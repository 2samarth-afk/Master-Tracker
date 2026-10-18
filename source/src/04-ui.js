/* ===== Shared UI, shell, overlays ===== */
const V = { page: 'today', id: null, todayDate: null, todoDate: null, calDate: null, calView: 'week', calOpen: null, notesView: { kind: 'all' }, noteOpen: null, goalTab: 'goals', overlay: null, quick: null, metricRange: 'month', goalPeriod: 'week' };
function setV(p) { Object.assign(V, p); emit(); }
const PAGES = [['today', 'today'], ['tracker', 'tracker'], ['goals', 'goals'], ['todo', 'to-do'], ['notes', 'notes']];
function go(page, extra = {}) {
  setV({ page, id: null, noteOpen: null, ...extra });
  try { if (location.hash.slice(1) !== page) history.replaceState(null, '', '#' + page); } catch (e) { }
  window.scrollTo(0, 0);
}
function openNote(id) { go('notes', { noteOpen: id }); }
function openTask(t) { if (t.date) go('todo', { todoDate: t.date }); else go('todo'); }
function openEvent(e) { go('todo', { todoDate: e.date }); }

const I = {
  search: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>`,
  gear: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="3.2"></circle><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7L5.6 5.6"></path></svg>`,
  close: html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>`,
  left: html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>`,
  right: html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>`,
  pin: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 4h6l-1 6 4 4H6l4-4-1-6zM12 14v7"></path></svg>`,
  archive: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="5"></rect><path d="M5 9v11h14V9M10 13h4"></path></svg>`,
  trash: html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"></path></svg>`,
  grid: html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="4" width="7" height="7"></rect><rect x="13" y="4" width="7" height="7"></rect><rect x="4" y="13" width="7" height="7"></rect><rect x="13" y="13" width="7" height="7"></rect></svg>`,
  list: html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>`,
  image: html`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="16"></rect><circle cx="9" cy="10" r="2"></circle><path d="M21 16l-6-6-9 10"></path></svg>`,
  nav: {
    today: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"></path></svg>`,
    tracker: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 20V12M10 20V6M15 20v-9M20 20V9"></path></svg>`,
    goals: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle><circle cx="12" cy="12" r="0.8" fill="currentColor"></circle></svg>`,
    todo: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="4" width="16" height="16"></rect><path d="M8 12l3 3 5-6"></path></svg>`,
    calendar: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15"></rect><path d="M3.5 10h17M8 3v4M16 3v4"></path></svg>`,
    notes: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"></path><path d="M14 3v5h5M9 12h7M9 16h7"></path></svg>`,
  },
};

/* ---------- generic overlays ---------- */
function useEsc(fn) { useEffect(() => { const k = e => { if (e.key === 'Escape') fn(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [fn]); }
function Modal({ title, sub, onClose, children, actions, size }) {
  useEsc(onClose);
  return html`<div class="scrim" onMouseDown=${e => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="modal ${size || ''}" role="dialog" aria-modal="true" aria-label=${title}>
      <button class="iconbtn close" aria-label="Close" onClick=${onClose}>${I.close}</button>
      ${title ? html`<h2>${title}</h2>` : null}
      ${sub ? html`<p class="muted it" style=${{ marginBottom: '22px' }}>${sub}</p>` : html`<div style=${{ height: '14px' }}></div>`}
      ${children}
      ${actions ? html`<div class="actions">${actions}</div>` : null}
    </div>
  </div>`;
}
function Panel({ title, onClose, children }) {
  useEsc(onClose);
  return html`<div class="scrim" style=${{ background: 'var(--scrim)', padding: 0 }} onMouseDown=${e => { if (e.target === e.currentTarget) onClose(); }}>
    <aside class="panel" role="dialog" aria-modal="true" aria-label=${title}>
      <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}><h2>${title}</h2><button class="iconbtn" aria-label="Close" onClick=${onClose}>${I.close}</button></div>
      ${children}
    </aside>
  </div>`;
}
function UiHost() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force(x => x + 1); UI.subs.add(f); return () => UI.subs.delete(f); }, []);
  const c = UI.confirm;
  const done = v => { const r = c.res; UI.confirm = null; uiEmit(); r(v); };
  return html`<${Fragment}>
    <div class="toasts" role="status" aria-live="polite">${UI.toasts.map(t => html`<div class="toast"><span>${t.text}</span>${t.action ? html`<button onClick=${() => { t.action.fn(); UI.toasts = UI.toasts.filter(x => x.id !== t.id); uiEmit(); }}>${t.action.label}</button>` : null}</div>`)}</div>
    ${c ? html`<${ConfirmBox} c=${c} done=${done} />` : null}
  <//>`;
}
function ConfirmBox({ c, done }) {
  const [typed, setTyped] = useState('');
  const ok = !c.typed || typed.trim().toUpperCase() === c.typed;
  return html`<${Modal} title=${c.title} sub=${c.body} size="narrow" onClose=${() => done(false)} actions=${html`<button class="btn ghost" onClick=${() => done(false)}>${c.cancel || 'Cancel'}</button><button class=${'btn' + (c.danger ? ' danger' : '')} disabled=${!ok} onClick=${() => done(true)}>${c.confirm || 'Confirm'}</button>`}>
    ${c.typed ? html`<div class="field"><label for="typed-confirm">Type ${c.typed} to confirm</label><input id="typed-confirm" class="input" value=${typed} onInput=${e => setTyped(e.target.value)} autofocus /></div>` : null}
  <//>`;
}

