/* ===== Calendar ===== */
const HOUR_H = 48; const MIN_PX = HOUR_H / 60;
function Calendar() {
  const t0 = todayStr(); const date = V.calDate || t0; const view = V.calView || 'week'; const ws = S.settings().weekStart;
  const [hidden, setHidden] = useState([]); const [draft, setDraft] = useState(null); const fileRef = useRef();
  const setDate = d => setV({ calDate: d });
  let days, title;
  if (view === 'day') { days = [date]; title = fmtFull(date); }
  else if (view === 'week') { const f = weekStart(date, ws); days = Array.from({ length: 7 }, (_, i) => addDays(f, i)); title = `${fmtDM(days[0])} to ${fmtDM(days[6])} ${days[6].slice(0, 4)}`; }
  else { title = `${MONTHS[+date.slice(5, 7) - 1]} ${date.slice(0, 4)}`; }
  const shift = dir => setDate(view === 'day' ? addDays(date, dir) : view === 'week' ? addDays(date, 7 * dir) : addMonths(monthStart(date), dir));
  const visible = e => !hidden.includes(e.cat || 'personal');
  const open = V.calOpen; const openEv = open ? (open.id === 'new' ? open : (() => { const base = S.findEvent(open.id); if (!base) return null; return base.rule ? { ...base, id: base.id + '@' + open.date, baseId: base.id, date: open.date, recurring: true } : base; })()) : null;
  const closePanel = () => setV({ calOpen: null });
  const unscheduled = S.tasksOn(t0, true).filter(t => !t.done && t.kind !== 'timed' && !t.eventId);
  const importIcs = e => { const file = e.target.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { try { const evs = parseIcs(rd.result); evs.forEach(ev => S.saveEvent(ev, true)); toast(`Imported ${evs.length} event${evs.length === 1 ? '' : 's'}.`); } catch (err) { toast('That file could not be read as a calendar.'); } }; rd.readAsText(file); e.target.value = ''; };
  const exportIcs = async () => { const r = await offerFile('master-calendar.ics', toIcs()); if (r === null) setV({ overlay: 'exporttext', exportPayload: { title: 'Copy your calendar', sub: 'Saving files is not available here. Copy this into a file named master-calendar.ics.', text: toIcs() } }); else if (r) toast('Calendar exported.'); };
  return html`<section class="wrap page">
    <div class="pagehead">
      <div><div class="meta"><span>${title.toLowerCase()}</span></div><h1 class="pagetitle">calendar</h1></div>
      <div class="toolbar">
        <div class="seg" role="group" aria-label="View">${[['day', 'Day'], ['week', 'Week'], ['month', 'Month']].map(([k, l]) => html`<button class=${view === k ? 'on' : ''} aria-pressed=${view === k} onClick=${() => setV({ calView: k })}>${l}</button>`)}</div>
        <div class="daynav"><button class="iconbtn" aria-label="Previous" onClick=${() => shift(-1)}>${I.left}</button><button class="txtbtn" style=${{ padding: '4px 8px' }} onClick=${() => setDate(t0)}>Today</button><button class="iconbtn" aria-label="Next" onClick=${() => shift(1)}>${I.right}</button></div>
        <button class="btn accent" onClick=${() => setV({ calOpen: { id: 'new', date: view === 'month' ? (date.slice(0, 7) === t0.slice(0, 7) ? t0 : monthStart(date)) : (days.includes(t0) ? t0 : days[0]), start: '09:00', end: '10:00', title: '', cat: 'personal', allDay: false } })}>New event</button>
      </div>
    </div>
    <div class="cal-wrap">
      <aside class="cal-rail">
        <div><${SecHead} label="categories" />${CATS.map(c => html`<label class="check" style=${{ padding: '6px 0' }}><input type="checkbox" checked=${!hidden.includes(c.id)} onChange=${() => setHidden(hidden.includes(c.id) ? hidden.filter(x => x !== c.id) : [...hidden, c.id])} /><i class="dot" style=${{ background: catVar(c.id) }}></i>${c.name}</label>`)}</div>
        <div><${SecHead} label="open to-dos" />${unscheduled.length ? unscheduled.map(t => html`<div class="taskrow hl" draggable="true" style=${{ cursor: 'grab', minHeight: '38px', padding: '7px 14px' }} onDragStart=${e => { e.dataTransfer.setData('text/plain', 'task:' + t.id); }} title="Drag onto the calendar to block time"><span class="n" style=${{ fontSize: '15px' }}>${t.title}</span><span class="meta">drag →</span></div>`) : html`<p class="muted it" style=${{ fontSize: '14px' }}>Nothing left to schedule today.</p>`}</div>
        <div><${SecHead} label="import & export" /><div class="toolbar"><button class="btn ghost sm" onClick=${() => fileRef.current.click()}>Import .ics</button><button class="btn ghost sm" onClick=${exportIcs}>Export .ics</button></div><input type="file" accept=".ics,text/calendar" hidden ref=${fileRef} onChange=${importIcs} /></div>
      </aside>
      <div style=${{ minWidth: 0 }}>
        ${view === 'month' ? html`<${MonthGrid} date=${date} visible=${visible} />` : html`<${TimeGrid} days=${days} visible=${visible} draft=${draft} setDraft=${setDraft} />`}
      </div>
    </div>
    ${openEv ? html`<${EventPanel} key=${openEv.id + (openEv.date || '')} ev=${openEv} onClose=${closePanel} />` : null}
  </section>`;
}

