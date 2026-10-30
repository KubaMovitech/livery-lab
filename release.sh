#!/bin/sh
# uso: sh release.sh <versione> "nota 1" "nota 2" …
# Controlla che index.html sia aggiornato rispetto a src/, che APP_VERSION in index.html sia <versione> e scrive version.json (il canale degli aggiornamenti
# letto dall'app su raw.githubusercontent.com) con lo SHA-256 di index.html. Va committato insieme a index.html.
set -e
V=$1; shift
ROOT=$(cd "$(dirname "$0")" && pwd)
# index.html deve essere ricostruito dai moduli in src/ (python3 tools/build.py)
python3 "$ROOT/tools/build.py" --check --lint
# i moduli isolati di src/modules/ non devono avere dipendenze nascoste (salta se mancano espree ed eslint-scope)
if command -v node >/dev/null 2>&1; then node "$ROOT/tools/check-modules.js" || { [ $? -eq 2 ] || exit 1; }; fi
grep -q "const APP_VERSION='$V'" "$ROOT/index.html" || { echo "index.html: APP_VERSION non è $V"; exit 1; }
grep -q "{v:'$V'," "$ROOT/index.html" || { echo "index.html: manca la voce $V nel CHANGELOG"; exit 1; }
python3 - "$ROOT" "$V" "$@" <<'P'
import sys,json,hashlib,datetime
root,v,notes=sys.argv[1],sys.argv[2],sys.argv[3:]
h=hashlib.sha256(open(root+'/index.html','rb').read()).hexdigest()
json.dump({"version":v,"date":datetime.date.today().isoformat(),"notes":notes,"app":{"file":"index.html","sha256":h}},
          open(root+'/version.json','w'),ensure_ascii=False,indent=1)
P
cat "$ROOT/version.json"
