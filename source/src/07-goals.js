/* ===== Goals ===== */
function Goals() {
  if (V.id && S.goal(V.id)) return html`<${GoalDetail} key=${V.id} g=${S.goal(V.id)} />`;
  return html`<${GoalsHome} />`;
}
function GoalsHome() {
  const [edit, setEdit] = useState(V.goalNew ? {} : null); const [filter, setFilter] = useState('active');
  useEffect(() => { if (V.goalNew) setV({ goalNew: false }); }, []);
  const all = S.goals(); const list = all.filter(g => filter === 'all' || (g.status || 'active') === filter);
  const active = all.filter(g => (g.status || 'active') === 'active');
  const onTrack = active.filter(g => goalStats(g).status === 'ok').length;
  return html`<section class="wrap page">
    <div class="pagehead">
      <div><div class="meta"><span>${active.length} active</span><span>${onTrack} on track</span><span>${all.filter(g => g.status === 'done').length} completed</span></div><h1 class="pagetitle">goals</h1></div>
      <div class="toolbar"><button class="btn accent" onClick=${() => setEdit({})}>New goal</button></div>
    </div>
    <div class="tabs" role="tablist">${[['goals', 'goals'], ['review', 'review']].map(([k, l]) => html`<button role="tab" aria-selected=${V.goalTab === k} class=${V.goalTab === k ? 'on' : ''} onClick=${() => setV({ goalTab: k })}>${l}</button>`)}</div>
    ${V.goalTab === 'review' ? html`<${Review} />` : html`
      <div class="toolbar" style=${{ marginBottom: '26px' }}><div class="seg" role="group" aria-label="Filter goals">${[['active', 'Active'], ['paused', 'Paused'], ['done', 'Done'], ['all', 'All']].map(([k, l]) => html`<button class=${filter === k ? 'on' : ''} onClick=${() => setFilter(k)}>${l} <span class="tnum" style=${{ opacity: .6 }}>${k === 'all' ? all.length : all.filter(g => (g.status || 'active') === k).length}</span></button>`)}</div></div>
      ${list.length ? html`<div class="gcards">${list.map((g, i) => html`<${GoalCard} g=${g} n=${i + 1} onEdit=${() => setEdit(g)} />`)}</div>` : html`<div class="empty"><div class="big">${filter === 'active' ? 'no goals yet.' : 'nothing here.'}</div><p>A goal pairs a target with a way to log it. Reading, running, keeping up with the news, being a good person: all of them fit.</p><button class="btn accent" style=${{ marginTop: '18px' }} onClick=${() => setEdit({})}>New goal</button></div>`}
    `}
    ${edit ? html`<${GoalForm} g=${edit} onClose=${() => setEdit(null)} />` : null}
  </section>`;
}
function GoalCard({ g, n, onEdit }) {
  const gs = goalStats(g); const type = GOAL_TYPES.find(t => t.id === g.type) || {};
  return html`<article class="gcard">
    <div style=${{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}><span class="lbl-s">${String(n).padStart(2, '0')} · ${type.name}${g.category ? ' · ' + g.category : ''}</span><span class=${'pill ' + gs.status}>${gs.statusText}</span></div>
    <h3><button style=${{ all: 'unset', cursor: 'pointer' }} onClick=${() => go('goals', { id: g.id })}>${g.title}</button></h3>
    <div style=${{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}><span class="pct tnum">${Math.round(gs.pct * 100)}%</span><div style=${{ flex: 1, paddingBottom: '8px' }}><div class="bar"><i style=${{ width: gs.pct * 100 + '%' }}></i></div></div></div>
    <div style=${{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}><span class="muted tnum" style=${{ fontSize: '14px' }}>${gs.valueText}</span><span class="muted tnum" style=${{ fontSize: '14px' }}>${gs.daysLeft != null ? `${gs.daysLeft} days left` : gs.streak ? `${plural(gs.streak, 'day')} streak` : ''}</span></div>
    <div class="toolbar" style=${{ borderTop: '1px solid var(--line)', paddingTop: '12px', justifyContent: 'space-between' }}><button class="ulink" onClick=${() => go('goals', { id: g.id })}>Open and log →</button><button class="txtbtn" onClick=${onEdit}>Edit</button></div>
  </article>`;
}

