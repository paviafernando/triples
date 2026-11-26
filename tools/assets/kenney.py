"""Baja packs de voces de Kenney (CC0) y los pasa a mp3 en assets/locutor/kenney/."""
import io, os, re, subprocess, urllib.request, zipfile
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124 Safari/537.36'}
OUT = 'assets/locutor/kenney'; os.makedirs(OUT, exist_ok=True)
log = open('assets/locutor/_log_kenney.txt', 'w')
for page in ['voiceover-pack', 'voiceover-pack-fighter']:
    try:
        h = urllib.request.urlopen(urllib.request.Request('https://kenney.nl/assets/' + page, headers=UA), timeout=40).read().decode('utf-8', 'replace')
        m = re.search(r'href="([^"]+\.zip)"', h)
        if not m: log.write(f'{page}: sin zip\n'); continue
        url = m.group(1) if m.group(1).startswith('http') else 'https://kenney.nl' + m.group(1)
        data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
        z = zipfile.ZipFile(io.BytesIO(data)); n = 0
        for name in z.namelist():
            if not re.search(r'\.(ogg|wav)$', name, re.I) or '__MACOSX' in name: continue
            base = re.sub(r'[^a-z0-9_]+', '_', (page.split('-')[-1] + '_' + os.path.splitext(os.path.basename(name))[0]).lower())
            tmp = '/tmp/k_' + os.path.basename(name); open(tmp, 'wb').write(z.read(name))
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-b:a', '96k', f'{OUT}/{base}.mp3']); n += 1
        log.write(f'{page}: {n} archivos desde {url}\n')
    except Exception as e:
        log.write(f'{page}: ERROR {e}\n')
