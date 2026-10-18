/* ===== Tracker ===== */
const TEMPLATES = [
  { name: 'Sleep', type: 'duration', target: 450, direction: 'up', category: 'Health' },
  { name: 'Workout', type: 'yesno', category: 'Health' },
  { name: 'Running', type: 'number', unit: 'km', direction: 'up', category: 'Health' },
  { name: 'Deep work', type: 'duration', target: 240, direction: 'up', category: 'Work' },
  { name: 'Reading', type: 'duration', target: 30, direction: 'up', category: 'Learning' },
  { name: 'Water', type: 'count', unit: 'glasses', target: 8, direction: 'up', category: 'Health' },
  { name: 'Mood', type: 'rating', category: 'Mind' },
  { name: 'Spend', type: 'number', unit: 'INR', direction: 'down', category: 'Money' },
  { name: 'Applications sent', type: 'count', direction: 'up', category: 'Work' },
  { name: 'Case practice', type: 'duration', direction: 'up', category: 'Work' },
];

function Tracker() { return V.id && S.metric(V.id) ? html`<${MetricDetail} key=${V.id} m=${S.metric(V.id)} />` : html`<${TrackerList} />`; }
function TrackerList() {
  const [edit, setEdit] = useState(null); const [showArch, setShowArch] = useState(false);
  const t0 = todayStr(); const ms = S.metrics(); const arch = S.metrics(true).filter(m => m.archived);
  const addTpl = tp => { S.saveMetric({ id: uid(), showToday: true, agg: defaultAgg(tp.type), created: t0, ...tp }); toast(`Added ${tp.name}.`); };
  return html`<section class="wrap page">
    <div class="pagehead">
      <div><div class="meta"><span>${ms.length} ${ms.length === 1 ? 'metric' : 'metrics'}</span>${ms.length ? html`<span>${ms.filter(m => S.entry(m.id, t0)).length} logged today</span>` : null}</div><h1 class="pagetitle">tracker</h1></div>
      <div class="toolbar"><button class="btn accent" onClick=${() => setEdit({})}>New metric</button></div>
    </div>
    ${ms.length ? html`<div class="cards">${ms.map(m => html`<${MetricCard} m=${m} />`)}</div>` : html`<div class="empty" style=${{ padding: '10px 0 30px' }}><div class="big">nothing tracked yet.</div><p>Pick a template or add your own.</p></div>`}
    <div style=${{ marginTop: '56px' }}>
      <${SecHead} label="add from a template" />
      <div class="toolbar">${TEMPLATES.filter(tp => !S.metrics(true).some(m => m.name.toLowerCase() === tp.name.toLowerCase())).map(tp => html`<button class="chip" onClick=${() => addTpl(tp)}>+ ${tp.name} <span style=${{ opacity: .6 }}>${METRIC_TYPES.find(x => x.id === tp.type).name.toLowerCase()}</span></button>`)}</div>
    </div>
    ${arch.length ? html`<div style=${{ marginTop: '44px' }}><button class="txtbtn" onClick=${() => setShowArch(!showArch)}>${showArch ? 'Hide' : 'Show'} archived (${arch.length})</button>
      ${showArch ? html`<div style=${{ marginTop: '14px' }}>${arch.map(m => html`<div class="taskrow"><span class="n">${m.name}</span><button class="txtbtn" onClick=${() => S.saveMetric({ ...m, archived: false })}>Restore</button></div>`)}</div>` : null}</div>` : null}
    ${edit ? html`<${MetricForm} m=${edit} onClose=${() => setEdit(null)} />` : null}
  </section>`;
}
function MetricCard({ m }) {
  const t0 = todayStr(); const e = S.entries(m.id);
  const spark = Array.from({ length: 14 }, (_, i) => { const d = addDays(t0, i - 13); return e[d] ? e[d].v : null; });
  const streak = metricStreak(m);
  return html`<article class="mcard">
    <div class="top"><button class="name" onClick=${() => go('tracker', { id: m.id })}>${m.name}</button><span class="lbl-s">${m.category || METRIC_TYPES.find(t => t.id === m.type).name}</span></div>
    <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
      <div><div class="big tnum">${e[t0] ? fmtMetric(m, e[t0].v) : html`<span style=${{ fontSize: '22px', color: 'var(--muted)', letterSpacing: '-.02em' }}>not logged</span>`}</div>${m.target != null && m.target !== '' && m.type !== 'yesno' ? html`<div class="muted" style=${{ fontSize: '13px', marginTop: '6px' }}>Target ${m.direction === 'down' ? 'at most' : 'at least'} ${fmtMetric(m, +m.target)}</div>` : null}</div>
      <${Sparkline} values=${spark} />
    </div>
    <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px', flexWrap: 'wrap' }}>
      <${MetricInput} m=${m} date=${t0} />
      <span class="lbl-s tnum">${plural(streak, 'day')} streak</span>
    </div>
  </article>`;
}

