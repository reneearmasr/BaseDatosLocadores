"""Inserta src/asistente.js dentro del código codificado de apps-script/Index.html.
Uso: python3 src/empaquetar.py   (desde la carpeta del repositorio)"""
import re, base64, json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ruta = os.path.join(R, 'apps-script', 'Index.html')
html = open(ruta, encoding='utf-8').read()
m = re.search(r'var APP_B64=\[(.*?)\];', html, re.S)
code = base64.b64decode(''.join(json.loads('[' + m.group(1) + ']'))).decode('utf-8')
marca = '\n/* ============ ASISTENTE DE LOCADORES'
if marca in code:
    code = code[:code.index(marca)]
code = code.rstrip('\n') + '\n' + open(os.path.join(R, 'src', 'asistente.js'), encoding='utf-8').read()
b = base64.b64encode(code.encode('utf-8')).decode()
arr = '[\n' + ',\n'.join('"' + b[i:i + 1000] + '"' for i in range(0, len(b), 1000)) + '\n]'
open(ruta, 'w', encoding='utf-8').write(html[:m.start()] + 'var APP_B64=' + arr + ';' + html[m.end():])
print('Index.html actualizado')
