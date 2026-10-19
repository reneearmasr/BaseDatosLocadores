/**
 * GESTOR DE LOCADORES – ATU
 * Repositorio central en Google Sheets + aplicación web (Apps Script).
 *
 * MULTIANUAL: cada año tiene sus propias hojas.
 *   BASE 2026, BASE 2027…     → un locador por fila (columna A = ID interno, no editar)
 *   TECHOS 2026, TECHOS 2027… → techo de monto mensual por órgano y unidad orgánica
 *   HISTORIAL                 → cada cambio de todos los años (columna AÑO)
 *   BAJAS                     → copia de los registros eliminados (columna AÑO)
 * Un año nuevo se crea desde la app copiando la base y los techos del año anterior.
 */

const KEYS = ['_id','n','organo','uo','nombre','reemplazo','certificado','entregables','descripcion','tipo','tipo2','dni',
  'montoAnt','montoAct','grado','detalle','excepcion','campo','operativo','mixto','administrativo','asistente',
  'especialista','coordinador','obs','_upd','_by'];
const HEADERS = ['ID (no editar)','N°','ORGANO','UNIDAD ORGANICA','NOMBRE COMPLETO DEL PROVEEDOR','REEMPLAZO (X)',
  'Certificado SI/NO','Nro. De entregables','DESCRIPCION DEL OBJETO DEL SERVICIO','TIPO (ADMINISTRATIVO, CAMPO O MIXTO)',
  'Tipo 2 (conteo)','DNI','MONTO MENSUAL (Anterior)','MONTO MENSUAL (actual)',
  'Doctorado / Maestria / Titulado / Bachiller / Técnico / Egresado / Est. Universitario / Sec. Completa','Detalle',
  'EXCEPCIÓN','CAMPO','OPERATIVO','MIXTO','ADMINISTRATIVO','ASISTENTE/ ANALISTA','ESPECIALISTA','COORDINADOR',
  'OBSERVACIÓN','ÚLTIMA ACTUALIZACIÓN','ACTUALIZADO POR'];
const H_HEAD = ['GRUPO','FECHA','USUARIO','ACCIÓN','ID','NOMBRE','DNI','CAMPO','VALOR ANTERIOR','VALOR NUEVO','MOTIVO','AÑO'];
const ANIO_INICIAL = 2026; // año de la base cargada al inicio (hojas BASE / TECHOS sin año)
const NUM_KEYS = ['montoAnt','montoAct'];
/* Columnas añadidas al final (después de ACTUALIZADO POR) para no mover los datos existentes:
   meses financiados (con certificado) y previsión presupuestal para los años siguientes */
const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC'];
const BASE_N = KEYS.length;
const EXTRA_KEYS = MESES.map(function (m, i) { return 'm' + ('0' + (i + 1)).slice(-2); }).concat(['prevision','prevNum','prevMonto','prevAnios']);
const EXTRA_HEADERS = MESES.map(function (m) { return 'FINANCIADO ' + m; }).concat(['PREVISIÓN PRESUPUESTAL','N° PREVISIÓN','MONTO PREVISTO','AÑOS DE LA PREVISIÓN']);
EXTRA_KEYS.forEach(function (k) { KEYS.push(k); });
EXTRA_HEADERS.forEach(function (h) { HEADERS.push(h); });
NUM_KEYS.push('prevMonto');
function colsNum_() { return NUM_KEYS.map(function (k) { return KEYS.indexOf(k) + 1; }); }
const T_HEAD = ['NIVEL','ÓRGANO','UNIDAD ORGÁNICA','TECHO MONTO MENSUAL'];
/* Techos iniciales (archivo "Techos por Área usuaria"). Se copian a la hoja TECHOS la primera vez. */
const TECHOS_INICIALES = []; // Los techos se cargan desde la app (Datos y respaldo → Cargar techos desde Excel)
const TZ = 'America/Lima';

