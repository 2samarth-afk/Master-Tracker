/* ===== To-do ===== */
const SLOT_H = 32; // px per 30 minutes
function laneLayout(items, startOf, endOf) {
  const sorted = items.slice().sort((a, b) => startOf(a) - startOf(b) || endOf(b) - endOf(a));
  const out = new Map(); let group = []; let groupEnd = -1;
  const flushGroup = () => { const lanes = []; group.forEach(it => { let li = lanes.findIndex(end => end <= startOf(it)); if (li < 0) { li = lanes.length; lanes.push(0); } lanes[li] = endOf(it); out.set(it.id, { lane: li }); }); group.forEach(it => { out.get(it.id).lanes = lanes.length; }); group = []; groupEnd = -1; };
  sorted.forEach(it => { if (group.length && startOf(it) >= groupEnd) flushGroup(); group.push(it); groupEnd = Math.max(groupEnd, endOf(it)); });
  flushGroup(); return out;
}
function syncTaskEvent(t) {
  if (!t.eventId) return; const ev = S.findEvent(t.eventId); if (!ev || ev.rule) return;
  if (t.kind === 'timed' && t.date) S.saveEvent({ ...ev, title: t.title, date: t.date, start: t.start, end: fromMin(Math.min(1440, toMin(t.start) + (t.dur || 30))) }, true);
}
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => fromMin(i * 30));