/* ---------- metric input, by type ---------- */
function MetricInput({ m, date, compact }) {
  const e = S.entry(m.id, date); const v = e ? e.v : null;
  const set = val => S.setEntry(m.id, date, val == null ? null : { ...(e || {}), v: val });
  const [draft, setDraft] = useState(null);
  if (m.type === 'yesno') return html`<div class="mi">${v ? html`<input class="note" aria-label=${`Detail for ${m.name}`} placeholder="detail" value=${(e && e.n) || ''} onChange=${ev => S.setEntry(m.id, date, { ...(S.entry(m.id, date) || { v: 1 }), n: ev.target.value })} />` : null}<button class="yn ${v ? 'on' : ''}" aria-pressed=${!!v} onClick=${() => set(v ? null : 1)}>${v ? 'Done ✓' : 'Mark done'}</button></div>`;
  if (m.type === 'rating') return html`<div class="rate" role="radiogroup" aria-label=${m.name}>${[1, 2, 3, 4, 5].map(i => html`<button class=${v != null && i <= v ? 'on' : ''} role="radio" aria-checked=${v === i} aria-label=${`${i} of 5`} onClick=${() => set(v === i ? null : i)}></button>`)}</div>`;
  if (m.type === 'count') return html`<div class="mi"><button class="step" aria-label="Decrease" onClick=${() => set(v == null || v <= 1 ? (v == 1 ? 0 : null) : v - 1)}>−</button><span class="val tnum" style=${{ minWidth: '28px', textAlign: 'center' }}>${v ?? 0}</span><button class="step" aria-label="Increase" onClick=${() => set((v || 0) + 1)}>+</button></div>`;
  const shown = draft != null ? draft : v == null ? '' : m.type === 'duration' ? fmtDur(v) : String(v);
  const commit = () => { if (draft == null) return; const t = draft.trim(); setDraft(null); if (!t) { set(null); return; } const nv = m.type === 'duration' ? parseDuration(t) : parseFloat(t.replace(',', '.')); if (nv == null || isNaN(nv)) { toast(m.type === 'duration' ? 'Enter a time like 7h 30m, 7:30 or 90m.' : 'Enter a number.'); return; } set(nv); };
  const met = v != null && metricMet(m, v);
  return html`<div class="mi">
    <input class="num tnum" inputmode=${m.type === 'duration' ? 'text' : 'decimal'} aria-label=${`${m.name} for ${fmtShort(date)}`} placeholder=${m.type === 'duration' ? '0h 00m' : '0'} value=${shown} onInput=${ev => setDraft(ev.target.value)} onBlur=${commit} onKeyDown=${ev => { if (ev.key === 'Enter') { ev.target.blur(); } }} />
    ${m.unit && m.type === 'number' ? html`<span class="unit">${m.unit}</span>` : null}
    ${met && !compact ? html`<span class="okmark" aria-label="Target met">✓</span>` : met ? html`<span class="okmark" aria-label="Target met">✓</span>` : null}
  </div>`;
}