function MetricForm({ m, onClose }) {
  const isNew = !m.id;
  const [f, setF] = useState({ name: '', type: 'yesno', unit: '', direction: 'up', target: '', category: '', showToday: true, agg: '', ...m, target: m.target != null ? (m.type === 'duration' ? fmtDur(m.target) : m.target) : '' });
  const up = p => setF({ ...f, ...p });
  const save = () => {
    if (!f.name.trim()) { toast('Give the metric a name.'); return; }
    let target = f.target === '' || f.target == null ? null : f.type === 'duration' ? parseDuration(f.target) : parseFloat(f.target);
    if (f.target !== '' && (target == null || isNaN(target))) { toast('Enter a valid target or leave it empty.'); return; }
    S.saveMetric({ ...m, ...f, name: f.name.trim(), target, id: m.id || uid(), agg: f.agg || defaultAgg(f.type), created: m.created || todayStr() });
    toast(isNew ? 'Metric added.' : 'Metric saved.'); onClose();
  };
  const del = async () => {
    const n = Object.keys(S.entries(m.id)).length;
    if (await ask({ title: `Delete ${m.name}?`, body: `This deletes the metric and its ${n} logged ${n === 1 ? 'entry' : 'entries'}. Archive it instead to keep the history.`, confirm: 'Delete', danger: true })) { S.deleteMetric(m.id); onClose(); go('tracker'); toast('Metric deleted.'); }
  };
  return html`<${Modal} title=${isNew ? 'new metric' : 'edit metric'} onClose=${onClose} actions=${html`
    ${!isNew ? html`<button class="txtbtn danger left" onClick=${del}>Delete</button><button class="btn ghost" onClick=${() => { S.saveMetric({ ...m, archived: true }); onClose(); go('tracker'); toast('Archived. History is kept.'); }}>Archive</button>` : null}
    <button class="btn ghost" onClick=${onClose}>Cancel</button><button class="btn" onClick=${save}>${isNew ? 'Add metric' : 'Save'}</button>`}>
    <div class="fields" onKeyDown=${e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') save(); }}>
      <div class="field full"><label for="mf-n">Name</label><input id="mf-n" class="input" autofocus value=${f.name} onInput=${e => up({ name: e.target.value })} placeholder="Sleep, Deep work, Running…" /></div>
      <div class="field full"><span class="lbl-s">Type</span><div class="typegrid">${METRIC_TYPES.map(t => html`<button type="button" class=${'typecard' + (f.type === t.id ? ' on' : '')} aria-pressed=${f.type === t.id} onClick=${() => up({ type: t.id, agg: '' })}><b>${t.name}</b><span class="muted">${t.hint}</span></button>`)}</div></div>
      ${f.type === 'number' || f.type === 'count' ? html`<div class="field"><label for="mf-u">Unit</label><input id="mf-u" class="input" value=${f.unit} onInput=${e => up({ unit: e.target.value })} placeholder="km, kg, INR, glasses" /></div>` : null}
      ${f.type !== 'yesno' ? html`<div class="field"><label for="mf-t">Daily target (optional)</label><input id="mf-t" class="input tnum" value=${f.target} onInput=${e => up({ target: e.target.value })} placeholder=${f.type === 'duration' ? '7h 30m' : f.type === 'rating' ? '4' : '10'} /></div>` : null}
      ${f.type !== 'yesno' ? html`<div class="field"><label for="mf-d">Better when</label><select id="mf-d" class="input" value=${f.direction} onChange=${e => up({ direction: e.target.value })}><option value="up">Higher is better</option><option value="down">Lower is better</option><option value="neutral">Neither</option></select></div>` : null}
      <div class="field"><label for="mf-a">Combine days by</label><select id="mf-a" class="input" value=${f.agg || defaultAgg(f.type)} onChange=${e => up({ agg: e.target.value })}><option value="sum">Total</option><option value="avg">Average</option></select></div>
      <div class="field"><label for="mf-c">Category (optional)</label><input id="mf-c" class="input" value=${f.category} onInput=${e => up({ category: e.target.value })} placeholder="Health, Work, Money" /></div>
      <div class="field full"><label class="check"><input type="checkbox" checked=${f.showToday !== false} onChange=${e => up({ showToday: e.target.checked })} /> Show on Today for quick logging</label></div>
    </div>
  <//>`;
}

