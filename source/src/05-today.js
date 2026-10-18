/* ===== Today ===== */
const QUOTE = 'The curse of discipline is that every day looks the same. The curse of indiscipline is that every year does.';
function useClock() { const [, f] = useState(0); useEffect(() => { const t = setInterval(() => f(x => x + 1), 20000); return () => clearInterval(t); }, []); }
function greeting() { const hh = new Date().getHours(); return hh < 5 ? 'good night' : hh < 12 ? 'good morning' : hh < 17 ? 'good afternoon' : 'good evening'; }
function relWord(date) { const k = diffDays(todayStr(), date); return k === 0 ? 'today' : k === -1 ? 'yesterday' : k === 1 ? 'tomorrow' : k < 0 ? 'earlier' : 'ahead'; }
function relText(date) { const k = diffDays(todayStr(), date); return k === 0 ? 'today' : k === -1 ? 'yesterday' : k === 1 ? 'tomorrow' : k < 0 ? `${-k} days ago` : `in ${k} days`; }

function Badge({ text = 'show up for yourself · show up for yourself · ' }) {
  return html`<svg class="badge" viewBox="0 0 120 120" aria-hidden="true">
    <defs><path id="badge-c" d="M60,60 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0"></path></defs>
    <g class="spin"><text textLength="292" lengthAdjust="spacing"><textPath href="#badge-c">${text}</textPath></text></g>
    <circle cx="60" cy="60" r="25" style=${{ fill: 'var(--red)' }}></circle>
  </svg>`;
}