function Todo() {
  const t0 = todayStr(); const date = V.todoDate || t0; const setDate = d => setV({ todoDate: d === t0 ? null : d });
  const [editing, setEditing] = useState(null); const [wrap, setWrap] = useState(false);
  const tasks = S.tasksOn(date, true);
  const timed = tasks.filter(t => t.kind === 'timed');
  const full = tasks.filter(t => t.kind !== 'timed').sort((a, b) => (a.done - b.done) || ((toMin(a.due) ?? 9999) - (toMin(b.due) ?? 9999)));
  const done = tasks.filter(t => t.done).length;
  const d = pd(date); const pend = pendingCarry().length;
  const unfinishedToday = full.filter(t => !t.done);
  const backlog = S.backlog();
  const reps = S.repeats().filter(r => r.active !== false);
  const last7 = Array.from({ length: 7 }, (_, i) => { const dd = addDays(date > t0 ? t0 : date, i - 6); const ts = S.tasksOn(dd); return { d: dd, done: ts.filter(t => t.done).length, n: ts.length }; });
  const dropFull = e => { e.preventDefault(); e.currentTarget.classList.remove('dropzone'); const id = e.dataTransfer.getData('text/plain'); const t = S.findTask(id); if (!t) return; S.saveTask({ ...t, date, kind: 'fullDay', start: null }); };
  const dropBacklog = e => { e.preventDefault(); e.currentTarget.classList.remove('dropzone'); const id = e.dataTransfer.getData('text/plain'); const t = S.findTask(id); if (!t) return; S.saveTask({ ...t, date: null, kind: 'fullDay', start: null }); toast('Moved to backlog.'); };
  const dz = { onDragOver: e => { e.preventDefault(); e.currentTarget.classList.add('dropzone'); }, onDragLeave: e => e.currentTarget.classList.remove('dropzone') };
  const busy = dd => S.tasksOn(dd).length > 0;
  return html`<section class="wrap page">
    <div class="pagehead">
      <div><div class="meta"><span>to-do</span><span>${fmtLong(date).toLowerCase()} ${d.getFullYear()}</span><span>${relText(date)}</span></div><h1 class="pagetitle">${DAYS[d.getDay()].toLowerCase()}</h1></div>
      <div style=${{ textAlign: 'right' }}><div class="d tnum" style=${{ fontSize: '64px', color: 'var(--red)', letterSpacing: '-.05em' }}>${done}<span style=${{ color: 'var(--muted)' }}>/${tasks.length}</span></div><div class="lbl-s" style=${{ marginTop: '6px' }}>done ${date === t0 ? 'today' : 'that day'}</div></div>
    </div>
    <div style=${{ marginTop: '-22px', marginBottom: '30px' }}><${WeekStrip} date=${date} onChange=${setDate} mark=${busy} /></div>
    <${Composer} date=${date} />
    ${pend && S.settings().carry === 'ask' ? html`<div class="welcome" style=${{ padding: '16px 22px', marginBottom: '34px' }}><span>${pend} unfinished full-day ${pend === 1 ? 'task' : 'tasks'} from earlier days.</span><button class="btn accent sm" onClick=${() => setV({ overlay: 'eod' })}>Decide now</button></div>` : null}
    <div class="todo-layout">
      <div style=${{ minWidth: 0 }}>
        <${SecHead} label="timeline" right="click a slot to add · drag to move · drag the bottom edge to resize" />
        <${Timeline} date=${date} tasks=${timed} onEdit=${t => setEditing(t.id)} />
      </div>
      <div style=${{ minWidth: 0 }}>
        <div class="block" ...${dz} onDrop=${dropFull}>
          <${SecHead} label="anytime" right=${`${full.filter(t => t.done).length} of ${full.length}`} />
          ${full.length ? full.map((t, i) => html`<div class=${'taskrow hl' + (t.done ? ' done' : '')} draggable="true" onDragStart=${e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; }} title="Drag onto the timeline to give it a time">
            <span class="num tnum">${i + 1}.</span>
            <input type="checkbox" checked=${!!t.done} aria-label=${`Mark ${t.title} done`} onChange=${() => S.toggleTask(t)} />
            <button class="n" onClick=${() => setEditing(t.id)}>${t.title}${t.repeatId ? html`<span class="muted" style=${{ fontSize: '12px', marginLeft: '8px' }}>repeats</span>` : null}${t.carriedFrom ? html`<span class="muted" style=${{ fontSize: '12px', marginLeft: '8px' }}>from ${fmtDM(t.carriedFrom)}</span>` : null}</button>
            <span class="meta tnum">${t.due ? 'by ' + fmtTime(t.due) : 'anytime'}</span>
          </div>`) : html`<p class="muted" style=${{ padding: '14px 0' }}>Nothing for anytime. Add one above and leave the time on “anytime”.</p>`}
          ${date === t0 && unfinishedToday.length && nowMin() >= 18 * 60 ? html`<button class="ulink" style=${{ marginTop: '16px' }} onClick=${() => setWrap(true)}>Wrap up today →</button>` : null}
          <p class="muted" style=${{ fontSize: '13px', marginTop: '12px' }}>Drag any of these onto the timeline to give it a time.</p>
        </div>
        <div class="block" ...${dz} onDrop=${dropBacklog}>
          <${SecHead} label="backlog" right=${`${backlog.length}`} />
          ${backlog.map(t => html`<div class="taskrow hl" draggable="true" onDragStart=${e => { e.dataTransfer.setData('text/plain', t.id); }}>
            <button class="n" onClick=${() => setEditing(t.id)}>${t.title}</button>
            <button class="txtbtn" style=${{ color: 'var(--red-ink)' }} onClick=${() => { S.saveTask({ ...t, date }); toast(`Added to ${date === t0 ? 'today' : fmtShort(date)}.`); }}>${date === t0 ? 'do today' : 'add to ' + fmtDM(date).toLowerCase()}</button>
          </div>`)}
          <${AddLine} placeholder="Add to backlog (no date)" withTime=${false} onAdd=${title => S.saveTask({ id: uid(), title, date: null, kind: 'fullDay', cat: 'personal', done: false })} />
        </div>
        ${reps.length ? html`<div class="block"><${SecHead} label="repeating" />${reps.map(r => html`<div class="taskrow"><span class="n" style=${{ fontSize: '15px' }}>${r.title}</span><span class="meta">${ruleText(r.rule)}${r.kind === 'timed' ? ' · ' + fmtTime(r.start) : ''}</span><button class="txtbtn" onClick=${async () => { if (await ask({ title: 'Stop repeating?', body: `“${r.title}” will stop appearing on future days. Days already planned keep it.`, confirm: 'Stop' })) S.setList('repeats', S.repeats().map(x => x.id === r.id ? { ...x, active: false } : x)); }}>stop</button></div>`)}</div>` : null}
        <div class="block">
          <${SecHead} label="last 7 days" right=${(() => { const a = last7.reduce((s2, x) => s2 + x.done, 0), b = last7.reduce((s2, x) => s2 + x.n, 0); return b ? `${Math.round(a / b * 100)}% done` : 'no tasks yet'; })()} />
          <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '8px', alignItems: 'end', height: '100px', marginTop: '16px' }}>${last7.map(x => { const p = x.n ? x.done / x.n : 0; return html`<button title=${`${fmtShort(x.d)}: ${x.done} of ${x.n} done`} aria-label=${`${fmtShort(x.d)}: ${x.done} of ${x.n} done`} onClick=${() => setDate(x.d)} style=${{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'stretch', height: '100%', background: 'none', border: 0, padding: 0, gap: '6px' }}><span style=${{ height: Math.max(3, p * 70) + 'px', background: x.n ? (x.d === date ? 'var(--red)' : 'var(--ink)') : 'var(--line)' }}></span><span class="lbl-s" style=${{ textAlign: 'center', color: x.d === date ? 'var(--red-ink)' : null }}>${DAYS[dow(x.d)].slice(0, 2).toLowerCase()}</span></button>`; })}</div>
        </div>
      </div>
    </div>
    ${editing && S.findTask(editing) ? html`<${TaskPanel} t=${S.findTask(editing)} onClose=${() => setEditing(null)} />` : null}
    ${wrap ? html`<${WrapUp} list=${unfinishedToday} onClose=${() => setWrap(false)} />` : null}
  </section>`;
}
function Composer({ date }) {
  const [title, setTitle] = useState(''); const [time, setTime] = useState(''); const [dur, setDur] = useState(30); const ref = useRef();
  const add = () => {
    const t = title.trim(); if (!t) { ref.current && ref.current.focus(); return; }
    if (time) S.saveTask({ id: uid(), title: t, date, kind: 'timed', start: time, dur: +dur, cat: 'personal', done: false });
    else S.saveTask({ id: uid(), title: t, date, kind: 'fullDay', cat: 'personal', done: false });
    toast(time ? `Scheduled at ${fmtTime(time)}.` : 'Added to anytime.');
    setTitle(''); setTime(''); setDur(30); ref.current && ref.current.focus();
  };
  return html`<form class="composer" onSubmit=${e => { e.preventDefault(); add(); }}>
    <input ref=${ref} class="t" id="todo-composer" aria-label="New task" placeholder=${`Add a task for ${date === todayStr() ? 'today' : fmtShort(date)}`} value=${title} onInput=${e => setTitle(e.target.value)} />
    <select aria-label="Time" value=${time} onChange=${e => setTime(e.target.value)}><option value="">anytime</option>${HALF_HOURS.map(x => html`<option value=${x}>${fmtTime(x)}</option>`)}</select>
    <select aria-label="Length" value=${dur} disabled=${!time} onChange=${e => setDur(+e.target.value)}>${[30, 60, 90, 120, 180, 240].map(m => html`<option value=${m}>${fmtDur(m)}</option>`)}</select>
    <button type="submit">Add</button>
  </form>`;
}
const ruleText = r => !r ? '' : r.type === 'daily' ? 'every day' : r.type === 'weekdays' ? 'weekdays' : r.type === 'weekly' ? 'every ' + (r.days || []).map(x => DAYS[x].slice(0, 3).toLowerCase()).join(', ') : r.type === 'monthly' ? 'every month' : r.type === 'yearly' ? 'every year' : '';

