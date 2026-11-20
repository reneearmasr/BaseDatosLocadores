# Genera app/index.html (versión Supabase) a partir de apps-script/Index.html, sin tocar el código del aplicativo:
# reemplaza google.script.run por llamadas a Supabase (función public.locadores_api) y agrega el ingreso con Google.
import re, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(R, 'apps-script/Index.html'), encoding='utf-8').read()

SB_URL = 'https://gqjhayjilmyqwavmwztg.supabase.co'
SB_KEY = 'sb_publishable_mt7fiyz53XnvwUDn2Evfcg_2cyXaOKz'  # clave pública (la seguridad está en la base de datos)

shim = r'''<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script>
/* ===== Conexión con Supabase (proyecto POI ATU · espacio "locadores") ===== */
var SB_URL='%s', SB_KEY='%s';
var sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
function locApi(fn,args){return sb.rpc('locadores_api',{p:{fn:fn,args:args}}).then(function(r){if(r.error)throw new Error(r.error.message);return fn==='getVersion'?r.data:JSON.stringify(r.data)})}
(function(){function mk(ok,fail){var o={withSuccessHandler:function(f){return mk(f,fail)},withFailureHandler:function(f){return mk(ok,f)},withUserObject:function(){return o}};
  return new Proxy(o,{get:function(t,n){if(n in t)return t[n];return function(){var a=[].slice.call(arguments);locApi(n,a).then(function(v){ok&&ok(v)},function(e){fail&&fail(e)})}}})}
 window.google={script:{run:mk(null,null),host:{close:function(){}}}};})();
function esc0(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function entrarGoogle(){sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}})}
function salir(){sb.auth.signOut().then(function(){location.replace(location.origin+location.pathname)})}
function pantallaIngreso(msg){var b=document.getElementById('bootMsg');if(!b)return;b.style.display='block';
 b.innerHTML='<div style="text-align:center;padding:10px 6px"><div style="font-size:19px;font-weight:700;color:#1f5f6b">Gestor de Locadores · ATU</div>'+
 '<p style="color:#4b5d65;margin:8px 0 18px">Ingresa con la cuenta de Google autorizada por la Unidad de Presupuesto.</p>'+
 (msg?'<div style="background:#fbe9eb;color:#8a2f39;border-radius:8px;padding:10px 12px;margin:0 0 16px;font-size:13px">'+msg+'</div>':'')+
 '<button id="btnG" style="display:inline-flex;align-items:center;gap:10px;padding:10px 18px;border:1px solid #c9d3d6;border-radius:8px;background:#fff;cursor:pointer;font-weight:600">'+
 '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>Ingresar con Google</button></div>';
 document.getElementById('btnG').onclick=entrarGoogle}
function barraSesion(email){var d=document.createElement('div');d.id='sbSesion';d.style.cssText='position:fixed;top:8px;right:12px;z-index:50;font-size:12px;background:#ffffffee;border:1px solid #dfe5e8;border-radius:16px;padding:3px 6px 3px 10px;display:flex;gap:8px;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,.08)';
 d.innerHTML='<span style="color:#4b5d65">'+esc0(email)+'</span><button style="border:0;background:#e6f0f2;color:#1f5f6b;border-radius:12px;padding:2px 9px;cursor:pointer;font-size:12px">Salir</button>';
 d.querySelector('button').onclick=salir;document.body.appendChild(d)}
var __arrancado=false;
async function iniciarSesion(){var s=(await sb.auth.getSession()).data.session;if(!s){pantallaIngreso();return}
 if(__arrancado)return;
 try{await locApi('getVersion',[])}catch(e){pantallaIngreso(esc0(e.message)+'<br><br><a href="#" onclick="salir();return false">Usar otra cuenta</a>');return}
 __arrancado=true;barraSesion(s.user.email);document.getElementById('bootMsg').innerHTML='Cargando el aplicativo…';window.__bootApp()}
sb.auth.onAuthStateChange(function(ev){if(ev==='SIGNED_IN')iniciarSesion()});
window.addEventListener('DOMContentLoaded',function(){iniciarSesion()});
</script>
''' % (SB_URL, SB_KEY)

anchor = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>'
assert html.count(anchor) == 1
html = html.replace(anchor, shim + anchor)
a = '(function(){try{var bin=atob(APP_B64.join(\'\'));'
assert html.count(a) == 1
html = html.replace(a, 'window.__bootApp=(function(){try{var bin=atob(APP_B64.join(\'\'));')
b = "Envía una captura de este mensaje.';}}})();\n</script>\n<!-- FIN DEL ARCHIVO Index.html -->"
assert html.count(b) == 1, html[-400:]
html = html.replace(b, "Envía una captura de este mensaje.';}}});\n</script>\n<!-- FIN DEL ARCHIVO -->")
# Textos del aplicativo: Google Sheets → base de datos (Supabase)
import base64, json
m = re.search(r'var APP_B64=\[(.*?)\];', html, re.S)
code = base64.b64decode(''.join(json.loads('[' + m.group(1) + ']'))).decode('utf-8')
for a_, b_ in [("Repositorio en Google Sheets", "Base de datos en Supabase"), ("Datos actualizados desde Google Sheets", "Datos actualizados desde la base de datos"),
               ("Guardando en Google Sheets…", "Guardando…"), ("en la hoja HISTORIAL de Google Sheets", "en el Historial de la base de datos"),
               ("un repositorio central de Google Sheets", "una base de datos central (Supabase)"), ("El repositorio central en Google Sheets", "La base de datos central"),
               ("Conectando con el repositorio en Google Sheets…", "Conectando con la base de datos…"), ("Google está tardando; reintentando", "La conexión está tardando; reintentando"),
               ("se guarda en Google Sheets con tu correo", "se guarda en la base de datos con tu correo"), ("la base de locadores en Google Sheets", "la base de locadores"),
               ("Sincronizado con Google Sheets", "Sincronizado con la base de datos")]:
    code = code.replace(a_, b_)
b64 = base64.b64encode(code.encode('utf-8')).decode()
arr = '[\n' + ',\n'.join('"' + b64[i:i+1000] + '"' for i in range(0, len(b64), 1000)) + '\n]'
html = html[:m.start()] + 'var APP_B64=' + arr + ';' + html[m.end():]
html = html.replace('<base target="_top">', '')
html = html.replace('<title>Gestor de Locadores · ATU</title>', '<title>Gestor de Locadores · ATU</title>\n<meta name="robots" content="noindex">')
open(os.path.join(R, 'app/index.html'), 'w', encoding='utf-8').write(html)
print('app/index.html', len(html))