/* The one place goals are logged: Today's goal rows and the goal page both use it */
function GoalLog({ g, date, compact }) {
  const style = goalLogStyle(g); const daily = goalDaily(g); const v = daily[date]; const fmt = goalFmt(g);
  const amounts = goalAmounts(g); const amt = amounts[date];
  const [val, setVal] = useState(''); const t0 = todayStr();
  const linked = g.metricId && S.metric(g.metricId);
  const noteField = () => (linked && v == null) ? null : html`<input class="input" style=${{ fontSize: '14.5px', marginTop: '12px' }} aria-label="Note for this day" placeholder=${v == null && style !== 'steps' ? 'Add a note (optional)' : 'Add a note for this day'} value=${goalNote(g, date)} onChange=${e => goalLogPatch(S.goal(g.id), date, { n: e.target.value })} />`;
  if (style === 'steps') {
    if (!compact) return html`<${StepList} g=${g} />`;
    const steps = (g.steps || []).filter(s => !s.done).slice(0, 3);
    const toggle = s => S.saveGoal({ ...g, steps: (g.steps || []).map(x => x.id === s.id ? { ...x, done: !x.done, doneAt: !x.done ? new Date(date + 'T12:00:00').toISOString() : null } : x) });
    return html`<div>${steps.map(s => html`<label class="taskrow" style=${{ cursor: 'pointer', minHeight: '40px', padding: '6px 0' }}><input type="checkbox" onChange=${() => toggle(s)} /><span class="n" style=${{ fontSize: '15px' }}>${s.title}</span>${s.date ? html`<span class="meta">${fmtDM(s.date)}</span>` : null}</label>`)}${!steps.length ? html`<p class="muted">Every step is done.</p>` : null}</div>`;
  }
  if (style === 'check') {
    const unit = g.detailUnit;
    return html`<div>
      <div class="toolbar">
        <button class=${'btn' + (v != null ? ' accent' : ' ghost') + (compact ? ' sm' : '')} aria-pressed=${v != null} onClick=${() => goalLog(S.goal(g.id), date, v != null ? null : 1)}>${v != null ? 'Done ✓' : 'Mark done'}</button>
        ${unit ? html`<label class="toolbar" style=${{ gap: '8px' }}><input class="input tnum" style=${{ width: '110px', fontSize: compact ? '15px' : '18px' }} inputmode="decimal" aria-label=${`How many ${unit}`} placeholder=${`how many ${unit}`} value=${amt ?? ''} onChange=${e => { const x = e.target.value.trim(); goalLogPatch(S.goal(g.id), date, { a: x === '' ? null : parseFloat(x.replace(',', '.')) }); }} /><span class="muted">${unit}</span></label>` : null}
        ${v != null ? html`<span class="muted" style=${{ fontSize: '14px' }}>${date === t0 ? 'logged today' : 'logged ' + fmtDM(date)}</span>` : null}
      </div>
      ${noteField()}
    </div>`;
  }
  if (style === 'rating') return html`<div>
    <div class="toolbar"><div class="rate" style=${{ gap: '8px' }} role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(i => html`<button style=${{ width: compact ? '24px' : '30px', height: compact ? '24px' : '30px' }} class=${v != null && i <= v ? 'on' : ''} role="radio" aria-checked=${v === i} aria-label=${`${i} of 5`} onClick=${() => goalLog(S.goal(g.id), date, v === i ? null : i)}></button>`)}</div>${v != null ? html`<span class="muted">${v} / 5</span>` : html`<span class="muted" style=${{ fontSize: '14px' }}>How did today go?</span>`}</div>
    ${noteField()}
  </div>`;
  const isAmt = style === 'amount';
  const commit = mode => { const n = parseFloat(String(val).replace(',', '.')); if (isNaN(n)) { toast('Enter a number.'); return; } goalLog(S.goal(g.id), date, isAmt && mode === 'add' ? (v || 0) + n : n); setVal(''); toast(isAmt && mode === 'add' ? `Added ${fmtNum(n)}${g.unit ? ' ' + g.unit : ''}.` : 'Saved.'); };
  return html`<div>
    <div class="toolbar"><input class="input tnum" style=${{ width: '130px', fontSize: compact ? '16px' : '20px' }} inputmode="decimal" aria-label=${isAmt ? 'Amount to add' : 'Measurement'} placeholder=${isAmt ? `add ${g.unit || 'amount'}` : (g.unit || 'value')} value=${val} onInput=${e => setVal(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') commit('add'); }} />
      ${isAmt ? html`<button class=${'btn' + (compact ? ' sm' : '')} onClick=${() => commit('add')}>Add</button>${!compact ? html`<button class="btn ghost" onClick=${() => commit('set')}>Set day total</button>` : null}` : html`<button class=${'btn' + (compact ? ' sm' : '')} onClick=${() => commit('set')}>Save</button>`}
      ${v != null ? html`<span class="muted tnum" style=${{ fontSize: '14px' }}>${date === t0 ? 'today' : fmtDM(date)}: <b style=${{ color: 'var(--ink)' }}>${fmt(v)}</b></span><button class="txtbtn" onClick=${() => goalLog(S.goal(g.id), date, null)}>clear</button>` : null}</div>
    ${noteField()}
  </div>`;
}

