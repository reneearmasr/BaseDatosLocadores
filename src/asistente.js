/* ============ ASISTENTE DE LOCADORES (mismo chatbot del Tablero ATU; local, sin IA ni servicios externos) ============ */
function crearAsistenteLoc(){
  /* ---------- utilidades ---------- */
  const low = s => String(s == null ? '' : s).normalize('NFD').replace(RE_DIA, '').toLowerCase().replace(/[¿?¡!]/g, ' ').replace(/\s+/g, ' ').trim();
  const lista = items => '<ul>' + items.map(i => '<li>' + i + '</li>').join('') + '</ul>';
  const clamp = v => Math.max(0, Math.min(100, v));
  const pc = (a, b) => b ? (100 * a / b).toFixed(1) + ' %' : '—';
  const barra = (frac, cls) => '<span class="atb-bar"><i class="' + cls + '" style="width:' + clamp(frac * 100).toFixed(1) + '%"></i></span>';
  const kpi = (lbl, val, cls) => '<div class="atb-kpi' + (cls ? ' ' + cls : '') + '"><span>' + lbl + '</span><b>' + val + '</b></div>';
  const titulo = (ico, txt) => '<div class="atb-tit">' + ico + ' ' + txt + '</div>';
  const pie = txt => '<p class="atb-q">' + txt + '</p>';
  const nota = txt => '<small class="atb-nota">' + txt + '</small>';
  const fila = (nombre, valor, frac, cls, sub, attrs) => '<div class="atb-row' + (attrs ? ' atb-click' : '') + '"' + (attrs || '') + '><div class="atb-row-h"><b>' + esc(nombre) + '</b><span class="' + cls + '">' + valor + '</span></div>' + barra(frac, cls) + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
  const dl = pares => '<div class="atb-dl atb-dl2">' + pares.filter(p => p && p[1] !== '' && p[1] != null).map(p => '<span>' + p[0] + '</span><b>' + p[1] + '</b>').join('') + '</div>';
  const fecha = () => today();
  /* acciones (abrir ficha, ver en base, ir a una sección) */
  const ACC = new Map(); let nAcc = 0;
  const accion = (texto, fn) => { const id = 'x' + (++nAcc); ACC.set(id, fn); return '<button type="button" class="atb-lnk" data-acc="' + id + '">' + texto + '</button>'; };
  const verBase = (rows, etq) => accion('Ver en Base de datos →', () => go('base', {ids: rows.map(r => r._id), idsLabel: etq || 'Asistente'}));
  const exportar = rows => accion('Exportar a Excel →', () => exportRows(rows, 'Locadores_asistente'));
  const irA = (k, txt) => accion(txt, () => go(k));
  const ficha = r => ' data-acc="' + (function(){ const id = 'x' + (++nAcc); ACC.set(id, () => { const x = byId(r._id); if (x) openFicha(x); }); return id; })() + '" role="button" tabindex="0" title="Abrir ficha"';
  const tono = p => p > 1.00001 ? 'r' : p >= 0.9 ? 'a' : 'v';

  /* ---------- diccionario de áreas (órganos y unidades orgánicas) ---------- */
  const COMUN = new Set(['QUE','POR','CON','SIN','HAY','UNA','UNO','LOS','LAS','DEL','MAS','DNI','TOP','SON','CUAL','PARA','ESTA','ESE','ESA','VER','DAME','CADA','MES','SOL','MIL','TODO','ENTRE','SOBRE','HASTA','NOS','SUS','LES','ATU','OSE','ASI','DIA','HOY','AYER','UNO']);
  function areas(){
    const m = new Map();
    const add = (kind, name, organo) => {
      if (!name) return; const key = kind + '|' + norm(name) + (kind === 'uo' ? '|' + norm(organo) : '');
      if (m.has(key)) return;
      const tk = toks(name); const sig = new Map();
      const ini = tk.map(t => t[0]).join(''); if (ini.length >= 3 && !COMUN.has(ini)) sig.set(ini, false);
      const raw = String(name); let x; const re = /\(([A-Za-zÁÉÍÓÚÑáéíóúñ.]{2,12})\)/g;
      while ((x = re.exec(raw))) sig.set(norm(x[1]).replace(/ /g, ''), true);
      x = raw.match(/^\s*([A-ZÁÉÍÓÚÑ.]{2,12})\s*[-–:]/); if (x) sig.set(norm(x[1]).replace(/ /g, ''), true);
      m.set(key, {kind, name, organo, tk, sig});
    };
    for (const r of DB.data){ if (r.organo) add('organo', r.organo, r.organo); if (r.uo) add('uo', r.uo, r.organo); }
    for (const t of DB.techos || []){ if (t.organo) add('organo', t.organo, t.organo); if (t.uo) add('uo', t.uo, t.organo); }
    return [...m.values()];
  }
  function buscarArea(qt, qw){
    const A = areas(); const N = A.length || 1; const df = new Map();
    A.forEach(a => new Set(a.tk).forEach(t => df.set(t, (df.get(t) || 0) + 1)));
    const w = t => Math.log(1 + N / (df.get(t) || 1));
    let best = null;
    for (const a of A){
      let s = 0, used = [];
      for (const [g] of a.sig) if (qw.includes(g)){ s = 1.01; used = [g]; break; }
      if (!s && a.tk.length){
        let tot = 0, got = 0, dist = false; const u = [];
        for (const t of a.tk){
          const W = w(t); tot += W;
          const k = qt.findIndex(x => x === t || (x.length >= 4 && t.length >= 4 && lev(x, t) <= 1) || (x.length >= 5 && t.length >= 5 && (x.startsWith(t) || t.startsWith(x))));
          if (k >= 0){ got += W; u.push(qt[k]); if ((df.get(t) || 0) <= Math.max(2, N * 0.2)) dist = true; }
        }
        const sc = tot ? got / tot : 0;
        if (sc >= 0.6 && dist && u.length >= Math.min(2, a.tk.length)){ s = sc; used = u; }
      }
      if (s && (!best || s > best.s + 1e-9 || (Math.abs(s - best.s) < 1e-9 && (a.tk.length > best.a.tk.length || (a.tk.length === best.a.tk.length && a.kind === 'organo' && best.a.kind === 'uo')))))
        best = {a, s, used};
    }
    return best;
  }

  /* ---------- filtros ---------- */
  function montoDe(L){
    const A = 's?\\/?\\.?\\s*(\\d[\\d.,]*)\\s*(mil|k)?';
    const val = (a, m) => { let t = String(a).replace(/[.,]$/, ''); if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); let v = num(t); if (v == null) return null; if (m) v *= 1000; return v; };
    const o = {}; let x;
    if ((x = L.match(new RegExp('entre\\s*' + A + '\\s*(?:y|a)\\s*' + A)))){ o.min = val(x[1], x[2]); o.max = val(x[3], x[4]); o.incl = true; }
    else {
      if ((x = L.match(new RegExp('(?:mas de|mayor(?:es)? (?:a|que|de)|superior(?:es)? a|por encima de|encima de|superan?|supera los|mas alto que)\\s*' + A)))) o.min = val(x[1], x[2]);
      if ((x = L.match(new RegExp('(?:menos de|menor(?:es)? (?:a|que|de)|inferior(?:es)? a|por debajo de|debajo de|hasta|no superan?)\\s*' + A)))) o.max = val(x[1], x[2]);
    }
    ['min', 'max'].forEach(k => { if (o[k] != null && o[k] < 300) delete o[k]; });
    if (o.min == null && o.max == null) delete o.incl;
    return o;
  }
  function parse(q){
    const L = low(q);
    const qw = norm(q).split(' ').filter(Boolean), qt = toks(q);
    const am = buscarArea(qt, qw);
    let R0 = ' ' + norm(q) + ' ';
    if (am) am.used.forEach(t => { R0 = R0.split(' ' + t + ' ').join(' '); });
    const RL = R0.toLowerCase().replace(/\s+/g, ' ');
    const f = {};
    if (am) f.area = {kind: am.a.kind, name: am.a.name, organo: am.a.organo};
    if (/\bcampo\b/.test(RL)) f.tipo = 'Campo'; else if (/\badministrativ/.test(RL)) f.tipo = 'Administrativo'; else if (/\bmixtos?\b/.test(RL)) f.tipo = 'Mixto';
    if (/\bdoctor/.test(RL)) f.grado = 'Doctorado'; else if (/\b(maestr|magister)/.test(RL)) f.grado = 'Maestría'; else if (/\btitulad/.test(RL)) f.grado = 'Titulado';
    else if (/\bbachiller/.test(RL)) f.grado = 'Bachiller'; else if (/\begresad/.test(RL)) f.grado = 'Egresado'; else if (/\btecnicos?\b/.test(RL)) f.grado = 'Técnico';
    else if (/\bestudiantes?\b/.test(RL)) f.grado = 'Estudiante universitario'; else if (/\bsecundaria/.test(RL)) f.grado = 'Secundaria completa';
    if (/\bcoordinador/.test(RL)) f.nivel = 'Coordinador'; else if (/\bespecialistas?\b/.test(RL)) f.nivel = 'Especialista'; else if (/\b(asistentes?|analistas?)\b/.test(RL)) f.nivel = 'Asistente / Analista'; else if (/\bauxiliar/.test(RL)) f.nivel = 'Auxiliar';
    if (/\b(sin|no tienen?|no cuentan con|falta|faltan) (el |con )?certificad|\bcertificado no\b|\bno certificad/.test(RL)) f.cert = 'No';
    else if (/\b(con|tienen?|cuentan con) (el )?certificad|\bcertificado si\b/.test(RL)) f.cert = 'Sí';
    if (/\b(suben|subio|subieron|aument|increment)/.test(RL)) f.vari = 'Sube'; else if (/\b(bajan|bajaron|bajo su|reduj|reduc|disminu)/.test(RL)) f.vari = 'Baja';
    if (/\bsin reemplazo/.test(RL)) f.reemp = false; else if (/\breemplaz/.test(RL)) f.reemp = true;
    if (/\bexcepci/.test(RL)) f.exc = true;
    Object.assign(f, montoDe(L));
    return {L, RL, f, am, qt};
  }
  const hayFiltro = f => ['area', 'tipo', 'grado', 'nivel', 'cert', 'vari', 'reemp', 'exc', 'min', 'max'].some(k => f[k] != null);
  function filtrar(f){
    return DB.data.filter(esAct).filter(r => {
      if (f.area){
        if (f.area.kind === 'organo'){ if (norm(r.organo) !== norm(f.area.name)) return false; }
        else if (norm(r.uo) !== norm(f.area.name)) return false;
      }
      if (f.tipo && tipoN(r) !== f.tipo) return false;
      if (f.grado && gradoN(r) !== f.grado) return false;
      if (f.nivel && nivel(r) !== f.nivel) return false;
      if (f.cert && certN(r) !== f.cert) return false;
      if (f.vari && varEst(r) !== f.vari) return false;
      if (f.reemp != null && !!(r.reemplazo && r.reemplazo.trim()) !== f.reemp) return false;
      if (f.exc && !(r.excepcion && r.excepcion.trim())) return false;
      const m = r.montoAct;
      if (f.min != null && (m == null || (f.incl ? m < f.min : m <= f.min))) return false;
      if (f.max != null && (m == null || m > f.max)) return false;
      return true;
    });
  }
  function etiqueta(f){
    const p = [];
    if (f.area) p.push(f.area.name);
    if (f.tipo) p.push('tipo ' + f.tipo.toLowerCase());
    if (f.nivel) p.push(f.nivel.toLowerCase());
    if (f.grado) p.push('grado ' + f.grado.toLowerCase());
    if (f.cert) p.push(f.cert === 'No' ? 'sin certificado' : 'con certificado');
    if (f.vari) p.push(f.vari === 'Sube' ? 'honorario subió' : 'honorario bajó');
    if (f.reemp != null) p.push(f.reemp ? 'con reemplazo' : 'sin reemplazo');
    if (f.exc) p.push('con excepción');
    if (f.min != null && f.max != null) p.push('entre ' + fmtS0(f.min) + ' y ' + fmtS0(f.max));
    else if (f.min != null) p.push('más de ' + fmtS0(f.min)); else if (f.max != null) p.push('hasta ' + fmtS0(f.max));
    return p.join(' · ');
  }
  const deF = f => { const e = etiqueta(f); return e ? ' · ' + esc(e) : ''; };
  const pre = f => f.area ? f.area.name + ' ' : 'Locadores ';

  /* ---------- techos ---------- */
  function techoDe(area){
    const A = techoAreas(); if (!A.length || !area) return null;
    let t = area.kind === 'organo' ? A.find(a => a.isO && a.k === norm(area.name)) : A.find(a => !a.isO && a.k.split('|')[1] === norm(area.name));
    if (!t && area.kind === 'uo'){ const o = norm(area.organo); t = A.find(a => a.isO && a.k === o); }
    return t || null;
  }
  const nomT = t => t.isO ? t.organo : t.uo;

  /* ---------- respuestas ---------- */
  const SUGERENCIAS = ['Resumen de la base', '¿Qué áreas exceden su techo?', 'Locadores por órgano', 'Los 10 honorarios más altos'];

  function rResumen(f, foco){
    const rows = filtrar(f);
    if (!rows.length) return {html: 'No encontré locadores' + (hayFiltro(f) ? ' que cumplan a la vez: <b>' + esc(etiqueta(f)) + '</b>' : ' en la base') + ' 🤔. Prueba con un solo criterio.', chips: SUGERENCIAS};
    const a = agg(rows);
    const t = techoDe(f.area);
    const tp = groupBy(rows, tipoN);
    const tipos = ['Campo', 'Administrativo', 'Mixto', 'Sin dato'].filter(k => tp.has(k)).map(k => k + ' ' + fmtN(tp.get(k).length)).join(' · ');
    const k3 = foco === 'prom'
      ? kpi('Promedio mensual', fmtS0(a.prom), 'k-v') + kpi('Locadores', fmtN(a.n)) + kpi('Monto mensual', fmtM(a.act))
      : kpi('Locadores', fmtN(a.n), foco === 'n' ? 'k-v' : '') + kpi('Monto mensual', fmtM(a.act), foco === 'monto' ? 'k-v' : '') + kpi('Promedio', fmtS0(a.prom));
    let html = titulo('📊', (hayFiltro(f) ? 'Locadores' + deF(f) : 'Resumen de la base de locadores') + ' <span>al ' + fecha() + '</span>') +
      '<div class="atb-kpis">' + k3 + '</div>' +
      dl([['Monto mensual actual', fmtS(a.act)], ['Por tipo', tipos],
        ['Honorario mínimo – máximo', a.mn != null ? fmtS0(a.mn) + ' – ' + fmtS0(a.mx) : ''],
        a.cAnt ? ['Variación vs. monto anterior', (a.varS >= 0 ? '+' : '−') + fmtS0(Math.abs(a.varS)) + ' (' + fmtP(a.varP) + ')'] : null,
        !hayFiltro(f) ? ['Órganos · unidades', fmtN(new Set(rows.map(r => r.organo).filter(Boolean)).size) + ' · ' + fmtN(new Set(rows.map(r => r.uo).filter(Boolean)).size)] : null]);
    if (t) html += '<div style="margin-top:9px">' + fila('Techo de ' + nomT(t), pc(t.monto, t.techo), t.techo ? t.monto / t.techo : 0, tono(t.techo ? t.monto / t.techo : 0), (t.saldo < -0.005 ? 'Excede en ' + fmtS0(-t.saldo) : 'Saldo ' + fmtS0(t.saldo)) + ' · techo ' + fmtS0(t.techo)) + '</div>';
    html += '<div class="atb-acts">' + verBase(rows, etiqueta(f) || 'Toda la base') + exportar(rows) + '</div>';
    html += pie(rows.length <= 40 ? '¿Quieres ver la lista de nombres?' : '¿Quieres verlo por unidad orgánica o por tipo?');
    const ch = [];
    if (rows.length <= 40) ch.push('Lista de locadores ' + (etiqueta(f) ? 'de ' + etiqueta(f) : ''));
    if (!f.area || f.area.kind === 'organo') ch.push(pre(f) + 'por unidad orgánica');
    ch.push(pre(f) + 'por tipo');
    if (f.area && !t) ch.push('¿Qué áreas exceden su techo?'); else if (f.area) ch.push('Techo de ' + f.area.name);
    else ch.push('¿Qué áreas exceden su techo?');
    return {html, chips: ch.map(s => s.trim())};
  }

  function rLista(f){
    const rows = filtrar(f).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    if (!rows.length) return {html: 'No encontré locadores con: <b>' + esc(etiqueta(f) || 'ese criterio') + '</b> 🤔.', chips: SUGERENCIAS};
    if (!hayFiltro(f)) return {html: 'La base tiene <b>' + fmtN(rows.length) + '</b> locadores; es una lista muy larga para el chat. Dime un órgano, una unidad o un criterio (por ejemplo <i>"locadores de campo de la ' + esc((areas().find(a => a.kind === 'uo') || {}).name || 'unidad') + '"</i>) o ábrela en la Base de datos.<div class="atb-acts">' + irA('base', 'Abrir la Base de datos →') + '</div>', chips: ['Locadores por órgano', 'Locadores por unidad orgánica']};
    const max = 25, mx = Math.max(...rows.map(r => r.montoAct || 0), 1);
    return {
      html: titulo('📋', 'Locadores' + deF(f) + ' <span>' + fmtN(rows.length) + ' en total · toca un nombre para abrir su ficha</span>') +
        '<div class="atb-rows">' + rows.slice(0, max).map(r => fila(r.nombre || '(sin nombre)', fmtS0(r.montoAct), (r.montoAct || 0) / mx, 'n', esc([r.dni ? 'DNI ' + r.dni : '', f.area && f.area.kind === 'uo' ? '' : r.uo, tipoN(r)].filter(Boolean).join(' · ')), ficha(r))).join('') + '</div>' +
        (rows.length > max ? nota('Se muestran ' + max + ' de ' + fmtN(rows.length) + ', en orden alfabético.') : '') +
        '<div class="atb-acts">' + verBase(rows, etiqueta(f)) + exportar(rows) + '</div>',
      chips: [(f.area ? f.area.name + ' ' : 'Los 10 ') + 'honorarios más altos', 'Resumen de ' + (etiqueta(f) || 'la base')].map(s => s.trim())
    };
  }

  function rTop(f, dir, n){
    const rows = filtrar(f).filter(r => r.montoAct != null);
    if (!rows.length) return {html: 'No encontré locadores con monto' + deF(f) + ' 🤔.', chips: SUGERENCIAS};
    rows.sort((a, b) => dir * ((b.montoAct || 0) - (a.montoAct || 0)) || String(a.nombre).localeCompare(String(b.nombre)));
    const vis = rows.slice(0, n), mx = Math.max(...vis.map(r => r.montoAct || 0), 1);
    return {
      html: titulo(dir > 0 ? '🏆' : '🔽', 'Los ' + vis.length + ' honorarios ' + (dir > 0 ? 'más altos' : 'más bajos') + deF(f) + ' <span>monto mensual actual</span>') +
        '<div class="atb-rows">' + vis.map((r, i) => fila((i + 1) + '. ' + (r.nombre || '(sin nombre)'), fmtS0(r.montoAct), (r.montoAct || 0) / mx, dir > 0 ? 'n' : 'b', esc([r.uo || r.organo, nivel(r)].filter(Boolean).join(' · ')), ficha(r))).join('') + '</div>' +
        nota('Toca un nombre para abrir su ficha.') + '<div class="atb-acts">' + verBase(vis, (dir > 0 ? 'Honorarios más altos' : 'Honorarios más bajos')) + '</div>',
      chips: [(f.area ? f.area.name + ' ' : 'Los 10 ') + 'honorarios ' + (dir > 0 ? 'más bajos' : 'más altos'), 'Promedio de honorario ' + (etiqueta(f) ? 'de ' + etiqueta(f) : 'de la base')].map(s => s.trim())
    };
  }

  const DIMTXT = {organo: ['órgano', 'órganos'], uo: ['unidad orgánica', 'unidades orgánicas'], tipo: ['tipo', 'tipos'], grado: ['grado académico', 'grados académicos'], nivel: ['nivel', 'niveles'], cert: ['certificado', 'estados de certificado'], rango: ['rango de monto', 'rangos de monto'], var: ['variación de honorario', 'variaciones']};
  function rDesglose(f, dim, orden){
    const rows = filtrar(f);
    if (!rows.length) return {html: 'No encontré locadores' + deF(f) + ' 🤔.', chips: SUGERENCIAS};
    let g = [...groupBy(rows, DIMS[dim].f)].map(([k, v]) => ({k, rows: v, a: agg(v)}));
    const porMonto = orden === 'monto';
    if (orden === 'monto') g.sort((a, b) => b.a.act - a.a.act);
    else if (orden === 'n' || !DIMS[dim].ord) g.sort((a, b) => b.a.n - a.a.n || b.a.act - a.a.act);
    else { const o = DIMS[dim].ord; g.sort((a, b) => (o.indexOf(a.k) < 0 ? 99 : o.indexOf(a.k)) - (o.indexOf(b.k) < 0 ? 99 : o.indexOf(b.k))); }
    const max = 10, vis = g.slice(0, max);
    const mx = Math.max(...vis.map(x => porMonto ? x.a.act : x.a.n), 1), tot = agg(rows);
    const filas = vis.map(x => fila(x.k, porMonto ? fmtM(x.a.act) : fmtN(x.a.n) + ' loc.', (porMonto ? x.a.act : x.a.n) / mx, porMonto ? 'n' : 'b',
      (porMonto ? fmtN(x.a.n) + ' locadores' : fmtM(x.a.act) + ' al mes') + ' · prom. ' + fmtS0(x.a.prom) + ' · ' + pc(x.a.n, tot.n) + ' del total',
      (function(){ const id = 'x' + (++nAcc); ACC.set(id, () => go('base', {ids: x.rows.map(r => r._id), idsLabel: x.k})); return ' data-acc="' + id + '" role="button" tabindex="0" title="Ver en Base de datos"'; })())).join('');
    const notas = ['Toca una fila para verla en la Base de datos.'];
    if (g.length > max) notas.push('Se muestran ' + max + ' de ' + g.length + '.');
    const top = g[0];
    return {
      html: titulo('📊', 'Locadores' + deF(f) + ' por ' + DIMTXT[dim][0] + (orden ? ' <span>ordenado por ' + (porMonto ? 'monto mensual' : 'cantidad') + '</span>' : ' <span>' + fmtN(tot.n) + ' locadores · ' + fmtM(tot.act) + ' al mes</span>')) +
        (orden && top ? '<p style="margin:0 0 8px">' + (porMonto ? 'El mayor monto mensual lo tiene' : 'La mayor cantidad de locadores la tiene') + ' <b>' + esc(top.k) + '</b>: ' + fmtN(top.a.n) + ' locadores y ' + fmtS(top.a.act) + ' al mes.</p>' : '') +
        '<div class="atb-rows">' + filas + '</div>' + nota(notas.join(' ')) +
        '<div class="atb-acts">' + irA('consol', 'Ir a Consolidados →') + '</div>',
      chips: top && (dim === 'organo' || dim === 'uo') ? ['Resumen de ' + top.k, top.k + ' por tipo', 'Techo de ' + top.k] : [pre(f) + 'por ' + (dim === 'tipo' ? 'nivel' : 'tipo'), 'Resumen de ' + (etiqueta(f) || 'la base')].map(s => s.trim())
    };
  }

  function rTecho(f, hipo){
    const A = techoAreas();
    if (!A.length) return {html: 'Todavía no hay techos cargados 📭. Cárgalos en <b>Datos y respaldo → Cargar techos desde Excel</b> (archivo "Techos por Área usuaria").<div class="atb-acts">' + irA('datos', 'Ir a Datos y respaldo →') + '</div>', chips: SUGERENCIAS.slice(0, 1)};
    if (f.area){
      const t = techoDe(f.area);
      if (!t) return {html: 'No encontré un techo registrado para <b>' + esc(f.area.name) + '</b> 🤔. Revisa que el nombre en la hoja TECHOS coincida con el de la base.', chips: ['¿Qué áreas exceden su techo?']};
      const p = t.techo ? t.monto / t.techo : 0, tn = tono(p);
      let html = titulo(t.saldo < -0.005 ? '⚠️' : '🧮', 'Techo de ' + esc(nomT(t)) + ' <span>' + (t.isO ? 'Órgano' : 'Unidad orgánica') + ' · al ' + fecha() + '</span>') +
        '<div class="atb-kpis">' + kpi('Techo mensual', fmtM(t.techo)) + kpi('Monto actual', fmtM(t.monto)) + kpi(t.saldo < -0.005 ? 'Exceso' : 'Saldo', fmtM(Math.abs(t.saldo)), 'k-' + tn) + '</div>' +
        barra(p, tn) + dl([['Usado del techo', pc(t.monto, t.techo)], ['Locadores', fmtN(t.n)], ['Estado', t.estado]]);
      if (hipo){
        const ok = t.saldo + 0.005 >= hipo;
        html += '<div class="atb-glosa" style="margin-top:9px">' + (ok ? '✅ Sí alcanza: un locador de <b>' + fmtS0(hipo) + '</b> deja un saldo de <b>' + fmtS0(t.saldo - hipo) + '</b>.' : '⛔ No alcanza: con un locador de <b>' + fmtS0(hipo) + '</b> el área quedaría <b>' + fmtS0(hipo - t.saldo) + '</b> por encima de su techo.') + '</div>';
      }
      const rows = DB.data.filter(esAct).filter(r => t.isO ? norm(r.organo) === t.k : norm(r.organo) + '|' + norm(r.uo) === t.k);
      html += '<div class="atb-acts">' + verBase(rows, 'Techo: ' + nomT(t)) + '</div>';
      return {html, chips: ['Resumen de ' + nomT(t), nomT(t) + ' honorarios más altos', '¿Qué áreas exceden su techo?']};
    }
    const X = A.filter(a => a.estado === 'Excede').sort((a, b) => a.saldo - b.saldo);
    const C = A.filter(a => a.estado !== 'Excede' && a.techo && a.monto / a.techo >= 0.9).sort((a, b) => b.monto / b.techo - a.monto / a.techo);
    let html;
    if (X.length){
      const mx = Math.max(...X.map(a => -a.saldo), 1);
      html = titulo('⚠️', X.length + (X.length === 1 ? ' área excede' : ' áreas exceden') + ' su techo <span>de ' + A.length + ' con techo registrado · al ' + fecha() + '</span>') +
        '<div class="atb-rows">' + X.slice(0, 8).map(a => fila(nomT(a), '+' + fmtS0(-a.saldo), -a.saldo / mx, 'r', 'monto ' + fmtS0(a.monto) + ' · techo ' + fmtS0(a.techo) + ' · ' + pc(a.monto, a.techo) + ' · ' + fmtN(a.n) + ' loc.')).join('') + '</div>' +
        nota('Barra: exceso relativo al mayor.' + (X.length > 8 ? ' Se muestran 8 de ' + X.length + '.' : ''));
    } else html = titulo('✅', 'Ninguna área excede su techo <span>' + A.length + ' áreas con techo · al ' + fecha() + '</span>');
    if (C.length) html += '<p style="margin:10px 0 4px"><b>Cerca del límite</b> (90 % o más):</p><div class="atb-rows">' + C.slice(0, 5).map(a => fila(nomT(a), pc(a.monto, a.techo), a.monto / a.techo, 'a', 'saldo ' + fmtS0(a.saldo) + ' · ' + fmtN(a.n) + ' loc.')).join('') + '</div>';
    const ok = A.filter(a => a.estado !== 'Excede').length;
    html += dl([['Áreas dentro del techo', fmtN(ok) + ' de ' + fmtN(A.length)], ['Techo total registrado', fmtS(A.reduce((s, a) => s + a.techo, 0))]]) +
      '<div class="atb-acts">' + irA('consol', 'Ver techos en Consolidados →') + '</div>';
    const top = X[0] || C[0];
    return {html, chips: top ? ['Techo de ' + nomT(top), 'Resumen de ' + nomT(top)] : SUGERENCIAS.slice(0, 2)};
  }

  function rPersona(rows, titulo0){
    if (rows.length === 1){
      const r = rows[0], v = varEst(r);
      const vc = r.montoAnt && r.montoAct != null ? (r.montoAct > r.montoAnt ? 'k-v' : r.montoAct < r.montoAnt ? 'k-r' : '') : '';
      return {
        html: titulo('👤', esc(r.nombre || '(sin nombre)') + ' <span>' + (r.dni ? 'DNI ' + esc(r.dni) : 'Sin DNI') + '</span>') +
          '<div class="atb-kpis">' + kpi('Monto actual', fmtS0(r.montoAct)) + kpi('Monto anterior', fmtS0(r.montoAnt)) + kpi('Variación', r.montoAnt && r.montoAct != null ? fmtP(r.montoAct / r.montoAnt - 1) : v, vc) + '</div>' +
          dl([['Órgano', esc(r.organo)], ['Unidad orgánica', esc(r.uo)], ['Tipo', tipoN(r)], ['Nivel / cargo', nivel(r)], ['Grado académico', esc(gradoN(r))],
            ['Certificado', certN(r)], ['N° de entregables', esc(r.entregables)], r.reemplazo && r.reemplazo.trim() ? ['Reemplazo', esc(r.reemplazo)] : null,
            r.excepcion && r.excepcion.trim() ? ['Excepción', esc(r.excepcion)] : null, r._upd ? ['Última actualización', esc(r._upd) + (r._by ? ' · ' + esc(r._by) : '')] : null]) +
          (r.descripcion ? '<div class="atb-glosa" style="margin-top:8px"><b>Servicio:</b> ' + esc(String(r.descripcion).slice(0, 320)) + (String(r.descripcion).length > 320 ? '…' : '') + '</div>' : '') +
          (r.obs ? '<div class="atb-glosa" style="margin-top:6px"><b>Observación:</b> ' + esc(r.obs) + '</div>' : '') +
          '<div class="atb-acts">' + accion('Abrir ficha completa →', () => { const x = byId(r._id); if (x) openFicha(x); }) + '</div>',
        chips: ['Cambios de ' + (r.dni || r.nombre), r.uo ? 'Resumen de ' + r.uo : 'Resumen de la base'].filter(Boolean)
      };
    }
    const vis = rows.slice(0, 12), mx = Math.max(...vis.map(r => r.montoAct || 0), 1);
    return {
      html: titulo('🔎', (titulo0 || 'Encontré ' + rows.length + ' coincidencias') + ' <span>toca un nombre para abrir su ficha</span>') +
        '<div class="atb-rows">' + vis.map(r => fila(r.nombre || '(sin nombre)', fmtS0(r.montoAct), (r.montoAct || 0) / mx, 'n', esc([r.dni ? 'DNI ' + r.dni : '', r.uo || r.organo].filter(Boolean).join(' · ')), ficha(r))).join('') + '</div>' +
        (rows.length > vis.length ? nota('Se muestran ' + vis.length + ' de ' + rows.length + '. Escribe el nombre más completo o el DNI.') : ''),
      chips: vis.slice(0, 2).map(r => r.dni ? 'DNI ' + r.dni : r.nombre)
    };
  }

  const NO_NOMBRE = new Set(('CUANTO CUANTOS CUANTA CUANTAS GANA GANAN COBRA COBRAN PERCIBE DATOS DATO INFORMACION INFO FICHA QUIEN QUIENES ES SON BUSCA BUSCAR BUSCAME ENCUENTRA UBICA ' +
    'LOCADOR LOCADORES LOCADORA MONTO MONTOS HONORARIO HONORARIOS SUELDO MENSUAL ACTUAL ANTERIOR DNI TRABAJA TRABAJAN AREA AREAS UNIDAD UNIDADES ORGANO ORGANOS ORGANICA DONDE EN QUE CUAL ' +
    'CUALES SU SUS EL UN UNA AL A CON SIN POR PARA COMO TIENE TIENEN HAY ME DAME MUESTRA MUESTRAME VER LISTA LISTADO SOBRE TODO TODOS ESTA ESTE MES HOY AYER CAMBIOS CAMBIO HISTORIAL MODIFICO ' +
    'MODIFICARON QUIERO SABER DIME RESUMEN TOTAL TECHO TECHOS TIPO GRADO NIVEL CERTIFICADO GERENCIA SUBGERENCIA OFICINA PERSONA SENOR SENORA SR SRA LIC ING ABOG MAS MENOS ALTO ALTOS BAJO BAJOS ' +
    'CAMPO ADMINISTRATIVO MIXTO PROMEDIO NOMBRE NOMBRES APELLIDO REGISTRO REGISTRADO BASE EXISTE ESTA CONTRATADO CONTRATADA PAGA PAGAN SERVICIO').split(' '));
  function porNombre(qt, usados, forzar){
    const q = qt.filter(t => !usados.has(t) && !NO_NOMBRE.has(t) && t.length >= 2);
    if (!q.length) return [];
    let best = 0; const res = [];
    for (const r of DB.data){
      const c = cx(r); if (!c.tk.length) continue;
      const m = tokM(q, c.tk);
      if (m > 0) res.push({r, m});
      if (m > best) best = m;
    }
    const need = q.length >= 2 ? 1.6 : (forzar ? 1 : 99);
    if (best < need) return [];
    if (q.length === 1){ const ex = res.filter(x => cx(x.r).tk.includes(q[0])); return ex.length && ex.length <= 40 ? ex.map(x => x.r) : []; }
    return res.filter(x => x.m >= best - 0.05).sort((a, b) => cx(a.r).tk.length - cx(b.r).tk.length || String(a.r.nombre).localeCompare(String(b.r.nombre))).map(x => x.r);
  }
  function porDni(L){
    const m = L.match(/\b(\d{7,8})\b/); if (!m) return null;
    const k = dniKey(m[1]);
    return {dni: m[1], rows: DB.data.filter(r => cx(r).dk === k)};
  }

  function rHistorial(ids, L, etq){
    let H = DB.hist.filter(h => h.type !== 'techos' || !ids);
    if (ids) H = H.filter(h => ids.has(h.id));
    const hoy = today();
    const ayer = (() => { const d = new Date(Date.now() - 864e5); return d.toLocaleDateString('es-PE', {day: '2-digit', month: '2-digit', year: 'numeric'}); })();
    let cuando = '';
    if (/\bhoy\b/.test(L)){ H = H.filter(h => String(h.ts).startsWith(hoy)); cuando = ' de hoy'; }
    else if (/\bayer\b/.test(L)){ H = H.filter(h => String(h.ts).startsWith(ayer)); cuando = ' de ayer'; }
    const grupos = []; const gm = new Map();
    H.forEach(h => { if (!gm.has(h.g)){ gm.set(h.g, []); grupos.push(gm.get(h.g)); } gm.get(h.g).push(h); });
    if (!grupos.length) return {html: 'No hay cambios registrados' + cuando + (etq ? ' para <b>' + esc(etq) + '</b>' : '') + ' 📭.', chips: ['Últimos cambios', 'Resumen de la base']};
    const corto = v => { const s = String(v == null ? '' : v); return esc(s.length > 40 ? s.slice(0, 40) + '…' : s) || '(vacío)'; };
    const item = g => {
      const h = g[0], tipo = HT[h.type] || h.type;
      let det;
      if (h.type === 'edit' || h.type === 'bulk' || h.type === 'fix' || h.type === 'undo'){
        const fs = g.filter(x => x.f && x.f !== '_registro');
        const per = new Set(g.map(x => x.id)).size;
        det = (per > 1 ? fmtN(per) + ' registros · ' : esc(h.nombre || '') + ' · ') + fs.slice(0, 2).map(x => esc(lbl(x.f)) + ': ' + corto(x.from) + ' → ' + corto(x.to)).join('; ') + (fs.length > 2 ? ' (+' + (fs.length - 2) + ')' : '');
      } else if (h.type === 'add') det = esc(g.length > 1 ? fmtN(g.length) + ' registros' : h.nombre || '');
      else if (h.type === 'delete') det = esc(g.length > 1 ? fmtN(g.length) + ' registros' : h.nombre || '');
      else det = esc(h.nombre || '') + (h.to ? ' · ' + corto(h.to) : '');
      const cls = h.type === 'delete' ? 'r' : h.type === 'add' || h.type === 'import' ? 'v' : 'a';
      return '<div class="atb-pz ' + cls + '"><b>' + esc(tipo) + '</b><span class="atb-pz-d">' + esc(String(h.ts).slice(0, 16)) + '</span><span class="atb-pz-t">' + det + (h.reason ? ' <i>— ' + esc(h.reason) + '</i>' : '') + '<br><small class="atb-nota" style="margin:0">' + esc(h.user || '') + '</small></span></div>';
    };
    return {
      html: titulo('🕘', 'Últimos cambios' + cuando + (etq ? ' de ' + esc(etq) : '') + ' <span>' + fmtN(grupos.length) + ' operaciones registradas</span>') +
        '<div class="atb-pzs">' + grupos.slice(0, 8).map(item).join('') + '</div>' +
        (grupos.length > 8 ? nota('Se muestran las 8 más recientes.') : '') +
        '<div class="atb-acts">' + irA('hist', 'Ver historial completo →') + '</div>',
      chips: cuando ? ['Últimos cambios'] : ['Cambios de hoy', 'Problemas de calidad de datos']
    };
  }

  function rCalidad(L){
    const Q = qualityChecks().map(q => ({...q, c: q.cnt != null ? q.cnt : q.items.length})).filter(q => q.c > 0);
    const esp = [['sindni', /\bsin dni\b/], ['dnilen', /\bdni (incorrect|mal|con longitud|de 7|incomplet)/], ['dnidup', /\bdni duplicad|\bduplicad.*\bdni\b/], ['nomdup', /\bnombres? duplicad|\bduplicad.*\bnombre/], ['sinmonto', /\bsin monto\b/], ['techo', /\bexced/]]
      .map(([id, re]) => re.test(L) ? Q.find(q => q.id === id) || {id, c: 0} : null).find(Boolean);
    if (esp){
      if (!esp.c) return {html: '✅ No hay registros con ese problema.', chips: ['Problemas de calidad de datos']};
      if (esp.id !== 'techo' && esp.items && esp.items.length) return rPersona(esp.items, esp.t + ': ' + fmtN(esp.c));
    }
    if (!Q.length) return {html: titulo('✅', 'La base no tiene problemas de calidad detectados'), chips: SUGERENCIAS};
    const mx = Math.max(...Q.map(q => q.c), 1);
    const cls = s => s === 'bad' ? 'r' : s === 'warn' ? 'a' : 'b';
    return {
      html: titulo('🧹', 'Calidad de datos <span>' + Q.filter(q => q.sev !== 'info').length + ' revisiones con observaciones</span>') +
        '<div class="atb-rows">' + Q.slice(0, 10).map(q => fila(q.t, fmtN(q.c), q.c / mx, cls(q.sev), '', (function(){ const id = 'x' + (++nAcc); ACC.set(id, () => go('calidad')); return ' data-acc="' + id + '" role="button" tabindex="0"'; })())).join('') + '</div>' +
        nota('Rojo: corregir · Ámbar: revisar.') + '<div class="atb-acts">' + irA('calidad', 'Ir a Calidad de datos →') + '</div>',
      chips: (function(){ const c = ['Locadores sin DNI', 'DNI duplicados', 'Nombres duplicados'].filter(c => Q.some(q => ({'Locadores sin DNI': 'sindni', 'DNI duplicados': 'dnidup', 'Nombres duplicados': 'nomdup'})[c] === q.id)); return c.length ? c : ['¿Qué áreas exceden su techo?', 'Últimos cambios']; })()
    };
  }

  const GUIA = [
    {k: /\b(nuevo locador|agregar|anadir|registrar|alta|incorporar)\b/, r: 'Para registrar un locador ve a <b>Base de datos → Nuevo locador</b>, completa la ficha y guarda. El cambio se guarda en Google Sheets con tu correo y queda en el Historial.'},
    {k: /\b(editar|modificar|corregir|actualizar (un|el|los|datos)|cambiar (el|un|los) )/, r: 'Para editar, abre la <b>Base de datos</b>, toca el nombre del locador para abrir su ficha, cambia los campos y guarda. Para varios a la vez, márcalos y usa <b>Edición masiva</b>.'},
    {k: /\b(eliminar|borrar|dar de baja|quitar un)\b/, r: 'Para dar de baja: selecciona los registros en la <b>Base de datos</b> y pulsa <b>Eliminar</b>. Se guarda una copia en la hoja <b>BAJAS</b> y el movimiento queda en el Historial.'},
    {k: /\b(cruce|cruzar|comparar con (un )?excel|otro excel)\b/, r: 'En <b>Cruce con Excel</b> subes un archivo (o pegas una lista) y la app lo compara con la base por DNI y por nombre, aun con errores de tipeo; luego puedes exportar el resultado.'},
    {k: /\b(resumen locadores|formato de techos|resumen en excel)\b/, r: 'El botón <b>Resumen locadores</b> (en Base de datos o Consolidados) descarga el Excel con el formato del archivo de techos por área usuaria.'},
    {k: /\b(cargar techos|subir techos|actualizar techos)\b/, r: 'Los techos se cargan en <b>Datos y respaldo → Cargar techos desde Excel</b>, con el archivo "Techos por Área usuaria".'},
    {k: /\b(exportar|descargar|excel)\b/, r: 'En <b>Base de datos</b> usa <b>Exportar vista</b> (lo que tengas filtrado) o <b>Resumen locadores</b>; en <b>Consolidados</b>, <b>Exportar consolidado</b>.'},
    {k: /\b(imprimir|pdf)\b/, r: 'Usa <b>Imprimir vista</b> en la Base de datos o <b>Imprimir</b> en Consolidados; sale en A4 horizontal.'},
    {k: /\b(version|versiones|mes anterior)\b/, r: 'En <b>Comparar versiones</b> subes otra versión de la base (por ejemplo, la del mes anterior) y ves altas, bajas y cambios campo por campo.'},
    {k: /\b(secciones|menu|que tiene|partes)\b/, r: 'El gestor tiene: <b>Panel general</b>, <b>Base de datos</b>, <b>Cruce con Excel</b>, <b>Consolidados</b>, <b>Comparar versiones</b>, <b>Calidad de datos</b>, <b>Historial de cambios</b> y <b>Datos y respaldo</b>.'}
  ];

  function ayuda(){
    return {html: 'Soy el asistente de la base de locadores 🤖. Respondo con los mismos datos del gestor (sin inteligencia artificial):' + lista([
      'Cantidad y monto mensual por órgano, unidad, tipo, nivel o grado',
      'Techos por área usuaria: saldo, excesos y si alcanza para un nuevo locador',
      'Buscar a un locador por nombre (en cualquier orden) o DNI',
      'Honorarios más altos o más bajos, rangos de monto y variaciones',
      'Últimos cambios, problemas de calidad de datos y cómo usar el gestor']) + '¿Por dónde empezamos?', chips: SUGERENCIAS};
  }

  /* ---------- intención ---------- */
  let CTX = null;
  const DIMRE = [['organo', /^(organos?|gerencias?)$/], ['uo', /^(unidad(es)?( organicas?)?|areas?( usuarias?)?|uo|oficinas?)$/], ['tipo', /^tipos?$/], ['grado', /^(grados?( academicos?)?|formacion)$/], ['nivel', /^(nivel(es)?|cargos?)$/], ['rango', /^rangos?( de monto)?$/], ['cert', /^(certificados?|certificacion)$/], ['var', /^variacion(es)?$/]];
  const dimDe = s => { const m = s.match(/\b(?:por|cada|segun|desglose (?:de|por)|distribucion (?:de|por))\s+(?:el |la |los |las |su |sus )?(organos?|gerencias?|unidad(?:es)?(?: organicas?)?|areas?(?: usuarias?)?|uo|oficinas?|tipos?|grados?(?: academicos?)?|formacion|nivel(?:es)?|cargos?|rangos?(?: de monto)?|certificados?|certificacion|variacion(?:es)?)\b/); if (!m) return null; const h = DIMRE.find(([, re]) => re.test(m[1])); return h ? h[0] : null; };

  function responder(texto){
    const orig = String(texto || '').trim();
    if (!orig) return {html: 'Escribe tu pregunta o elige una opción 👇', chips: SUGERENCIAS};
    if (!DB.data.length) return {html: 'La base todavía no tiene registros 📭. Cárgala primero desde el Panel general.', chips: []};
    const P = parse(orig); const {L, RL} = P; let f = P.f;
    const pal = L.split(' ').length;
    if (/^(hola|buen[oa]s( dias| tardes| noches)?|hey|saludos|que tal)\b/.test(L) && pal <= 4)
      return {html: '¡Hola! 👋 Puedo darte cifras de la base de locadores al <b>' + fecha() + '</b> (por órgano, unidad, tipo o nivel), revisar techos y buscar a cualquier locador por nombre o DNI. ¿Qué necesitas?', chips: SUGERENCIAS};
    if (/^(gracias|muchas gracias|ok|listo|perfecto|genial|chevere|excelente)\b/.test(L) && pal <= 4) return {html: '¡Con gusto! 😊 ¿Te ayudo con algo más?', chips: SUGERENCIAS};
    if (/\b(quien eres|que eres|que puedes hacer|que sabes|que haces|ayuda|ayudame)\b/.test(L) && pal <= 6 && !hayFiltro(f)) return ayuda();
    if (/^buscar un locador$/.test(L)) return {html: 'Escribe el <b>nombre</b> (en cualquier orden, por ejemplo <i>"Quispe Rosa"</i>) o el <b>DNI</b> del locador 🔎.', chips: []};

    /* seguimiento: "¿y en la GAF?", "¿y cuánto suman?", "de esos, ¿cuántos son de campo?" */
    const sigue = CTX && (/^(y|e|tambien|ahora|ok y|y para|y en|y de|y los|y las|y el|y la|y solo)\b/.test(L) || /\b(de esos|de ellos|de ellas|de estos|de estas|entre ellos|de ese grupo)\b/.test(L));
    if (sigue){ const nf = Object.assign({}, CTX.f, f); if (P.f.area) nf.area = P.f.area; f = nf; }

    /* uso del gestor */
    if (/\b(como|donde|para que sirve|boton|guia|tutorial)\b/.test(L) && !/\b(como (va|van|esta|estan))\b/.test(L)){
      const g = GUIA.find(x => x.k.test(L));
      if (g) return {html: '💡 ' + g.r + '<br>¿Te ayudo con algo más?', chips: SUGERENCIAS.slice(0, 3)};
    }

    /* DNI */
    const dn = porDni(L);
    const pideHist = /\b(historial|cambios?|modificaci|modifico|modificaron|edito|editaron|editado|ultimas? (actualizaciones|modificaciones|altas|bajas)|movimientos?|quien (cambio|actualizo|modifico|elimino|dio de baja)|dados? de baja|eliminad)/.test(RL);
    if (dn){
      if (!dn.rows.length) return {html: 'No encontré el DNI <b>' + esc(dn.dni) + '</b> en la base 🤔. Revisa los dígitos o búscalo por nombre.', chips: ['Locadores sin DNI']};
      CTX = null;
      return pideHist ? rHistorial(new Set(dn.rows.map(r => r._id)), L, dn.rows[0].nombre) : rPersona(dn.rows);
    }

    const usados = new Set(P.am ? P.am.used : []);
    if (pideHist){
      const nm = porNombre(P.qt, usados, false);
      return rHistorial(nm.length ? new Set(nm.map(r => r._id)) : null, L, nm.length === 1 ? nm[0].nombre : nm.length ? null : null);
    }
    if (/\b(calidad|duplicad|inconsistenc|errores|sin dni|sin monto|dni (incorrect|mal|incomplet)|problemas? (de|en) (la )?(base|datos))/.test(RL)) return rCalidad(L);

    const hipoM = L.match(/\b(?:contratar|incorporar|agregar|sumar|anadir|nuevo locador|alcanza|puedo)\b.*?s?\/?\.?\s*(\d[\d.,]*)\s*(mil)?/);
    const hipo = hipoM ? (num(hipoM[1].replace(/[.,]$/, '')) || 0) * (hipoM[2] ? 1000 : 1) : 0;
    if (/\b(techos?|tope|exced|sobrepas|saldos?|limites?|disponible|alcanza|margen)\b/.test(RL) || (hipo >= 300 && f.area)){
      CTX = {f, i: 'techo'}; return rTecho(f, hipo >= 300 ? hipo : 0);
    }

    const nTop = (() => { const m = L.match(/\b(?:top|los|las)\s*(\d{1,2})\b/) || L.match(/\b(\d{1,2})\s*(?:mayores|menores|primeros|locadores|honorarios|mas)\b/); return m ? Math.min(30, Math.max(1, +m[1])) : 10; })();
    if (/\b(mas alt|mejor pagad|ganan? mas|cobran? mas|mayores? (honorario|monto|sueldo|remuneraci|pago|ingreso)s?|honorarios? mas alt|maxim|top)/.test(RL) && f.min == null){ CTX = {f, i: 'top'}; return rTop(f, 1, nTop); }
    if (/\b(mas baj|peor pagad|menos pagad|ganan? menos|cobran? menos|menores? (honorario|monto|sueldo|remuneraci|pago)s?|honorarios? mas baj|minim)/.test(RL) && f.max == null){ CTX = {f, i: 'bottom'}; return rTop(f, -1, nTop); }

    let dim = dimDe(RL);
    const cualMas = RL.match(/\b(que|cual|cuales)\s+(organo|gerencia|unidad|area|oficina)s?\b.*\b(mas|mayor|menos|menor)\b/);
    if (cualMas){ dim = /organo|gerencia/.test(cualMas[2]) ? 'organo' : 'uo'; }
    if (dim){
      if (f.area && f.area.kind === 'uo' && (dim === 'uo' || dim === 'organo')) dim = 'tipo';
      if (f.area && f.area.kind === 'organo' && dim === 'organo') dim = 'uo';
      const orden = cualMas ? (/\b(monto|gasto|soles|dinero|pago|presupuesto|costo)/.test(RL) ? 'monto' : 'n') : (/\b(monto|gasto|soles|dinero|costo|presupuesto)\b/.test(RL) && /\b(mayor|mas|ordenad)/.test(RL) ? 'monto' : null);
      CTX = {f, i: 'dim', dim}; return rDesglose(f, dim, orden);
    }

    /* nombre de persona */
    const pidePersona = /\b(datos|informacion|ficha|quien es|busca|buscar|buscame|encuentra|ubica|gana|ganan|cobra|percibe|existe|esta registrad|trabaja)\b/.test(RL);
    const nm = porNombre(P.qt, usados, pidePersona);
    if (nm.length && !(f.area && !pidePersona && nm.length > 3)){ CTX = null; return rPersona(nm); }

    const pideLista = /\b(lista|listar|listado|quienes|cuales son|muestr|mostrar|dame los|nombres|relacion de|detalle de|enumera)\b/.test(RL);
    const pideProm = /\b(promedio|media)\b/.test(RL);
    const pideMonto = /\b(monto|montos|suma|suman|sumar|cuanto (se )?(paga|gasta|cuesta|invierte|es)|planilla|presupuesto|gasto|costo|importe|soles|dinero|honorarios)\b/.test(RL);
    const pideN = /\b(cuant[oa]s|numero|cantidad|hay|conteo|cuenta|contar)\b/.test(RL);
    const pideRes = /\b(resumen|total|general|situacion|estado|como (va|esta|estan|van))\b/.test(RL);
    if (pideLista){ CTX = {f, i: 'lista'}; return rLista(f); }
    if (pideProm){ CTX = {f, i: 'prom'}; return rResumen(f, 'prom'); }
    if (pideMonto || pideN || pideRes){ const foco = pideMonto ? 'monto' : pideN ? 'n' : null; CTX = {f, i: 'res', foco}; return rResumen(f, foco); }
    if (hayFiltro(f)){
      const i = sigue && CTX ? CTX.i : 'res';
      if (i === 'lista') return rLista(f);
      if (i === 'top' || i === 'bottom') return rTop(f, i === 'top' ? 1 : -1, nTop);
      if (i === 'techo') return rTecho(f, 0);
      if (i === 'dim') return rDesglose(f, CTX.dim, null);
      CTX = {f, i: 'res'}; return rResumen(f, i === 'prom' ? 'prom' : CTX && CTX.foco);
    }
    const g = GUIA.find(x => x.k.test(L));
    if (g) return {html: '💡 ' + g.r + '<br>¿Te ayudo con algo más?', chips: SUGERENCIAS.slice(0, 3)};
    const ej = areas().find(a => a.kind === 'organo');
    return {html: 'No entendí la consulta 🤔. Prueba, por ejemplo, con:' + lista(['"¿Cuántos locadores tiene la ' + esc(ej ? ej.name : 'Gerencia General') + '?"', '"¿Qué áreas exceden su techo?"', '"Locadores de campo con más de 5000"', '"Datos de Juan Pérez" o un DNI', '"Monto mensual por unidad orgánica"', '"Últimos cambios"']), chips: SUGERENCIAS};
  }
  return {responder, SUGERENCIAS, ACC, fecha};
}