/* ---------- Web app ---------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Gestor de Locadores · ATU')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* Menú dentro de la hoja */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Gestor de Locadores')
    .addItem('Preparar hojas del repositorio', 'prepararRepositorio')
    .addItem('Renumerar N° de orden del último año', 'renumerarDesdeMenu')
    .addToUi();
}
function prepararRepositorio() { setup_(); }
function renumerarDesdeMenu() {
  var y = anio_();
  var o = JSON.parse(renumerar(Session.getEffectiveUser().getEmail(), y));
  SpreadsheetApp.getActiveSpreadsheet().toast('Año ' + y + ': se numeraron ' + o.total + ' registros del 1 al ' + o.total + '.', 'Gestor de Locadores');
}

/* Si alguien edita a mano una hoja BASE o TECHOS, la app de los demás se entera y se recarga */
function onEdit(e) {
  try {
    var n = e && e.range && e.range.getSheet().getName();
    if (n && (n.indexOf('BASE') === 0 || n.indexOf('TECHOS') === 0)) {
      PropertiesService.getDocumentProperties().setProperty('ver', 'manual|' + Date.now());
    }
  } catch (err) {}
}

/* ---------- Utilidades ---------- */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById('1x0Drh819dfaFWmyN-b0W8dT2S1XHmoC6c004bbfJoMM'); }
function props_() { return PropertiesService.getDocumentProperties(); }
/* Usuario real que usa la app. Si Google no lo revela (implementación "Ejecutar como: Yo"),
   se usa el correo que la persona escribió en la app, marcado como "sin verificar".
   Nunca se atribuye el cambio al propietario de la hoja por defecto. */
