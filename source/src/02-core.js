/* ===== Core: utilities, storage, domain ===== */
const { h, render, Fragment } = preact;
const { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } = preactHooks;
const html = htm.bind(h);

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2, '0');
const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayStr = () => ds(new Date());
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ds(d); };
const addMonths = (s, n) => { const d = pd(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return ds(d); };
const diffDays = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const dow = s => pd(s).getDay();
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtLong = s => { const d = pd(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtFull = s => { const d = pd(s); return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtShort = s => { const d = pd(s); return `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
const fmtDM = s => { const d = pd(s); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
const weekNum = s => { const d = pd(s); const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7)); const w1 = new Date(t.getFullYear(), 0, 4); return 1 + Math.round(((t - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7); };
const dayOfYear = s => diffDays(`${s.slice(0, 4)}-01-01`, s) + 1;
const daysInYear = y => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365;
const weekStart = (s, ws) => { const k = (dow(s) - ws + 7) % 7; return addDays(s, -k); };
const monthStart = s => s.slice(0, 8) + '01';
const monthDays = s => new Date(+s.slice(0, 4), +s.slice(5, 7), 0).getDate();
const toMin = t => { if (!t) return null; const [a, b] = t.split(':').map(Number); return a * 60 + (b || 0); };
const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
function fmtTime(t) {
  if (t == null || t === '') return '';
  const m = typeof t === 'number' ? t : toMin(t);
  if (S.settings().clock !== '12') return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  let hh = Math.floor(m / 60) % 24; const ap = hh >= 12 ? 'pm' : 'am'; hh = hh % 12 || 12;
  return `${hh}:${pad(m % 60)} ${ap}`;
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fmtDur = mins => { mins = Math.round(mins || 0); const hh = Math.floor(mins / 60), mm = mins % 60; return hh ? `${hh}h ${pad(mm)}m` : `${mm}m`; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clone = o => JSON.parse(JSON.stringify(o));
const round1 = v => Math.round(v * 10) / 10;
const fmtNum = v => { if (v == null || isNaN(v)) return '–'; const r = Math.abs(v) >= 100 ? Math.round(v) : round1(v); return r.toLocaleString('en-IN'); };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stripHtml = s => { const d = document.createElement('div'); d.innerHTML = s || ''; d.querySelectorAll('h1,h2,p,div,li,br').forEach(n => n.append(' ')); return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
function parseDuration(str) {
  if (str == null) return null; str = String(str).trim().toLowerCase(); if (!str) return null;
  let m = str.match(/^(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m?)?$/); if (m) return Math.round(parseFloat(m[1]) * 60 + (m[2] ? +m[2] : 0));
  m = str.match(/^(\d+)\s*m(in)?$/); if (m) return +m[1];
  m = str.match(/^(\d+):(\d{1,2})$/); if (m) return +m[1] * 60 + +m[2];
  m = str.match(/^(\d+(?:\.\d+)?)$/); if (m) { const v = parseFloat(m[1]); return v <= 24 ? Math.round(v * 60) : Math.round(v); }
  return null;
}

/* ---------- categories ---------- */
const CATS = [
  { id: 'work', name: 'Work' }, { id: 'study', name: 'Study' }, { id: 'health', name: 'Health' },
  { id: 'social', name: 'Social' }, { id: 'personal', name: 'Personal' },
];
const catVar = id => `var(--c-${CATS.some(c => c.id === id) ? id : 'personal'})`;
const catName = id => (CATS.find(c => c.id === id) || {}).name || 'Personal';

/* ---------- store ---------- */
const DEFAULT_SETTINGS = { name: 'Samarth', theme: 'system', clock: '24', weekStart: 1, carry: 'ask', dayStart: 6, dismissedWelcome: false, lastEod: null };
const LS_KEY = 'master-app.v1';
const DB = { db: null, mode: 'starting', docs: { s: {}, n: {} }, pending: {}, seq: {}, timers: {}, loaded: { s: false, n: false }, rev: 0, subs: new Set(), assets: null, downloads: null, error: null, localOnly: true };

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const j = JSON.parse(raw); DB.docs = j.docs || DB.docs; DB.localOnly = j.localOnly !== false; }
  } catch (e) { /* storage blocked */ }
}
let localTimer = null;
function saveLocal() {
  clearTimeout(localTimer);
  localTimer = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ docs: DB.docs, localOnly: !DB.db })); } catch (e) { try { if (DB.db) localStorage.removeItem(LS_KEY); } catch (e2) { } }
  }, 250);
}
let rafId = 0;
function emit() { DB.rev++; memo.clear(); if (rafId) return; rafId = requestAnimationFrame(() => { rafId = 0; DB.subs.forEach(f => f()); }); }
const memo = new Map();
const cached = (key, fn) => { if (memo.has(key)) return memo.get(key); const v = fn(); memo.set(key, v); return v; };

const getDoc = (col, id) => DB.docs[col][id];
function setDoc(col, id, data) { DB.docs[col][id] = data; queueWrite(col, id); emit(); saveLocal(); }
function delDoc(col, id) { delete DB.docs[col][id]; queueWrite(col, id); emit(); saveLocal(); }
function queueWrite(col, id) {
  const key = col + '/' + id;
  DB.seq[key] = (DB.seq[key] || 0) + 1; DB.pending[key] = true;
  clearTimeout(DB.timers[key]);
  DB.timers[key] = setTimeout(() => flush(col, id), 450);
}
async function flush(col, id, retry = 0) {
  const key = col + '/' + id;
  if (!DB.db) return; // local mode: localStorage already holds it
  const seq = DB.seq[key];
  const data = DB.docs[col][id];
  try {
    const ref = DB.db.collection(col).doc(id);
    if (data) await ref.set(clone(data)); else await ref.delete();
    if (DB.seq[key] === seq) delete DB.pending[key];
  } catch (e) {
    const code = e && e.code;
    if ((code === 'unavailable' || code === 'resource_exhausted') && retry < 2) { setTimeout(() => flush(col, id, retry + 1), 800 + Math.random() * 900); return; }
    delete DB.pending[key];
    if (code === 'quota_exceeded') toast('Storage is full. Delete old notes or entries to save new ones.');
    else if (code === 'invalid_argument') toast('That item is too large to save. Shorten it or remove an image.');
    else toast('Could not save a change. It is kept on this device and will retry when you edit again.');
  }
}
function flushAll() { Object.keys(DB.timers).forEach(k => { clearTimeout(DB.timers[k]); const [c, ...r] = k.split('/'); if (DB.pending[k]) flush(c, r.join('/')); }); }

async function connectDb() {
  if (!window.claude || !window.claude.use) { DB.mode = 'local'; emit(); return; }
  let db = null;
  try { db = await window.claude.use('db'); } catch (e) { db = null; }
  if (!db) { DB.mode = 'local'; emit(); return; }
  DB.db = db; DB.mode = 'syncing'; emit();
  const hadLocal = DB.localOnly && (Object.keys(DB.docs.s).length + Object.keys(DB.docs.n).length) > 0;
  const localCopy = clone(DB.docs);
  let firstDone = { s: false, n: false };
  ['s', 'n'].forEach(col => {
    db.collection(col).onSnapshot(snap => {
      if (!firstDone[col] && !snap.metadata.fromCache) {
        firstDone[col] = true;
        const next = {};
        snap.docs.forEach(d => { next[d.id] = clone(d.data()); });
        Object.keys(DB.pending).forEach(k => { const [c, ...r] = k.split('/'); const id = r.join('/'); if (c === col) { if (DB.docs[col][id]) next[id] = DB.docs[col][id]; else delete next[id]; } });
        DB.docs[col] = next;
        DB.loaded[col] = true;
        if (firstDone.s && firstDone.n) afterFirstLoad();
      } else {
        snap.docChanges().forEach(ch => {
          const id = ch.doc.id; if (DB.pending[col + '/' + id]) return;
          if (ch.type === 'removed') delete DB.docs[col][id]; else DB.docs[col][id] = clone(ch.doc.data());
        });
      }
      emit(); saveLocal();
    }, err => { DB.error = err && err.code; DB.mode = 'local'; emit(); });
  });
  function afterFirstLoad() {
    DB.mode = 'synced'; DB.localOnly = false;
    const serverEmpty = Object.keys(DB.docs.s).length + Object.keys(DB.docs.n).length === 0;
    if (serverEmpty && hadLocal) {
      ['s', 'n'].forEach(col => Object.entries(localCopy[col]).forEach(([id, d]) => { DB.docs[col][id] = d; queueWrite(col, id); }));
      toast('Moved your saved data into your account.');
    }
    emit(); saveLocal();
  }
  // Optional capabilities
  try { DB.assets = await window.claude.use('assets'); } catch (e) { DB.assets = null; }
  try { DB.downloads = await window.claude.use('downloads'); } catch (e) { DB.downloads = null; }
  emit();
}
window.addEventListener('pagehide', flushAll);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAll(); });

/* ---------- toasts and confirms (in-page; the viewer blocks native dialogs) ---------- */
const UI = { toasts: [], confirm: null, subs: new Set() };
const uiEmit = () => UI.subs.forEach(f => f());
function toast(text, action, ms = 5000) {
  const t = { id: uid(), text, action };
  UI.toasts = [...UI.toasts, t].slice(-3); uiEmit();
  setTimeout(() => { UI.toasts = UI.toasts.filter(x => x.id !== t.id); uiEmit(); }, action ? 8000 : ms);
}
function ask(opts) { return new Promise(res => { UI.confirm = { ...opts, res }; uiEmit(); }); }

/* ---------- domain accessors ---------- */
const S = {
  settings() { return { ...DEFAULT_SETTINGS, ...(getDoc('s', 'settings') || {}) }; },
  setSettings(p) { setDoc('s', 'settings', { ...(getDoc('s', 'settings') || {}), ...p }); },
  list(id) { return (getDoc('s', id) || {}).items || []; },
  setList(id, items) { setDoc('s', id, { ...(getDoc('s', id) || {}), items }); },

  /* metrics */
  metrics(all) { return S.list('metrics').filter(m => all || !m.archived).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); },
  metric(id) { return S.list('metrics').find(m => m.id === id); },
  saveMetric(m) { const l = S.list('metrics'); const i = l.findIndex(x => x.id === m.id); const n = l.slice(); if (i >= 0) n[i] = m; else n.push({ order: l.length, ...m }); S.setList('metrics', n); },
  deleteMetric(id) {
    S.setList('metrics', S.list('metrics').filter(m => m.id !== id));
    Object.keys(DB.docs.s).filter(k => k.startsWith(`e~${id}~`)).forEach(k => delDoc('s', k));
  },
  entries(mid) {
    return cached('ent:' + mid, () => {
      const out = {};
      Object.keys(DB.docs.s).forEach(k => { if (k.startsWith(`e~${mid}~`)) Object.assign(out, DB.docs.s[k].d || {}); });
      return out;
    });
  },
  entry(mid, date) { const d = getDoc('s', `e~${mid}~${date.slice(0, 4)}`); return d && d.d ? d.d[date] : undefined; },
  setEntry(mid, date, val) {
    const id = `e~${mid}~${date.slice(0, 4)}`;
    const doc = getDoc('s', id) || { mid, year: +date.slice(0, 4), d: {} };
    const d = { ...doc.d };
    if (val == null || val.v == null || (typeof val.v === 'number' && isNaN(val.v))) delete d[date]; else d[date] = val;
    const m = S.metric(mid);
    setDoc('s', id, { ...doc, d, ...(m && m.demo ? { demo: true } : {}) });
  },

  /* goals */
  goals() { return cached('goals', () => Object.keys(DB.docs.s).filter(k => k.startsWith('g~')).map(k => DB.docs.s[k]).sort((a, b) => (a.created || '').localeCompare(b.created || ''))); },
  goal(id) { return getDoc('s', 'g~' + id); },
  saveGoal(g) { setDoc('s', 'g~' + g.id, g); },
  deleteGoal(id) { delDoc('s', 'g~' + id); Object.keys(DB.docs.s).filter(k => k.startsWith(`gl~${id}~`)).forEach(k => delDoc('s', k)); },
  /* Goal logs live in one record per goal per year, so years of entries never outgrow a single record */
  goalLogs(g) { return cached('gl:' + g.id, () => { const out = { ...(g.logs || {}) }; Object.keys(DB.docs.s).forEach(k => { if (k.startsWith(`gl~${g.id}~`)) Object.assign(out, DB.docs.s[k].d || {}); }); return out; }); },
  setGoalLogEntry(gid, date, entry) {
    const id = `gl~${gid}~${date.slice(0, 4)}`; const doc = getDoc('s', id) || { gid, year: +date.slice(0, 4), d: {} };
    const d = { ...doc.d }; if (entry == null) delete d[date]; else d[date] = entry;
    const g = S.goal(gid);
    setDoc('s', id, { ...doc, d, ...(g && g.demo ? { demo: true } : {}) });
    if (g && g.logs && g.logs[date] !== undefined) { const logs = { ...g.logs }; delete logs[date]; setDoc('s', 'g~' + gid, { ...g, logs }); }
  },

  /* tasks */
  bucketId(date) { return date ? 't~' + date.slice(0, 7) : 'backlog'; },
  allTasks() {
    return cached('alltasks', () => {
      const out = [];
      Object.keys(DB.docs.s).forEach(k => { if (k.startsWith('t~') || k === 'backlog') (DB.docs.s[k].items || []).forEach(t => out.push(t)); });
      return out;
    });
  },
  tasksOn(date, generate) {
    if (generate) S.ensureRepeats(date);
    return cached('tasks:' + date, () => ((getDoc('s', 't~' + date.slice(0, 7)) || {}).items || []).filter(t => t.date === date && !t.dropped));
  },
  backlog() { return S.list('backlog').filter(t => !t.dropped); },
  findTask(id) { return S.allTasks().find(t => t.id === id); },
  saveTask(t) {
    const old = S.findTask(t.id);
    if (old && S.bucketId(old.date) !== S.bucketId(t.date)) {
      const ob = S.bucketId(old.date); const od = getDoc('s', ob) || { items: [] };
      setDoc('s', ob, { ...od, items: od.items.filter(x => x.id !== t.id) });
    }
    const b = S.bucketId(t.date); const doc = getDoc('s', b) || { items: [] };
    const items = (doc.items || []).slice(); const i = items.findIndex(x => x.id === t.id);
    if (i >= 0) items[i] = t; else items.push(t);
    setDoc('s', b, { ...doc, items });
    if (t.eventId) { const ev = S.findEvent(t.eventId); if (ev && (ev.title !== t.title)) S.saveEvent({ ...ev, title: t.title }, true); }
  },
  removeTask(id) {
    const t = S.findTask(id); if (!t) return;
    const b = S.bucketId(t.date); const doc = getDoc('s', b) || { items: [] };
    setDoc('s', b, { ...doc, items: doc.items.filter(x => x.id !== id) });
  },
  toggleTask(t) {
    const done = !t.done;
    const n = { ...t, done, doneAt: done ? new Date().toISOString() : null };
    S.saveTask(n);
    if (t.metricId && t.date) { const m = S.metric(t.metricId); if (m && m.type === 'yesno') S.setEntry(t.metricId, t.date, done ? { v: 1 } : null); }
    if (t.goalId && t.date) { const g = S.goal(t.goalId); if (g && goalLogStyle(g) === 'check') { if (g.metricId && S.metric(g.metricId)) goalLog(g, t.date, done ? 1 : null); else S.setGoalLogEntry(g.id, t.date, done ? { ...(S.goalLogs(g)[t.date] || {}), v: 1 } : null); } }
    return n;
  },
  repeats() { return S.list('repeats'); },
  ensureRepeats(date) {
    if (date < todayStr()) return;
    const reps = S.repeats().filter(r => r.active !== false && date >= (r.from || '0000') && repeatMatches(r.rule, date, r.from));
    if (!reps.length) return;
    const b = 't~' + date.slice(0, 7); const doc = getDoc('s', b) || { items: [] };
    const gen = doc.gen || {}; const have = gen[date] || [];
    const missing = reps.filter(r => !have.includes(r.id));
    if (!missing.length) return;
    const items = (doc.items || []).slice();
    missing.forEach(r => items.push({ id: uid(), title: r.title, date, kind: r.kind, start: r.start, dur: r.dur, due: r.due, cat: r.cat, done: false, repeatId: r.id, goalId: r.goalId, metricId: r.metricId, ...(r.demo ? { demo: true } : {}) }));
    DB.docs.s[b] = { ...doc, items, gen: { ...gen, [date]: [...have, ...missing.map(r => r.id)] } };
    queueWrite('s', b); memo.clear(); saveLocal(); setTimeout(emit, 0);
  },

  /* events */
  findEvent(id) {
    const base = String(id).split('@')[0];
    for (const k of Object.keys(DB.docs.s)) if (k.startsWith('ev~') || k === 'recurring') { const e = (DB.docs.s[k].items || []).find(x => x.id === base); if (e) return e; }
    return null;
  },
  eventsOn(date) {
    return cached('ev:' + date, () => {
      const own = ((getDoc('s', 'ev~' + date.slice(0, 7)) || {}).items || []).filter(e => e.date === date);
      const rec = S.list('recurring').filter(r => eventRecurs(r, date)).map(r => ({ ...r, id: r.id + '@' + date, baseId: r.id, date, recurring: true }));
      return [...own, ...rec].sort((a, b) => (a.allDay ? -1 : 0) - (b.allDay ? -1 : 0) || (toMin(a.start) || 0) - (toMin(b.start) || 0));
    });
  },
  saveEvent(e, skipTask) {
    const clean = { ...e }; delete clean.baseId; delete clean.recurring;
    const isRec = !!(clean.rule && clean.rule.type && clean.rule.type !== 'none');
    // remove from any old location
    Object.keys(DB.docs.s).forEach(k => {
      if (k.startsWith('ev~') || k === 'recurring') { const items = DB.docs.s[k].items || []; if (items.some(x => x.id === clean.id)) { DB.docs.s[k] = { ...DB.docs.s[k], items: items.filter(x => x.id !== clean.id) }; queueWrite('s', k); memo.clear(); } }
    });
    if (isRec) { S.setList('recurring', [...S.list('recurring'), clean]); }
    else { delete clean.rule; const b = 'ev~' + clean.date.slice(0, 7); const doc = getDoc('s', b) || { items: [] }; setDoc('s', b, { ...doc, items: [...(doc.items || []), clean] }); }
    if (!skipTask && clean.taskId) { const t = S.findTask(clean.taskId); if (t && t.title !== clean.title) S.saveTask({ ...t, title: clean.title }); }
    emit();
  },
  deleteEvent(id) {
    Object.keys(DB.docs.s).forEach(k => { if (k.startsWith('ev~') || k === 'recurring') { const items = DB.docs.s[k].items || []; if (items.some(x => x.id === id)) setDoc('s', k, { ...DB.docs.s[k], items: items.filter(x => x.id !== id) }); } });
    const t = S.allTasks().find(x => x.eventId === id); if (t) S.saveTask({ ...t, eventId: null });
  },

  /* notes and folders */
  notes() { return cached('notes', () => Object.values(DB.docs.n)); },
  note(id) { return getDoc('n', id); },
  saveNote(n) { setDoc('n', n.id, { ...n, updatedAt: new Date().toISOString() }); },
  deleteNoteForever(id) { delDoc('n', id); },
  folders() { return S.list('folders'); },
  folderPath(id) { const fs = S.folders(); const parts = []; let f = fs.find(x => x.id === id); let guard = 0; while (f && guard++ < 20) { parts.unshift(f.name); f = fs.find(x => x.id === f.parentId); } return parts.join(' / '); },
  folderDesc(id) { const fs = S.folders(); const out = new Set([id]); let grew = true; while (grew) { grew = false; fs.forEach(f => { if (f.parentId && out.has(f.parentId) && !out.has(f.id)) { out.add(f.id); grew = true; } }); } return out; },
  ensureFolderPath(path) {
    const parts = path.split('/').map(s => s.trim()).filter(Boolean); let parent = null; let fs = S.folders().slice();
    parts.forEach(name => { let f = fs.find(x => (x.parentId || null) === parent && x.name.toLowerCase() === name.toLowerCase()); if (!f) { f = { id: uid(), name, parentId: parent }; fs.push(f); } parent = f.id; });
    S.setList('folders', fs); return parent;
  },
  reviews() { const out = { ...((getDoc('s', 'reviews') || {}).items || {}) }; Object.keys(DB.docs.s).forEach(k => { if (k.startsWith('rv~')) Object.assign(out, DB.docs.s[k].items || {}); }); return out; },
  setReview(key, text) { const y = (key.match(/\d{4}/) || [todayStr().slice(0, 4)])[0]; const id = 'rv~' + y; const d = getDoc('s', id) || { items: {} }; setDoc('s', id, { items: { ...d.items, [key]: text } }); },
};

function repeatMatches(rule, date, from) {
  if (!rule) return false; const d = dow(date);
  if (rule.type === 'daily') return true;
  if (rule.type === 'weekdays') return d >= 1 && d <= 5;
  if (rule.type === 'weekly') return (rule.days && rule.days.length ? rule.days : [dow(from || date)]).includes(d);
  return false;
}
function eventRecurs(r, date) {
  if (!r.rule || date < r.date) return false;
  if (r.rule.until && date > r.rule.until) return false;
  if ((r.exceptions || []).includes(date)) return false;
  const t = r.rule.type;
  if (t === 'daily') return true;
  if (t === 'weekly') return (r.rule.days && r.rule.days.length ? r.rule.days : [dow(r.date)]).includes(dow(date));
  if (t === 'monthly') return pd(date).getDate() === pd(r.date).getDate();
  if (t === 'yearly') return date.slice(5) === r.date.slice(5);
  return false;
}
const evDur = e => e.allDay ? 0 : Math.max(0, (toMin(e.end) || 0) - (toMin(e.start) || 0));

/* ---------- metric helpers ---------- */
const METRIC_TYPES = [
  { id: 'yesno', name: 'Yes / No', hint: 'Did it or did not' },
  { id: 'count', name: 'Count', hint: 'Whole numbers, like glasses of water' },
  { id: 'number', name: 'Number', hint: 'Decimals with a unit, like km or kg' },
  { id: 'duration', name: 'Duration', hint: 'Hours and minutes' },
  { id: 'rating', name: 'Rating', hint: 'A 1 to 5 score' },
];
const defaultAgg = type => (type === 'duration' || type === 'rating') ? 'avg' : 'sum';
function fmtMetric(m, v) {
  if (v == null) return '–';
  if (m.type === 'yesno') return v ? 'Done' : 'Not done';
  if (m.type === 'duration') return fmtDur(v);
  if (m.type === 'rating') return `${round1(v)} / 5`;
  return `${fmtNum(v)}${m.unit ? ' ' + m.unit : ''}`;
}
function metricMet(m, v) {
  if (v == null) return false;
  if (m.type === 'yesno') return v >= 1;
  if (m.target == null || m.target === '') return true;
  return m.direction === 'down' ? v <= +m.target : v >= +m.target;
}
function metricStreak(m, asOf) {
  const e = S.entries(m.id); let d = asOf || todayStr(); let n = 0;
  if (!e[d] || !metricMet(m, e[d].v)) d = addDays(d, -1);
  while (e[d] && metricMet(m, e[d].v) && n < 5000) { n++; d = addDays(d, -1); }
  return n;
}
function metricLongest(m) {
  const e = S.entries(m.id); const days = Object.keys(e).sort(); let best = 0, cur = 0, prev = null;
  days.forEach(d => { if (metricMet(m, e[d].v)) { cur = prev && diffDays(prev, d) === 1 ? cur + 1 : 1; prev = d; best = Math.max(best, cur); } else { cur = 0; prev = null; } });
  return best;
}
function aggregate(vals, agg) { const v = vals.filter(x => x != null); if (!v.length) return null; const s = v.reduce((a, b) => a + b, 0); return agg === 'avg' ? s / v.length : s; }

/* ---------- periods for charts ---------- */
function periodBuckets(period, anchor, offset = 0) {
  const ws = S.settings().weekStart;
  if (period === 'week') {
    const st = addDays(weekStart(anchor, ws), offset * 7);
    return Array.from({ length: 7 }, (_, i) => { const d = addDays(st, i); return { key: d, label: DAYS[dow(d)].slice(0, 3), from: d, to: d, title: fmtShort(d) }; });
  }
  if (period === 'month') {
    const st = addMonths(monthStart(anchor), offset); const n = monthDays(st);
    return Array.from({ length: n }, (_, i) => { const d = addDays(st, i); return { key: d, label: (i % 5 === 0 || i === n - 1) ? String(i + 1) : '', from: d, to: d, title: fmtShort(d) }; });
  }
  if (period === 'quarter') {
    const st = addDays(weekStart(anchor, ws), -12 * 7 + offset * 13 * 7);
    return Array.from({ length: 13 }, (_, i) => { const f = addDays(st, i * 7); return { key: f, label: i % 3 === 0 ? fmtDM(f) : '', from: f, to: addDays(f, 6), title: `Week of ${fmtDM(f)}` }; });
  }
  const y = +anchor.slice(0, 4) + offset;
  return Array.from({ length: 12 }, (_, i) => { const f = `${y}-${pad(i + 1)}-01`; return { key: f, label: MONTHS[i].slice(0, 3), from: f, to: addDays(addMonths(f, 1), -1), title: `${MONTHS[i]} ${y}` }; });
}
function bucketize(map, buckets, agg) {
  const keys = Object.keys(map);
  return buckets.map(b => {
    if (b.from === b.to) return map[b.from] != null ? map[b.from] : null;
    const vals = keys.filter(k => k >= b.from && k <= b.to).map(k => map[k]);
    return aggregate(vals, agg);
  });
}
const PERIOD_NAMES = { week: ['This week', 'Last week'], month: ['This month', 'Last month'], quarter: ['Last 13 weeks', 'Previous 13 weeks'], year: ['This year', 'Last year'] };

/* ---------- goals ---------- */
const GOAL_TYPES = [
  { id: 'frequency', name: 'Frequency', hint: 'Do it N times a week or month', log: 'check', ex: 'Read the news 5 days a week' },
  { id: 'progress', name: 'Progress', hint: 'Add up toward a total', log: 'amount', ex: 'Run 500 km this year' },
  { id: 'target', name: 'Target', hint: 'Reach and hold a measurement', log: 'measure', ex: 'Reach 72 kg' },
  { id: 'milestone', name: 'Milestone plan', hint: 'A list of steps or dated sessions', log: 'steps', ex: 'Full marathon training plan' },
  { id: 'habit', name: 'Habit', hint: 'A daily yes or no; the streak counts', log: 'check', ex: 'Stretch every morning' },
  { id: 'qualitative', name: 'Qualitative', hint: 'No natural number; rate yourself daily', log: 'rating', ex: 'Be a good person' },
  { id: 'custom', name: 'Custom', hint: 'Pick any logging style and chart', log: 'amount', ex: 'Anything else' },
];
const LOG_STYLES = [
  { id: 'check', name: 'Mark done', hint: 'One tap per day' },
  { id: 'amount', name: 'Add an amount', hint: 'Enter what you added today' },
  { id: 'measure', name: 'Record a measurement', hint: 'Enter today\u2019s value' },
  { id: 'steps', name: 'Tick off steps', hint: 'Check sessions or steps' },
  { id: 'rating', name: 'Rate 1 to 5', hint: 'A quick self-rating' },
];
const CHART_TYPES = [
  { id: 'line', name: 'Line', d: 'Value over time', styles: ['amount', 'measure', 'rating', 'check'] },
  { id: 'area', name: 'Cumulative', d: 'Running total toward the target', styles: ['amount', 'check', 'steps'] },
  { id: 'bar', name: 'Bar', d: 'Per day, week, or month', styles: ['amount', 'measure', 'rating', 'check', 'steps'] },
  { id: 'grouped', name: 'Compare periods', d: 'This period beside the last', styles: ['amount', 'measure', 'rating', 'check'] },
  { id: 'stacked', name: 'Done vs missed', d: 'Hits and misses per week', styles: ['check', 'steps'] },
  { id: 'heatmap', name: 'Calendar heatmap', d: 'One square per day', styles: ['amount', 'check', 'rating', 'steps'] },
  { id: 'streak', name: 'Streak grid', d: 'Consecutive days', styles: ['check', 'amount', 'rating', 'measure'] },
  { id: 'ring', name: 'Progress ring', d: 'Percent to target', styles: ['amount', 'measure', 'check', 'steps', 'rating'] },
  { id: 'pbar', name: 'Progress bar', d: 'Percent to target', styles: ['amount', 'measure', 'check', 'steps', 'rating'] },
  { id: 'burnup', name: 'Burn-up', d: 'Actual vs pace needed', styles: ['amount', 'steps', 'check'] },
  { id: 'projection', name: 'Projection', d: 'Projected finish date', styles: ['amount', 'measure', 'steps', 'check'] },
  { id: 'rate', name: 'Completion rate', d: 'Hits vs target, per week', styles: ['check', 'rating'] },
  { id: 'checklist', name: 'Checklist', d: 'Steps done of total', styles: ['steps'] },
  { id: 'scatter', name: 'Scatter', d: 'Each entry with a trend line', styles: ['measure', 'rating', 'amount'] },
  { id: 'range', name: 'Range band', d: 'Weekly low to high', styles: ['measure', 'rating'] },
];
const REC_CHARTS = { frequency: ['rate', 'heatmap'], progress: ['burnup', 'bar'], target: ['line', 'ring'], milestone: ['checklist', 'burnup'], habit: ['streak', 'heatmap'], qualitative: ['heatmap', 'line'], custom: ['bar'] };
const goalLogStyle = g => g.logStyle || (GOAL_TYPES.find(t => t.id === g.type) || {}).log || 'check';
const goalKind = g => g.type !== 'custom' ? g.type : ({ check: 'habit', amount: 'progress', measure: 'target', rating: 'qualitative', steps: 'milestone' })[goalLogStyle(g)];
const goalAgg = g => ({ check: 'sum', amount: 'sum', steps: 'sum', measure: 'avg', rating: 'avg' })[goalLogStyle(g)];
function goalDaily(g) {
  return cached('gd:' + g.id, () => {
    const st = goalLogStyle(g); const out = {};
    if (st === 'steps') { (g.steps || []).forEach(s => { if (s.done && s.doneAt) { const d = s.doneAt.slice(0, 10); out[d] = (out[d] || 0) + 1; } }); return out; }
    if (g.metricId && S.metric(g.metricId)) { const e = S.entries(g.metricId); Object.keys(e).forEach(d => { if (e[d].v != null && (st !== 'check' || e[d].v)) out[d] = st === 'check' ? 1 : e[d].v; }); return out; }
    Object.entries(S.goalLogs(g)).forEach(([d, l]) => { if (l && l.v != null) out[d] = l.v; });
    return out;
  });
}
function goalAmounts(g) {
  return cached('ga:' + g.id, () => { const out = {}; Object.entries(S.goalLogs(g)).forEach(([d, l]) => { if (l && l.a != null && l.a !== '') out[d] = +l.a; }); return out; });
}
function goalLogPatch(g, date, patch) {
  if (g.metricId && S.metric(g.metricId)) { const cur = S.entry(g.metricId, date); if (patch.n != null && cur) S.setEntry(g.metricId, date, { ...cur, n: patch.n }); return; }
  const cur = S.goalLogs(g)[date] || {};
  const next = { ...cur, ...patch };
  if (patch.a != null && patch.a !== '' && next.v == null && goalLogStyle(g) === 'check') next.v = 1;
  const empty = next.v == null && (next.a == null || next.a === '') && !next.n;
  S.setGoalLogEntry(g.id, date, empty ? null : next);
}
function goalLog(g, date, val) {
  if (g.metricId && S.metric(g.metricId)) { const m = S.metric(g.metricId); S.setEntry(g.metricId, date, val == null ? null : { v: m.type === 'yesno' ? (val ? 1 : 0) : val }); return; }
  S.setGoalLogEntry(g.id, date, val == null ? null : { ...(S.goalLogs(g)[date] || {}), v: val });
}
const goalNote = (g, date) => { if (g.metricId && S.metric(g.metricId)) { const e = S.entry(g.metricId, date); return (e && e.n) || ''; } return (S.goalLogs(g)[date] || {}).n || ''; };
function freqPerWeek(g) { const n = +g.times || 1; return g.per === 'day' ? n * 7 : g.per === 'month' ? n * 12 / 52 : n; }
function goalStats(g, asOf = todayStr()) {
  return cached('gs:' + g.id + asOf, () => {
    const kind = goalKind(g); const daily = goalDaily(g); const days = Object.keys(daily).sort();
    const start = g.start || days[0] || asOf; const end = g.end || null;
    const daysLeft = end ? Math.max(0, diffDays(asOf, end)) : null;
    const r = { kind, pct: 0, status: 'none', statusText: 'No entries yet', valueText: '', streak: 0, longest: 0, daysLeft, start, end, loggedToday: daily[asOf] != null };
    // streaks over logged days
    let d = r.loggedToday ? asOf : addDays(asOf, -1); while (daily[d] != null && r.streak < 5000) { r.streak++; d = addDays(d, -1); }
    let cur = 0, prev = null; days.forEach(x => { cur = prev && diffDays(prev, x) === 1 ? cur + 1 : 1; prev = x; r.longest = Math.max(r.longest, cur); });
    const paceDays = (actual, total) => {
      if (!end || !g.start || !total) return null;
      const span = Math.max(1, diffDays(g.start, end)); const el = clamp(diffDays(g.start, asOf), 0, span);
      const expected = total * el / span; const perDay = total / span; return (actual - expected) / perDay;
    };
    const paceStatus = diff => {
      if (diff == null) return;
      if (diff >= 1) { r.status = 'ok'; r.statusText = `Ahead by ${Math.round(diff)} day${Math.round(diff) === 1 ? '' : 's'}`; }
      else if (diff <= -1) { r.status = 'warn'; r.statusText = `Behind by ${Math.round(-diff)} day${Math.round(-diff) === 1 ? '' : 's'}`; }
      else { r.status = 'ok'; r.statusText = 'On track'; }
    };
    if (kind === 'frequency') {
      const per = g.per || 'week'; const n = +g.times || 1; let from, to;
      if (per === 'day') { from = to = asOf; } else if (per === 'month') { from = monthStart(asOf); to = addDays(addMonths(from, 1), -1); } else { from = weekStart(asOf, S.settings().weekStart); to = addDays(from, 6); }
      const hits = days.filter(x => x >= from && x <= to).length;
      const span = diffDays(from, to) + 1; const el = diffDays(from, asOf) + 1;
      const exp = n * el / span;
      r.pct = clamp(hits / n, 0, 1); r.current = hits; r.target = n;
      r.valueText = `${hits} of ${n} this ${per}`;
      if (hits >= n) { r.status = 'ok'; r.statusText = `Done this ${per}`; }
      else if (hits + 0.001 >= Math.floor(exp)) { r.status = 'ok'; r.statusText = 'On track'; }
      else { const k = Math.ceil(exp - hits); r.status = 'warn'; r.statusText = `Behind by ${k}`; }
    } else if (kind === 'habit') {
      const win = 30; let hit = 0; for (let i = 0; i < win; i++) if (daily[addDays(asOf, -i)] != null) hit++;
      r.pct = hit / win; r.current = r.streak;
      r.valueText = `${r.streak}-day streak · ${hit} of last ${win} days`;
      r.status = r.loggedToday ? 'ok' : r.streak > 0 ? 'none' : 'warn';
      r.statusText = r.loggedToday ? 'Done today' : r.streak > 0 ? 'Not yet today' : 'Streak broken';
    } else if (kind === 'progress') {
      const total = days.filter(x => x >= start && x <= asOf).reduce((a, x) => a + daily[x], 0);
      const T = +g.target || 0; r.current = total; r.target = T; r.pct = T ? clamp(total / T, 0, 1) : 0;
      r.valueText = `${fmtNum(total)} of ${fmtNum(T)}${g.unit ? ' ' + g.unit : ''}`;
      if (T && total >= T) { r.status = 'ok'; r.statusText = 'Target reached'; }
      else if (days.length) { r.status = 'ok'; r.statusText = 'In progress'; paceStatus(paceDays(total, T)); }
    } else if (kind === 'target') {
      const latest = days.length ? daily[days[days.length - 1]] : null; const base = g.baseline != null && g.baseline !== '' ? +g.baseline : (days.length ? daily[days[0]] : null);
      const T = +g.target; r.current = latest; r.target = T;
      if (latest != null && base != null && T !== base) r.pct = clamp((base - latest) / (base - T), 0, 1); else if (latest != null && latest === T) r.pct = 1;
      r.valueText = latest == null ? `Target ${fmtNum(T)}${g.unit ? ' ' + g.unit : ''}` : `${fmtNum(latest)} → ${fmtNum(T)}${g.unit ? ' ' + g.unit : ''}`;
      if (latest != null) {
        const reached = base > T ? latest <= T : latest >= T;
        if (reached) { r.status = 'ok'; r.statusText = 'Target reached'; }
        else { r.status = 'ok'; r.statusText = 'In progress'; if (end && g.start) { const span = Math.max(1, diffDays(g.start, end)); const el = clamp(diffDays(g.start, asOf), 0, span); const expPct = el / span; const diff = (r.pct - expPct) * span; paceStatus(diff); } }
      }
    } else if (kind === 'milestone') {
      const steps = g.steps || []; const done = steps.filter(s => s.done).length; const due = steps.filter(s => s.date && s.date <= asOf).length;
      r.current = done; r.target = steps.length; r.pct = steps.length ? done / steps.length : 0;
      r.valueText = `${done} of ${steps.length} steps`;
      if (steps.length && done === steps.length) { r.status = 'ok'; r.statusText = 'Plan complete'; }
      else if (due) { const dueDone = steps.filter(s => s.date && s.date <= asOf && s.done).length; const k = due - dueDone; if (k > 0) { r.status = 'warn'; r.statusText = `Behind by ${k} step${k === 1 ? '' : 's'}`; } else { r.status = 'ok'; r.statusText = done > due ? `Ahead by ${done - due}` : 'On track'; } }
      else if (steps.length) { r.status = 'ok'; r.statusText = 'On track'; }
    } else if (kind === 'qualitative') {
      const win = 30; let hit = 0; const vals = []; for (let i = 0; i < win; i++) { const v = daily[addDays(asOf, -i)]; if (v != null) { hit++; if (i < 7) vals.push(v); } }
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      r.pct = hit / win; r.current = avg;
      r.valueText = goalLogStyle(g) === 'rating' ? `${avg == null ? '–' : round1(avg)} / 5 this week · ${hit} of ${win} days` : `${hit} of last ${win} days`;
      r.status = r.loggedToday ? 'ok' : 'none'; r.statusText = r.loggedToday ? 'Checked in today' : 'Not yet today';
    }
    if (g.status === 'done') { r.status = 'ok'; r.statusText = 'Completed'; }
    if (g.status === 'paused') { r.status = 'none'; r.statusText = 'Paused'; }
    return r;
  });
}

/* ---------- consistency (Today heatmap) ---------- */
function dayScore(date) {
  return cached('score:' + date, () => {
    const ms = S.metrics().filter(m => m.showToday !== false);
    let total = 0, got = 0;
    ms.forEach(m => { const e = S.entries(m.id)[date]; if (date >= (m.created || '0000')) { total++; if (e && e.v != null && (m.type !== 'yesno' || e.v)) got++; } });
    const ts = S.tasksOn(date); total += ts.length; got += ts.filter(t => t.done).length;
    return total ? got / total : null;
  });
}
const scoreLevel = s => s == null || s === 0 ? 0 : s < 0.35 ? 1 : s < 0.6 ? 2 : s < 0.85 ? 3 : 4;
function consistencyStreak(asOf) {
  let d = asOf || todayStr(); let n = 0; const s0 = dayScore(d);
  if (!(s0 != null && s0 >= 0.5)) d = addDays(d, -1);
  while (n < 2000) { const s = dayScore(d); if (s != null && s >= 0.5) { n++; d = addDays(d, -1); } else break; }
  return n;
}

/* ---------- search ---------- */
function searchAll(q) {
  q = q.trim().toLowerCase(); if (!q) return [];
  const hit = (t) => (t || '').toLowerCase().includes(q);
  const res = [];
  const notes = S.notes().filter(n => !n.deletedAt).map(n => ({ n, text: stripHtml(n.body) })).filter(({ n, text }) => hit(n.title) || hit(text) || (n.tags || []).some(hit) || hit(S.folderPath(n.folderId)));
  notes.sort((a, b) => (b.n.updatedAt || '').localeCompare(a.n.updatedAt || ''));
  res.push({ group: 'Notes', items: notes.slice(0, 8).map(({ n, text }) => ({ kind: 'note', id: n.id, title: n.title || firstLine(text), sub: snippet(text, q) || S.folderPath(n.folderId) || 'Inbox' })) });
  const tasks = S.allTasks().filter(t => !t.dropped && hit(t.title)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  res.push({ group: 'Tasks', items: tasks.slice(0, 6).map(t => ({ kind: 'task', id: t.id, date: t.date, title: t.title, sub: t.date ? fmtFull(t.date) : 'Backlog' })) });
  res.push({ group: 'Goals', items: S.goals().filter(g => hit(g.title)).slice(0, 6).map(g => ({ kind: 'goal', id: g.id, title: g.title, sub: (GOAL_TYPES.find(t => t.id === g.type) || {}).name })) });
  res.push({ group: 'Tracker', items: S.metrics(true).filter(m => hit(m.name) || hit(m.category)).slice(0, 6).map(m => ({ kind: 'metric', id: m.id, title: m.name, sub: METRIC_TYPES.find(t => t.id === m.type).name })) });
  res.push({ group: 'Folders', items: S.folders().filter(f => hit(f.name)).slice(0, 5).map(f => ({ kind: 'folder', id: f.id, title: S.folderPath(f.id), sub: `${S.notes().filter(n => !n.deletedAt && n.folderId === f.id).length} notes` })) });
  return res.filter(g => g.items.length);
}
const firstLine = t => (t || '').split(/\s{2,}|\. /)[0].slice(0, 60) || 'Untitled';
function snippet(text, q) { const i = text.toLowerCase().indexOf(q); if (i < 0) return ''; const s = Math.max(0, i - 40); return (s ? '…' : '') + text.slice(s, i + q.length + 60); }
function highlight(text, q) {
  if (!q) return text; const i = text.toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return text;
  return html`${text.slice(0, i)}<mark>${text.slice(i, i + q.length)}</mark>${text.slice(i + q.length)}`;
}

/* ---------- export / import ---------- */
function exportData() { return JSON.stringify({ app: 'master', version: 1, exportedAt: new Date().toISOString(), docs: DB.docs }, null, 1); }
async function offerFile(filename, data) {
  if (DB.downloads) {
    try { await DB.downloads.save({ filename, data }); return true; }
    catch (e) { if (e && e.code === 'declined') return false; }
  }
  return null;
}
function importData(text) {
  const j = JSON.parse(text);
  if (!j || !j.docs || !j.docs.s) throw new Error('This file is not a Master export.');
  Object.keys(DB.docs.s).forEach(k => { if (!j.docs.s[k]) delDoc('s', k); });
  Object.keys(DB.docs.n).forEach(k => { if (!(j.docs.n || {})[k]) delDoc('n', k); });
  Object.entries(j.docs.s).forEach(([k, v]) => setDoc('s', k, v));
  Object.entries(j.docs.n || {}).forEach(([k, v]) => setDoc('n', k, v));
}
function clearDemo() {
  const demoMetrics = S.list('metrics').filter(m => m.demo).map(m => m.id);
  S.setList('metrics', S.list('metrics').filter(m => !m.demo));
  Object.keys(DB.docs.s).forEach(k => {
    const d = DB.docs.s[k];
    if (k.startsWith('e~') && (d.demo || demoMetrics.includes(d.mid))) delDoc('s', k);
    else if (k.startsWith('g~') && d.demo) delDoc('s', k);
    else if (k.startsWith('gl~') && (d.demo || (S.goal(d.gid) || {}).demo)) delDoc('s', k);
    else if ((k.startsWith('t~') || k.startsWith('ev~') || ['backlog', 'repeats', 'recurring', 'folders'].includes(k)) && (d.items || []).some(x => x.demo)) setDoc('s', k, { ...d, items: d.items.filter(x => !x.demo) });
  });
  Object.keys(DB.docs.n).forEach(k => { if (DB.docs.n[k].demo) delDoc('n', k); });
}
function deleteEverything() { Object.keys(DB.docs.s).forEach(k => delDoc('s', k)); Object.keys(DB.docs.n).forEach(k => delDoc('n', k)); }
const hasAnyData = () => Object.keys(DB.docs.s).some(k => k !== 'settings') || Object.keys(DB.docs.n).length > 0;

/* ---------- ICS ---------- */
function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
function toIcs() {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Master//EN'];
  const all = []; Object.keys(DB.docs.s).forEach(k => { if (k.startsWith('ev~') || k === 'recurring') (DB.docs.s[k].items || []).forEach(e => all.push(e)); });
  all.forEach(e => {
    const d = e.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${e.id}@master`, `SUMMARY:${icsEscape(e.title)}`);
    if (e.allDay) { lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, '')}`); }
    else { lines.push(`DTSTART:${d}T${(e.start || '09:00').replace(':', '')}00`, `DTEND:${d}T${(e.end || e.start || '10:00').replace(':', '')}00`); }
    if (e.loc) lines.push(`LOCATION:${icsEscape(e.loc)}`);
    if (e.notes) lines.push(`DESCRIPTION:${icsEscape(e.notes)}`);
    if (e.rule && e.rule.type) { const map = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }; let rr = `RRULE:FREQ=${map[e.rule.type]}`; if (e.rule.type === 'weekly' && e.rule.days && e.rule.days.length) rr += ';BYDAY=' + e.rule.days.map(x => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][x]).join(','); if (e.rule.until) rr += `;UNTIL=${e.rule.until.replace(/-/g, '')}`; lines.push(rr); }
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR'); return lines.join('\r\n');
}
function parseIcs(text) {
  const raw = text.replace(/\r\n[ \t]/g, '').split(/\r?\n/); const out = []; let cur = null;
  const val = l => l.slice(l.indexOf(':') + 1).replace(/\\n/g, '\n').replace(/\\([,;\\])/g, '$1');
  const parseDt = l => { const v = val(l).trim(); const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/); if (!m) return null; return { date: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? `${m[4]}:${m[5]}` : null }; };
  raw.forEach(l => {
    if (l.startsWith('BEGIN:VEVENT')) cur = {};
    else if (l.startsWith('END:VEVENT')) { if (cur && cur.date) out.push(cur); cur = null; }
    else if (cur) {
      if (l.startsWith('SUMMARY')) cur.title = val(l);
      else if (l.startsWith('LOCATION')) cur.loc = val(l);
      else if (l.startsWith('DESCRIPTION')) cur.notes = val(l);
      else if (l.startsWith('DTSTART')) { const d = parseDt(l); if (d) { cur.date = d.date; cur.start = d.time; cur.allDay = !d.time; } }
      else if (l.startsWith('DTEND')) { const d = parseDt(l); if (d) cur.end = d.time; }
      else if (l.startsWith('RRULE')) { const v = val(l); const f = (v.match(/FREQ=(\w+)/) || [])[1]; const map = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' }; if (map[f]) { const days = ((v.match(/BYDAY=([\w,]+)/) || [])[1] || '').split(',').filter(Boolean).map(x => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(x.slice(-2))).filter(x => x >= 0); const until = (v.match(/UNTIL=(\d{8})/) || [])[1]; cur.rule = { type: map[f], days, until: until ? `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}` : null }; } }
    }
  });
  return out.map(e => ({ id: uid(), title: e.title || 'Untitled event', date: e.date, start: e.allDay ? null : e.start, end: e.allDay ? null : (e.end || fromMin(Math.min(1439, toMin(e.start) + 60))), allDay: !!e.allDay, cat: 'personal', loc: e.loc || '', notes: e.notes || '', rule: e.rule || null }));
}