function WrapUp({ list, onClose }) {
  const t1 = addDays(todayStr(), 1);
  const act = (t, how) => { if (how === 'carry') { S.saveTask({ ...t, resolved: true, dropped: true }); S.saveTask({ ...t, id: uid(), date: t1, carriedFrom: t.date }); } else if (how === 'backlog') { S.saveTask({ ...t, resolved: true, dropped: true }); S.saveTask({ ...t, id: uid(), date: null }); } else S.saveTask({ ...t, resolved: true, dropped: true }); };
  const live = list.filter(t => S.findTask(t.id) && !S.findTask(t.id).dropped);
  if (!live.length) { setTimeout(onClose, 0); return null; }
  return html`<${Modal} title="wrap up today" sub="Unfinished anytime tasks. Scheduled slots clear on their own." onClose=${onClose} actions=${html`<button class="btn accent" onClick=${() => { live.forEach(t => act(t, 'carry')); toast('Moved to tomorrow.'); onClose(); }}>Move all to tomorrow</button>`}>
    ${live.map(t => html`<div class="taskrow" style=${{ flexWrap: 'wrap' }}><span class="n">${t.title}</span><span style=${{ display: 'flex', gap: '14px' }}><button class="txtbtn" onClick=${() => act(t, 'carry')}>tomorrow</button><button class="txtbtn" onClick=${() => act(t, 'backlog')}>backlog</button><button class="txtbtn danger" onClick=${() => act(t, 'drop')}>drop</button></span></div>`)}
  <//>`;
}