function GoalForm({ g, onClose }) {
  const isNew = !g.id; const t0 = todayStr();
  const [f, setF] = useState(() => ({ title: '', type: 'frequency', logStyle: '', times: 5, per: 'week', target: '', baseline: '', unit: '', detailUnit: '', start: t0, end: '', metricId: '', category: '', steps: [], charts: null, showTarget: true, status: 'active', ...clone(g) }));
  const [gen, setGen] = useState({ count: 12, every: 7, from: t0, prefix: 'Session' });
  const [confirm, setConfirm] = useState(null);
  const up = p => { setConfirm(null); setF(prev => ({ ...prev, ...p })); };
  const style = f.logStyle || (GOAL_TYPES.find(t => t.id === f.type) || {}).log;
  const compat = CHART_TYPES.filter(c => c.styles.includes(style)).map(c => c.id);
  const rec = (REC_CHARTS[f.type] || []).filter(c => compat.includes(c));
  const charts = (f.charts || rec).filter(c => compat.includes(c));
  const metricOk = ['check', 'amount', 'measure'].includes(style);
  const kind = f.type === 'custom' ? ({ check: 'habit', amount: 'progress', measure: 'target', rating: 'qualitative', steps: 'milestone' })[style] : f.type;
  const setType = id => up({ type: id, logStyle: '', charts: null });
  const toggleChart = id => up({ charts: charts.includes(id) ? charts.filter(x => x !== id) : [...charts, id] });
  const addStep = () => up({ steps: [...(f.steps || []), { id: uid(), title: '', date: '', done: false }] });
  const genSteps = () => { const n = clamp(+gen.count || 0, 1, 200); const add = Array.from({ length: n }, (_, i) => ({ id: uid(), title: `${gen.prefix || 'Session'} ${(f.steps || []).length + i + 1}`, date: addDays(gen.from || t0, i * (+gen.every || 7)), done: false })); up({ steps: [...(f.steps || []), ...add] }); };
  const build = () => {
    const out = { ...g, ...f, title: f.title.trim(), logStyle: f.type === 'custom' || f.logStyle ? style : '', charts, id: g.id || uid(), created: g.created || new Date().toISOString() };
    ['times', 'target', 'baseline'].forEach(k => { out[k] = out[k] === '' || out[k] == null ? null : +out[k]; });
    out.detailUnit = style === 'check' ? (out.detailUnit || '').trim() : '';
    out.steps = (out.steps || []).filter(s => (s.title || '').trim()).map(s => ({ ...s, title: s.title.trim(), date: s.date || null }));
    if (!out.end) out.end = null; if (!out.start) out.start = null; if (!out.metricId || !metricOk) out.metricId = null;
    out.logs = (S.goal(out.id) || {}).logs || {};
    return out;
  };
  const save = () => {
    if (!f.title.trim()) { toast('Give the goal a title.'); return; }
    if (f.type !== 'custom' && (kind === 'progress' || kind === 'target') && (f.target === '' || f.target == null)) { toast('Add a target value.'); return; }
    const out = build();
    if (isNew) { S.saveGoal(out); toast('Goal created.'); onClose(); go('goals', { id: out.id }); return; }
    if (!confirm) {
      const changes = [];
      if (out.type !== g.type || goalLogStyle(out) !== goalLogStyle(g)) changes.push('the goal type or logging style, so past entries are counted differently');
      if ((out.target ?? null) !== (g.target ?? null) || (out.times ?? null) !== (g.times ?? null) || out.per !== g.per || (out.baseline ?? null) !== (g.baseline ?? null)) changes.push('the target, so progress and pace change');
      if ((out.start || null) !== (g.start || null) || (out.end || null) !== (g.end || null)) changes.push('the dates, so the pace you need changes');
      if ((out.metricId || null) !== (g.metricId || null)) changes.push('the linked metric, so entries come from somewhere else');
      if (JSON.stringify(out.steps) !== JSON.stringify(g.steps || [])) changes.push('the steps in the plan');
      setConfirm(changes.length ? `You are changing ${changes.join('; ')}. Logged entries are kept.` : `Save your changes to “${out.title}”?`);
      return;
    }
    S.saveGoal(out); toast('Goal saved.'); onClose();
  };
  const type = GOAL_TYPES.find(t => t.id === f.type);
  return html`<${Modal} title=${isNew ? 'new goal' : 'edit goal'} size="wide" onClose=${onClose} actions=${confirm ? html`<div class="confirmbar" role="alert"><p><b>Are you sure?</b> ${confirm}</p><button class="btn ghost" onClick=${() => setConfirm(null)}>Keep editing</button><button class="btn accent" onClick=${save}>Yes, save changes</button></div>` : html`<button class="btn ghost" onClick=${onClose}>Cancel</button><button class="btn accent" onClick=${save}>${isNew ? 'Create goal' : 'Save'}</button>`}>
    <div class="fields">
      <div class="field full"><label for="gf-t">Goal</label><input id="gf-t" class="input" style=${{ fontSize: '22px' }} autofocus value=${f.title} onInput=${e => up({ title: e.target.value })} placeholder=${type ? type.ex : 'What do you want to achieve'} /></div>
      <div class="field full"><span class="lbl-s">Goal type</span><div class="typegrid">${GOAL_TYPES.map(t => html`<button type="button" class=${'typecard' + (f.type === t.id ? ' on' : '')} aria-pressed=${f.type === t.id} onClick=${() => setType(t.id)}><b>${t.name}</b><span class="muted">${t.hint}</span><span class="muted" style=${{ fontSize: '12px' }}>e.g. ${t.ex}</span></button>`)}</div></div>
      <div class="field"><label for="gf-l">How I log it</label><select id="gf-l" class="input" value=${style} onChange=${e => up({ logStyle: e.target.value, charts: null })}>${LOG_STYLES.map(s => html`<option value=${s.id}>${s.name}: ${s.hint}</option>`)}</select></div>
      ${style === 'check' ? html`<div class="field"><label for="gf-du">Also record an amount each time (optional)</label><input id="gf-du" class="input" value=${f.detailUnit || ''} onInput=${e => up({ detailUnit: e.target.value })} placeholder="pages, km, minutes" /></div>` : null}
      ${f.type === 'frequency' ? html`<div class="field"><span class="lbl-s">How often</span><div style=${{ display: 'flex', gap: '12px', alignItems: 'center' }}><input class="input tnum" aria-label="Times" type="number" min="1" style=${{ width: '80px' }} value=${f.times} onInput=${e => up({ times: e.target.value })} /><span class="muted">times a</span><select class="input" aria-label="Period" value=${f.per} onChange=${e => up({ per: e.target.value })}><option value="day">day</option><option value="week">week</option><option value="month">month</option></select></div></div>` : null}
      ${['progress', 'target'].includes(kind) || (f.type === 'custom' && style !== 'check') ? html`
        ${kind === 'target' ? html`<div class="field"><label for="gf-b">Starting value (optional)</label><input id="gf-b" class="input tnum" type="number" step="any" value=${f.baseline ?? ''} onInput=${e => up({ baseline: e.target.value })} placeholder="Uses your first entry if empty" /></div>` : null}
        <div class="field"><label for="gf-tg">Target${f.type === 'custom' ? ' (optional)' : ''}</label><input id="gf-tg" class="input tnum" type="number" step="any" value=${f.target ?? ''} onInput=${e => up({ target: e.target.value })} placeholder=${kind === 'progress' ? '500' : '72'} /></div>
        <div class="field"><label for="gf-u">Unit</label><input id="gf-u" class="input" value=${f.unit} onInput=${e => up({ unit: e.target.value })} placeholder="km, books, kg, pages" /></div>` : null}
      <div class="field"><label for="gf-s">Start date</label><input id="gf-s" type="date" class="input" value=${f.start || ''} onInput=${e => up({ start: e.target.value })} /></div>
      <div class="field"><label for="gf-e">End date (optional)</label><input id="gf-e" type="date" class="input" value=${f.end || ''} onInput=${e => up({ end: e.target.value })} /></div>
      ${metricOk ? html`<div class="field"><label for="gf-m">Feed from a tracker metric (optional)</label><select id="gf-m" class="input" value=${f.metricId || ''} onChange=${e => up({ metricId: e.target.value })}><option value="">No, I log it here</option>${S.metrics().map(m => html`<option value=${m.id}>${m.name}</option>`)}</select></div>` : null}
      <div class="field"><label for="gf-c">Category (optional)</label><input id="gf-c" class="input" value=${f.category} onInput=${e => up({ category: e.target.value })} placeholder="Health, Learning, Character" /></div>
      ${style === 'steps' ? html`<div class="field full">
        <span class="lbl-s">Steps or sessions</span>
        <div style=${{ maxHeight: '260px', overflowY: 'auto', borderTop: '1px solid var(--line)' }}>
          ${(f.steps || []).map((s, i) => html`<div class="taskrow"><span class="num tnum">${i + 1}.</span><input class="input" style=${{ border: 0, flex: 1 }} aria-label=${`Step ${i + 1}`} value=${s.title} placeholder="Long run 16 km" onInput=${e => { const st2 = f.steps.slice(); st2[i] = { ...s, title: e.target.value }; up({ steps: st2 }); }} /><input type="date" class="input" style=${{ width: '160px', border: 0 }} aria-label=${`Date for step ${i + 1}`} value=${s.date || ''} onInput=${e => { const st2 = f.steps.slice(); st2[i] = { ...s, date: e.target.value }; up({ steps: st2 }); }} /><button class="iconbtn" aria-label=${`Remove step ${i + 1}`} onClick=${() => up({ steps: f.steps.filter(x => x.id !== s.id) })}>${I.close}</button></div>`)}
        </div>
        <div class="toolbar" style=${{ marginTop: '10px' }}><button class="txtbtn" onClick=${addStep}>+ Add a step</button></div>
        <div class="toolbar" style=${{ marginTop: '14px', padding: '12px 14px', border: '1px solid var(--line)', gap: '10px' }}><span class="muted" style=${{ fontSize: '14px' }}>Add</span><input class="input tnum" type="number" min="1" aria-label="Number of sessions" style=${{ width: '64px' }} value=${gen.count} onInput=${e => setGen({ ...gen, count: e.target.value })} /><input class="input" aria-label="Session name" style=${{ width: '110px' }} value=${gen.prefix} onInput=${e => setGen({ ...gen, prefix: e.target.value })} /><span class="muted" style=${{ fontSize: '14px' }}>every</span><input class="input tnum" type="number" min="1" aria-label="Days between sessions" style=${{ width: '56px' }} value=${gen.every} onInput=${e => setGen({ ...gen, every: e.target.value })} /><span class="muted" style=${{ fontSize: '14px' }}>days from</span><input type="date" class="input" aria-label="First session date" style=${{ width: '160px' }} value=${gen.from} onInput=${e => setGen({ ...gen, from: e.target.value })} /><button class="btn ghost sm" onClick=${genSteps}>Add sessions</button></div>
      </div>` : null}
      <div class="field full">
        <span class="lbl-s">Charts</span>
        <p class="muted" style=${{ fontSize: '14px', margin: '0 0 8px' }}>Red outlines are recommended for this goal. Charts that cannot read this goal’s data are greyed out. You can change these any time.</p>
        <div class="chartpick">${CHART_TYPES.map(c => { const ok = compat.includes(c.id); return html`<label class=${(ok ? '' : 'dis ') + (rec.includes(c.id) ? 'rec' : '')} title=${ok ? c.d : 'Not for this kind of goal'}><input type="checkbox" disabled=${!ok} checked=${ok && charts.includes(c.id)} onChange=${() => toggleChart(c.id)} /><span><span style=${{ display: 'block' }}>${c.name}</span><span class="muted" style=${{ fontSize: '12px' }}>${c.d}</span></span></label>`; })}</div>
        <label class="check" style=${{ marginTop: '14px' }}><input type="checkbox" checked=${f.showTarget !== false} onChange=${e => up({ showTarget: e.target.checked })} /> Show the target line on time charts</label>
      </div>
    </div>
  <//>`;
}