/* ---------- shell ---------- */
function Strip() {
  const t = todayStr(); const s = S.settings();
  return html`<div class="strip"><div class="wrap">
    <span class="l tnum">${(s.name || 'You')} · ${fmtShort(t).toLowerCase()} · week ${weekNum(t)}</span>
    <span class="mid">Show up for yourself.</span>
    <button class="r" onClick=${() => setV({ quick: 'menu' })}>quick add +</button>
  </div></div>`;
}
function Topbar() {
  const inbox = S.notes().filter(n => !n.deletedAt && !n.archived && !n.folderId).length;
  return html`<header class="topbar"><div class="wrap">
    <nav class="nav" aria-label="Sections">${PAGES.map(([id, name]) => html`<a href=${'#' + id} class=${V.page === id ? 'on' : ''} aria-current=${V.page === id ? 'page' : null} onClick=${e => { e.preventDefault(); go(id); }}>${name}${id === 'notes' && inbox ? html`<sup class="nbadge tnum" aria-label=${`${inbox} in Inbox`}>${inbox}</sup>` : null}</a>`)}</nav>
    <button class="mark" onClick=${() => go('today')} aria-label="Master, go to Today">master<span>.</span></button>
    <div class="tools">
 <a class="iconbtn" href="https://calendar.google.com" target="_blank" rel="noopener" aria-label="Open Google Calendar in a new tab" title="Google Calendar">${I.nav.calendar}</a>
      <button class="iconbtn" aria-label="Search everything" title="Search (/)" onClick=${() => setV({ overlay: 'search' })}>${I.search}</button>
      <button class="iconbtn" aria-label="Settings" title="Settings" onClick=${() => setV({ overlay: 'settings' })}>${I.gear}</button>
    </div>
  </div></header>`;
}
function BottomNav() {
  return html`<${Fragment}>
    <button class="fab" aria-label="Quick add" onClick=${() => setV({ quick: 'menu' })}>+</button>
  <//>`;
}