function activo_() { try { return Session.getActiveUser().getEmail() || ''; } catch (x) { return ''; } }
function email_(declarado) {
  var e = activo_();
  if (e) return e;
  declarado = String(declarado || '').trim().slice(0, 80);
  return declarado ? declarado + ' (sin verificar)' : 'usuario no identificado';
}
function now_() { return Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm:ss'); }
function ver_() { return props_().getProperty('ver') || '0'; }
function bump_(user) { var v = Date.now() + '|' + user; props_().setProperty('ver', v); return v; }
function cellV_(k, v) {
  if (k === '_id') return Number(v);
  if (NUM_KEYS.indexOf(k) >= 0) {
    if (v === null || v === undefined || v === '') return '';
    var n = Number(v); return isFinite(n) ? n : '';
  }
  return v === null || v === undefined ? '' : String(v);
}
function readV_(k, x) {
  if (x instanceof Date) x = Utilities.formatDate(x, TZ, 'dd/MM/yyyy');
  if (k === '_id') return Number(x);
  if (NUM_KEYS.indexOf(k) >= 0) { if (x === '' || x === null) return null; var n = Number(x); return isFinite(n) ? n : null; }
  return x === null || x === undefined ? '' : String(x).trim();
}

/* ---------- Años ---------- */
function nomBase_(y) { return 'BASE ' + y; }
function nomTechos_(y) { return 'TECHOS ' + y; }
function anios_() {
  var ys = [];
  ss_().getSheets().forEach(function (s) { var m = /^BASE (\d{4})$/.exec(s.getName()); if (m) ys.push(Number(m[1])); });
  return ys.sort();
}
function anio_(y) {
  y = Number(y);
  var ys = anios_();
  if (y && ys.indexOf(y) >= 0) return y;
  return ys.length ? ys[ys.length - 1] : ANIO_INICIAL;
}
/* Contadores por año (el año inicial conserva los contadores anteriores a la versión multianual) */
function getNum_(k, y) {
  var v = props_().getProperty(k + '_' + y);
  if (v === null && y === ANIO_INICIAL) v = props_().getProperty(k);
  return Number(v) || 0;
}
function setNum_(k, y, v) { props_().setProperty(k + '_' + y, String(v)); }

function asegurarColumnas_(b, n) {
  if (b.getMaxColumns() < n) b.insertColumnsAfter(b.getMaxColumns(), n - b.getMaxColumns());
}
/* Agrega a una hoja BASE existente las columnas de meses financiados y previsión (una sola vez) */
function asegurarExtras_(b) {
  if (String(b.getRange(1, BASE_N + 1).getValue()) === EXTRA_HEADERS[0]) return;
  asegurarColumnas_(b, KEYS.length);
  b.getRange(1, BASE_N + 1, b.getMaxRows(), EXTRA_KEYS.length).setNumberFormat('@');
  b.getRange(2, KEYS.indexOf('prevMonto') + 1, b.getMaxRows() - 1, 1).setNumberFormat('#,##0.00');
  b.getRange(1, BASE_N + 1, 1, EXTRA_HEADERS.length).setValues([EXTRA_HEADERS]).setFontWeight('bold')
    .setBackground('#4a3a7a').setFontColor('#ffffff').setWrap(true).setVerticalAlignment('middle');
}
function nuevaBase_(ss, nombre) {
  var b = ss.insertSheet(nombre, 0);
  asegurarColumnas_(b, KEYS.length);
  b.getRange(1, 1, b.getMaxRows(), KEYS.length).setNumberFormat('@');
  b.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold')
    .setBackground('#1f5f6b').setFontColor('#ffffff').setWrap(true).setVerticalAlignment('middle');
  colsNum_().forEach(function (c) {
    b.getRange(2, c, b.getMaxRows() - 1, 1).setNumberFormat('#,##0.00');
  });
  b.setFrozenRows(1); b.setFrozenColumns(1); b.setRowHeight(1, 48);
  b.setColumnWidth(1, 70); b.setColumnWidth(5, 280); b.setColumnWidth(9, 320);
  return b;
}
function nuevosTechos_(ss, nombre, filas) {
  var t = ss.insertSheet(nombre);
  t.getRange(1, 1, t.getMaxRows(), 3).setNumberFormat('@');
  t.getRange(2, 4, t.getMaxRows() - 1, 1).setNumberFormat('#,##0.00');
  t.getRange(1, 1, 1, T_HEAD.length).setValues([T_HEAD]).setFontWeight('bold').setBackground('#002060').setFontColor('#ffffff');
  t.setFrozenRows(1); t.setColumnWidth(2, 380); t.setColumnWidth(3, 480); t.setColumnWidth(4, 170);
  if (filas && filas.length) t.getRange(2, 1, filas.length, 4).setValues(filas);
  return t;
}

/* Crea las hojas que falten y pasa la versión de un solo año a la multianual (sin perder datos) */
function setup_() {
  var ss = ss_();
  // migración: BASE → BASE 2026, TECHOS → TECHOS 2026
  var vieja = ss.getSheetByName('BASE');
  if (vieja && !ss.getSheetByName(nomBase_(ANIO_INICIAL))) vieja.setName(nomBase_(ANIO_INICIAL));
  var viejaT = ss.getSheetByName('TECHOS');
  if (viejaT && !ss.getSheetByName(nomTechos_(ANIO_INICIAL))) viejaT.setName(nomTechos_(ANIO_INICIAL));
  if (!anios_().length) nuevaBase_(ss, nomBase_(ANIO_INICIAL));
  anios_().forEach(function (y) {
    if (!ss.getSheetByName(nomTechos_(y))) nuevosTechos_(ss, nomTechos_(y), y === ANIO_INICIAL ? TECHOS_INICIALES : []);
    asegurarExtras_(ss.getSheetByName(nomBase_(y)));
  });

  var h = ss.getSheetByName('HISTORIAL');
  if (!h) {
    h = ss.insertSheet('HISTORIAL');
    h.getRange(1, 1, h.getMaxRows(), H_HEAD.length).setNumberFormat('@');
    h.getRange(1, 1, 1, H_HEAD.length).setValues([H_HEAD]).setFontWeight('bold').setBackground('#1f5f6b').setFontColor('#ffffff');
    h.setFrozenRows(1);
  } else if (String(h.getRange(1, H_HEAD.length).getValue()) !== 'AÑO') {
    h.getRange(1, H_HEAD.length).setValue('AÑO').setFontWeight('bold').setBackground('#1f5f6b').setFontColor('#ffffff');
    h.getRange(2, H_HEAD.length, h.getMaxRows() - 1, 1).setNumberFormat('@');
  }
  var bjH = HEADERS.slice(0, BASE_N).concat(['FECHA DE BAJA', 'DADO DE BAJA POR', 'AÑO']).concat(EXTRA_HEADERS);
  var d = ss.getSheetByName('BAJAS');
  if (!d) {
    d = ss.insertSheet('BAJAS');
    d.getRange(1, 1, d.getMaxRows(), bjH.length).setNumberFormat('@');
    d.getRange(1, 1, 1, bjH.length).setValues([bjH]).setFontWeight('bold').setBackground('#8e2f39').setFontColor('#ffffff');
    d.setFrozenRows(1);
  } else {
    if (String(d.getRange(1, BASE_N + 3).getValue()) !== 'AÑO') d.getRange(1, BASE_N + 3).setValue('AÑO').setFontWeight('bold').setBackground('#8e2f39').setFontColor('#ffffff');
    if (String(d.getRange(1, BASE_N + 4).getValue()) !== EXTRA_HEADERS[0]) {
      asegurarColumnas_(d, bjH.length);
      d.getRange(1, BASE_N + 4, 1, EXTRA_HEADERS.length).setValues([EXTRA_HEADERS]).setFontWeight('bold').setBackground('#8e2f39').setFontColor('#ffffff');
    }
  }
  // borrar la hoja vacía por defecto
  ss.getSheets().forEach(function (s) {
    var n = s.getName();
    if (!/^(BASE|TECHOS) \d{4}$/.test(n) && ['HISTORIAL', 'BAJAS'].indexOf(n) < 0 && s.getLastRow() === 0 && ss.getSheets().length > 4) ss.deleteSheet(s);
  });
}
function base_(y) { setup_(); return ss_().getSheetByName(nomBase_(y)); }

/* ---------- Lectura ---------- */
function leerBase_(b) {
  var last = b.getLastRow(), rows = [];
  if (last > 1) {
    var v = b.getRange(2, 1, last - 1, KEYS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      if (v[i][0] === '' || v[i][0] === null) continue;
      var o = {};
      for (var j = 0; j < KEYS.length; j++) o[KEYS[j]] = readV_(KEYS[j], v[i][j]);
      rows.push(o);
    }
  }
  return rows;
}
function getData(anio) {
  setup_();
  var y = anio_(anio);
  return JSON.stringify({ rows: leerBase_(base_(y)), hist: getHistory_(3000, y), techos: getTechos_(y), anio: y, anios: anios_(),
    version: ver_(), user: activo_(), identificado: !!activo_(), title: ss_().getName(), url: ss_().getUrl() });
}
/* Solo los registros de un año (para comparar años) */
function getRows(anio) {
  setup_();
  var y = Number(anio);
  if (anios_().indexOf(y) < 0) throw new Error('No existe el año ' + anio);
  return JSON.stringify({ rows: leerBase_(base_(y)), anio: y });
}
function getHistory_(max, y) {
  var h = ss_().getSheetByName('HISTORIAL');
  var last = h.getLastRow();
  if (last < 2) return [];
  var n = Math.min(max * 3, last - 1);
  var v = h.getRange(last - n + 1, 1, n, H_HEAD.length).getDisplayValues().reverse();
  return v.filter(function (r) { var a = Number(r[11]); return a ? a === y : y === ANIO_INICIAL; }).slice(0, max);
}
function getVersion() { return ver_(); }
function getTechos_(y) {
  var t = ss_().getSheetByName(nomTechos_(y));
  if (!t) return [];
  var last = t.getLastRow();
  if (last < 2) return [];
  return t.getRange(2, 1, last - 1, 4).getValues().filter(function (r) { return r[1] !== '' || r[2] !== ''; })
    .map(function (r) { return [String(r[0]), String(r[1]).trim(), String(r[2]).trim(), Number(r[3]) || 0]; });
}
/* Agrega filas al final de una hoja, ampliándola si hace falta (las hojas nuevas traen solo 1000 filas) */
function append_(sh, rows) {
  if (!rows.length) return;
  var start = sh.getLastRow() + 1, need = start + rows.length - 1;
  if (need > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows() + 200);
  sh.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
}
function logH_(fila, y) {
  var hs = ss_().getSheetByName('HISTORIAL');
  var r = fila.slice(0, H_HEAD.length - 1); while (r.length < H_HEAD.length - 1) r.push('');
  r.push(String(y));
  append_(hs, [r]);
}

/* ---------- Año nuevo ----------
 * Copia la base y los techos del año "desde" al año "nuevo".
 * pasarMonto: el monto mensual actual del año anterior pasa a ser el "monto anterior" del nuevo año.
 * limpiarMeses: el año nuevo empieza sin meses financiados (aún no tiene certificados). */
function crearAnio(nuevo, desde, usuario, pasarMonto, limpiarMeses) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    setup_();
    var ss = ss_(), y = Number(nuevo), d = Number(desde);
    if (!(y >= 2000 && y <= 2100)) throw new Error('Año no válido: ' + nuevo);
    if (anios_().indexOf(y) >= 0) throw new Error('El año ' + y + ' ya existe.');
    if (anios_().indexOf(d) < 0) throw new Error('No existe el año de origen ' + desde + '.');
    var src = ss.getSheetByName(nomBase_(d));
    var b = src.copyTo(ss).setName(nomBase_(y));
    ss.setActiveSheet(b); ss.moveActiveSheet(1);
    var last = b.getLastRow();
    if (pasarMonto && last > 1) {
      var cA = KEYS.indexOf('montoAnt') + 1, cB = KEYS.indexOf('montoAct') + 1;
      b.getRange(2, cA, last - 1, 1).setValues(b.getRange(2, cB, last - 1, 1).getValues());
    }
    asegurarExtras_(b);
    if (limpiarMeses && last > 1) b.getRange(2, BASE_N + 1, last - 1, 12).clearContent();
    var tSrc = ss.getSheetByName(nomTechos_(d));
    if (tSrc) tSrc.copyTo(ss).setName(nomTechos_(y)); else nuevosTechos_(ss, nomTechos_(y), []);
    setNum_('maxId', y, getNum_('maxId', d));
    setNum_('maxN', y, getNum_('maxN', d));
    var user = email_(usuario);
    var total = Math.max(0, last - 1);
    logH_([String(Date.now()), now_(), user, 'Nuevo año', '', 'Año ' + y, '', '', 'Año ' + d, total + ' registros',
      'Creado copiando la base y los techos de ' + d + (pasarMonto ? '; monto actual ' + d + ' → monto anterior ' + y : '') + (limpiarMeses ? '; sin meses financiados' : '')], y);
    return JSON.stringify({ ok: true, anio: y, total: total, version: bump_(user) });
  } finally { lock.releaseLock(); }
}