function Timeline({ date, tasks, onEdit }) {
  const box = useRef(); const inner = useRef(); const cancel = useRef(false); const live = useRef(false);
  const [drag, setDrag] = useState(null); const [newAt, setNewAt] = useState(null); const [title, setTitle] = useState(''); const [hover, setHover] = useState(null); const [hint, setHint] = useState(null);
  useEffect(() => { if (box.current) box.current.scrollTop = Math.max(0, S.settings().dayStart * 2 * SLOT_H - 8); }, [date]);
  const minAt = clientY => { const r = inner.current.getBoundingClientRect(); return clamp(Math.floor((clientY - r.top) / SLOT_H) * 30, 0, 1410); };
  const isToday = date === todayStr(); const nm = nowMin();
  const items = tasks.map(t => drag && drag.id === t.id ? { ...t, start: fromMin(drag.start), dur: drag.dur } : t);
  const taskIds = new Set(tasks.map(t => t.id));
  const evs = [];
  const all = [...items.map(t => ({ ...t, _start: toMin(t.start), _end: toMin(t.start) + (t.dur || 30) })), ...evs];
  const lanes = laneLayout(all, x => x._start, x => x._end);
  const down = (e, t, mode) => {
    if (e.target.tagName === 'INPUT' || e.button !== 0) return;
    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setHint(null);
    setDrag({ id: t.id, mode, y0: e.clientY, s0: toMin(t.start), d0: t.dur || 30, start: toMin(t.start), dur: t.dur || 30, moved: false });
  };
  const move = e => {
    if (!drag) return; const dy = e.clientY - drag.y0; const steps = Math.round(dy / SLOT_H);
    const n = { ...drag, moved: drag.moved || Math.abs(dy) > 4 };
    if (drag.mode === 'move') n.start = clamp(drag.s0 + steps * 30, 0, 1440 - drag.d0); else n.dur = clamp(drag.d0 + steps * 30, 30, 1440 - drag.s0);
    setDrag(n);
  };
  const up = (e, t) => {
    if (!drag) return; const dd = drag; setDrag(null);
    if (!dd.moved) { onEdit(t); return; }
    const nt = { ...t, start: fromMin(dd.start), dur: dd.dur }; S.saveTask(nt); syncTaskEvent(nt);
  };
  // Enter blurs the input; the blur is the only place that saves, so a task is created exactly once
  const commit = () => { if (!live.current) return; live.current = false; const tt = title.trim(); const at = newAt; setTitle(''); setNewAt(null); if (cancel.current) { cancel.current = false; return; } if (tt && at != null) S.saveTask({ id: uid(), title: tt, date, kind: 'timed', start: fromMin(at), dur: 30, cat: 'personal', done: false }); };
  const onDrop = e => { e.preventDefault(); setHover(null); const id = e.dataTransfer.getData('text/plain'); const t = S.findTask(id); if (!t) return; const st0 = minAt(e.clientY); const nt = { ...t, date, kind: 'timed', start: fromMin(st0), dur: t.dur || 30 }; S.saveTask(nt); syncTaskEvent(nt); toast(`Scheduled at ${fmtTime(st0)}.`); };
  const onMove = e => { if (drag || newAt != null) return; if (e.target !== inner.current) { if (hint != null) setHint(null); return; } const m = minAt(e.clientY); if (m !== hint) setHint(m); };
  return html`<div class="tl" ref=${box}>
    <div class="tl-inner" ref=${inner} style=${{ height: 48 * SLOT_H + 'px' }}
      onMouseMove=${onMove} onMouseLeave=${() => setHint(null)}
      onClick=${e => { if (e.target === inner.current && newAt == null) { live.current = true; cancel.current = false; setNewAt(minAt(e.clientY)); setTitle(''); setHint(null); } }}
      onDragOver=${e => { e.preventDefault(); setHover(minAt(e.clientY)); }} onDragLeave=${() => setHover(null)} onDrop=${onDrop}>
      ${Array.from({ length: 48 }, (_, i) => html`<div class=${'tl-slot' + (i % 2 ? ' half' : '')} style=${{ top: i * SLOT_H + 'px', height: SLOT_H + 'px' }}></div>`)}
      ${Array.from({ length: 24 }, (_, hh) => hh ? html`<div class="tl-hour tnum" style=${{ top: hh * 2 * SLOT_H + 'px' }}>${fmtTime(hh * 60)}</div>` : null)}
      ${isToday ? html`<div class="tl-now" style=${{ top: nm / 30 * SLOT_H + 'px' }} aria-hidden="true"><span class="tnum">${fmtTime(nm)}</span></div>` : null}
      ${hint != null ? html`<div class="tl-hint tnum" style=${{ top: hint / 30 * SLOT_H + 2 + 'px', height: SLOT_H - 4 + 'px' }}>+ ${fmtTime(hint)}  add a task</div>` : null}
      ${hover != null ? html`<div class="ghostblk" style=${{ top: hover / 30 * SLOT_H + 'px', height: SLOT_H - 2 + 'px' }}>${fmtTime(hover)}</div>` : null}
      ${evs.map(e => { const L = lanes.get(e.id) || { lane: 0, lanes: 1 }; const w = 100 / L.lanes; return html`<div class="evctx" style=${{ top: e._start / 30 * SLOT_H + 1 + 'px', height: (e._end - e._start) / 30 * SLOT_H - 2 + 'px', left: `calc(${L.lane * w}% + 4px)`, width: `calc(${w}% - 8px)` }} title="Calendar event: open in Calendar" onClick=${ev => { ev.stopPropagation(); openEvent({ ...e, id: e.baseId || e.id.slice(3) }); }}><b style=${{ fontWeight: 500 }}>${e.title}</b> <span class="tnum">${fmtTime(e._start)}–${fmtTime(e._end)}</span> · calendar</div>`; })}
      ${items.map(t => {
        const s0 = toMin(t.start), du = t.dur || 30; const L = lanes.get(t.id) || { lane: 0, lanes: 1 }; const w = 100 / L.lanes;
        const ev = t.eventId ? S.findEvent(t.eventId) : null;
        return html`<div class=${'blk' + (t.done ? ' done' : '') + (drag && drag.id === t.id ? ' drag' : '')} style=${{ '--c': catVar(t.cat), top: s0 / 30 * SLOT_H + 1 + 'px', height: du / 30 * SLOT_H - 2 + 'px', left: `calc(${L.lane * w}% + 4px)`, width: `calc(${w}% - 8px)` }}
          onPointerDown=${e => down(e, t, 'move')} onPointerMove=${move} onPointerUp=${e => up(e, t)} onClick=${e => e.stopPropagation()} role="button" tabindex="0" aria-label=${`${t.title}, ${fmtTime(s0)} for ${fmtDur(du)}`} onKeyDown=${e => { if (e.key === 'Enter') onEdit(t); }}>
          <input type="checkbox" checked=${!!t.done} aria-label=${`Mark ${t.title} done`} onChange=${() => S.toggleTask(t)} onPointerDown=${e => e.stopPropagation()} />
          <span class="bt">${t.title}${du >= 60 ? html`<small class="tnum">${fmtTime(s0)}–${fmtTime(s0 + du)}</small>` : html`<span class="tnum" style=${{ fontSize: '12px', marginLeft: '8px', color: 'var(--soft)', fontWeight: 400 }}>${fmtTime(s0)}</span>`}</span>
          <span class="rz" onPointerDown=${e => down(e, t, 'resize')} aria-hidden="true"></span>
        </div>`;
      })}
      ${newAt != null ? html`<div class="tl-new" style=${{ top: newAt / 30 * SLOT_H + 'px' }} onClick=${e => e.stopPropagation()}>
        <input autofocus aria-label=${`New task at ${fmtTime(newAt)}`} placeholder=${`${fmtTime(newAt)} · type a task, press Enter`} value=${title} onInput=${e => setTitle(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } if (e.key === 'Escape') { cancel.current = true; e.currentTarget.blur(); } }} onBlur=${commit} />
      </div>` : null}
    </div>
  </div>`;
}