(function(){
  const st = document.createElement('style');
  st.textContent = `.atb-toggle{position:fixed;right:22px;bottom:22px;z-index:9998;height:56px;padding:0 22px 0 14px;border-radius:999px;border:0;background:var(--navy,#16324F);color:#fff;cursor:pointer;box-shadow:0 8px 22px rgba(20,34,56,.30);display:flex;align-items:center;gap:10px;font:600 14.5px/1 var(--font,system-ui,sans-serif);transition:transform .15s,background .15s,box-shadow .15s}
.atb-toggle:hover{background:var(--navy2,#22476E);transform:translateY(-2px);box-shadow:0 10px 26px rgba(20,34,56,.34)}
.atb-toggle:focus-visible{outline:3px solid var(--teal,#12A08A);outline-offset:3px}
.atb-ico{width:42px;height:42px;display:flex;align-items:center;justify-content:center;flex:none;margin-left:-6px}
.atb-ico svg{width:42px;height:42px;display:block}
.atb-toggle .atb-x2{display:none}
.atb-toggle.abierto{padding:0;width:56px;justify-content:center}
.atb-toggle.abierto .atb-lbl,.atb-toggle.abierto .atb-ico{display:none}
.atb-toggle.abierto .atb-x2{display:block;width:22px;height:22px}
.atb-teaser{position:fixed;right:22px;bottom:90px;z-index:9998;max-width:250px;background:#fff;color:var(--ink,#142238);border:1px solid var(--line,#E2E8F0);border-radius:14px 14px 4px 14px;padding:11px 34px 11px 14px;box-shadow:0 8px 24px rgba(20,34,56,.18);font:14px/1.4 var(--font,system-ui,sans-serif);cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s;pointer-events:none}
.atb-teaser.ver{opacity:1;transform:none;pointer-events:auto}
.atb-teaser b{display:block;margin-bottom:2px}
.atb-teaser button{position:absolute;top:6px;right:6px;border:0;background:transparent;color:var(--muted,#5A6B82);font-size:17px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:6px}
.atb-teaser button:hover{background:var(--line2,#EEF2F7)}
.atb-panel{position:fixed;right:22px;bottom:90px;z-index:9999;width:390px;height:min(600px,calc(100vh - 116px));background:#fff;border-radius:16px;box-shadow:0 16px 44px rgba(20,34,56,.30);display:flex;flex-direction:column;overflow:hidden;font-family:var(--font,system-ui,sans-serif);font-size:14px;color:var(--ink,#142238);opacity:0;transform:translateY(12px) scale(.98);transform-origin:bottom right;pointer-events:none;visibility:hidden;transition:opacity .18s,transform .18s,visibility 0s .18s}
.atb-panel.abierto{opacity:1;transform:none;pointer-events:auto;visibility:visible;transition:opacity .18s,transform .18s}
.atb-head{background:linear-gradient(135deg,var(--navy,#16324F),var(--navy2,#22476E));color:#fff;padding:13px 12px 13px 14px;display:flex;align-items:center;gap:11px}
.atb-av{width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex:none}
.atb-av svg{width:44px;height:44px;display:block}
.atb-head b{display:block;font-size:15px}
.atb-head span{display:flex;align-items:center;gap:6px;font-size:12px;opacity:.85}
.atb-head span i{width:7px;height:7px;border-radius:50%;background:#5CE0C6;display:inline-block}
.atb-hb{margin-left:auto;display:flex;gap:2px}
.atb-hb button{background:transparent;border:0;color:#fff;cursor:pointer;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.atb-hb button:hover{background:rgba(255,255,255,.14)}
.atb-hb svg{width:18px;height:18px}
.atb-msgs{flex:1;overflow-y:auto;padding:14px 12px;background:var(--bg,#F2F5F9);display:flex;flex-direction:column;gap:9px}
.atb-m{max-width:90%;padding:10px 12px;border-radius:14px;line-height:1.45;word-wrap:break-word}
.atb-m.bot{align-self:flex-start;background:#fff;border:1px solid var(--line,#E2E8F0);border-bottom-left-radius:4px;width:90%}
.atb-m.yo{align-self:flex-end;background:var(--navy,#16324F);color:#fff;border-bottom-right-radius:4px;white-space:pre-wrap}
.atb-m ul{margin:6px 0;padding-left:18px}
.atb-m li{margin:2px 0}
.atb-m p{margin:6px 0}
.atb-tit{font-weight:650;margin-bottom:8px;line-height:1.35}
.atb-tit span{display:block;font-weight:400;font-size:12px;color:var(--muted,#5A6B82)}
.atb-q{margin:10px 0 0 !important;color:var(--ink,#142238)}
.atb-nota{display:block;margin-top:6px;color:var(--muted,#5A6B82);font-size:11.5px;line-height:1.35}
.atb-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}
.atb-kpi{background:var(--bg,#F2F5F9);border-radius:10px;padding:7px 8px;min-width:0}
.atb-kpi span{display:block;font-size:11px;color:var(--muted,#5A6B82);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.atb-kpi b{display:block;font-size:14.5px;font-weight:700;white-space:nowrap;letter-spacing:-.01em}
.atb-kpi.k-v{background:#E3F5F1}.atb-kpi.k-v b{color:#0B7A68}
.atb-kpi.k-a{background:#FDF1DE}.atb-kpi.k-a b{color:#A86A0C}
.atb-kpi.k-r{background:#FBE7E6}.atb-kpi.k-r b{color:#B23A36}
.atb-bar{display:block;height:7px;border-radius:999px;background:var(--line2,#EEF2F7);overflow:hidden}
.atb-bar i{display:block;height:100%;border-radius:999px}
.atb-bar i.v{background:#12A08A}.atb-bar i.a{background:#F2A93B}.atb-bar i.r{background:#D9534F}.atb-bar i.n{background:#16324F}.atb-bar i.b{background:#3A7BD5}.atb-bar i.p{background:#7A6FD0}
.atb-rows{display:flex;flex-direction:column;gap:9px;margin:4px 0}
.atb-row-h{display:flex;justify-content:space-between;gap:8px;margin-bottom:3px;font-size:13.5px}
.atb-row-h b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.atb-row-h span{font-weight:700;white-space:nowrap}
.atb-row-h span.v{color:#0B7A68}.atb-row-h span.a{color:#A86A0C}.atb-row-h span.r{color:#B23A36}.atb-row-h span.n{color:#16324F}.atb-row-h span.b{color:#2D63AE}.atb-row-h span.p{color:#5C51B4}
.atb-row small{display:block;margin-top:2px;color:var(--muted,#5A6B82);font-size:11.5px}
.atb-dl{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;margin-top:9px;font-size:12.5px}
.atb-dl span{color:var(--muted,#5A6B82);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.atb-dl b{text-align:right;font-weight:600;white-space:nowrap}
.atb-svg{display:block;width:100%;height:auto;margin:2px 0}
.atb-svg rect:hover{opacity:.8}
.atb-ley{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11.5px;color:var(--muted,#5A6B82);margin-top:5px}
.atb-ley i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.atb-ley .lv{background:#12A08A}.atb-ley .lc{background:#8FD3C6}.atb-ley .lp{background:#16324F;height:3px;vertical-align:2px;width:12px}.atb-ley .lr{background:#D9534F}
.atb-ley-r{margin-left:auto}
.atb-stack{display:flex;height:12px;border-radius:999px;background:var(--line2,#EEF2F7);overflow:hidden}
.atb-stack i{display:block;height:100%}
.atb-stack .s1{background:#12A08A}.atb-stack .s2{background:#8FD3C6}.atb-stack .s3{background:repeating-linear-gradient(45deg,#D9534F 0 4px,#E57F7B 4px 8px)}
.atb-chips{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:96%}
.atb-chip{border:1px solid var(--teal,#12A08A);color:#0B7A68;background:#fff;border-radius:999px;padding:5px 11px;font:500 12.5px/1.3 var(--font,system-ui,sans-serif);cursor:pointer;text-align:left}
.atb-chip:hover{background:#E3F5F1}
.atb-esc{align-self:flex-start;background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:14px;border-bottom-left-radius:4px;padding:11px 14px;display:flex;gap:4px}
.atb-esc i{width:6px;height:6px;border-radius:50%;background:#9AA8BA;animation:atbP 1s infinite ease-in-out}
.atb-esc i:nth-child(2){animation-delay:.15s}.atb-esc i:nth-child(3){animation-delay:.3s}
@keyframes atbP{0%,80%,100%{opacity:.35;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
.atb-bien{align-self:stretch;display:flex;flex-direction:column;gap:9px}
.atb-hola{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:14px;padding:10px 12px;line-height:1.4;display:flex;gap:10px;align-items:flex-start}
.atb-hola-r{flex:none;width:52px;height:52px}
.atb-hola-r svg{width:52px;height:52px;display:block}
.atb-hola b{font-size:15px}
.atb-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.atb-card{display:grid;grid-template-columns:28px 1fr;grid-template-rows:auto auto;column-gap:8px;row-gap:1px;align-items:center;text-align:left;background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:9px 10px;cursor:pointer;font:inherit;color:inherit;transition:border-color .15s,box-shadow .15s,transform .15s}
.atb-card:hover{border-color:var(--teal,#12A08A);box-shadow:0 4px 14px rgba(18,160,138,.14);transform:translateY(-1px)}
.atb-card:focus-visible{outline:2px solid var(--teal,#12A08A);outline-offset:2px}
.atb-card .ci{grid-row:1/3;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.atb-card .ci svg{width:16px;height:16px}
.atb-card b{font-size:13px;line-height:1.2}
.atb-card small{font-size:11px;color:var(--muted,#5A6B82);line-height:1.25}
.ci.c7{background:#E8F1EC;color:#2F7A52}.ci.c8{background:#FBE7E6;color:#B23A36}
.atb-alerta{background:#FFF8EC;border:1px solid #F4D9A6;border-radius:12px;padding:9px 11px}
.atb-alerta>b{display:flex;align-items:center;gap:6px;font-size:13px;color:#8A5A0B;margin-bottom:5px}
.atb-alerta button{all:unset;cursor:pointer;color:#0B7A68;font-size:12px;font-weight:600;margin-top:4px}
.atb-pzs{display:flex;flex-direction:column;gap:6px}
.atb-pz{display:grid;grid-template-columns:auto 1fr;column-gap:8px;row-gap:1px;padding:7px 9px;border-radius:9px;background:var(--bg,#F2F5F9);border-left:4px solid #12A08A;font-size:12.5px;line-height:1.35}
.atb-pz.a{border-left-color:#F2A93B}.atb-pz.r{border-left-color:#D9534F;background:#FDF0EF}.atb-pz.g{border-left-color:#CBD5E1;opacity:.7}
.atb-pz-d{font-weight:700;text-align:right}.atb-pz.r .atb-pz-d{color:#B23A36}.atb-pz.a .atb-pz-d{color:#A86A0C}.atb-pz.v .atb-pz-d{color:#0B7A68}
.atb-pz-t{grid-column:1/3;color:var(--ink,#142238)}
.atb-alerta .atb-pz{background:#fff}
.atb-glosa{background:var(--bg,#F2F5F9);border-radius:8px;padding:7px 9px;font-size:12.5px;line-height:1.4}
.atb-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#D9534F;color:#fff;font:700 11.5px/20px var(--font,system-ui,sans-serif);text-align:center;box-shadow:0 0 0 2px #fff}
.atb-toggle.abierto .atb-badge{display:none}
.ci.c1{background:#E3EAF3;color:#16324F}.ci.c2{background:#FBE7E6;color:#B23A36}.ci.c3{background:#E3F5F1;color:#0B7A68}.ci.c4{background:#ECEAFA;color:#5C51B4}.ci.c5{background:#E4EEFB;color:#2D63AE}.ci.c6{background:#FDF1DE;color:#A86A0C}
.atb-form{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line,#E2E8F0);background:#fff}
.atb-in{flex:1;min-width:0;border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:10px 12px;font:inherit;outline:none;background:var(--bg,#F2F5F9)}
.atb-in:focus{border-color:var(--navy2,#22476E);background:#fff}
.atb-send{border:0;background:var(--teal,#12A08A);color:#fff;border-radius:12px;width:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}
.atb-send:hover{background:#0E8A76}
.atb-send svg{width:19px;height:19px}
.atb-pie{font-size:11px;color:var(--muted,#5A6B82);padding:0 12px 9px;background:#fff}
@media (max-width:560px){
  .atb-toggle{padding:0;width:56px;height:56px;justify-content:center;right:16px;bottom:16px}
  .atb-toggle .atb-lbl{display:none}
  .atb-ico{width:46px;height:46px;margin-left:0}
  .atb-ico svg{width:46px;height:46px}
  .atb-teaser{right:16px;bottom:82px}
  .atb-panel{right:8px;left:8px;width:auto;bottom:80px;height:calc(100vh - 92px)}
}
@media (prefers-reduced-motion:reduce){.atb-panel,.atb-teaser,.atb-toggle,.atb-card{transition:none}.atb-esc i{animation:none}}
@media print{.atb-toggle,.atb-panel,.atb-teaser{display:none !important}}
.atb-dl2{grid-template-columns:auto minmax(0,1fr)}
.atb-dl2 b{text-align:left;white-space:normal;word-break:break-word}
.atb-acts{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px}
.atb-lnk{all:unset;cursor:pointer;color:#0B7A68;font-size:12.5px;font-weight:600}
.atb-lnk:hover{text-decoration:underline}
.atb-click{cursor:pointer;border-radius:8px;padding:3px 4px;margin:-3px -4px}
.atb-click:hover{background:#F2F5F9}
.atb-click:hover .atb-row-h b{color:#0B7A68;text-decoration:underline}
.atb-m .atb-glosa i{color:var(--muted,#5A6B82)}
.atb-toggle{touch-action:none;cursor:grab}
.atb-head{cursor:move;touch-action:none;user-select:none}
.atb-head button{cursor:pointer}
body.atb-moviendo,body.atb-moviendo *{cursor:grabbing !important;user-select:none !important}
body.atb-moviendo .atb-panel,body.atb-moviendo .atb-teaser{transition:none !important}`;
  document.head.appendChild(st);
})();