/* Numera la columna N° de 1 hasta el último registro, en el orden actual de la hoja del año */
function renumerar(usuario, anio) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var y = anio_(anio), b = base_(y);
    var last = b.getLastRow(), total = 0;
    if (last > 1) {
      var ids = b.getRange(2, 1, last - 1, 1).getValues();
      var nums = [], k = 0;
      ids.forEach(function (r) { nums.push([r[0] === '' || r[0] === null ? '' : String(++k)]); });
      b.getRange(2, 2, nums.length, 1).setNumberFormat('@').setValues(nums);
      total = k;
    }
    var user = email_(usuario);
    logH_([String(Date.now()), now_(), user, 'Corrección', '', 'Toda la base', '', 'N°', '', '1 al ' + total, 'Renumeración del N° de orden (1…n en el orden actual)'], y);
    setNum_('maxN', y, total);
    return JSON.stringify({ ok: true, total: total, version: bump_(user) });
  } finally { lock.releaseLock(); }
}

/* Reemplaza los techos de un año (rows = [[nivel, organo, uo, techo], ...]) */
function setTechos(rows, usuario, anio) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    setup_();
    var y = anio_(anio);
    var t = ss_().getSheetByName(nomTechos_(y));
    var last = t.getLastRow();
    if (last > 1) t.getRange(2, 1, last - 1, 4).clearContent();
    if (rows.length) {
      if (rows.length + 1 > t.getMaxRows()) t.insertRowsAfter(t.getMaxRows(), rows.length + 10);
      t.getRange(2, 1, rows.length, 4).setValues(rows.map(function (r) { return [String(r[0]), String(r[1]), String(r[2] || ''), Number(r[3]) || 0]; }));
    }
    var user = email_(usuario);
    logH_([String(Date.now()), now_(), user, 'Techos', '', 'Techos por área usuaria', '', '', '', rows.length + ' áreas', 'Actualización de techos ' + y], y);
    return JSON.stringify({ ok: true, version: bump_(user) });
  } finally { lock.releaseLock(); }
}