function TaskPanel({ t, onClose }) {
  const set = p => { const n = { ...t, ...p }; S.saveTask(n); syncTaskEvent(n); };
  const rep = t.repeatId ? S.repeats().find(r => r.id === t.repeatId) : null;
  const setRepeat = type => {
    if (type === 'none') { if (rep) S.setList('repeats', S.repeats().map(r => r.id === rep.id ? { ...r, active: false } : r)); set({ repeatId: null }); return; }
    const rule = { type, days: type === 'weekly' ? [dow(t.date || todayStr())] : [] };
    if (rep && rep.active !== false) { S.setList('repeats', S.repeats().map(r => r.id === rep.id ? { ...r, rule } : r)); return; }
    const r = { id: uid(), title: t.title, kind: t.kind, start: t.start, dur: t.dur, due: t.due, cat: t.cat, rule, from: t.date || todayStr(), goalId: t.goalId, metricId: t.metricId, active: true };
    S.setList('repeats', [...S.repeats(), r]);
    const b = 't~' + (t.date || todayStr()).slice(0, 7); const doc = getDoc('s', b) || { items: [] }; const gen = doc.gen || {}; const dd = t.date || todayStr();
    setDoc('s', b, { ...doc, gen: { ...gen, [dd]: [...(gen[dd] || []), r.id] } });
    set({ repeatId: r.id });
  };
  const ev = t.eventId ? S.findEvent(t.eventId) : null;
  const toCal = () => {
    if (ev) { S.deleteEvent(ev.id); set({ eventId: null }); toast('Removed from calendar.'); return; }
    if (t.kind !== 'timed' || !t.date) { toast('Give the task a day and a time slot first.'); return; }
    const id = uid(); S.saveEvent({ id, title: t.title, date: t.date, start: t.start, end: fromMin(Math.min(1440, toMin(t.start) + (t.dur || 30))), allDay: false, cat: t.cat || 'personal', taskId: t.id }, true); set({ eventId: id }); toast('Added to calendar.');
  };
  const del = () => { const old = clone(t); if (ev) S.deleteEvent(ev.id); S.removeTask(t.id); onClose(); toast('Task deleted.', { label: 'Undo', fn: () => S.saveTask(old) }); };
  return html`<${Panel} title=${t.date ? fmtShort(t.date).toLowerCase() : 'backlog'} onClose=${onClose}>
    <label class="check" style=${{ fontSize: '16px' }}><input type="checkbox" checked=${!!t.done} onChange=${() => S.toggleTask(t)} /> ${t.done ? 'Done' : 'Not done yet'}</label>
    <div class="field"><label for="tp-t">Task</label><input id="tp-t" class="input" style=${{ fontSize: '20px' }} value=${t.title} onInput=${e => set({ title: e.target.value })} /></div>
    <div class="fields">
      <div class="field"><label for="tp-d">Day</label><input id="tp-d" type="date" class="input" value=${t.date || ''} onInput=${e => set({ date: e.target.value || null })} /></div>
      <div class="field"><label for="tp-k">When</label><select id="tp-k" class="input" value=${t.kind} onChange=${e => set({ kind: e.target.value, start: e.target.value === 'timed' ? (t.start || '09:00') : null, dur: t.dur || 30 })}><option value="fullDay">Anytime that day</option><option value="timed">A time slot</option></select></div>
      ${t.kind === 'timed' ? html`
        <div class="field"><label for="tp-s">Start</label><select id="tp-s" class="input tnum" value=${t.start} onChange=${e => set({ start: e.target.value })}>${HALF_HOURS.map(s => html`<option value=${s}>${fmtTime(s)}</option>`)}</select></div>
        <div class="field"><label for="tp-du">Length</label><select id="tp-du" class="input" value=${t.dur || 30} onChange=${e => set({ dur: +e.target.value })}>${[30, 60, 90, 120, 150, 180, 240, 300, 360, 480].map(m => html`<option value=${m}>${fmtDur(m)}</option>`)}</select></div>` : html`
        <div class="field full"><label for="tp-due">Due by (optional)</label><select id="tp-due" class="input tnum" value=${t.due || ''} onChange=${e => set({ due: e.target.value || null })}><option value="">anytime</option>${HALF_HOURS.map(s => html`<option value=${s}>by ${fmtTime(s)}</option>`)}</select></div>`}
      <div class="field"><label for="tp-c">Category</label><${CatSelect} id="tp-c" value=${t.cat} onChange=${v => set({ cat: v })} /></div>
      <div class="field"><label for="tp-r">Repeat</label><select id="tp-r" class="input" value=${rep && rep.active !== false ? rep.rule.type : 'none'} onChange=${e => setRepeat(e.target.value)} disabled=${!t.date}><option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekly">Every week on ${DAYS[dow(t.date || todayStr())]}</option></select></div>
      <div class="field"><label for="tp-g">Counts toward goal</label><select id="tp-g" class="input" value=${t.goalId || ''} onChange=${e => set({ goalId: e.target.value || null })}><option value="">None</option>${S.goals().filter(g => goalLogStyle(g) === 'check').map(g => html`<option value=${g.id}>${g.title}</option>`)}</select></div>
      <div class="field"><label for="tp-m">Logs metric when done</label><select id="tp-m" class="input" value=${t.metricId || ''} onChange=${e => set({ metricId: e.target.value || null })}><option value="">None</option>${S.metrics().filter(m => m.type === 'yesno').map(m => html`<option value=${m.id}>${m.name}</option>`)}</select></div>
    </div>
    <div class="field"><label for="tp-n">Note</label><textarea id="tp-n" class="input" value=${t.note || ''} onInput=${e => set({ note: e.target.value })} placeholder="Optional"></textarea></div>
    <div class="toolbar">
      ${t.date ? html`<button class="btn ghost sm" onClick=${() => { set({ date: null, kind: 'fullDay', start: null }); onClose(); toast('Moved to backlog.'); }}>Move to backlog</button>` : html`<button class="btn ghost sm" onClick=${() => set({ date: todayStr() })}>Do today</button>`}
      <span class="spacer"></span><button class="txtbtn danger" onClick=${del}>Delete</button>
    </div>
  <//>`;
}