(function(){
  var nRob = 0;
  var ROBOT = function(){ nRob++; return '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="' + 'atbRob' + nRob + '"><circle cx="33" cy="30" r="25.6"/></clipPath></defs><path d="M14.5 47.5 L7.5 60.5 L23.5 54" fill="#fff" stroke="#16324F" stroke-width="2.4" stroke-linejoin="round"/><circle cx="33" cy="30" r="26.8" fill="#fff" stroke="#16324F" stroke-width="2.4"/><g clip-path="url(#' + 'atbRob' + nRob + ')"><path d="M17 58c0-8 7-12.5 16-12.5S49 50 49 58v6H17z" fill="#fff" stroke="#16324F" stroke-width="2"/><path d="M28.5 46.2q4.5 4.6 9 0" fill="none" stroke="#16324F" stroke-width="1.8" stroke-linecap="round"/></g><line x1="23.5" y1="14" x2="21" y2="8.6" stroke="#16324F" stroke-width="1.8" stroke-linecap="round"/><line x1="42.5" y1="14" x2="45" y2="8.6" stroke="#16324F" stroke-width="1.8" stroke-linecap="round"/><circle cx="20.6" cy="7.6" r="2.4" fill="#5CC8B8" stroke="#16324F" stroke-width="1.4"/><circle cx="45.4" cy="7.6" r="2.4" fill="#5CC8B8" stroke="#16324F" stroke-width="1.4"/><rect x="18" y="12.5" width="30" height="30" rx="14" fill="#fff" stroke="#16324F" stroke-width="2.2"/><path d="M17.5 27a15.5 15.5 0 0 1 31 0" fill="none" stroke="#5CC8B8" stroke-width="3.2" stroke-linecap="round"/><path d="M17.5 27a15.5 15.5 0 0 1 31 0" fill="none" stroke="#16324F" stroke-width="1" stroke-linecap="round" opacity=".35"/><rect x="12.6" y="22.5" width="7.2" height="13" rx="3.2" fill="#5CC8B8" stroke="#16324F" stroke-width="1.8"/><rect x="46.2" y="22.5" width="7.2" height="13" rx="3.2" fill="#5CC8B8" stroke="#16324F" stroke-width="1.8"/><path d="M15.5 35.5q1.2 6.6 9.3 6.8" fill="none" stroke="#16324F" stroke-width="1.8" stroke-linecap="round"/><circle cx="26.2" cy="42.3" r="1.9" fill="#16324F"/><rect x="22" y="21.5" width="22" height="12.5" rx="6.25" fill="#16324F"/><path d="M33.3 22.4l-3.3 10.7M37.3 22.4l-3.3 10.7" stroke="#2B4F78" stroke-width="2.2"/><circle cx="28" cy="27" r="2.3" fill="none" stroke="#5CE0C6" stroke-width="1.5"/><circle cx="38" cy="27" r="2.3" fill="none" stroke="#5CE0C6" stroke-width="1.5"/><path d="M30.6 29.4h4.8a2.4 2.4 0 0 1-4.8 0z" fill="#fff"/></svg>'; };
  var SV = function(p){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var TARJETAS = [
    {c:'c1', t:'Resumen de la base', s:'Locadores y monto mensual', q:'Resumen de la base', i:SV('<circle cx="12" cy="12" r="9"/><path d="M12 12l4-3"/><path d="M12 7v1M7 12h1M16 12h1"/>')},
    {c:'c2', t:'Techos excedidos', s:'Áreas sobre su techo', q:'¿Qué áreas exceden su techo?', i:SV('<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>')},
    {c:'c3', t:'Por órgano', s:'Cantidad y monto', q:'Locadores por órgano', i:SV('<path d="M4 20h16"/><path d="M7 16V8M12 16v-4M17 16V5"/>')},
    {c:'c4', t:'Honorarios más altos', s:'Los 10 primeros', q:'Los 10 honorarios más altos', i:SV('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>')},
    {c:'c5', t:'Buscar un locador', s:'Por nombre o DNI', q:'Buscar un locador', i:SV('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>')},
    {c:'c7', t:'Últimos cambios', s:'Quién cambió qué', q:'Últimos cambios', i:SV('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>')},
    {c:'c8', t:'Calidad de datos', s:'DNI y duplicados', q:'Problemas de calidad de datos', i:SV('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>')},
    {c:'c6', t:'Cómo usar el gestor', s:'Secciones y botones', q:'¿Qué secciones tiene el gestor?', i:SV('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>')}
  ];
  function guardar(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }
  function leer(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  var ESC = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };

  function iniciar(){
    if (document.querySelector('.atb-toggle')) return;
    var A = crearAsistenteLoc();
    var X = techoAreas().filter(function(a){ return a.estado === 'Excede'; });
    var btn = document.createElement('button');
    btn.className = 'atb-toggle'; btn.type = 'button'; btn.title = 'Clic para abrir · arrastra para mover';
    btn.setAttribute('aria-label', 'Abrir asistente de locadores'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="atb-ico">' + ROBOT() + '</span><span class="atb-lbl">Pregúntale a la base</span>' +
      (X.length ? '<span class="atb-badge" aria-label="' + X.length + ' áreas exceden su techo">' + X.length + '</span>' : '') +
      '<svg class="atb-x2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var tz = document.createElement('div');
    tz.className = 'atb-teaser'; tz.setAttribute('role', 'status');
    var claveTz = X.length ? 'atbl_techo_' + X.length + '_' + new Date().toDateString() : 'atbl_teaser_visto';
    tz.innerHTML = X.length
      ? '<b>⚠️ ' + (X.length === 1 ? '1 área excede su techo' : X.length + ' áreas exceden su techo') + '</b>' + ESC(X[0].isO ? X[0].organo : X[0].uo) + (X.length > 1 ? ' <small>(+' + (X.length - 1) + ' más)</small>' : '') + '<button type="button" aria-label="Ocultar mensaje">×</button>'
      : '<b>👋 ¿Buscas a un locador?</b>Pregúntame por nombre, DNI, área, techo o montos.<button type="button" aria-label="Ocultar mensaje">×</button>';
    var p = document.createElement('div');
    p.className = 'atb-panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Asistente de locadores');
    p.innerHTML = '<div class="atb-head" title="Arrastra para mover · doble clic para volver a su lugar"><div class="atb-av">' + ROBOT() + '</div><div><b>Asistente de locadores</b><span><i></i><em class="atb-fec" style="font-style:normal"></em></span></div>' +
      '<div class="atb-hb"><button class="atb-home" type="button" title="Inicio" aria-label="Volver al inicio">' + SV('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>') + '</button>' +
      '<button class="atb-x" type="button" title="Cerrar" aria-label="Cerrar">' + SV('<path d="M6 6l12 12M18 6L6 18"/>') + '</button></div></div>' +
      '<div class="atb-msgs" aria-live="polite"></div>' +
      '<form class="atb-form"><input class="atb-in" type="text" placeholder="Escribe tu pregunta…" aria-label="Tu pregunta" autocomplete="off"><button class="atb-send" type="submit" aria-label="Enviar">' + SV('<path d="M5 12h14M13 6l6 6-6 6"/>') + '</button></form>' +
      '<div class="atb-pie">Calculado con la base de locadores en Google Sheets (sin los filtros aplicados).</div>';
    document.body.appendChild(tz); document.body.appendChild(btn); document.body.appendChild(p);
    var msgs = p.querySelector('.atb-msgs'), inp = p.querySelector('.atb-in'), iniciado = false;
    function fec(){ p.querySelector('.atb-fec').textContent = fmtN(DB.data.filter(esAct).length) + ' locadores activos · ' + (LAST_SYNC || A.fecha()); }
    fec();

    function abajo(){ msgs.scrollTop = msgs.scrollHeight; }
    function quitarChips(){ msgs.querySelectorAll('.atb-chips').forEach(function(c){ c.remove(); }); }
    function alertaTechos(){
      var Y = techoAreas().filter(function(a){ return a.estado === 'Excede'; }).sort(function(a, b){ return a.saldo - b.saldo; });
      if (!Y.length) return '';
      return '<div class="atb-alerta"><b>⚠️ Áreas que exceden su techo</b><div class="atb-pzs">' + Y.slice(0, 3).map(function(a){
        return '<div class="atb-pz r"><b>' + ESC(a.isO ? 'Órgano' : 'Unidad') + '</b><span class="atb-pz-d">+' + fmtS0(-a.saldo) + '</span><span class="atb-pz-t">' + ESC(a.isO ? a.organo : a.uo) + '</span></div>';
      }).join('') + '</div><button type="button" class="atb-vertc">Ver todos los techos →</button></div>';
    }
    function bienvenida(){
      quitarChips(); fec();
      var w = document.createElement('div'); w.className = 'atb-bien';
      w.innerHTML = '<div class="atb-hola"><span class="atb-hola-r">' + ROBOT() + '</span><div><b>¡Hola! 👋</b> Te doy cifras de la base de locadores y te ayudo a usar el gestor. Elige una opción o escribe, por ejemplo, <i>"¿Cuántos locadores de campo hay?"</i> o un <i>DNI</i></div></div>' + alertaTechos() +
        '<div class="atb-grid">' + TARJETAS.map(function(c, i){ return '<button type="button" class="atb-card" data-i="' + i + '"><span class="ci ' + c.c + '">' + c.i + '</span><b>' + c.t + '</b><small>' + c.s + '</small></button>'; }).join('') + '</div>';
      var vt = w.querySelector('.atb-vertc'); if (vt) vt.onclick = function(){ enviar('¿Qué áreas exceden su techo?'); };
      w.querySelectorAll('.atb-card').forEach(function(b){ b.onclick = function(){ enviar(TARJETAS[+b.getAttribute('data-i')].q); }; });
      msgs.appendChild(w); w.scrollIntoView({block: 'start'});
    }
    function bot(html, chips){
      var d = document.createElement('div'); d.className = 'atb-m bot'; d.innerHTML = html; msgs.appendChild(d);
      if (chips && chips.length){
        var c = document.createElement('div'); c.className = 'atb-chips';
        chips.forEach(function(t){ var b = document.createElement('button'); b.type = 'button'; b.className = 'atb-chip'; b.textContent = t; b.onclick = function(){ enviar(t); }; c.appendChild(b); });
        msgs.appendChild(c);
      }
      abajo();
    }
    function enviar(texto){
      texto = String(texto || '').trim(); if (!texto) return;
      quitarChips();
      var u = document.createElement('div'); u.className = 'atb-m yo'; u.textContent = texto; msgs.appendChild(u);
      var e = document.createElement('div'); e.className = 'atb-esc'; e.setAttribute('aria-label', 'Escribiendo'); e.innerHTML = '<i></i><i></i><i></i>'; msgs.appendChild(e); abajo();
      setTimeout(function(){
        e.remove();
        var r;
        try { r = A.responder(texto); } catch (err) { console.warn(err); r = {html: 'Tuve un problema al calcular esa respuesta 😕. ¿Puedes reformularla?', chips: A.SUGERENCIAS}; }
        bot(r.html, r.chips);
      }, 420);
    }
    function ocultarTeaser(){ tz.classList.remove('ver'); guardar(claveTz, '1'); }
    function abrir(){
      ocultarTeaser(); fec();
      p.classList.add('abierto'); btn.classList.add('abierto');
      btn.setAttribute('aria-label', 'Cerrar asistente de locadores'); btn.setAttribute('aria-expanded', 'true');
      if (!iniciado){ iniciado = true; bienvenida(); }
      ubicar();
      setTimeout(function(){ inp.focus(); }, 60);
    }
    function cerrar(sinFoco){
      p.classList.remove('abierto'); btn.classList.remove('abierto');
      btn.setAttribute('aria-label', 'Abrir asistente de locadores'); btn.setAttribute('aria-expanded', 'false'); if (!sinFoco) btn.focus();
    }
    /* acciones dentro de las respuestas: abrir ficha, ver en la base, ir a una sección */
    function ejecutar(el){
      var fn = A.ACC.get(el.getAttribute('data-acc')); if (!fn) return;
      cerrar(true); setTimeout(fn, 30);
    }
    msgs.addEventListener('click', function(ev){ var el = ev.target.closest('[data-acc]'); if (el) ejecutar(el); });
    msgs.addEventListener('keydown', function(ev){ if (ev.key === 'Enter'){ var el = ev.target.closest('[data-acc]'); if (el){ ev.preventDefault(); ejecutar(el); } } });
    /* ---------- mover con el mouse (botón y barra superior del chat) ---------- */
    var POS = (function(){ try { var o = JSON.parse(leer('atbl_pos') || 'null'); return o && isFinite(o.r) && isFinite(o.b) ? o : null; } catch (e) { return null; } })();
    function ubicar(){
      var vw = window.innerWidth, vh = window.innerHeight;
      if (!POS){ ['right','bottom','left','top'].forEach(function(k){ btn.style[k] = ''; p.style[k] = ''; tz.style[k] = ''; }); return; }
      var bw = btn.offsetWidth || 56, bh = btn.offsetHeight || 56;
      POS.r = Math.max(8, Math.min(vw - bw - 8, POS.r)); POS.b = Math.max(8, Math.min(vh - bh - 8, POS.b));
      btn.style.right = POS.r + 'px'; btn.style.bottom = POS.b + 'px';
      var bl = vw - POS.r - bw, bt = vh - POS.b - bh, br = vw - POS.r;
      function junto(el, w, h){
        var top = bt - 12 - h;
        if (top < 8) top = (bt + bh + 12 + h <= vh - 8) ? bt + bh + 12 : Math.max(8, vh - h - 8);
        var left = Math.max(8, Math.min(vw - w - 8, br - w));
        if (top < bt + bh && top + h > bt && left < br && left + w > bl){ left = bl - w - 12 >= 8 ? bl - w - 12 : Math.min(vw - w - 8, br + 12); }
        el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.left = left + 'px'; el.style.top = top + 'px';
      }
      if (vw > 560) junto(p, p.offsetWidth || 390, p.offsetHeight || Math.min(600, vh - 116));
      else ['right','bottom','left','top'].forEach(function(k){ p.style[k] = ''; });
      junto(tz, tz.offsetWidth || 250, tz.offsetHeight || 70);
    }
    var arrastrado = false;
    function arrastrable(el, esAsa){
      el.addEventListener('pointerdown', function(ev){
        if (ev.button !== 0 || !esAsa(ev)) return;
        var r0 = btn.getBoundingClientRect(), x0 = ev.clientX, y0 = ev.clientY, mov = false;
        var R = window.innerWidth - r0.right, B = window.innerHeight - r0.bottom;
        function mover(e){
          var dx = e.clientX - x0, dy = e.clientY - y0;
          if (!mov && Math.abs(dx) + Math.abs(dy) < 6) return;
          if (!mov){ mov = true; document.body.classList.add('atb-moviendo'); try { el.setPointerCapture(ev.pointerId); } catch (x) {} }
          POS = {r: R - dx, b: B - dy}; ubicar(); e.preventDefault();
        }
        function soltar(){
          document.removeEventListener('pointermove', mover); document.removeEventListener('pointerup', soltar); document.removeEventListener('pointercancel', soltar);
          document.body.classList.remove('atb-moviendo');
          if (mov){ arrastrado = true; setTimeout(function(){ arrastrado = false; }, 0); guardar('atbl_pos', JSON.stringify(POS)); }
        }
        document.addEventListener('pointermove', mover); document.addEventListener('pointerup', soltar); document.addEventListener('pointercancel', soltar);
      });
    }
    arrastrable(btn, function(){ return true; });
    var head = p.querySelector('.atb-head');
    arrastrable(head, function(ev){ return !ev.target.closest('button'); });
    head.addEventListener('dblclick', function(ev){ if (ev.target.closest('button')) return; POS = null; guardar('atbl_pos', ''); ubicar(); });
    btn.addEventListener('click', function(ev){ if (arrastrado){ ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
    window.addEventListener('resize', ubicar);
    ubicar();

    btn.onclick = function(){ p.classList.contains('abierto') ? cerrar() : abrir(); setTimeout(ubicar, 0); };
    p.querySelector('.atb-x').onclick = function(){ cerrar(); };
    p.querySelector('.atb-home').onclick = bienvenida;
    p.addEventListener('keydown', function(ev){ if (ev.key === 'Escape'){ ev.stopPropagation(); cerrar(); } });
    p.querySelector('.atb-form').addEventListener('submit', function(ev){ ev.preventDefault(); var t = inp.value; inp.value = ''; enviar(t); });
    tz.onclick = function(ev){ if (ev.target.tagName === 'BUTTON'){ ev.stopPropagation(); ocultarTeaser(); } else abrir(); };
    if (!leer(claveTz)){
      setTimeout(function(){ if (!p.classList.contains('abierto')){ tz.classList.add('ver'); ubicar(); } }, 1800);
      setTimeout(function(){ if (tz.classList.contains('ver')) ocultarTeaser(); }, 12000);
    }
    window.__asistente = {responder: A.responder};
  }
  /* se inicia cuando la base terminó de cargar */
  var t = setInterval(function(){ if (DB && DB.data && DB.data.length && !document.getElementById('busy')){ clearInterval(t); iniciar(); } }, 400);
})();