function GoalDetail({ g }) {
  const [edit, setEdit] = useState(false); const [allHist, setAllHist] = useState(false); const [date, setDate] = useState(todayStr()); const [compare, setCompare] = useState(false); const [adding, setAdding] = useState(''); const [statusAsk, setStatusAsk] = useState(null);
  const t0 = todayStr(); const gs = goalStats(g); const style = goalLogStyle(g); const daily = goalDaily(g); const fmt = goalFmt(g); const amounts = goalAmounts(g);
  const type = GOAL_TYPES.find(t => t.id === g.type) || {}; const period = V.goalPeriod;
  const charts = (g.charts && g.charts.length ? g.charts : REC_CHARTS[g.type] || ['bar']).filter(c => CHART_TYPES.find(x => x.id === c && x.styles.includes(style)));
  const avail = CHART_TYPES.filter(c => c.styles.includes(style) && !charts.includes(c.id));
  const setCharts = c => S.saveGoal({ ...g, charts: c });
  const tasks = S.allTasks().filter(t => t.goalId === g.id && !t.dropped).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);
  const notes = S.notes().filter(n => !n.deletedAt && n.links && n.links.goalId === g.id);
  const allLogs = S.goalLogs(g); const histAll = Array.from(new Set([...Object.keys(daily), ...Object.keys(allLogs).filter(d => (allLogs[d] || {}).n)])).sort().reverse();
  const history = allHist ? histAll.slice(0, 400) : histAll.slice(0, 12);
  const del = async () => { const n = Object.keys(daily).length; if (await ask({ title: 'Delete this goal?', body: `“${g.title}” and its ${n} logged ${n === 1 ? 'day' : 'days'} will be deleted${g.metricId ? ' (entries in the linked metric are kept)' : ''}.`, confirm: 'Delete goal', danger: true })) { S.deleteGoal(g.id); go('goals'); toast('Goal deleted.'); } };
  return html`<section class="wrap page">
    <button class="ulink back" onClick=${() => go('goals')}>← all goals</button>
    <div class="pagehead">
      <div style=${{ minWidth: 0 }}><div class="meta"><span>${type.name}</span>${g.category ? html`<span>${g.category}</span>` : null}${g.metricId && S.metric(g.metricId) ? html`<span>fed by ${S.metric(g.metricId).name}</span>` : null}<span class=${'pill ' + gs.status}>${gs.statusText}</span></div><h1 class="pagetitle sm">${g.title}</h1><p class="pagesub tnum">${gs.valueText}</p></div>
      <div class="toolbar">
        ${(g.status || 'active') === 'active' ? html`<button class="txtbtn" onClick=${() => setStatusAsk('paused')}>Pause</button><button class="txtbtn" onClick=${() => setStatusAsk('done')}>Mark complete</button>` : html`<button class="txtbtn" onClick=${() => setStatusAsk('active')}>Make active</button>`}
        <button class="txtbtn danger" onClick=${del}>Delete</button>
        <button class="btn" onClick=${() => setEdit(true)}>Edit goal</button>
      </div>
    </div>
    ${statusAsk ? html`<div class="confirmbar" style=${{ marginBottom: '28px' }} role="alert"><p><b>Are you sure?</b> ${statusAsk === 'done' ? 'This marks the goal complete and moves it to Done.' : statusAsk === 'paused' ? 'This pauses the goal; it stops showing on Today.' : 'This makes the goal active again.'}</p><button class="btn ghost sm" onClick=${() => setStatusAsk(null)}>Cancel</button><button class="btn accent sm" onClick=${() => { S.saveGoal({ ...g, status: statusAsk }); setStatusAsk(null); }}>Yes</button></div>` : null}
    <div class="stats">
      <div><div class="lbl-s">progress</div><div class="v tnum">${Math.round(gs.pct * 100)}<span>%</span></div></div>
      <div><div class="lbl-s">current streak</div><div class="v tnum">${gs.streak} <span>${gs.streak === 1 ? 'day' : 'days'}</span></div></div>
      <div><div class="lbl-s">longest streak</div><div class="v tnum">${gs.longest} <span>${gs.longest === 1 ? 'day' : 'days'}</span></div></div>
      <div><div class="lbl-s">days logged</div><div class="v tnum">${Object.keys(daily).length}</div></div>
      <div><div class="lbl-s">${g.end ? 'days left' : 'started'}</div><div class="v tnum">${g.end ? gs.daysLeft : (g.start ? fmtDM(g.start).toLowerCase() : '–')}</div></div>
    </div>
    <div class="chartbox" style=${{ marginBottom: '40px' }}>
      <div class="ch-head" style=${{ flexWrap: 'wrap' }}><span class="t">${style === 'steps' ? 'the plan' : date === t0 ? 'log today' : 'log ' + fmtShort(date).toLowerCase()}</span>${style !== 'steps' ? html`<label class="toolbar" style=${{ gap: '8px' }}><span class="lbl-s">day</span><input type="date" class="input" style=${{ width: '170px' }} max=${t0} value=${date} onInput=${e => setDate(e.target.value || t0)} /></label>` : null}</div>
      <${GoalLog} g=${g} date=${date} />
    </div>
    <div class="toolbar" style=${{ marginBottom: '20px', justifyContent: 'space-between' }}>
      <div class="seg" role="group" aria-label="Period">${[['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly']].map(([k, l]) => html`<button class=${period === k ? 'on' : ''} aria-pressed=${period === k} onClick=${() => setV({ goalPeriod: k })}>${l}</button>`)}</div>
      <div class="toolbar"><label class="check" style=${{ fontSize: '14px' }}><input type="checkbox" checked=${compare} onChange=${e => setCompare(e.target.checked)} /> Compare with previous ${period}</label>
        ${avail.length ? html`<select class="input" style=${{ width: 'auto', fontSize: '14px' }} aria-label="Add a chart" value="" onChange=${e => { if (e.target.value) setCharts([...charts, e.target.value]); }}><option value="">+ Add a chart</option>${avail.map(c => html`<option value=${c.id}>${c.name}</option>`)}</select>` : null}
      </div>
    </div>
    <div class="charts">${charts.map(c => { const ct = CHART_TYPES.find(x => x.id === c); return html`<div class="chartbox"><div class="ch-head"><span class="t">${ct.name.toLowerCase()}</span><span style=${{ display: 'flex', gap: '6px', alignItems: 'center' }}><span class="muted" style=${{ fontSize: '13px' }}>${ct.d}</span><button class="iconbtn" style=${{ minWidth: '30px', minHeight: '30px', padding: '4px' }} aria-label=${`Remove ${ct.name} chart`} onClick=${() => setCharts(charts.filter(x => x !== c))}>${I.close}</button></span></div><${GoalChart} g=${g} type=${c} period=${period} compare=${compare} /></div>`; })}</div>
    <div class="twocol" style=${{ marginTop: '60px' }}>
      <div class="main">
        <${SecHead} label="history" right=${`${histAll.length} ${histAll.length === 1 ? 'entry' : 'entries'}`} />
        ${history.length ? history.map(d => html`<div class="taskrow"><span class="tnum" style=${{ width: '110px', flex: 'none' }}>${fmtShort(d)}</span><span class="tnum" style=${{ minWidth: '170px', flex: 'none', fontWeight: 500 }}>${daily[d] != null ? fmt(daily[d]) : '–'}${amounts[d] != null ? html`<span class="muted" style=${{ fontWeight: 400 }}> · ${fmtNum(amounts[d])} ${g.detailUnit || ''}</span>` : null}</span><span class="n muted" style=${{ fontSize: '14px' }}>${goalNote(g, d)}</span>${style !== 'steps' ? html`<button class="iconbtn" aria-label=${`Delete entry for ${fmtShort(d)}`} onClick=${() => { const linked = g.metricId && S.metric(g.metricId); const old = allLogs[d] ? clone(allLogs[d]) : null; const oldV = daily[d]; if (linked) goalLog(g, d, null); else S.setGoalLogEntry(g.id, d, null); toast('Entry deleted.', { label: 'Undo', fn: () => { if (linked) goalLog(S.goal(g.id), d, oldV); else S.setGoalLogEntry(g.id, d, old); } }); }}>${I.trash}</button>` : null}</div>`) : html`<p class="muted" style=${{ paddingTop: '12px' }}>Nothing logged yet.</p>`}
        ${histAll.length > 12 ? html`<button class="txtbtn" style=${{ marginTop: '14px' }} onClick=${() => setAllHist(!allHist)}>${allHist ? 'Show less' : `Show all ${histAll.length}`}</button>` : null}
      </div>
      <div class="side">
        <${SecHead} label="linked to-dos" />
        ${tasks.map(t => html`<div class=${'taskrow' + (t.done ? ' done' : '')}><input type="checkbox" checked=${!!t.done} aria-label=${`Toggle ${t.title}`} onChange=${() => S.toggleTask(t)} /><button class="n" onClick=${() => openTask(t)}>${t.title}</button><span class="meta">${t.date ? fmtDM(t.date) : 'backlog'}</span></div>`)}
        <div class="taskrow" style=${{ borderTop: tasks.length ? '1px solid var(--line)' : 0 }}><span aria-hidden="true" style=${{ color: 'var(--red)', fontWeight: 600 }}>+</span><input class="input" style=${{ border: 0, flex: 1 }} aria-label="Add a to-do for this goal" placeholder="Add a to-do for today" value=${adding} onInput=${e => setAdding(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && adding.trim()) { S.saveTask({ id: uid(), title: adding.trim(), date: t0, kind: 'fullDay', goalId: g.id, cat: 'personal', done: false }); setAdding(''); toast('Added to today.'); } }} /></div>
        <div style=${{ marginTop: '40px' }}><${SecHead} label="linked notes" />
          ${notes.map(n => html`<button class="taskrow hl" style=${{ width: '100%', background: 'none', border: 0, textAlign: 'left', color: 'inherit' }} onClick=${() => openNote(n.id)}><span class="n">${noteTitle(n)}</span></button>`)}
          <button class="txtbtn" style=${{ marginTop: '10px' }} onClick=${() => { const id = uid(); S.saveNote({ id, title: g.title + ' notes', body: '', folderId: null, tags: [], links: { goalId: g.id }, createdAt: new Date().toISOString() }); openNote(id); }}>+ New linked note</button>
        </div>
      </div>
    </div>
    ${edit ? html`<${GoalForm} g=${g} onClose=${() => setEdit(false)} />` : null}
  </section>`;
}

