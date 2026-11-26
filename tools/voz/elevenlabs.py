"""Genera el relator con ElevenLabs para cada idioma (tools/voz/<lang>.txt -> assets/voz/<lang>/<id>.mp3).
Secret: ELEVENLABS_API_KEY. Opcionales (Variables del repo): VOICE_EN, VOICE_ES (voice_id), MODEL (eleven_v3 por defecto).
Solo regenera las frases nuevas o cambiadas (guarda un hash por frase)."""
import os, json, re, sys, hashlib, subprocess, urllib.request, urllib.error
os.makedirs('assets/voz', exist_ok=True)
LOG = open('assets/voz/_log.txt', 'w')
_print = print
def print(*a):
    _print(*a); LOG.write(' '.join(str(x) for x in a) + '\n'); LOG.flush()
KEY = os.environ.get('ELEVENLABS_API_KEY', '').strip()
if not KEY: print('FALTA el secret ELEVENLABS_API_KEY en GitHub (Settings > Secrets and variables > Actions)'); sys.exit(0)
print('clave OK, largo', len(KEY))
MODEL = os.environ.get('MODEL', '').strip() or 'eleven_v3'
H = {'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'}
def api(path, data=None, accept_json=True):
    req = urllib.request.Request('https://api.elevenlabs.io' + path, data=json.dumps(data).encode() if data is not None else None, headers=dict(H, Accept='application/json' if accept_json else 'audio/mpeg'))
    with urllib.request.urlopen(req, timeout=120) as r: return json.loads(r.read()) if accept_json else r.read()
def pick_voice(lang):
    v = os.environ.get('VOICE_' + lang.upper(), '').strip()
    if v: return v
    try: vs = api('/v1/voices')['voices']
    except urllib.error.HTTPError as e: print('ERROR al listar voces', e.code, e.read()[:300]); raise
    def score(x):
        lab = json.dumps(x.get('labels', {})).lower() + ' ' + (x.get('name') or '').lower() + ' ' + (x.get('description') or '').lower()
        s = 0
        if 'male' in lab and 'female' not in lab: s += 3
        for w in ['sport', 'announcer', 'commentator', 'hype', 'energetic', 'excited', 'deep', 'narrat']: s += 2 if w in lab else 0
        if lang == 'es' and ('spanish' in lab or 'latin' in lab or 'argent' in lab): s += 4
        if lang == 'en' and 'american' in lab: s += 2
        return s
    vs.sort(key=score, reverse=True)
    print(lang, 'voz elegida:', vs[0]['name'], vs[0]['voice_id']); return vs[0]['voice_id']
def tts(voice, text, model):
    st = {'stability': 0.0 if model == 'eleven_v3' else 0.3, 'similarity_boost': 0.8, 'style': 0.8, 'use_speaker_boost': True}
    body = {'text': text, 'model_id': model, 'voice_settings': st}
    return api(f'/v1/text-to-speech/{voice}?output_format=mp3_44100_128', body, accept_json=False)
for lang in ['en', 'es']:
    src = f'tools/voz/{lang}.txt'
    if not os.path.exists(src): continue
    out = f'assets/voz/{lang}'; os.makedirs(out, exist_ok=True)
    hp = f'{out}/hashes.json'; hashes = json.load(open(hp)) if os.path.exists(hp) else {}
    voice = pick_voice(lang); ids = []
    for line in open(src, encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('#') or '|' not in line: continue
        vid, txt = [x.strip() for x in line.split('|', 1)]; ids.append(vid)
        model = MODEL; text = txt if model == 'eleven_v3' else re.sub(r'\[[^\]]+\]\s*', '', txt)
        h = hashlib.md5((voice + model + text).encode()).hexdigest()
        if hashes.get(vid) == h and os.path.exists(f'{out}/{vid}.mp3'): continue
        try: audio = tts(voice, text, model)
        except urllib.error.HTTPError as e:
            print(lang, vid, 'error', e.code, e.read()[:300]);
            if model != 'eleven_multilingual_v2':
                try: audio = tts(voice, re.sub(r'\[[^\]]+\]\s*', '', txt), 'eleven_multilingual_v2')
                except Exception as e2: print('  falló otra vez', e2); continue
            else: continue
        raw = f'/tmp/{lang}_{vid}.mp3'; open(raw, 'wb').write(audio)
        # eco de estadio, normalizado, sin silencios
        af = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,aecho=0.8:0.55:60|120:0.2|0.1,loudnorm=I=-13:TP=-1'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', '44100', '-ac', '1', '-b:a', '112k', f'{out}/{vid}.mp3'])
        hashes[vid] = h; print(lang, 'OK', vid, text)
    json.dump(hashes, open(hp, 'w'), indent=0)
    json.dump(sorted(i for i in ids if os.path.exists(f'{out}/{i}.mp3')), open(f'{out}/index.json', 'w'))