function TimeGrid({ days, visible, draft, setDraft }) {
  const box = useRef(); const cols = useRef(); const t0 = todayStr(); const nm = nowMin();
  const [drag, setDrag] = useState(null); const [title, setTitle] = useState(''); const liveD = useRef(false);
  useEffect(() => { if (box.current) box.current.scrollTop = Math.max(0, S.settings().dayStart * HOUR_H - 6); }, [days[0], days.length]);
  const n = days.length; const gridCols = `repeat(${n}, minmax(0,1fr))`;
  const at = (clientX, clientY) => { const r = cols.current.getBoundingClientRect(); const ci = clamp(Math.floor((clientX - r.left) / (r.width / n)), 0, n - 1); const m = clamp(Math.round((clientY - r.top) / MIN_PX / 15) * 15, 0, 1440); return { ci, m }; };
  const evsByDay = days.map(d => S.eventsOn(d).filter(visible));
  const startCreate = e => { if (e.button !== 0 || e.target !== e.currentTarget) return; const p = at(e.clientX, e.clientY); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ kind: 'new', ci: p.ci, a: p.m, b: p.m + 60, moved: false, y0: e.clientY }); };
  const moveCreate = e => { if (!drag || drag.kind !== 'new') return; const p = at(e.clientX, e.clientY); const moved = drag.moved || Math.abs(e.clientY - drag.y0) > 6; setDrag({ ...drag, b: moved ? Math.max(drag.a + 15, p.m) : drag.a + 60, moved }); };
  const endCreate = () => { if (!drag || drag.kind !== 'new') return; liveD.current = true; setDraft({ date: days[drag.ci], start: fromMin(drag.a), end: fromMin(Math.min(1440, drag.b)) }); setTitle(''); setDrag(null); };
  const saveDraft = () => { if (!liveD.current) return; liveD.current = false; const tt = title.trim(); if (tt && draft) S.saveEvent({ id: uid(), title: tt, date: draft.date, start: draft.start, end: draft.end, allDay: false, cat: 'personal' }); setDraft(null); setTitle(''); };
  const evDown = (e, ev, mode) => { if (e.button !== 0) return; e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ kind: mode, ev, x0: e.clientX, y0: e.clientY, ci0: days.indexOf(ev.date), s0: toMin(ev.start), e0: toMin(ev.end), ci: days.indexOf(ev.date), s: toMin(ev.start), e: toMin(ev.end), moved: false, alt: e.altKey }); };
  const evMove = e => {
    if (!drag || drag.kind === 'new') return; const dy = e.clientY - drag.y0; const dm = Math.round(dy / MIN_PX / 15) * 15; const moved = drag.moved || Math.abs(dy) > 4 || Math.abs(e.clientX - drag.x0) > 6;
    if (drag.kind === 'move') { const p = at(e.clientX, e.clientY); const len = drag.e0 - drag.s0; const s = clamp(drag.s0 + dm, 0, 1440 - len); setDrag({ ...drag, ci: p.ci, s, e: s + len, moved }); }
    else setDrag({ ...drag, e: clamp(drag.e0 + dm, drag.s0 + 15, 1440), moved });
  };
  const evUp = () => {
    if (!drag || drag.kind === 'new') return; const d = drag; setDrag(null);
    if (!d.moved) { setV({ calOpen: { id: d.ev.baseId || d.ev.id, date: d.ev.date } }); return; }
    const nd = days[d.ci]; const patch = { date: nd, start: fromMin(d.s), end: fromMin(d.e) };
    if (d.alt) { const c = { ...d.ev, ...patch, id: uid() }; delete c.rule; delete c.taskId; S.saveEvent(c, true); toast('Event duplicated.'); return; }
    if (d.ev.recurring) { const base = S.findEvent(d.ev.baseId); S.saveEvent({ ...base, exceptions: [...(base.exceptions || []), d.ev.date] }); const single = { ...base, ...patch, id: uid() }; delete single.rule; delete single.exceptions; S.saveEvent(single, true); toast('Moved this occurrence only.'); return; }
    S.saveEvent({ ...d.ev, ...patch }, true);
    if (d.ev.taskId) { const t = S.findTask(d.ev.taskId); if (t) S.saveTask({ ...t, date: nd, kind: 'timed', start: patch.start, dur: d.e - d.s }); }
  };
  const onDrop = e => {
    e.preventDefault(); const data = e.dataTransfer.getData('text/plain'); if (!data.startsWith('task:')) return;
    const t = S.findTask(data.slice(5)); if (!t) return; const p = at(e.clientX, e.clientY); const dur = t.dur || 30; const id = uid();
    S.saveEvent({ id, title: t.title, date: days[p.ci], start: fromMin(p.m), end: fromMin(Math.min(1440, p.m + dur)), allDay: false, cat: t.cat || 'personal', taskId: t.id }, true);
    S.saveTask({ ...t, date: days[p.ci], kind: 'timed', start: fromMin(p.m), dur, eventId: id }); toast(`Blocked ${fmtTime(p.m)} for “${t.title}”.`);
  };
  return html`<div>
    <div class="cal-head" style=${{ gridTemplateColumns: gridCols }}>${days.map((d, i) => { const tot = evsByDay[i].reduce((a, e) => a + evDur(e), 0); return html`<button class=${'dh' + (d === t0 ? ' today' : '')} onClick=${() => setV({ calView: 'day', calDate: d })} aria-label=${`Open ${fmtFull(d)}`}><div class="lbl-s">${DAYS[dow(d)].slice(0, 3).toLowerCase()}</div><div class="d2 tnum">${pd(d).getDate()}</div><div class="muted tnum" style=${{ fontSize: '12px', marginTop: '4px' }}>${tot ? fmtDur(tot) + ' blocked' : ' '}</div></button>`; })}</div>
    <div class="cal-allday" style=${{ gridTemplateColumns: gridCols }}>${days.map((d, i) => html`<div>${evsByDay[i].filter(e => e.allDay).map(e => html`<button class="adchip" style=${{ '--c': catVar(e.cat) }} onClick=${() => setV({ calOpen: { id: e.baseId || e.id, date: d } })}>${e.title}</button>`)}</div>`)}</div>
    <div class="cal-grid" ref=${box}>
      <div style=${{ position: 'relative', height: 24 * HOUR_H + 'px' }}>
        ${Array.from({ length: 24 }, (_, hh) => html`<div class="tl-slot" style=${{ top: hh * HOUR_H + 'px', left: '58px' }}></div><div class="tl-slot half" style=${{ top: hh * HOUR_H + HOUR_H / 2 + 'px', left: '58px' }}></div>${hh ? html`<div class="tl-hour tnum" style=${{ top: hh * HOUR_H + 'px', left: 0 }}>${fmtTime(hh * 60)}</div>` : null}`)}
        <div class="cal-cols" ref=${cols} style=${{ gridTemplateColumns: gridCols, height: 24 * HOUR_H + 'px' }} onDragOver=${e => e.preventDefault()} onDrop=${onDrop}>
          ${days.map((d, ci) => {
            const evs = evsByDay[ci].filter(e => !e.allDay).map(e => drag && drag.ev && (drag.ev.id === e.id) && drag.kind !== 'new' && !drag.alt ? null : e).filter(Boolean);
            const ghost = drag && drag.ev && drag.kind !== 'new' && drag.ci === ci ? { ...drag.ev, start: fromMin(drag.s), end: fromMin(drag.e), id: '__ghost' } : null;
            const list = ghost ? [...evs, ghost] : evs;
            const lanes = laneLayout(list, e => toMin(e.start), e => Math.max(toMin(e.start) + 15, toMin(e.end)));
            const we = dow(d) === 0 || dow(d) === 6;
            return html`<div class=${'cal-col' + (we ? ' we' : '')} onPointerDown=${e => { if (e.target === e.currentTarget) setDraft(null); startCreate(e); }} onPointerMove=${moveCreate} onPointerUp=${endCreate}>
              ${d === t0 ? html`<div class="tl-now" style=${{ top: nm * MIN_PX + 'px', left: 0 }}></div>` : null}
              ${list.map(e => { const s = toMin(e.start), en = Math.max(s + 15, toMin(e.end)); const L = lanes.get(e.id) || { lane: 0, lanes: 1 }; const w = 100 / L.lanes; const task = e.taskId ? S.findTask(e.taskId) : null;
                return html`<div class=${'blk' + (e.id === '__ghost' ? ' drag' : '') + (task && task.done ? ' done' : '')} style=${{ '--c': catVar(e.cat), top: s * MIN_PX + 1 + 'px', height: Math.max(18, (en - s) * MIN_PX - 2) + 'px', left: `calc(${L.lane * w}% + 2px)`, width: `calc(${w}% - 4px)`, fontSize: '13px', padding: '3px 6px 3px 7px' }}
                  role="button" tabindex="0" aria-label=${`${e.title}, ${fmtTime(e.start)} to ${fmtTime(e.end)}`} onKeyDown=${k => { if (k.key === 'Enter') setV({ calOpen: { id: e.baseId || e.id, date: d } }); }}
                  onPointerDown=${p => e.id !== '__ghost' && evDown(p, e, 'move')} onPointerMove=${evMove} onPointerUp=${evUp}>
                  <span class="bt">${e.title}${(en - s) >= 45 ? html`<small class="tnum">${fmtTime(s)}–${fmtTime(en)}${e.recurring ? ' · repeats' : ''}</small>` : null}</span>
                  <span class="rz" onPointerDown=${p => evDown(p, e, 'resize')} aria-hidden="true"></span>
                </div>`; })}
              ${drag && drag.kind === 'new' && drag.ci === ci ? html`<div class="ghostblk" style=${{ top: drag.a * MIN_PX + 'px', height: (drag.b - drag.a) * MIN_PX + 'px' }}>${fmtTime(drag.a)}–${fmtTime(Math.min(1440, drag.b))}</div>` : null}
              ${draft && draft.date === d ? html`<div class="tl-new" style=${{ top: toMin(draft.start) * MIN_PX + 'px', minHeight: (toMin(draft.end) - toMin(draft.start)) * MIN_PX + 'px' }} onPointerDown=${e => e.stopPropagation()}>
                <div class="muted tnum" style=${{ fontSize: '11px' }}>${fmtTime(draft.start)}–${fmtTime(draft.end)}</div>
                <input autofocus aria-label="New event title" placeholder="Event title, press Enter" value=${title} onInput=${e => setTitle(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } if (e.key === 'Escape') { liveD.current = false; setDraft(null); setTitle(''); } }} onBlur=${() => { if (title.trim()) saveDraft(); else { liveD.current = false; setDraft(null); } }} />
                <button class="txtbtn" style=${{ fontSize: '10px' }} onMouseDown=${e => e.preventDefault()} onClick=${() => { liveD.current = false; setV({ calOpen: { id: 'new', date: draft.date, start: draft.start, end: draft.end, title, cat: 'personal', allDay: false } }); setDraft(null); }}>more options</button>
              </div>` : null}
            </div>`;
          })}
        </div>
      </div>
    </div>
    <p class="muted" style=${{ fontSize: '13px', marginTop: '10px' }}>Drag on empty space to block time. Drag an event to move it, its bottom edge to resize. Hold Alt while dragging to duplicate.</p>
  </div>`;
}