/* ---------- quick add ---------- */
function QuickAdd() {
  const close = () => setV({ quick: null });
  const mode = V.quick;
  const t0 = todayStr();
  const [f, setF] = useState({ title: '', time: '', end: '', date: t0, kind: 'fullDay', metric: (S.metrics()[0] || {}).id, body: '' });
  const up = p => setF({ ...f, ...p });
  if (mode === 'menu') return html`<${Modal} title="quick add" size="narrow" onClose=${close}>
    <div class="menu" style=${{ display: 'grid', gap: '4px' }}>
      ${[['todo', 'New to-do', 'Today, with or without a time'], ['note', 'New note', 'Opens a blank page'], ['log', 'Log a metric', 'Record today’s value']].map(([k, a, b]) => html`<button style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', padding: '16px 12px', borderBottom: '1px solid var(--line)' }} onClick=${() => { if (k === 'note') { setV({ quick: null }); newNote({ kind: 'inbox' }); } else setV({ quick: k }); }}><span class="d" style=${{ fontSize: '24px', letterSpacing: '-.03em' }}>${a.toLowerCase()}</span><span class="muted" style=${{ fontSize: '14px' }}>${b}</span></button>`)}
    </div>
  <//>`;
  const save = () => {
    if (mode === 'todo') { if (!f.title.trim()) return; const timed = !!f.time && f.kind === 'timed'; S.saveTask({ id: uid(), title: f.title.trim(), date: f.date, kind: timed ? 'timed' : 'fullDay', start: timed ? f.time : null, dur: 30, due: !timed && f.time ? f.time : null, cat: 'personal', done: false }); toast('Added to ' + (f.date === t0 ? 'today' : fmtShort(f.date)) + '.'); }
    if (mode === 'note') { if (!f.title.trim() && !f.body.trim()) return; const id = uid(); S.saveNote({ id, title: f.title.trim(), body: f.body.trim() ? `<p>${esc(f.body.trim()).replace(/\n/g, '<br>')}</p>` : '', folderId: null, tags: [], createdAt: new Date().toISOString() }); toast('Saved to Inbox.', { label: 'Open', fn: () => openNote(id) }); }
    if (mode === 'log') { if (!f.metric) return; toast('Logged.'); }
    if (mode === 'event') { if (!f.title.trim() || !f.time) { toast('Add a title and a start time.'); return; } const st = toMin(f.time); const en = f.end ? toMin(f.end) : st + 60; S.saveEvent({ id: uid(), title: f.title.trim(), date: f.date, start: f.time, end: fromMin(Math.min(1440, Math.max(st + 15, en))), allDay: false, cat: 'personal' }); toast('Event added.'); }
    close();
  };
  const onKey = e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); save(); } };
  const m = S.metric(f.metric);
  const titles = { todo: 'new to-do', note: 'new note', log: 'log a metric', event: 'new event' };
  return html`<${Modal} title=${titles[mode]} size="narrow" onClose=${close} actions=${html`<button class="btn ghost left" onClick=${() => setV({ quick: 'menu' })}>Back</button><button class="btn" onClick=${save}>${mode === 'log' ? 'Done' : 'Save'}</button>`}>
    <div class="fields" onKeyDown=${onKey}>
      ${mode === 'todo' ? html`
        <div class="field full"><label for="qa-t">Task</label><input id="qa-t" class="input" autofocus value=${f.title} onInput=${e => up({ title: e.target.value })} placeholder="What needs doing" /></div>
        <div class="field"><label for="qa-d">Day</label><input id="qa-d" type="date" class="input" value=${f.date} onInput=${e => up({ date: e.target.value })} /></div>
        <div class="field"><label for="qa-k">Kind</label><select id="qa-k" class="input" value=${f.kind} onChange=${e => up({ kind: e.target.value })}><option value="fullDay">Full-day (anytime)</option><option value="timed">Scheduled slot</option></select></div>
        <div class="field full"><label for="qa-tm">${f.kind === 'timed' ? 'Start time' : 'Due by (optional)'}</label><input id="qa-tm" type="time" step="1800" class="input" value=${f.time} onInput=${e => up({ time: e.target.value })} /></div>` : null}
      ${mode === 'note' ? html`
        <div class="field full"><label for="qa-nt">Title</label><input id="qa-nt" class="input" autofocus value=${f.title} onInput=${e => up({ title: e.target.value })} placeholder="Optional" /></div>
        <div class="field full"><label for="qa-nb">Note</label><textarea id="qa-nb" class="input" value=${f.body} onInput=${e => up({ body: e.target.value })} placeholder="Write something down"></textarea></div>` : null}
      ${mode === 'log' ? html`
        <div class="field full"><label for="qa-m">Metric</label><select id="qa-m" class="input" value=${f.metric} onChange=${e => up({ metric: e.target.value })}>${S.metrics().map(x => html`<option value=${x.id}>${x.name}</option>`)}</select></div>
        ${m ? html`<div class="field full"><span class="lbl-s">Today</span><div style=${{ paddingTop: '6px' }}><${MetricInput} m=${m} date=${t0} /></div></div>` : html`<p class="muted full">Add a metric in Tracker first.</p>`}` : null}
      ${mode === 'event' ? html`
        <div class="field full"><label for="qa-et">Title</label><input id="qa-et" class="input" autofocus value=${f.title} onInput=${e => up({ title: e.target.value })} placeholder="What is happening" /></div>
        <div class="field full"><label for="qa-ed">Date</label><input id="qa-ed" type="date" class="input" value=${f.date} onInput=${e => up({ date: e.target.value })} /></div>
        <div class="field"><label for="qa-es">Start</label><input id="qa-es" type="time" step="900" class="input" value=${f.time} onInput=${e => up({ time: e.target.value })} /></div>
        <div class="field"><label for="qa-ee">End</label><input id="qa-ee" type="time" step="900" class="input" value=${f.end} onInput=${e => up({ end: e.target.value })} /></div>` : null}
    </div>
  <//>`;
}