/* ---------- Review ---------- */
function Review() {
  const [period, setPeriod] = useState('week'); const [off, setOff] = useState(0); const t0 = todayStr(); const ws = S.settings().weekStart;
  let from, to, pf, pt, label;
  if (period === 'week') { from = addDays(weekStart(t0, ws), off * 7); to = addDays(from, 6); pf = addDays(from, -7); pt = addDays(from, -1); label = `${fmtDM(from)} to ${fmtDM(to)}`; }
  else if (period === 'month') { from = addMonths(monthStart(t0), off); to = addDays(addMonths(from, 1), -1); pf = addMonths(from, -1); pt = addDays(from, -1); label = `${MONTHS[+from.slice(5, 7) - 1]} ${from.slice(0, 4)}`; }
  else { const y = +t0.slice(0, 4) + off; from = `${y}-01-01`; to = `${y}-12-31`; pf = `${y - 1}-01-01`; pt = `${y - 1}-12-31`; label = String(y); }
  const key = `${period}-${from}`; const refl = S.reviews()[key] || '';
  const sumRange = (m, a, b) => { const e = S.entries(m.id); const v = Object.keys(e).filter(d => d >= a && d <= b).map(d => e[d].v); return aggregate(v, m.agg || defaultAgg(m.type)); };
  const taskRange = (a, b) => { const ts = S.allTasks().filter(t => t.date && t.date >= a && t.date <= b && !t.dropped); return [ts.filter(t => t.done).length, ts.length]; };
  const [d1, n1] = taskRange(from, to); const [d0, n0] = taskRange(pf, pt);
  return html`<div>
    <div class="toolbar" style=${{ marginBottom: '30px', justifyContent: 'space-between' }}>
      <div class="seg" role="group" aria-label="Review period">${[['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([k, l]) => html`<button class=${period === k ? 'on' : ''} onClick=${() => { setPeriod(k); setOff(0); }}>${l}</button>`)}</div>
      <div class="daynav" style=${{ display: 'flex', alignItems: 'center', gap: '6px' }}><button class="iconbtn" aria-label="Previous period" onClick=${() => setOff(off - 1)}>${I.left}</button><span class="d" style=${{ fontSize: '28px', minWidth: '200px', textAlign: 'center', letterSpacing: '-.03em' }}>${label.toLowerCase()}</span><button class="iconbtn" aria-label="Next period" disabled=${off >= 0} onClick=${() => setOff(Math.min(0, off + 1))}>${I.right}</button></div>
    </div>
    <div class="twocol">
      <div class="main">
        <${SecHead} label="tracker" />
        <div class="tblwrap" style=${{ marginTop: '10px' }}><table class="tbl"><thead><tr><th>Metric</th><th>This ${period}</th><th>Previous</th><th>Change</th></tr></thead><tbody>
          ${S.metrics().map(m => { const a = sumRange(m, from, to), b = sumRange(m, pf, pt); const d = a != null && b != null ? a - b : null; const good = d == null || d === 0 || m.direction === 'neutral' ? '' : (m.direction === 'down' ? d < 0 : d > 0) ? 'up' : 'down'; const f = v => m.type === 'yesno' ? `${fmtNum(v)} days` : fmtMetric(m, v); return html`<tr><td>${m.name}<span class="muted" style=${{ fontSize: '12px', marginLeft: '8px' }}>${(m.agg || defaultAgg(m.type)) === 'avg' ? 'avg' : 'total'}</span></td><td class="tnum">${a == null ? '–' : f(a)}</td><td class="tnum muted">${b == null ? '–' : f(b)}</td><td class=${'tnum delta ' + good}>${d == null ? '–' : (d >= 0 ? '+' : '−') + f(Math.abs(d)).replace(' days', '') + (b ? ` (${d >= 0 ? '+' : '−'}${Math.abs(Math.round(d / Math.abs(b) * 100))}%)` : '')}</td></tr>`; })}
          <tr><td>To-dos done</td><td class="tnum">${n1 ? `${d1} of ${n1} (${Math.round(d1 / n1 * 100)}%)` : '–'}</td><td class="tnum muted">${n0 ? `${d0} of ${n0} (${Math.round(d0 / n0 * 100)}%)` : '–'}</td><td></td></tr>
        </tbody></table></div>
        <div style=${{ marginTop: '48px' }}><${SecHead} label="reflection" />
          <textarea class="input" style=${{ minHeight: '170px', fontSize: '17px', marginTop: '10px' }} aria-label="Reflection" placeholder="What went well? What will you change next time?" value=${refl} onChange=${e => { S.setReview(key, e.target.value); toast('Reflection saved.'); }}></textarea>
          <p class="muted" style=${{ fontSize: '13px', marginTop: '8px' }}>Saved with ${label}.</p>
        </div>
      </div>
      <div class="side">
        <${SecHead} label="goals" />
        ${S.goals().map(g => { const gs = goalStats(g, to < t0 ? to : t0); return html`<div class="goalrow"><div style=${{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}><button class="t" onClick=${() => go('goals', { id: g.id })}>${g.title}</button><span class=${'pill ' + gs.status}>${gs.statusText}</span></div><div style=${{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}><div class="bar"><i style=${{ width: gs.pct * 100 + '%' }}></i></div><span class="tnum muted" style=${{ fontSize: '13px' }}>${Math.round(gs.pct * 100)}%</span></div></div>`; })}
        ${!S.goals().length ? html`<p class="muted">No goals yet.</p>` : null}
      </div>
    </div>
  </div>`;
}
