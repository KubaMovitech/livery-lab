#!/usr/bin/env python3
"""Ricompone index.html (l'app distribuita come file unico) dai moduli in src/.

  python3 tools/build.py           scrive index.html
  python3 tools/build.py --check   controlla che index.html sia aggiornato (esce con 1 se no)
  python3 tools/build.py --lint    in più controlla la sintassi di ogni modulo JS con node --check

src/index.html è il guscio della pagina: ogni riga "@@include percorso" viene sostituita dal file
src/percorso così com'è. I moduli di src/app/ condividono lo stesso scope (stanno dentro un'unica
funzione nella pagina), quindi l'ordine delle righe @@include è l'ordine di esecuzione.
"""
import os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'index.html')
INC = re.compile(r'^@@include (\S+)$')

def read(p):
    with open(p, encoding='utf-8', newline='') as f:
        return f.read()

def build():
    out, used = [], []
    for line in read(os.path.join(SRC, 'index.html')).splitlines(keepends=True):
        m = INC.match(line.rstrip('\n'))
        if not m:
            out.append(line); continue
        rel = m.group(1); p = os.path.join(SRC, rel)
        if not os.path.isfile(p):
            sys.exit(f'build: manca {rel}')
        body = read(p)
        if not body.endswith('\n'):
            sys.exit(f'build: {rel} deve finire con un a capo')
        # un modulo non deve chiudere il tag che lo contiene
        tag = '</style' if rel.endswith('.css') else '</script' if rel.endswith('.js') else None
        if tag and tag in body.lower():
            sys.exit(f'build: {rel} contiene "{tag}"')
        out.append(body); used.append(rel)
    # file dimenticati: esistono in src/ ma il guscio non li include
    every = {os.path.relpath(os.path.join(d, f), SRC).replace(os.sep, '/')
             for d, _, fs in os.walk(SRC) for f in fs} - {'index.html'}
    extra = sorted(every - set(used))
    if extra:
        sys.exit('build: file in src/ non inclusi: ' + ', '.join(extra))
    return ''.join(out), used

def lint(used):
    node = shutil.which('node')
    if not node:
        print('lint: node non trovato, salto il controllo della sintassi'); return True
    ok = True
    for rel in used:
        if not rel.endswith('.js'): continue
        # ogni modulo da solo deve essere JavaScript valido (le dipendenze dagli altri si vedono solo all'esecuzione)
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as t:
            t.write(read(os.path.join(SRC, rel)))
        r = subprocess.run([node, '--check', t.name], capture_output=True, text=True); os.unlink(t.name)
        if r.returncode:
            ok = False; print(f'lint: {rel}\n{r.stderr.strip()}')
    return ok

def main(args):
    html, used = build()
    if '--lint' in args and not lint(used):
        sys.exit(1)
    if '--check' in args:
        if not os.path.isfile(OUT) or read(OUT) != html:
            sys.exit('index.html non corrisponde a src/: esegui python3 tools/build.py')
        print(f'index.html aggiornato ({len(used)} moduli)'); return
    with open(OUT, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    print(f'index.html scritto da {len(used)} moduli, {len(html.encode())} byte')

if __name__ == '__main__':
    main(sys.argv[1:])