/* ---------- global search ---------- */
function SearchOverlay() {
  const [q, setQ] = useState(''); const [sel, setSel] = useState(0);
  const close = () => setV({ overlay: null });
  useEsc(close);
  const res = useMemo(() => searchAll(q), [q, DB.rev]);
  const flat = res.flatMap(g => g.items);
  const openHit = it => {
    close();
    if (it.kind === 'note') openNote(it.id);
    else if (it.kind === 'task') { if (it.date) go('todo', { todoDate: it.date }); else go('todo'); }
    else if (it.kind === 'goal') go('goals', { id: it.id });
    else if (it.kind === 'metric') go('tracker', { id: it.id });
    else if (it.kind === 'folder') go('notes', { notesView: { kind: 'folder', id: it.id } });
  };
  const key = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(flat.length - 1, s + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
    if (e.key === 'Enter' && flat[sel]) openHit(flat[sel]);
  };
  let k = -1;
  return html`<div class="scrim" onMouseDown=${e => { if (e.target === e.currentTarget) close(); }}>
    <div class="search" role="dialog" aria-modal="true" aria-label="Search everything">
      <div class="q">${I.search}<input autofocus aria-label="Search everything" placeholder="Search notes, tasks, goals, metrics, events" value=${q} onInput=${e => { setQ(e.target.value); setSel(0); }} onKeyDown=${key} /><span class="kbd">Esc</span></div>
      <div class="res">
        ${!q ? html`<p class="muted it" style=${{ padding: '16px 22px' }}>Search every part of the app. To search notes only, use the search box inside Notes.</p>` : null}
        ${q && !flat.length ? html`<p class="muted it" style=${{ padding: '16px 22px' }}>Nothing matches “${q}”.</p>` : null}
        ${res.map(g => html`<div><div class="grp lbl-s">${g.group}</div>${g.items.map(it => { k++; const i = k; return html`<button class=${'hit' + (i === sel ? ' on' : '')} onMouseEnter=${() => setSel(i)} onClick=${() => openHit(it)}><span style=${{ fontSize: '17px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%' }}>${highlight(it.title || 'Untitled', q)}</span><span class="s">${highlight(it.sub || '', q)}</span></button>`; })}</div>`)}
      </div>
    </div>
  </div>`;
}

/* ---------- settings ---------- */
function Settings() {
  const s = S.settings(); const close = () => setV({ overlay: null });
  const fileRef = useRef();
  const status = DB.mode === 'synced' ? 'Saved to your account. Changes sync across your devices.' : DB.mode === 'syncing' ? 'Connecting to your account storage…' : 'Saved in this browser only. Export regularly to keep a copy.';
  const doExport = async () => {
    const name = `master-backup-${todayStr()}.json`; const r = await offerFile(name, exportData());
    if (r === null) setV({ overlay: 'exporttext' }); else if (r) toast('Backup saved.');
  };
  const doImport = e => {
    const file = e.target.files[0]; if (!file) return; const rd = new FileReader();
    rd.onload = async () => { const ok = await ask({ title: 'Replace everything with this backup?', body: 'Your current data will be replaced by the file’s contents. Export first if you want a copy.', confirm: 'Replace', danger: true }); if (!ok) return; try { importData(rd.result); toast('Backup restored.'); } catch (err) { toast(err.message || 'That file could not be read.'); } };
    rd.readAsText(file); e.target.value = '';
  };
  return html`<${Modal} title="settings" sub=${status} onClose=${close}>
    <div class="fields">
      <div class="field"><label for="st-name">Your name</label><input id="st-name" class="input" value=${s.name} onInput=${e => S.setSettings({ name: e.target.value })} /></div>
      <div class="field"><label for="st-theme">Theme</label><select id="st-theme" class="input" value=${s.theme} onChange=${e => S.setSettings({ theme: e.target.value })}><option value="system">Match system</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
      <div class="field"><label for="st-type">Typeface</label><select id="st-type" class="input" value=${s.typeface || 'grotesk'} onChange=${e => S.setSettings({ typeface: e.target.value })}><option value="grotesk">Grotesk (editorial)</option><option value="serif">Serif (Playfair)</option></select></div>
      <div class="field"><label for="st-clock">Time format</label><select id="st-clock" class="input" value=${s.clock} onChange=${e => S.setSettings({ clock: e.target.value })}><option value="24">24-hour (14:30)</option><option value="12">12-hour (2:30 pm)</option></select></div>
      <div class="field"><label for="st-ws">Week starts on</label><select id="st-ws" class="input" value=${s.weekStart} onChange=${e => S.setSettings({ weekStart: +e.target.value })}><option value="1">Monday</option><option value="0">Sunday</option></select></div>
      <div class="field"><label for="st-carry">Unfinished full-day tasks</label><select id="st-carry" class="input" value=${s.carry} onChange=${e => S.setSettings({ carry: e.target.value })}><option value="ask">Ask me at the end of the day</option><option value="carry">Carry to the next day</option><option value="backlog">Move to backlog</option><option value="drop">Drop them</option></select></div>
      <div class="field"><label for="st-ds">Day view opens at</label><select id="st-ds" class="input" value=${s.dayStart} onChange=${e => S.setSettings({ dayStart: +e.target.value })}>${[5, 6, 7, 8, 9].map(hh => html`<option value=${hh}>${pad(hh)}:00</option>`)}</select></div>
    </div>
    <div style=${{ marginTop: '34px' }}>
      <${SecHead} label="your data" />
      <div class="toolbar">
        <button class="btn ghost sm" onClick=${doExport}>Export backup</button>
        <button class="btn ghost sm" onClick=${() => fileRef.current.click()}>Import backup</button>
        <input type="file" accept=".json,application/json" ref=${fileRef} hidden onChange=${doImport} />
        <button class="btn ghost sm" onClick=${() => { close(); loadDemo(); toast('Demo data loaded. Clear it any time in Settings.'); }}>Load demo data</button>
        <button class="btn ghost sm" onClick=${async () => { if (await ask({ title: 'Clear demo data?', body: 'This removes every example metric, goal, task, event and note. Anything you added stays.', confirm: 'Clear demo data' })) { clearDemo(); toast('Demo data cleared.'); } }}>Clear demo data</button>
      </div>
      <button class="txtbtn" style=${{ marginTop: '26px', color: 'var(--bad)' }} onClick=${async () => { if (await ask({ title: 'Delete all data?', body: 'Every metric, goal, task, event and note will be deleted. This cannot be undone.', confirm: 'Delete everything', danger: true, typed: 'DELETE' })) { deleteEverything(); close(); toast('All data deleted.'); } }}>Delete all data</button>
      ${DB.signOut ? html`<div style=${{ marginTop: '18px' }}><button class="txtbtn" onClick=${DB.signOut}>Sign out${DB.userEmail ? ' (' + DB.userEmail + ')' : ''}</button></div>` : null}
    </div>
    <div style=${{ marginTop: '30px' }}>
      <${SecHead} label="shortcuts" />
      <p class="muted" style=${{ marginTop: '12px' }}><span class="kbd">N</span> new note · <span class="kbd">/</span> search everything · <span class="kbd">?</span> this list · <span class="kbd">Esc</span> close</p>
    </div>
  <//>`;
}
function ExportText() {
  const close = () => setV({ overlay: null, exportPayload: null }); const ref = useRef();
  const p = V.exportPayload || { title: 'Copy your backup', sub: 'Saving files is not available here. Copy this text into a file named master-backup.json.', text: exportData() };
  return html`<${Modal} title=${p.title} sub=${p.sub} onClose=${close} actions=${html`<button class="btn" onClick=${async () => { try { await navigator.clipboard.writeText(p.text); toast('Copied.'); } catch (e) { ref.current.select(); toast('Press Ctrl+C or Cmd+C to copy.'); } }}>Copy</button>`}>
    <textarea ref=${ref} class="input tnum" style=${{ minHeight: '260px', fontSize: '12px' }} readonly value=${p.text}></textarea>
  <//>`;
}
function Shortcuts() {
  const close = () => setV({ overlay: null });
  return html`<${Modal} title="shortcuts" size="narrow" onClose=${close}>
    ${[['N', 'Start a new note'], ['/', 'Search everything'], ['?', 'Show this list'], ['Esc', 'Close a panel or dialog']].map(([k, d]) => html`<div class="taskrow"><span class="kbd" style=${{ minWidth: '42px', textAlign: 'center' }}>${k}</span><span class="n">${d}</span></div>`)}
  <//>`;
}

