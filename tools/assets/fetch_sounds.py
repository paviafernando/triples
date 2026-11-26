"""Baja sonidos CC0 de Freesound (vista previa HQ en mp3) según tools/assets/sonidos.json.
Deja varios candidatos por categoría en assets/sfx/candidatos/ y los créditos en assets/sfx/creditos.json."""
import json, os, re, time, urllib.parse, urllib.request, html

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'}
OUT = 'assets/sfx/candidatos'
os.makedirs(OUT, exist_ok=True)
log = open('assets/_log_sonidos.txt', 'w')
def L(*a):
    print(*a); log.write(' '.join(str(x) for x in a) + '\n'); log.flush()

def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        data = r.read()
    return data if binary else data.decode('utf-8', 'replace')

import glob
for f in glob.glob(OUT + '/*.mp3'):
    if os.path.getsize(f) == 0: os.remove(f)
cfg = json.load(open('tools/assets/sonidos.json', encoding='utf-8'))
credits = {}
try: credits = json.load(open('assets/sfx/creditos.json'))
except Exception: pass
seen = set()
for cat, queries in cfg.items():
    if cat.startswith('_'): continue
    got = 0
    for q in queries:
        if got >= 4: break
        params = {'q': q, 'f': 'license:"Creative Commons 0"', 'g': '1'}
        url = 'https://freesound.org/search/?' + urllib.parse.urlencode(params)
        try:
            page = get(url)
        except Exception as e:
            L('ERROR buscando', cat, q, e); continue
        links = []
        for m in re.finditer(r'href="(/people/[^/"]+/sounds/(\d+)/)"', page):
            if m.group(2) not in [x[1] for x in links]: links.append((m.group(1), m.group(2)))
        L(cat, '|', q, '->', len(links), 'resultados')
        for path, sid in links[:8]:
            if got >= 4: break
            if sid in seen: continue
            seen.add(sid)
            try:
                sp = get('https://freesound.org' + path)
            except Exception as e:
                L('  error página', sid, e); continue
            if 'publicdomain/zero' not in sp:
                L('  saltado (no CC0)', sid); continue
            m = re.search(r'<meta property="og:audio" content="([^"]+)"', sp) or re.search(r'(https://cdn\.freesound\.org/previews/[^"\']+-hq\.mp3)', sp)
            if not m:
                L('  sin preview', sid); continue
            prev = html.unescape(m.group(1))
            title = re.search(r'<meta property="og:title" content="([^"]*)"', sp)
            dur = re.search(r'Duration[^0-9]*([0-9:.]+)', sp)
            fn = f'{cat}_{got + 1}.mp3'
            cands = [prev]
            if prev.startswith('//'): cands = ['https:' + prev]
            mm = re.search(r'previews/(\d+)/(\d+_\d+)', prev)
            if mm: cands += [f'https://cdn.freesound.org/previews/{mm.group(1)}/{mm.group(2)}-hq.mp3', f'https://freesound.org/data/previews/{mm.group(1)}/{mm.group(2)}-hq.mp3']
            data = None
            for cu in cands:
                try:
                    data = get(cu, True)
                    if len(data) > 2000: break
                except Exception as e:
                    L('  error bajando', sid, repr(cu), e); data = None
            if not data: continue
            open(os.path.join(OUT, fn), 'wb').write(data)
            author = path.split('/')[2]
            credits[fn] = {'id': sid, 'titulo': html.unescape(title.group(1)) if title else '', 'autor': author, 'url': 'https://freesound.org' + path, 'licencia': 'CC0', 'busqueda': q, 'duracion': dur.group(1) if dur else ''}
            L('  OK', fn, sid, credits[fn]['titulo'], credits[fn]['duracion'])
            got += 1
            time.sleep(1.2)
        time.sleep(1.5)
    L('==', cat, got, 'candidatos')
json.dump(credits, open('assets/sfx/creditos.json', 'w'), ensure_ascii=False, indent=1)
