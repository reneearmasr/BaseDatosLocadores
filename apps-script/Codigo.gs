/**
 * GESTOR DE LOCADORES – ATU
 * Repositorio central en Google Sheets + aplicación web (Apps Script).
 *
 * Hojas que usa (se crean solas la primera vez):
 *   BASE        → un locador por fila (columna A = ID interno, no editar)
 *   HISTORIAL   → cada cambio: fecha, usuario, acción, campo, antes, después, motivo
 *   BAJAS       → copia de los registros eliminados
 *   TECHOS      → techo de monto mensual por órgano y unidad orgánica (área usuaria)
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
const H_HEAD = ['GRUPO','FECHA','USUARIO','ACCIÓN','ID','NOMBRE','DNI','CAMPO','VALOR ANTERIOR','VALOR NUEVO','MOTIVO'];
const NUM_KEYS = ['montoAnt','montoAct'];
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
    .addToUi();
}
function prepararRepositorio() { setup_(); }

/* Si alguien edita la hoja BASE a mano, la app de los demás se entera y se recarga */
function onEdit(e) {
  try {
    if (e && e.range && e.range.getSheet().getName() === 'BASE') {
      PropertiesService.getDocumentProperties().setProperty('ver', 'manual|' + Date.now());
    }
  } catch (err) {}
}

/* ---------- Utilidades ---------- */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById('1x0Drh819dfaFWmyN-b0W8dT2S1XHmoC6c004bbfJoMM'); }
function email_() {
  var e = '';
  try { e = Session.getActiveUser().getEmail(); } catch (x) {}
  if (!e) { try { e = Session.getEffectiveUser().getEmail(); } catch (x) {} }
  return e || 'usuario';
}
function now_() { return Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm:ss'); }
function ver_() { return PropertiesService.getDocumentProperties().getProperty('ver') || '0'; }
function bump_(user) { var v = Date.now() + '|' + user; PropertiesService.getDocumentProperties().setProperty('ver', v); return v; }
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

function setup_() {
  var ss = ss_();
  var b = ss.getSheetByName('BASE');
  if (!b) {
    b = ss.insertSheet('BASE', 0);
    b.getRange(1, 1, b.getMaxRows(), KEYS.length).setNumberFormat('@');
    b.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold')
      .setBackground('#1f5f6b').setFontColor('#ffffff').setWrap(true).setVerticalAlignment('middle');
    [KEYS.indexOf('montoAnt') + 1, KEYS.indexOf('montoAct') + 1].forEach(function (c) {
      b.getRange(2, c, b.getMaxRows() - 1, 1).setNumberFormat('#,##0.00');
    });
    b.setFrozenRows(1); b.setFrozenColumns(1); b.setRowHeight(1, 48);
    b.setColumnWidth(1, 70); b.setColumnWidth(5, 280); b.setColumnWidth(9, 320);
  }
  var h = ss.getSheetByName('HISTORIAL');
  if (!h) {
    h = ss.insertSheet('HISTORIAL');
    h.getRange(1, 1, h.getMaxRows(), H_HEAD.length).setNumberFormat('@');
    h.getRange(1, 1, 1, H_HEAD.length).setValues([H_HEAD]).setFontWeight('bold').setBackground('#1f5f6b').setFontColor('#ffffff');
    h.setFrozenRows(1);
  }
  var d = ss.getSheetByName('BAJAS');
  if (!d) {
    d = ss.insertSheet('BAJAS');
    d.getRange(1, 1, d.getMaxRows(), HEADERS.length + 2).setNumberFormat('@');
    d.getRange(1, 1, 1, HEADERS.length + 2).setValues([HEADERS.concat(['FECHA DE BAJA', 'DADO DE BAJA POR'])])
      .setFontWeight('bold').setBackground('#8e2f39').setFontColor('#ffffff');
    d.setFrozenRows(1);
  }
  var t = ss.getSheetByName('TECHOS');
  if (!t) {
    t = ss.insertSheet('TECHOS');
    t.getRange(1, 1, t.getMaxRows(), 3).setNumberFormat('@');
    t.getRange(2, 4, t.getMaxRows() - 1, 1).setNumberFormat('#,##0.00');
    t.getRange(1, 1, 1, T_HEAD.length).setValues([T_HEAD]).setFontWeight('bold').setBackground('#002060').setFontColor('#ffffff');
    t.setFrozenRows(1); t.setColumnWidth(2, 380); t.setColumnWidth(3, 480); t.setColumnWidth(4, 170);
    t.getRange(2, 1, TECHOS_INICIALES.length, 4).setValues(TECHOS_INICIALES);
  }
  // borrar la hoja vacía por defecto
  ss.getSheets().forEach(function (s) {
    var n = s.getName();
    if (['BASE', 'HISTORIAL', 'BAJAS', 'TECHOS'].indexOf(n) < 0 && s.getLastRow() === 0 && ss.getSheets().length > 4) ss.deleteSheet(s);
  });
  return b;
}

/* ---------- Lectura ---------- */
function getData() {
  var b = setup_();
  var last = b.getLastRow();
  var rows = [];
  if (last > 1) {
    var v = b.getRange(2, 1, last - 1, KEYS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      if (v[i][0] === '' || v[i][0] === null) continue;
      var o = {};
      for (var j = 0; j < KEYS.length; j++) o[KEYS[j]] = readV_(KEYS[j], v[i][j]);
      rows.push(o);
    }
  }
  return JSON.stringify({ rows: rows, hist: getHistory_(3000), techos: getTechos_(), version: ver_(), user: email_(),
    title: ss_().getName(), url: ss_().getUrl() });
}
function getHistory_(max) {
  var h = ss_().getSheetByName('HISTORIAL');
  var last = h.getLastRow();
  if (last < 2) return [];
  var n = Math.min(max, last - 1);
  return h.getRange(last - n + 1, 1, n, H_HEAD.length).getDisplayValues().reverse();
}
function getVersion() { return ver_(); }
function getTechos_() {
  var t = ss_().getSheetByName('TECHOS');
  var last = t.getLastRow();
  if (last < 2) return [];
  return t.getRange(2, 1, last - 1, 4).getValues().filter(function (r) { return r[1] !== '' || r[2] !== ''; })
    .map(function (r) { return [String(r[0]), String(r[1]).trim(), String(r[2]).trim(), Number(r[3]) || 0]; });
}
/* Reemplaza los techos (rows = [[nivel, organo, uo, techo], ...]) */
function setTechos(rows) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    setup_();
    var t = ss_().getSheetByName('TECHOS');
    var last = t.getLastRow();
    if (last > 1) t.getRange(2, 1, last - 1, 4).clearContent();
    if (rows.length) {
      if (rows.length + 1 > t.getMaxRows()) t.insertRowsAfter(t.getMaxRows(), rows.length + 10);
      t.getRange(2, 1, rows.length, 4).setValues(rows.map(function (r) { return [String(r[0]), String(r[1]), String(r[2] || ''), Number(r[3]) || 0]; }));
    }
    var user = email_();
    var hs = ss_().getSheetByName('HISTORIAL');
    hs.getRange(hs.getLastRow() + 1, 1, 1, H_HEAD.length).setValues([[String(Date.now()), now_(), user, 'Techos', '', 'Techos por área usuaria', '', '', '', rows.length + ' áreas', 'Actualización de techos']]);
    return JSON.stringify({ ok: true, version: bump_(user) });
  } finally { lock.releaseLock(); }
}