/* ---------- end of day: unfinished full-day tasks ---------- */
function pendingCarry() {
  const t0 = todayStr();
  return S.allTasks().filter(t => t.date && t.date < t0 && t.kind === 'fullDay' && !t.done && !t.dropped && !t.resolved && diffDays(t.date, t0) <= 14);
}
function autoCarry() {
  const mode = S.settings().carry; if (mode === 'ask') return;
  const list = pendingCarry(); if (!list.length) return;
  list.forEach(t => resolveCarry(t, mode));
}
function resolveCarry(t, how) {
  const t0 = todayStr();
  if (how === 'carry') { S.saveTask({ ...t, resolved: true, carriedTo: t0, dropped: true }); S.saveTask({ ...t, id: uid(), date: t0, carriedFrom: t.date, resolved: false }); }
  else if (how === 'backlog') { S.saveTask({ ...t, resolved: true, dropped: true }); S.saveTask({ ...t, id: uid(), date: null, resolved: false }); }
  else S.saveTask({ ...t, resolved: true, dropped: true });
}
function EodPrompt() {
  const list = pendingCarry();
  const close = () => setV({ overlay: null });
  if (!list.length) { setTimeout(close, 0); return null; }
  return html`<${Modal} title="unfinished from earlier" sub="Choose what happens to these full-day tasks. Scheduled time slots clear on their own." onClose=${close} actions=${html`<button class="btn ghost" onClick=${() => { list.forEach(t => resolveCarry(t, 'drop')); close(); }}>Drop all</button><button class="btn" onClick=${() => { list.forEach(t => resolveCarry(t, 'carry')); toast(`Carried ${list.length} to today.`); close(); }}>Carry all to today</button>`}>
    ${list.map(t => html`<div class="taskrow" style=${{ flexWrap: 'wrap' }}><span class="n">${t.title}<span class="muted it" style=${{ fontSize: '13px', marginLeft: '10px' }}>${fmtShort(t.date)}</span></span>
      <span style=${{ display: 'flex', gap: '14px' }}><button class="txtbtn" onClick=${() => resolveCarry(t, 'carry')}>Carry</button><button class="txtbtn" onClick=${() => resolveCarry(t, 'backlog')}>Backlog</button><button class="txtbtn" onClick=${() => resolveCarry(t, 'drop')}>Drop</button></span></div>`)}
  <//>`;
}

