"""Baja sonidos CC0 de Freesound (vista previa HQ en mp3) según tools/assets/sonidos.json.
Deja varios candidatos por categoría en assets/sfx/candidatos/ y los créditos en assets/sfx/creditos.json."""
import json, os, re, sys, time, urllib.parse, urllib.request, html

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'}
CFG = sys.argv[1] if len(sys.argv) > 1 else 'tools/assets/sonidos.json'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'assets/sfx/candidatos'
MAXN = int(sys.argv[3]) if len(sys.argv) > 3 else 4
ALLOW_BY = len(sys.argv) > 4 and sys.argv[4] == 'by'
CRED = os.path.join(os.path.dirname(OUT), 'creditos.json')
os.makedirs(OUT, exist_ok=True)
log = open(os.path.join(os.path.dirname(OUT), '_log.txt'), 'w')
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
cfg = json.load(open(CFG, encoding='utf-8'))
credits = {}
try: credits = json.load(open(CRED))
except Exception: pass
seen = set()
for cat, queries in cfg.items():
    if cat.startswith('_'): continue
    got = 0
    for q in queries:
        if got >= MAXN: break
        params = {'q': q, 'g': '1'} if ALLOW_BY else {'q': q, 'f': 'license:"Creative Commons 0"', 'g': '1'}
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
            if got >= MAXN: break
            if sid in seen: continue
            seen.add(sid)
            try:
                sp = get('https://freesound.org' + path)
            except Exception as e:
                L('  error página', sid, e); continue
            lic = 'CC0' if 'publicdomain/zero' in sp else ('CC-BY' if (ALLOW_BY and re.search(r'creativecommons\.org/licenses/by/[0-9.]+', sp) and not re.search(r'licenses/by-nc', sp)) else None)
            if not lic:
                L('  saltado (licencia)', sid); continue
            m = re.search(r'<meta property="og:audio" content="([^"]+)"', sp) or re.search(r'(https://cdn\.freesound\.org/previews/[^"\']+-hq\.mp3)', sp)
            if not m:
                L('  sin preview', sid); continue
            prev = html.unescape(m.group(1)).strip()
            L('  preview', sid, repr(prev))
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
            credits[fn] = {'id': sid, 'titulo': html.unescape(title.group(1)) if title else '', 'autor': author, 'url': 'https://freesound.org' + path, 'licencia': lic, 'busqueda': q, 'duracion': dur.group(1) if dur else ''}
            L('  OK', fn, sid, credits[fn]['titulo'], credits[fn]['duracion'])
            got += 1
            time.sleep(1.2)
        time.sleep(1.5)
    L('==', cat, got, 'candidatos')
json.dump(credits, open(CRED, 'w'), ensure_ascii=False, indent=1)