/* ---------- Escritura ----------
 * p = { ops: [ {op:'upd',id,ch:{campo:valor}} | {op:'add',rec} | {op:'del',id} | {op:'clear'} | {op:'addMany',rows:[...]} ],
 *       hist: [ [grupo,fecha,usuario,accion,id,nombre,dni,campo,antes,despues,motivo], ... ] }
 */
function commit(p) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var b = setup_();
    var user = email_(), ts = now_();
    var last = b.getLastRow();
    var ids = last > 1 ? b.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return Number(r[0]); }) : [];
    var idRow = {}; var maxId = 0;
    ids.forEach(function (id, i) { if (id) { idRow[id] = i + 2; if (id > maxId) maxId = id; } });
    var props = PropertiesService.getDocumentProperties();
    maxId = Math.max(maxId, Number(props.getProperty('maxId')) || 0);
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
        var rec = Object.assign({}, op.rec, { _id: id, _upd: ts, _by: user });
        adds.push(KEYS.map(function (k) { return cellV_(k, rec[k]); }));
      } else if (op.op === 'addMany') {
        (op.rows || []).forEach(function (r0) {
          var id = ++maxId;
          var rec = Object.assign({}, r0, { _id: id, _upd: ts, _by: user });
          adds.push(KEYS.map(function (k) { return cellV_(k, rec[k]); }));
        });
      } else if (op.op === 'del') {
        var row = idRow[Number(op.id)];
        if (row) dels.push(row); else warn.push('El registro ' + op.id + ' ya no existía');
      } else if (op.op === 'clear') {
        if (last > 1) b.getRange(2, 1, last - 1, KEYS.length).clearContent();
        idRow = {}; maxId = 0; last = 1;
      }
    });
    if (adds.length) {
      var start = Math.max(b.getLastRow(), 1) + 1;
      if (start + adds.length - 1 > b.getMaxRows()) b.insertRowsAfter(b.getMaxRows(), start + adds.length - 1 - b.getMaxRows() + 50);
      b.getRange(start, 1, adds.length, KEYS.length).setNumberFormat('@');
      [KEYS.indexOf('montoAnt') + 1, KEYS.indexOf('montoAct') + 1].forEach(function (c) { b.getRange(start, c, adds.length, 1).setNumberFormat('#,##0.00'); });
      b.getRange(start, 1, adds.length, KEYS.length).setValues(adds);
    }
    if (dels.length) {
      var bj = ss_().getSheetByName('BAJAS');
      var copy = dels.map(function (r) { return b.getRange(r, 1, 1, KEYS.length).getValues()[0].map(String).concat([ts, user]); });
      bj.getRange(bj.getLastRow() + 1, 1, copy.length, copy[0].length).setValues(copy);
      dels.sort(function (a, c) { return c - a; }).forEach(function (r) { b.deleteRow(r); });
    }

    // ---- historial
    var hist = (p.hist || []).map(function (h) {
      var r = h.slice(0, H_HEAD.length);
      while (r.length < H_HEAD.length) r.push('');
      r[1] = ts; r[2] = user;
      if (idMap[r[4]] !== undefined) r[4] = idMap[r[4]];
      return r.map(function (x) { return x === null || x === undefined ? '' : String(x).slice(0, 49000); });
    });
    if (hist.length) {
      var hs = ss_().getSheetByName('HISTORIAL');
      hs.getRange(hs.getLastRow() + 1, 1, hist.length, H_HEAD.length).setValues(hist);
    }
    props.setProperty('maxId', String(maxId));
    var v = bump_(user);
    return JSON.stringify({ ok: true, version: v, idMap: idMap, warn: warn, ts: ts, user: user });
  } finally {
    lock.releaseLock();
  }
}
