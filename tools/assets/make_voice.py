"""Genera las frases del locutor con Piper (voz neuronal es_AR daniela) y las deja en assets/voz/*.mp3 con efecto de estadio."""
import os, subprocess, urllib.request
os.makedirs('assets/voz', exist_ok=True)
log = open('assets/_log_voz.txt', 'w')
M = 'es_AR-daniela-high.onnx'
base = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_AR/daniela/high/'
for f in (M, M + '.json'):
    if not os.path.exists(f): urllib.request.urlretrieve(base + f + '?download=true', f)
for line in open('tools/assets/voz.txt', encoding='utf-8'):
    line = line.strip()
    if not line or line.startswith('#') or '|' not in line: continue
    vid, txt = [x.strip() for x in line.split('|', 1)]
    wav = f'/tmp/{vid}.wav'
    excited = txt.endswith('!')
    r = subprocess.run(['piper', '--model', M, '--output_file', wav, '--length_scale', '0.88' if excited else '0.95', '--noise_scale', '0.75', '--noise_w', '0.9'], input=txt.encode('utf-8'), capture_output=True)
    if r.returncode != 0:
        log.write(f'ERROR {vid}: {r.stderr.decode()[-400:]}\n'); continue
    # estadio: un poco más agudo y con presencia, eco de arena, normalizado
    af = 'highpass=f=120,equalizer=f=3000:t=q:w=1:g=4,aecho=0.85:0.6:70|140:0.22|0.12,loudnorm=I=-14:TP=-1.5'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', af, '-ar', '44100', '-ac', '1', '-b:a', '96k', f'assets/voz/{vid}.mp3'])
    log.write(f'OK {vid}: {txt}\n')
log.close()