/* ---------- small helpers ---------- */
function DayNav({ date, onChange, label }) {
  const t0 = todayStr();
  return html`<div class="daynav" role="group" aria-label=${label || 'Change day'}>
    <button class="iconbtn" aria-label="Previous day" onClick=${() => onChange(addDays(date, -1))}>${I.left}</button>
    <button class="txtbtn" style=${{ padding: '4px 8px' }} disabled=${date === t0} onClick=${() => onChange(t0)}>today</button>
    <button class="iconbtn" aria-label="Next day" onClick=${() => onChange(addDays(date, 1))}>${I.right}</button>
    <label class="iconbtn" style=${{ position: 'relative', cursor: 'pointer' }} title="Pick a date"><span class="sr">Pick a date</span>${I.nav.calendar}<input type="date" value=${date} onChange=${e => e.target.value && onChange(e.target.value)} style=${{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} /></label>
  </div>`;
}
function SecHead({ label, onClick, right }) {
  const inner = html`<span class="st">${String(label).toLowerCase()}</span><span class="spacer"></span>${right ? html`<span class="sm">${right}</span>` : null}`;
  if (onClick) return html`<button class="sechead" onClick=${onClick}>${inner}<span class="arw" aria-hidden="true">→</span></button>`;
  return html`<div class="sechead">${inner}</div>`;
}
/* Week strip: the main date switcher on Today and To-do */
function WeekStrip({ date, onChange, mark }) {
  const t0 = todayStr(); const ws = S.settings().weekStart; const first = weekStart(date, ws);
  const days = Array.from({ length: 7 }, (_, i) => addDays(first, i));
  return html`<div class="week" role="group" aria-label="Choose a day">
    <div class="ctl"><button class="iconbtn" aria-label="Previous week" onClick=${() => onChange(addDays(date, -7))}>${I.left}</button></div>
    <div class="days">${days.map(d => html`<button class=${'wd' + (d === date ? ' on' : '') + (d === t0 ? ' today' : '')} aria-pressed=${d === date} aria-label=${fmtFull(d)} onClick=${() => onChange(d)}>
      <span class="w">${DAYS[dow(d)].slice(0, 3).toLowerCase()}</span><span class="n tnum">${pd(d).getDate()}</span><span class=${'pip' + (mark && mark(d) ? ' has' : '')}></span></button>`)}</div>
    <div class="ctl"><button class="iconbtn" aria-label="Next week" onClick=${() => onChange(addDays(date, 7))}>${I.right}</button>
      <button class="txtbtn" style=${{ margin: '0 10px' }} disabled=${date === t0} onClick=${() => onChange(t0)}>${date === t0 ? 'today' : 'back to today'}</button>
      <label class="iconbtn" style=${{ position: 'relative', cursor: 'pointer' }} title="Pick a date"><span class="sr">Pick a date</span>${I.nav.calendar}<input type="date" value=${date} onChange=${e => e.target.value && onChange(e.target.value)} style=${{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} /></label></div>
  </div>`;
}
function CatSelect({ id, value, onChange }) { return html`<select id=${id} class="input" value=${value || 'personal'} onChange=${e => onChange(e.target.value)}>${CATS.map(c => html`<option value=${c.id}>${c.name}</option>`)}</select>`; }