function MonthGrid({ date, visible }) {
  const t0 = todayStr(); const ws = S.settings().weekStart; const first = monthStart(date); const start = weekStart(first, ws);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i)); const m = date.slice(0, 7);
  const heads = Array.from({ length: 7 }, (_, i) => DAYS[(ws + i) % 7].slice(0, 3));
  const drop = (e, d) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (!id.startsWith('ev:')) return; const ev = S.findEvent(id.slice(3)); if (!ev || ev.rule) { toast('Repeating events move from the day or week view.'); return; } S.saveEvent({ ...ev, date: d }, true); };
  return html`<div class="month" role="grid" aria-label="Month">
    ${heads.map(hd => html`<div class="mh">${hd.toLowerCase()}</div>`)}
    ${cells.map(d => { const evs = S.eventsOn(d).filter(visible); return html`<div class=${'mc' + (d.slice(0, 7) !== m ? ' out' : '') + (d === t0 ? ' today' : '')} onClick=${e => { if (e.target === e.currentTarget) setV({ calOpen: { id: 'new', date: d, start: '09:00', end: '10:00', title: '', cat: 'personal', allDay: false } }); }} onDragOver=${e => e.preventDefault()} onDrop=${e => drop(e, d)}>
      <button class="n tnum" aria-label=${`Open ${fmtFull(d)}`} onClick=${() => setV({ calView: 'day', calDate: d })}>${pd(d).getDate()}</button>
      ${evs.slice(0, 3).map(e => html`<button class="adchip" draggable=${!e.recurring} onDragStart=${ev => ev.dataTransfer.setData('text/plain', 'ev:' + e.id)} style=${{ '--c': catVar(e.cat) }} onClick=${() => setV({ calOpen: { id: e.baseId || e.id, date: d } })}>${e.allDay ? '' : fmtTime(e.start) + ' '}${e.title}</button>`)}
      ${evs.length > 3 ? html`<button class="txtbtn" style=${{ fontSize: '10px', textAlign: 'left' }} onClick=${() => setV({ calView: 'day', calDate: d })}>+${evs.length - 3} more</button>` : null}
    </div>`; })}
  </div>`;
}