function Today() {
  useClock();
  const t0 = todayStr(); const date = V.todayDate || t0; const isToday = date === t0; const future = date > t0;
  const setDate = d => setV({ todayDate: d === t0 ? null : d });
  const s = S.settings(); const name = (s.name || 'there').toLowerCase();
  const tasks = S.tasksOn(date, true);
  const timed = tasks.filter(t => t.kind === 'timed').sort((a, b) => toMin(a.start) - toMin(b.start));
  const fullDay = tasks.filter(t => t.kind !== 'timed').sort((a, b) => (a.done - b.done) || ((toMin(a.due) ?? 9999) - (toMin(b.due) ?? 9999)));
  const metrics = S.metrics().filter(m => m.showToday !== false && (m.created || '0000') <= date);
  const logged = metrics.filter(m => { const e = S.entry(m.id, date); return e && e.v != null; }).length;
  const planned = timed.reduce((a, t) => a + (t.dur || 30), 0);
  const nm = nowMin();
  const upcoming = timed.filter(t => !t.done).map(t => ({ title: t.title, start: toMin(t.start) })).sort((a, b) => a.start - b.start);
  const next = isToday ? upcoming.find(u => u.start > nm) : upcoming[0];
  const goals = S.goals().filter(g => (g.status || 'active') === 'active' && (!g.start || g.start <= date || !future)).slice(0, 4);
  const d = pd(date); const y = d.getFullYear();
  const showWelcome = !hasAnyData() && !s.dismissedWelcome;
  const clock = (() => { const n = new Date(); if (s.clock === '12') { const hh = n.getHours() % 12 || 12; return [`${hh}:${pad(n.getMinutes())}`, n.getHours() >= 12 ? 'pm' : 'am']; } return [`${pad(n.getHours())}:${pad(n.getMinutes())}`, '']; })();
  const notesDay = S.notes().filter(n => !n.deletedAt && ((n.day || (n.createdAt || '').slice(0, 10)) === date)).slice(0, 5);
  const busy = dd => S.tasksOn(dd).length > 0;

  return html`<${Fragment}>
    <section class="wrap hero">
      <div style=${{ minWidth: 0 }}>
        <div class="meta"><span>${s.name || 'You'} / ${y}</span><span>${isToday ? 'today' : `viewing ${relText(date)}`}</span></div>
        <div class="hero-top">
          <div style=${{ minWidth: 0 }}>
            <h2 class="greet">${greeting()}, ${name}</h2>
            <p class="quote">${QUOTE}</p>
          </div>
          <div class="now">
            ${isToday ? html`<div class="lbl-s">now</div><div class="clock tnum">${clock[0]}${clock[1] ? html`<small>${clock[1]}</small>` : null}</div>`
              : html`<div class="lbl-s">viewing</div><div class="clock" style=${{ fontSize: '40px' }}>${relText(date)}</div>`}
            <div class="next"><div class="lbl-s">${isToday ? 'next' : 'first up'}</div><div class="tnum">${next ? html`${next.title} · ${fmtTime(next.start)}` : html`<span class="muted">nothing else scheduled</span>`}</div></div>
          </div>
        </div>
        <div class="dayrow"><h1 class="dayname">${DAYS[d.getDay()].toLowerCase()}</h1><${Badge} /></div>
        <div class="dateline">
          <span class="dnum tnum">${d.getDate()}.</span>
          <div class="dmeta"><div class="m">${MONTHS[d.getMonth()].toLowerCase()}</div><div class="s tnum">${y} · week ${weekNum(date)} · day ${dayOfYear(date)} · ${daysInYear(y) - dayOfYear(date)} days left in the year</div></div>
        </div>
        <${WeekStrip} date=${date} onChange=${setDate} mark=${busy} />
      </div>
      <div class="vword" aria-hidden="true">${relWord(date)}</div>
    </section>

    <section class="wrap" aria-label="Day summary"><div class="summary">
      <a href="#todo" onClick=${e => { e.preventDefault(); go('todo', { todoDate: date }); }}><div class="k">tasks done</div><div class="num tnum">${tasks.filter(t => t.done).length}<span>/${tasks.length}</span></div><span class="go">open to-do →</span></a>
      <a href="#tracker" onClick=${e => { e.preventDefault(); go('tracker'); }}><div class="k">metrics logged</div><div class="num tnum">${logged}<span>/${metrics.length}</span></div><span class="go">${!future && logged < metrics.length ? 'log now →' : 'open tracker →'}</span></a>
      <a href="#todo" onClick=${e => { e.preventDefault(); go('todo', { todoDate: date }); }}><div class="k">time planned</div><div class="num tnum">${Math.floor(planned / 60)}<span>h</span>${pad(planned % 60)}<span>m</span></div><span class="go">plan the day →</span></a>
    </div></section>

    <section class="wrap page" style=${{ paddingTop: '60px' }}>
      ${showWelcome ? html`<div class="welcome"><div><h3>your app is ready.</h3><p class="muted" style=${{ marginTop: '8px' }}>Everything starts empty. Load demo data to see charts and goals filled in, or start fresh.</p></div><div class="toolbar"><button class="btn ghost" onClick=${() => S.setSettings({ dismissedWelcome: true })}>Start fresh</button><button class="btn accent" onClick=${() => { loadDemo(); toast('Demo data loaded. Clear it any time in Settings.'); }}>Load demo data</button></div></div>` : null}
      <div class="twocol">
        <div class="main">
          <div class="block">
            <${SecHead} label="tasks" right=${`${tasks.filter(t => t.done).length} of ${tasks.length} done`} onClick=${() => go('todo', { todoDate: date })} />
            <div class="grp-l">anytime today</div>
            ${fullDay.map((t, i) => html`<${TaskLine} t=${t} n=${i + 1} />`)}
            <${AddLine} placeholder=${`Add a task for ${isToday ? 'today' : fmtDM(date)}`} onAdd=${(title, due) => S.saveTask({ id: uid(), title, date, kind: 'fullDay', due, cat: 'personal', done: false })} />
            <div class="grp-l" style=${{ marginTop: '30px' }}>scheduled</div>
            ${timed.length ? timed.map(t => html`<${TaskLine} t=${t} timed />`) : html`<p class="muted" style=${{ padding: '8px 0' }}>No time slots planned. <button class="ulink" style=${{ marginLeft: '8px' }} onClick=${() => go('todo', { todoDate: date })}>Plan the day →</button></p>`}
          </div>
          <div class="block">
            <${SecHead} label="goals" right=${isToday ? null : `as of ${fmtDM(date)}`} onClick=${() => go('goals')} />
            ${goals.length ? goals.map(g => html`<${GoalTodayRow} g=${g} date=${date} future=${future} key=${g.id} />`) : html`<div class="empty"><p>No goals yet.</p><button class="ulink" style=${{ marginTop: '10px' }} onClick=${() => go('goals', { goalNew: true })}>Set a goal →</button></div>`}
          </div>
        </div>
        <div class="side">
          <div class="block">
            <${SecHead} label=${isToday ? 'log today' : 'log'} right=${isToday ? null : fmtShort(date).toLowerCase()} onClick=${() => go('tracker')} />
            ${future ? html`<p class="muted" style=${{ padding: '14px 0' }}>You can log this day once it arrives.</p>`
              : metrics.length ? metrics.map(m => html`<div class="logrow hl"><button class="n" onClick=${() => go('tracker', { id: m.id })}>${m.name}</button><${MetricInput} m=${m} date=${date} compact /></div>`)
              : html`<div class="empty"><p>Nothing tracked yet.</p><button class="ulink" style=${{ marginTop: '10px' }} onClick=${() => go('tracker')}>Add a metric →</button></div>`}
          </div>
          <div class="block">
            <${SecHead} label="consistency" right="17 weeks" onClick=${() => go('tracker')} />
            <div style=${{ marginTop: '16px' }}><${Heatmap} weeks=${17} anchor=${date < t0 ? t0 : date} selected=${date} level=${dd => scoreLevel(dayScore(dd))} title=${dd => { const sc = dayScore(dd); return `${fmtShort(dd)}: ${sc == null ? 'nothing planned' : Math.round(sc * 100) + '% done'}`; }} onPick=${dd => setDate(dd)} /></div>
            <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', gap: '12px', flexWrap: 'wrap' }}>
              <span class="tnum">streak <b class="d" style=${{ fontSize: '26px', color: 'var(--red)', letterSpacing: '-.03em', marginLeft: '6px' }}>${consistencyStreak(date > t0 ? t0 : date)}</b> <span class="muted">days</span></span>
              <${HeatKey} />
            </div>
            <p class="muted" style=${{ fontSize: '13px', marginTop: '10px' }}>Share of each day’s metrics logged and tasks done. Tap a square to open that day.</p>
          </div>
          <div class="block">
            <${SecHead} label="notes" right=${notesDay.length ? `${notesDay.length} from this day` : null} onClick=${() => go('notes')} />
            <${QuickNote} date=${date} />
            ${notesDay.map(n => html`<button class="taskrow hl" style=${{ width: '100%', background: 'none', border: 0, textAlign: 'left', color: 'inherit' }} onClick=${() => openNote(n.id)}><span class="n" style=${{ fontSize: '15px' }}>${noteTitle(n)}</span><span class="meta">${n.folderId ? S.folderPath(n.folderId) : 'inbox'}</span></button>`)}
            <div class="toolbar" style=${{ marginTop: '18px' }}><button class="ulink" onClick=${() => go('notes', { notesView: { kind: 'all' } })}>View all notes →</button><button class="ulink" onClick=${() => newNote({ kind: 'inbox' }, date)}>New note →</button></div>
          </div>
        </div>
      </div>
    </section>
  <//>`;
}
function GoalTodayRow({ g, date, future }) {
  const [open, setOpen] = useState(false); const gs = goalStats(g, date);
  return html`<div class="goalrow">
    <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}><button class="t" onClick=${() => go('goals', { id: g.id })}>${g.title}</button><span class=${'pill ' + gs.status}>${gs.statusText}</span></div>
    <div style=${{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px' }}><div class="bar"><i style=${{ width: gs.pct * 100 + '%' }}></i></div><span class="tnum muted" style=${{ fontSize: '13px', whiteSpace: 'nowrap' }}>${gs.valueText}</span>
      ${!future ? html`<button class="txtbtn" style=${{ color: open ? 'var(--ink)' : 'var(--red-ink)' }} aria-expanded=${open} onClick=${() => setOpen(!open)}>${open ? 'close' : 'log'}</button>` : null}</div>
    ${open ? html`<div class="inlinelog"><${GoalLog} g=${g} date=${date} compact /></div>` : null}
  </div>`;
}
function TaskLine({ t, timed, n }) {
  return html`<div class=${'taskrow hl' + (t.done ? ' done' : '')}>
    ${n ? html`<span class="num tnum">${n}.</span>` : null}
    <input type="checkbox" checked=${!!t.done} aria-label=${`Mark ${t.title} ${t.done ? 'not done' : 'done'}`} onChange=${() => S.toggleTask(t)} />
    ${timed ? html`<span class="tm tnum">${fmtTime(t.start)}</span>` : null}
    <button class="n" onClick=${() => openTask(t)}>${t.title}</button>
    ${!timed ? html`<span class="meta tnum">${t.due ? 'by ' + fmtTime(t.due) : 'anytime'}</span>` : html`<span class="meta tnum">${fmtDur(t.dur || 30)}</span>`}
  </div>`;
}
function AddLine({ placeholder, onAdd, withTime = true }) {
  const [v, setV2] = useState(''); const [due, setDue] = useState('');
  const add = () => { const t = v.trim(); if (!t) return; onAdd(t, due || null); setV2(''); setDue(''); };
  return html`<div class="taskrow" style=${{ borderTop: '1px solid var(--line)' }}>
    <span style=${{ width: '18px', textAlign: 'center', color: 'var(--red)', fontWeight: 600 }} aria-hidden="true">+</span>
    <input class="input" style=${{ border: 0, padding: '4px 0', flex: 1 }} aria-label=${placeholder} placeholder=${placeholder} value=${v} onInput=${e => setV2(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') add(); }} />
    ${withTime ? html`<select class="input tnum" aria-label="Due by (optional)" style=${{ width: 'auto', border: 0, fontSize: '13.5px', color: due ? 'var(--ink)' : 'var(--soft)' }} value=${due} onChange=${e => setDue(e.target.value)}><option value="">anytime</option>${Array.from({ length: 36 }, (_, i) => fromMin(360 + i * 30)).map(x => html`<option value=${x}>by ${fmtTime(x)}</option>`)}</select>` : null}
  </div>`;
}
function QuickNote({ date }) {
  const [v, setV2] = useState('');
  const save = () => { const t = v.trim(); if (!t) return; const id = uid(); S.saveNote({ id, title: t.length <= 70 ? t : '', body: t.length > 70 ? `<p>${esc(t)}</p>` : '', folderId: null, tags: [], createdAt: new Date().toISOString(), day: date && date !== todayStr() ? date : null }); setV2(''); toast('Saved to Inbox.', { label: 'Open', fn: () => openNote(id) }); };
  return html`<div style=${{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--line-2)', padding: '8px 0 9px' }}>
    <input type="text" placeholder="Write something down, press Enter" aria-label="Quick note" value=${v} onInput=${e => setV2(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') save(); }} style=${{ flex: 1, border: 0, background: 'none', fontSize: '16px', color: 'var(--ink)', outline: 'none', padding: '4px 0' }} />
  </div>`;
}