/* ---------- Escritura ----------
 * p = { anio, usuario, ops: [ {op:'upd',id,ch:{campo:valor}} | {op:'add',rec} | {op:'del',id} | {op:'clear'} | {op:'addMany',rows:[...]} ],
 *       hist: [ [grupo,fecha,usuario,accion,id,nombre,dni,campo,antes,despues,motivo], ... ] }
 */
function commit(p) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var y = anio_(p.anio), b = base_(y);
    if (p.anio && Number(p.anio) !== y) throw new Error('El año ' + p.anio + ' no existe.');
    var user = email_(p.usuario), ts = now_();
    var last = b.getLastRow();
    var ids = last > 1 ? b.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return Number(r[0]); }) : [];
    var idRow = {}; var maxId = 0;
    ids.forEach(function (id, i) { if (id) { idRow[id] = i + 2; if (id > maxId) maxId = id; } });
    maxId = Math.max(maxId, getNum_('maxId', y));
    var nVals = last > 1 ? b.getRange(2, 2, last - 1, 1).getValues() : [];
    var nSet = {}; var maxN = 0;
    nVals.forEach(function (r) { var n = Number(r[0]); if (n) { nSet[n] = true; if (n > maxN) maxN = n; } });
    maxN = Math.max(maxN, getNum_('maxN', y));
    var nMap = {};
    var idMap = {}, warn = [], adds = [], dels = [];
    var ops = p.ops || [];
    var updOps = ops.filter(function (o) { return o.op === 'upd'; });
    var cU = KEYS.indexOf('_upd');

    // ---- actualizaciones: en memoria si son muchas, celda por celda si son pocas
    if (updOps.length > 25 && last > 1) {
      var data = b.getRange(2, 1, last - 1, KEYS.length).getValues();
      var touched = false;
      updOps.forEach(function (op) {
        var row = idRow[Number(op.id)];
        if (!row) { warn.push('El registro ' + op.id + ' ya no existe (otro usuario lo eliminó)'); return; }
        var r = data[row - 2];
        Object.keys(op.ch).forEach(function (k) { var c = KEYS.indexOf(k); if (c > 0 && k.charAt(0) !== '_') r[c] = cellV_(k, op.ch[k]); });
        r[cU] = ts; r[cU + 1] = user; touched = true;
      });
      if (touched) b.getRange(2, 1, last - 1, KEYS.length).setValues(data);
    } else {
      updOps.forEach(function (op) {
        var row = idRow[Number(op.id)];
        if (!row) { warn.push('El registro ' + op.id + ' ya no existe (otro usuario lo eliminó)'); return; }
        Object.keys(op.ch).forEach(function (k) {
          var c = KEYS.indexOf(k);
          if (c > 0 && k.charAt(0) !== '_') b.getRange(row, c + 1).setValue(cellV_(k, op.ch[k]));
        });
        b.getRange(row, cU + 1, 1, 2).setValues([[ts, user]]);
      });
    }

    // ---- altas, bajas, reemplazo total
    ops.forEach(function (op) {
      if (op.op === 'add') {
        var id = ++maxId; idMap[op.rec._id] = id;
        var nn = Number(op.rec.n);
        if (!nn || nSet[nn]) { nn = ++maxN; } else if (nn > maxN) { maxN = nn; }
        nSet[nn] = true; nMap[op.rec._id] = nn;
        var rec = Object.assign({}, op.rec, { _id: id, n: String(nn), _upd: ts, _by: user });
        adds.push(KEYS.map(function (k) { return cellV_(k, rec[k]); }));
      } else if (op.op === 'addMany') {
        (op.rows || []).forEach(function (r0) {
          var id = ++maxId;
          var n0 = Number(r0.n); if (n0) { nSet[n0] = true; if (n0 > maxN) maxN = n0; }
          var rec = Object.assign({}, r0, { _id: id, _upd: ts, _by: user });
          adds.push(KEYS.map(function (k) { return cellV_(k, rec[k]); }));
        });
      } else if (op.op === 'del') {
        var row = idRow[Number(op.id)];
        if (row) dels.push(row); else warn.push('El registro ' + op.id + ' ya no existía');
      } else if (op.op === 'clear') {
        if (last > 1) b.getRange(2, 1, last - 1, KEYS.length).clearContent();
        idRow = {}; maxId = 0; last = 1; nSet = {}; maxN = 0;
      }
    });
    if (adds.length) {
      var start = Math.max(b.getLastRow(), 1) + 1;
      if (start + adds.length - 1 > b.getMaxRows()) b.insertRowsAfter(b.getMaxRows(), start + adds.length - 1 - b.getMaxRows() + 50);
      b.getRange(start, 1, adds.length, KEYS.length).setNumberFormat('@');
      colsNum_().forEach(function (c) { b.getRange(start, c, adds.length, 1).setNumberFormat('#,##0.00'); });
      b.getRange(start, 1, adds.length, KEYS.length).setValues(adds);
    }
    if (dels.length) {
      var bj = ss_().getSheetByName('BAJAS');
      var copy = dels.map(function (r) { var v = b.getRange(r, 1, 1, KEYS.length).getValues()[0].map(String); return v.slice(0, BASE_N).concat([ts, user, String(y)]).concat(v.slice(BASE_N)); });
      asegurarColumnas_(bj, copy[0].length);
      append_(bj, copy);
      dels.sort(function (a, c) { return c - a; }).forEach(function (r) { b.deleteRow(r); });
    }

    // ---- historial
    var hist = (p.hist || []).map(function (h) {
      var r = h.slice(0, H_HEAD.length - 1);
      while (r.length < H_HEAD.length - 1) r.push('');
      r[1] = ts; r[2] = user;
      if (idMap[r[4]] !== undefined) r[4] = idMap[r[4]];
      r.push(String(y));
      return r.map(function (x) { return x === null || x === undefined ? '' : String(x).slice(0, 49000); });
    });
    if (hist.length) {
      var hs = ss_().getSheetByName('HISTORIAL');
      append_(hs, hist);
    }
    setNum_('maxId', y, maxId);
    setNum_('maxN', y, maxN);
    var v = bump_(user);
    return JSON.stringify({ ok: true, version: v, idMap: idMap, nMap: nMap, warn: warn, ts: ts, user: user, anio: y });
  } finally {
    lock.releaseLock();
  }
}
