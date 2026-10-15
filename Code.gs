/**
 * 團體訂便當：Google Apps Script 後端
 * 放在一份 Google 試算表的「擴充功能 > Apps Script」裡。
 * 主揪密碼請設在「專案設定 > 指令碼屬性」，名稱 ADMIN_PASSWORD。
 */

var SHEET_NAME = "orders";
var HEADERS = ["round", "token", "pid", "name", "lines", "paid", "updatedAt"];
var TZ = "Asia/Taipei";
var SHOP_KEYS = ["chunfu", "yang"];

function doGet(e) {
  return json_({ ok: true, msg: "bento api is running" });
}

function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) {}
  var out;
  try { out = route_(p); } catch (err) { out = { ok: false, error: String(err && err.message || err) }; }
  return json_(out);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function route_(p) {
  var a = String(p.action || "");
  if (a === "state") return state_(p.token);
  if (a === "checkAdmin") return { ok: isAdmin_(p.pw) };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (a === "submit") return submit_(p);
    if (a === "cancel") return cancel_(p);
    if (a.indexOf("admin_") === 0) {
      if (!isAdmin_(p.pw)) return { ok: false, error: "主揪密碼錯誤" };
      return admin_(a, p);
    }
  } finally {
    lock.releaseLock();
  }
  return { ok: false, error: "未知的操作" };
}

/* ---------- 共用 ---------- */
function props_() { return PropertiesService.getScriptProperties(); }

function isAdmin_(pw) {
  var real = props_().getProperty("ADMIN_PASSWORD");
  return !!real && typeof pw === "string" && pw === real;
}

function getSession_() {
  var raw = props_().getProperty("session");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function setSession_(s) { props_().setProperty("session", JSON.stringify(s)); }

function nowStr_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm"); }
function today_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd"); }

function isLate_(s) {
  if (!s || !s.date || !s.deadline) return false;
  return nowStr_() > (s.date + " " + s.deadline);
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readRows_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var rows = [];
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    var lines = [];
    try { lines = JSON.parse(v[4] || "[]"); } catch (e) {}
    rows.push({
      row: i + 2, round: String(v[0]), token: String(v[1]), pid: String(v[2]),
      name: String(v[3]), lines: lines, paid: v[5] === true || v[5] === "TRUE", updatedAt: Number(v[6]) || 0
    });
  }
  return rows;
}

function validToken_(t) { return typeof t === "string" && /^[0-9a-f]{32}$/.test(t); }

/* ---------- 讀取 ---------- */
function state_(token) {
  var s = getSession_();
  var orders = [];
  if (s && s.round) {
    readRows_().forEach(function (r) {
      if (r.round !== String(s.round)) return;
      orders.push({ pid: r.pid, name: r.name, lines: r.lines, paid: r.paid, updatedAt: r.updatedAt, mine: !!token && r.token === token });
    });
  }
  return { ok: true, session: s, late: isLate_(s), orders: orders };
}

/* ---------- 同事 ---------- */
function cleanLines_(lines) {
  if (!Array.isArray(lines)) return null;
  var out = [];
  for (var i = 0; i < lines.length && i < 60; i++) {
    var l = lines[i];
    if (!l || typeof l.key !== "string" || !/^[a-z0-9]+\.[a-z]$/.test(l.key)) continue;
    var q = Math.floor(Number(l.qty));
    if (!(q >= 1 && q <= 99)) continue;
    out.push({ key: l.key, qty: q });
  }
  return out;
}

function submit_(p) {
  var s = getSession_();
  if (!s || s.status !== "open" || isLate_(s)) return { ok: false, error: "已經截止，不能再點了" };
  if (!validToken_(p.token)) return { ok: false, error: "瀏覽器識別碼錯誤，請重新整理" };
  var name = String(p.name || "").trim().slice(0, 20);
  if (!name) return { ok: false, error: "請先填名字" };
  var lines = cleanLines_(p.lines);
  if (!lines || !lines.length) return { ok: false, error: "還沒有點任何東西" };

  var sh = sheet_();
  var rows = readRows_();
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.round === String(s.round) && r.token === p.token) {
      sh.getRange(r.row, 4, 1, 4).setValues([[name, JSON.stringify(lines), r.paid, Date.now()]]);
      return { ok: true };
    }
  }
  var pid = Utilities.getUuid().replace(/-/g, "").slice(0, 10);
  sh.appendRow([String(s.round), p.token, pid, name, JSON.stringify(lines), false, Date.now()]);
  return { ok: true };
}

function cancel_(p) {
  var s = getSession_();
  if (!s || s.status !== "open" || isLate_(s)) return { ok: false, error: "已經截止，不能取消了" };
  if (!validToken_(p.token)) return { ok: false, error: "瀏覽器識別碼錯誤，請重新整理" };
  var rows = readRows_();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (rows[i].round === String(s.round) && rows[i].token === p.token) sheet_().deleteRow(rows[i].row);
  }
  return { ok: true };
}

/* ---------- 主揪 ---------- */
function admin_(a, p) {
  var s = getSession_();
  var dlOk = typeof p.deadline === "string" && /^\d{2}:\d{2}$/.test(p.deadline);

  if (a === "admin_open") {
    if (SHOP_KEYS.indexOf(p.shop) < 0) return { ok: false, error: "店家錯誤" };
    if (!dlOk) return { ok: false, error: "截止時間格式錯誤" };
    setSession_({ shop: p.shop, deadline: p.deadline, date: today_(), status: "open", round: String(Date.now()) });
    return { ok: true };
  }
  if (!s) return { ok: false, error: "還沒開單" };

  if (a === "admin_setdl") {
    if (!dlOk) return { ok: false, error: "截止時間格式錯誤" };
    s.deadline = p.deadline; s.status = "open"; setSession_(s);
    return { ok: true };
  }
  if (a === "admin_close") { s.status = "closed"; setSession_(s); return { ok: true }; }
  if (a === "admin_reopen") { s.status = "open"; setSession_(s); return { ok: true }; }
  if (a === "admin_newround") {
    var sh = sheet_();
    if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
    setSession_({ status: "idle", shop: s.shop });
    return { ok: true };
  }
  if (a === "admin_paid") {
    var rows = readRows_();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].pid === String(p.pid)) { sheet_().getRange(rows[i].row, 6).setValue(!!p.paid); return { ok: true }; }
    }
    return { ok: false, error: "找不到這筆訂單" };
  }
  return { ok: false, error: "未知的操作" };
}