function MetricDetail({ m }) {
  const [edit, setEdit] = useState(false); const [compare, setCompare] = useState(false); const [type, setType] = useState('auto');
  const [newDate, setNewDate] = useState(todayStr());
  const range = V.metricRange; const t0 = todayStr();
  const e = S.entries(m.id); const map = {}; Object.keys(e).forEach(d => { if (e[d].v != null) map[d] = e[d].v; });
  const agg = m.agg || defaultAgg(m.type);
  const days = Object.keys(map).sort();
  let buckets;
  if (range === 'all') { const first = days[0] || t0; const n = Math.max(1, (+t0.slice(0, 4) - +first.slice(0, 4)) * 12 + (+t0.slice(5, 7) - +first.slice(5, 7)) + 1); buckets = Array.from({ length: Math.min(n, 60) }, (_, i) => { const f = addMonths(monthStart(t0), i - Math.min(n, 60) + 1); return { from: f, to: addDays(addMonths(f, 1), -1), label: f.slice(5, 7) === '01' || i === 0 ? f.slice(0, 4) : '', title: `${MONTHS[+f.slice(5, 7) - 1]} ${f.slice(0, 4)}` }; }); }
  else buckets = periodBuckets(range, t0, 0);
  const vals = bucketize(map, buckets, agg);
  const prev = compare && range !== 'all' ? bucketize(map, periodBuckets(range, t0, -1), agg) : null;
  const fmt = v => m.type === 'yesno' ? `${fmtNum(v)} day${v === 1 ? '' : 's'}` : fmtMetric(m, v);
  const axis = axisFmt(m.type === 'duration' ? 'duration' : 'n');
  const useLine = type === 'line' || (type === 'auto' && (range === 'all' || range === 'year' && m.type !== 'yesno' && agg === 'avg'));
  const C = useLine ? LineChart : BarChart;
  const target = (m.target != null && m.target !== '' && (agg === 'avg' || buckets[0].from === buckets[0].to)) ? +m.target : null;
  const inRange = days.filter(d => d >= buckets[0].from && d <= buckets[buckets.length - 1].to);
  const allVals = days.map(d => map[d]);
  const total = allVals.reduce((a, b) => a + b, 0);
  const best = days.length ? days.reduce((b, d) => (m.direction === 'down' ? map[d] < map[b] : map[d] > map[b]) ? d : b, days[0]) : null;
  const lvl = d => { const v = map[d]; if (v == null) return 0; if (m.type === 'yesno') return v ? 4 : 0; const mx = Math.max(...allVals) || 1; if (m.target) return metricMet(m, v) ? 4 : clamp(Math.ceil(v / (+m.target || mx) * 3), 1, 3); return clamp(Math.ceil(v / mx * 4), 1, 4); };
  const linkedGoals = S.goals().filter(g => g.metricId === m.id);
  const rows = days.slice().reverse().slice(0, 120);
  return html`<section class="wrap page">
    <button class="ulink back" onClick=${() => go('tracker')}>← all metrics</button>
    <div class="pagehead">
      <div><div class="meta"><span>tracker</span>${m.category ? html`<span>${m.category}</span>` : null}</div><h1 class="pagetitle sm">${m.name}</h1><p class="pagesub">${METRIC_TYPES.find(t => t.id === m.type).name}${m.unit ? ` in ${m.unit}` : ''}${m.target != null && m.target !== '' ? ` · target ${m.direction === 'down' ? 'at most' : 'at least'} ${fmtMetric(m, +m.target)} a day` : ''}${m.category ? ` · ${m.category}` : ''}</p></div>
      <div class="toolbar"><div style=${{ display: 'flex', alignItems: 'center', gap: '12px' }}><span class="lbl-s">Today</span><${MetricInput} m=${m} date=${t0} /></div><button class="btn ghost" onClick=${() => setEdit(true)}>Edit</button></div>
    </div>
    <div class="stats">
      ${[['Average', aggregate(allVals, 'avg')], [agg === 'sum' ? 'Total' : 'Days logged', agg === 'sum' ? total : days.length], ['Best day', best ? map[best] : null], ['Current streak', null, plural(metricStreak(m), 'day')], ['Longest streak', null, plural(metricLongest(m), 'day')], ['Days logged', null, String(days.length)]].filter((x, i) => !(i === 5 && agg !== 'sum')).map(([l, v, txt]) => html`<div><div class="lbl-s">${l}</div><div class="v tnum">${txt || (v == null ? '–' : (l === 'Days logged' ? v : m.type === 'yesno' && l === 'Average' ? Math.round(v * 100) + '%' : fmtMetric(m, v)))}</div>${l === 'Best day' && best ? html`<div class="muted" style=${{ fontSize: '13px' }}>${fmtShort(best)}</div>` : null}</div>`)}
    </div>
    <div class="chartbox">
      <div class="ch-head" style=${{ flexWrap: 'wrap' }}>
        <div class="seg" role="group" aria-label="Range">${[['week', 'Week'], ['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year'], ['all', 'All']].map(([k, l]) => html`<button class=${range === k ? 'on' : ''} aria-pressed=${range === k} onClick=${() => setV({ metricRange: k })}>${l}</button>`)}</div>
        <div class="toolbar">
          ${range !== 'all' ? html`<label class="check" style=${{ fontSize: '14px' }}><input type="checkbox" checked=${compare} onChange=${ev => setCompare(ev.target.checked)} /> Compare with previous</label>` : null}
          <div class="seg" role="group" aria-label="Chart type">${[['auto', 'Auto'], ['bar', 'Bar'], ['line', 'Line']].map(([k, l]) => html`<button class=${type === k ? 'on' : ''} onClick=${() => setType(k)}>${l}</button>`)}</div>
        </div>
      </div>
      <${C} buckets=${buckets} values=${vals} prev=${prev} fmt=${fmt} axis=${axis} target=${target} aria=${`${m.name}, ${range}`} onPick=${i => { const b = buckets[i]; if (b.from === b.to) setV({ page: 'today', todayDate: b.from === t0 ? null : b.from }); }} />
      ${prev ? html`<div class="legend"><span><i style=${{ background: 'var(--green)' }}></i>${PERIOD_NAMES[range][0]}</span><span><i style=${{ background: 'var(--prev)' }}></i>${PERIOD_NAMES[range][1]}</span></div>` : null}
      ${compareSummary(vals, prev, agg, fmt, m.direction)}
      <p class="muted" style=${{ fontSize: '13px', marginTop: '8px' }}>${inRange.length} days logged in this range. Days you skipped show as gaps, not zeros.</p>
    </div>
    <div class="twocol" style=${{ marginTop: '48px' }}>
      <div class="main">
        <${SecHead} label="entries" />
        <div class="toolbar" style=${{ marginBottom: '14px' }}><span class="muted" style=${{ fontSize: '14px' }}>Add or fix a day:</span><input type="date" class="input" style=${{ width: '170px' }} max=${t0} value=${newDate} onInput=${ev => setNewDate(ev.target.value)} aria-label="Date to log" /><${MetricInput} m=${m} date=${newDate || t0} /></div>
        <div class="tblwrap"><table class="tbl"><thead><tr><th>Date</th><th>Value</th><th>Note</th><th></th></tr></thead><tbody>
          ${rows.map(d => html`<tr><td class="tnum" style=${{ whiteSpace: 'nowrap' }}>${fmtShort(d)}</td><td><${MetricInput} m=${m} date=${d} /></td><td><input class="input" style=${{ fontSize: '14px', border: 0 }} aria-label=${`Note for ${fmtShort(d)}`} value=${e[d].n || ''} placeholder="Add a note" onChange=${ev => S.setEntry(m.id, d, { ...e[d], n: ev.target.value })} /></td><td><button class="iconbtn" aria-label=${`Delete entry for ${fmtShort(d)}`} onClick=${() => { const old = e[d]; S.setEntry(m.id, d, null); toast('Entry deleted.', { label: 'Undo', fn: () => S.setEntry(m.id, d, old) }); }}>${I.trash}</button></td></tr>`)}
          ${!rows.length ? html`<tr><td colspan="4" class="muted">No entries yet. Log today above.</td></tr>` : null}
        </tbody></table></div>
      </div>
      <div class="side">
        <${SecHead} label="last 12 months" />
        <${Heatmap} weeks=${53} level=${lvl} title=${d => `${fmtShort(d)}: ${map[d] == null ? 'not logged' : fmtMetric(m, map[d])}`} onPick=${d => setNewDate(d)} />
        <div style=${{ marginTop: '14px' }}><${HeatKey} /></div>
        ${linkedGoals.length ? html`<div style=${{ marginTop: '40px' }}><${SecHead} label="feeds these goals" />${linkedGoals.map(g => html`<button class="goalrow hl" onClick=${() => go('goals', { id: g.id })}><span style=${{ fontSize: '16px' }}>${g.title}</span></button>`)}</div>` : null}
      </div>
    </div>
    ${edit ? html`<${MetricForm} m=${m} onClose=${() => setEdit(false)} />` : null}
  </section>`;
}