function EventPanel({ ev, onClose }) {
  const isNew = ev.id === 'new';
  const [f, setF] = useState(() => ({ title: '', date: todayStr(), start: '09:00', end: '10:00', allDay: false, cat: 'personal', loc: '', notes: '', reminder: '', ...ev, rule: ev.rule ? { ...ev.rule } : { type: 'none', days: [], until: null } }));
  const [scope, setScope] = useState(null);
  const up = p => setF({ ...f, ...p });
  const task = ev.taskId ? S.findTask(ev.taskId) : null;
  const valid = () => { if (!f.title.trim()) { toast('Add a title.'); return false; } if (!f.allDay && toMin(f.end) <= toMin(f.start)) { toast('End time must be after the start.'); return false; } return true; };
  const normalized = () => { const o = { ...f, title: f.title.trim() }; if (!o.rule || o.rule.type === 'none') o.rule = null; else if (o.rule.type !== 'weekly') o.rule = { ...o.rule, days: [] }; else if (!o.rule.days.length) o.rule = { ...o.rule, days: [dow(o.date)] }; if (o.allDay) { o.start = null; o.end = null; } return o; };
  const save = (sc) => {
    if (!valid()) return; const o = normalized();
    if (isNew) { S.saveEvent({ ...o, id: uid() }); toast('Event added.'); onClose(); return; }
    if (ev.recurring) {
      if (!sc) { setScope('save'); return; }
      const base = S.findEvent(ev.baseId);
      if (sc === 'one') { S.saveEvent({ ...base, exceptions: [...(base.exceptions || []), ev.date] }); const s1 = { ...o, id: uid() }; s1.rule = null; delete s1.exceptions; S.saveEvent(s1, true); }
      else if (sc === 'following') { S.saveEvent({ ...base, rule: { ...base.rule, until: addDays(ev.date, -1) } }); S.saveEvent({ ...o, id: uid(), exceptions: [] }); }
      else { S.saveEvent({ ...base, ...o, id: base.id, date: base.date }); }
      toast('Event saved.'); onClose(); return;
    }
    S.saveEvent({ ...o, id: ev.id }); toast('Event saved.'); onClose();
  };
  const del = async (sc) => {
    if (ev.recurring) {
      if (!sc) { setScope('delete'); return; }
      const base = S.findEvent(ev.baseId);
      if (sc === 'one') S.saveEvent({ ...base, exceptions: [...(base.exceptions || []), ev.date] });
      else if (sc === 'following') S.saveEvent({ ...base, rule: { ...base.rule, until: addDays(ev.date, -1) } });
      else S.deleteEvent(base.id);
      toast('Deleted.'); onClose(); return;
    }
    const old = S.findEvent(ev.id); S.deleteEvent(ev.id); onClose(); toast('Event deleted.', { label: 'Undo', fn: () => S.saveEvent(old, true) });
  };
  const slots = Array.from({ length: 96 }, (_, i) => fromMin(i * 15)).concat(['24:00']);
  return html`<${Panel} title=${isNew ? 'new event' : 'event'} onClose=${onClose}>
    <div class="field"><label for="ep-t">Title</label><input id="ep-t" class="input" style=${{ fontSize: '20px' }} autofocus=${isNew} value=${f.title} onInput=${e => up({ title: e.target.value })} onKeyDown=${e => { if (e.key === 'Enter') save(); }} /></div>
    <div class="fields">
      <div class="field full"><label for="ep-d">Date</label><input id="ep-d" type="date" class="input" value=${f.date} onInput=${e => up({ date: e.target.value || f.date })} /></div>
      <label class="check full"><input type="checkbox" checked=${f.allDay} onChange=${e => up({ allDay: e.target.checked, start: f.start || '09:00', end: f.end || '10:00' })} /> All day</label>
      ${!f.allDay ? html`<div class="field"><label for="ep-s">Start</label><select id="ep-s" class="input tnum" value=${f.start} onChange=${e => { const s = e.target.value; const len = toMin(f.end) - toMin(f.start); up({ start: s, end: fromMin(Math.min(1440, toMin(s) + Math.max(15, len))) }); }}>${slots.slice(0, 96).map(s => html`<option value=${s}>${fmtTime(s)}</option>`)}</select></div>
      <div class="field"><label for="ep-e">End</label><select id="ep-e" class="input tnum" value=${f.end} onChange=${e => up({ end: e.target.value })}>${slots.slice(1).map(s => html`<option value=${s}>${s === '24:00' ? 'Midnight' : fmtTime(s)}</option>`)}</select></div>` : null}
      <div class="field"><label for="ep-c">Category</label><${CatSelect} id="ep-c" value=${f.cat} onChange=${v => up({ cat: v })} /></div>
      <div class="field"><label for="ep-rm">Reminder</label><select id="ep-rm" class="input" value=${f.reminder || ''} onChange=${e => up({ reminder: e.target.value })}><option value="">None</option><option value="0">At start</option><option value="10">10 minutes before</option><option value="60">1 hour before</option><option value="1440">1 day before</option></select></div>
      <div class="field"><label for="ep-r">Repeat</label><select id="ep-r" class="input" value=${f.rule.type} onChange=${e => up({ rule: { ...f.rule, type: e.target.value, days: e.target.value === 'weekly' ? (f.rule.days.length ? f.rule.days : [dow(f.date)]) : [] } })}><option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option><option value="yearly">Every year</option></select></div>
      ${f.rule.type !== 'none' ? html`<div class="field"><label for="ep-u">Until (optional)</label><input id="ep-u" type="date" class="input" value=${f.rule.until || ''} onInput=${e => up({ rule: { ...f.rule, until: e.target.value || null } })} /></div>` : null}
      ${f.rule.type === 'weekly' ? html`<div class="field full"><span class="lbl-s">On</span><div class="toolbar" style=${{ gap: '6px' }}>${[1, 2, 3, 4, 5, 6, 0].map(x => html`<button class=${'chip' + (f.rule.days.includes(x) ? ' on' : '')} onClick=${() => up({ rule: { ...f.rule, days: f.rule.days.includes(x) ? f.rule.days.filter(y => y !== x) : [...f.rule.days, x] } })}>${DAYS[x].slice(0, 3)}</button>`)}</div></div>` : null}
    </div>
    <div class="field"><label for="ep-l">Location or link</label><input id="ep-l" class="input" value=${f.loc || ''} onInput=${e => up({ loc: e.target.value })} placeholder="Optional" /></div>
    <div class="field"><label for="ep-n">Notes</label><textarea id="ep-n" class="input" value=${f.notes || ''} onInput=${e => up({ notes: e.target.value })} placeholder="Optional"></textarea></div>
    ${task ? html`<label class="check"><input type="checkbox" checked=${!!task.done} onChange=${() => S.toggleTask(task)} /> Linked to-do done: ${task.title}</label>` : null}
    ${scope ? html`<div style=${{ border: '1px solid var(--line-2)', padding: '16px' }}><p style=${{ marginBottom: '12px' }}>${scope === 'save' ? 'Save changes to' : 'Delete'} which events?</p><div class="toolbar"><button class="btn sm" onClick=${() => scope === 'save' ? save('one') : del('one')}>This event</button><button class="btn ghost sm" onClick=${() => scope === 'save' ? save('following') : del('following')}>This and following</button><button class="btn ghost sm" onClick=${() => scope === 'save' ? save('all') : del('all')}>All events</button><button class="txtbtn" onClick=${() => setScope(null)}>Cancel</button></div></div>` : null}
    <div class="toolbar">${!isNew ? html`<button class="txtbtn" style=${{ color: 'var(--bad)' }} onClick=${() => del()}>Delete</button>` : null}<span class="spacer"></span><button class="btn ghost" onClick=${onClose}>Cancel</button><button class="btn" onClick=${() => save()}>${isNew ? 'Add event' : 'Save'}</button></div>
  <//>`;
}

/* Reminders: in-app banners while the page is open */
const reminded = new Set();
function checkReminders() { return; // calendar lives in Google Calendar now

  const t0 = todayStr(); const nm = nowMin();
  [t0, addDays(t0, 1)].forEach(d => S.eventsOn(d).forEach(e => {
    if (e.reminder === '' || e.reminder == null || e.allDay) return; const lead = +e.reminder; const st0 = toMin(e.start) + (d === t0 ? 0 : 1440);
    const key = e.id + d; if (reminded.has(key)) return;
    if (nm >= st0 - lead && nm < st0 + 1) { reminded.add(key); toast(`${e.title} ${lead ? `starts at ${fmtTime(e.start)}` : 'is starting now'}.`, { label: 'Open', fn: () => openEvent({ ...e, id: e.baseId || e.id, date: d }) }); }
  }));
}
