/* ===== Demo data (marked demo:true; Settings can clear it) ===== */
function loadDemo() {
  const t0 = todayStr(); let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const D = { demo: true };
  const ago = n => addDays(t0, -n);
  const created = ago(140);
  const M = {
    sleep: { id: 'dm-sleep', name: 'Sleep', type: 'duration', target: 450, direction: 'up', agg: 'avg', category: 'Health', showToday: true, order: 0 },
    deep: { id: 'dm-deep', name: 'Deep work', type: 'duration', target: 240, direction: 'up', agg: 'sum', category: 'Work', showToday: true, order: 1 },
    gym: { id: 'dm-gym', name: 'Running / gym', type: 'yesno', category: 'Health', showToday: true, order: 2, agg: 'sum' },
    run: { id: 'dm-run', name: 'Running', type: 'number', unit: 'km', direction: 'up', agg: 'sum', category: 'Health', showToday: true, order: 3 },
    mood: { id: 'dm-mood', name: 'Mood', type: 'rating', direction: 'up', agg: 'avg', category: 'Mind', showToday: true, order: 4 },
    water: { id: 'dm-water', name: 'Water', type: 'count', unit: 'glasses', target: 8, direction: 'up', agg: 'avg', category: 'Health', showToday: true, order: 5 },
    read: { id: 'dm-read', name: 'Reading', type: 'duration', target: 30, direction: 'up', agg: 'sum', category: 'Learning', showToday: false, order: 6 },
    news: { id: 'dm-news', name: 'News read', type: 'yesno', category: 'Learning', showToday: false, order: 7, agg: 'sum' },
  };
  const existing = S.list('metrics').filter(m => !m.demo);
  S.setList('metrics', [...existing, ...Object.values(M).map(m => ({ ...m, created, ...D }))]);
  const ent = {}; const put = (mid, d, v) => { const y = d.slice(0, 4); const k = `e~${mid}~${y}`; (ent[k] = ent[k] || { mid, year: +y, d: {}, demo: true }).d[d] = { v }; };
  for (let i = 120; i >= 1; i--) {
    const d = ago(i); const wd = dow(d); const trend = (120 - i) / 120;
    if (rnd() < 0.92) put(M.sleep.id, d, Math.round(390 + rnd() * 90 + trend * 20));
    if (wd >= 1 && wd <= 5 && rnd() < 0.9) put(M.deep.id, d, Math.round(120 + rnd() * 150 + trend * 40));
    else if (rnd() < 0.3) put(M.deep.id, d, Math.round(60 + rnd() * 90));
    const runDay = [1, 3, 6].includes(wd) && rnd() < 0.85; const gymDay = [2, 4].includes(wd) && rnd() < 0.8;
    if (runDay) put(M.run.id, d, Math.round((5 + rnd() * 6 + trend * 3 + (wd === 6 ? 4 : 0)) * 10) / 10);
    put(M.gym.id, d, runDay || gymDay ? 1 : 0);
    if (runDay || gymDay) { const k = `e~${M.gym.id}~${d.slice(0, 4)}`; ent[k].d[d].n = runDay ? 'run' : ['gym: legs', 'gym: upper body', 'gym: core'][Math.floor(rnd() * 3)]; }
    if (rnd() < 0.85) put(M.mood.id, d, clamp(Math.round(3 + rnd() * 2.2 - 0.4 + trend * 0.4), 1, 5));
    if (rnd() < 0.8) put(M.water.id, d, Math.round(5 + rnd() * 4));
    if (rnd() < 0.7) put(M.read.id, d, Math.round(15 + rnd() * 40));
    if ((wd >= 1 && wd <= 5 && rnd() < 0.82) || rnd() < 0.3) put(M.news.id, d, 1);
  }
  put(M.sleep.id, t0, 432); put(M.deep.id, t0, 180); put(M.gym.id, t0, 1);
  Object.entries(ent).forEach(([k, v]) => setDoc('s', k, v));

  /* goals */
  const yStart = `${t0.slice(0, 4)}-01-01`, yEnd = `${t0.slice(0, 4)}-12-31`;
  const planStart = ago(56); const titles = ['Easy run 6 km', 'Intervals 6 × 800 m', 'Tempo run 8 km', 'Long run'];
  const steps = Array.from({ length: 28 }, (_, i) => { const date = addDays(planStart, Math.round(i * 3.5)); const kind = titles[i % 4]; const title = kind === 'Long run' ? `Long run ${12 + Math.floor(i / 4) * 2} km` : kind; const done = date < t0 && i !== 9; return { id: 'dms' + i, title, date, done, doneAt: done ? date + 'T07:30:00.000Z' : null }; });
  const goals = [
    { id: 'dg-marathon', title: 'Full marathon training plan', type: 'milestone', logStyle: 'steps', steps, start: planStart, end: addDays(planStart, 98), charts: ['checklist', 'burnup', 'stacked'], category: 'Health' },
    { id: 'dg-500', title: 'Run 500 km this year', type: 'progress', target: 500, unit: 'km', start: yStart, end: yEnd, metricId: M.run.id, charts: ['burnup', 'bar', 'projection'], category: 'Health' },
    { id: 'dg-books', title: 'Read 24 books this year', type: 'progress', target: 24, unit: 'books', start: yStart, end: yEnd, charts: ['area', 'bar', 'pbar'], category: 'Learning', logs: {} },
    { id: 'dg-news', title: 'Stay consistent with the news', type: 'frequency', times: 5, per: 'week', start: ago(120), detailUnit: 'minutes', charts: ['rate', 'bar', 'heatmap'], category: 'Learning', logs: {} },
    { id: 'dg-body', title: 'Reach my desired body type', type: 'target', logStyle: 'measure', baseline: 80, target: 74, unit: 'kg', start: ago(100), end: addDays(t0, 80), charts: ['line', 'range', 'ring'], category: 'Health', logs: {} },
    { id: 'dg-good', title: 'Be a good person', type: 'qualitative', logStyle: 'rating', start: ago(90), charts: ['heatmap', 'line', 'rate'], category: 'Character', logs: {} },
  ];
  Object.entries(ent).forEach(([k, doc]) => { if (doc.mid === M.news.id) Object.keys(doc.d).forEach(d => { if (doc.d[d].v) goals[3].logs[d] = { v: 1, a: Math.round(10 + rnd() * 30) }; }); });
  goals[3].logs[addDays(t0, -1)] = { v: 1, a: 25, n: 'Morning briefing and one long read' };
  const bookDays = [-280, -262, -240, -221, -199, -180, -160, -141, -120, -97, -75, -50, -31, -12].map(n => addDays(t0, n)).filter(d => d >= yStart);
  bookDays.forEach(d => { goals[2].logs[d] = { v: 1 }; });
  for (let i = 100; i >= 0; i -= 3 + Math.floor(rnd() * 3)) { const d = ago(i); goals[4].logs[d] = { v: Math.round((80 - (100 - i) * 0.036 + (rnd() - 0.5) * 0.9) * 10) / 10 }; }
  const notes = ['Helped a junior with their case prep', 'Called home', 'Was short with someone at Team; apologised', 'Volunteered for the campus tour', ''];
  for (let i = 89; i >= 1; i--) { if (rnd() < 0.78) { const v = clamp(Math.round(3 + rnd() * 2.3), 1, 5); goals[5].logs[ago(i)] = { v, ...(rnd() < 0.18 ? { n: notes[Math.floor(rnd() * notes.length)] } : {}) }; } }
  goals.forEach((g, i) => S.saveGoal({ status: 'active', showTarget: true, created: new Date(Date.now() - (10 - i) * 1000).toISOString(), ...g, ...D }));

  /* tasks */
  const ev = { run: uid(), case: uid(), inter: uid() };
  const taskItems = {};
  const addT = t => { const b = t.date ? 't~' + t.date.slice(0, 7) : 'backlog'; (taskItems[b] = taskItems[b] || []).push({ id: uid(), cat: 'personal', done: false, ...t, ...D }); };
  addT({ title: 'Submit valuation sheet', date: t0, kind: 'fullDay', due: '18:00', done: true, cat: 'work' });
  addT({ title: 'Reply to placement emails', date: t0, kind: 'fullDay', due: '21:00', cat: 'work' });
  addT({ title: 'Book marathon training slot', date: t0, kind: 'fullDay', cat: 'health', goalId: null });
  addT({ title: 'Morning run', date: t0, kind: 'timed', start: '08:00', dur: 60, done: true, cat: 'health', eventId: ev.run, metricId: M.gym.id });
  addT({ title: 'Case prep block', date: t0, kind: 'timed', start: '10:00', dur: 90, cat: 'work', eventId: ev.case });
  addT({ title: 'valuation model', date: t0, kind: 'timed', start: '16:00', dur: 60, cat: 'work', eventId: ev.inter });
  addT({ title: 'Read 30 minutes', date: t0, kind: 'timed', start: '21:00', dur: 30, cat: 'personal' });
  addT({ title: 'Call the bank about the card', date: ago(1), kind: 'fullDay', cat: 'personal' });
  const pool = [['Revise econometrics problem set', 'study'], ['Team: confirm speaker slots', 'work'], ['Gym: upper body', 'health'], ['Mock case with Aarav', 'work'], ['Laundry', 'personal'], ['Read two chapters', 'personal'], ['Update application tracker', 'work'], ['Stretch 10 minutes', 'health']];
  for (let i = 14; i >= 1; i--) { const d = ago(i); const n = 3 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const [title, cat] = pool[Math.floor(rnd() * pool.length)]; const timed = rnd() < 0.4; addT({ title, date: d, kind: timed ? 'timed' : 'fullDay', start: timed ? fromMin((8 + Math.floor(rnd() * 10)) * 60) : null, dur: 60, cat, done: rnd() < 0.72, resolved: true }); } }
  addT({ title: 'Update resume with the Internship project', date: null, kind: 'fullDay', cat: 'work' });
  addT({ title: 'Plan a Goa weekend', date: null, kind: 'fullDay', cat: 'social' });
  addT({ title: 'Draft a GMAT study plan', date: null, kind: 'fullDay', cat: 'study' });
  Object.entries(taskItems).forEach(([b, items]) => { const doc = getDoc('s', b) || { items: [] }; setDoc('s', b, { ...doc, items: [...(doc.items || []).filter(x => !x.demo), ...items] }); });
  S.setList('repeats', [...S.repeats().filter(r => !r.demo), { id: 'dr-stretch', title: 'Stretch 10 minutes', kind: 'fullDay', cat: 'health', rule: { type: 'weekdays' }, from: addDays(t0, 1), active: true, ...D }]);

  /* events */
  const evItems = {};
  const addE = e => { const b = 'ev~' + e.date.slice(0, 7); (evItems[b] = evItems[b] || []).push({ id: uid(), allDay: false, cat: 'personal', ...e, ...D }); };
  const tdone = S.tasksOn(t0);
  const tid = title => (Object.values(taskItems).flat().find(t => t.title === title && t.date === t0) || {}).id;
  addE({ id: ev.run, title: 'Morning run', date: t0, start: '08:00', end: '09:00', cat: 'health', taskId: tid('Morning run') });
  addE({ id: ev.case, title: 'Case prep', date: t0, start: '10:00', end: '11:30', cat: 'work', taskId: tid('Case prep block') });
  addE({ title: 'Lunch with a mentor', date: t0, start: '13:00', end: '14:00', cat: 'social' });
  addE({ id: ev.inter, title: 'valuation model', date: t0, start: '16:00', end: '17:00', cat: 'work', taskId: tid('valuation model') });
  addE({ title: 'Reading', date: t0, start: '19:30', end: '20:30', cat: 'personal' });
  addE({ title: 'Case mock interview', date: addDays(t0, 1), start: '15:00', end: '16:00', cat: 'work', reminder: '60' });
  addE({ title: 'Dinner with family', date: addDays(t0, 3), start: '20:00', end: '22:00', cat: 'social' });
  addE({ title: 'Placement week begins', date: addDays(t0, 5), allDay: true, cat: 'work' });
  addE({ title: 'Dentist', date: addDays(t0, -2), start: '17:30', end: '18:15', cat: 'health' });
  Object.entries(evItems).forEach(([b, items]) => { const doc = getDoc('s', b) || { items: [] }; setDoc('s', b, { ...doc, items: [...(doc.items || []).filter(x => !x.demo), ...items] }); });
  S.setList('recurring', [...S.list('recurring').filter(r => !r.demo),
    { id: 'dre-econ', title: 'Econometrics lecture', date: ago(60), start: '11:30', end: '13:00', cat: 'study', rule: { type: 'weekly', days: [1, 3] }, exceptions: [], ...D },
    { id: 'dre-placecom', title: 'Team team sync', date: ago(60), start: '17:00', end: '18:00', cat: 'work', rule: { type: 'weekly', days: [5] }, exceptions: [], ...D },
    { id: 'dre-football', title: 'Football', date: ago(60), start: '07:00', end: '08:30', cat: 'health', rule: { type: 'weekly', days: [6] }, exceptions: [], ...D },
  ]);

  /* folders and notes */
  const F = { acad: 'df-acad', goals: 'df-goals', courses: 'df-courses', work: 'df-work', am: 'df-am', place: 'df-place', pers: 'df-pers', reading: 'df-reading' };
  S.setList('folders', [...S.folders().filter(f => !f.demo),
    { id: F.acad, name: 'Academic', parentId: null }, { id: F.goals, name: 'Goals', parentId: F.acad }, { id: F.courses, name: 'Courses', parentId: F.acad },
    { id: F.work, name: 'Work', parentId: null }, { id: F.am, name: 'Internship', parentId: F.work }, { id: F.place, name: 'Placements', parentId: null },
    { id: F.pers, name: 'Personal', parentId: null }, { id: F.reading, name: 'Reading list', parentId: F.pers },
  ].map(f => ({ ...f, ...D })));
  const at = n => new Date(Date.now() - n * 864e5).toISOString();
  const N = [
    { id: 'dn-q4', title: 'Q4 academic goals', folderId: F.goals, pinned: true, tags: ['q4'], createdAt: at(20), updatedAt: at(2), body: '<h2>What I want by December</h2><ul><li>Finish the econometrics paper with a <span class="hl-yellow">clean identification section</span></li><li>Keep CGPA above <b>3.7</b></li><li>One research assistant role lined up for spring</li></ul><h2>Weekly rhythm</h2><p>Two deep-work blocks a day, <span class="tc-green">Sunday evening review</span>, no new commitments in exam weeks.</p>' },
    { id: 'dn-econ', title: 'Econometrics: panel data', folderId: F.courses, tags: ['econometrics'], createdAt: at(9), updatedAt: at(9), body: '<p>Fixed effects remove anything constant within a unit. Random effects assume the unit effect is uncorrelated with the regressors.</p><h2>Hausman test</h2><p>If the estimates differ a lot, <span class="tc-red">prefer fixed effects</span>.</p>' },
    { id: 'dn-cases', title: 'Case frameworks cheat sheet', folderId: F.place, pinned: true, tags: ['cases'], createdAt: at(30), updatedAt: at(1), body: '<h2>Before every case</h2><ul class="clist"><li class="done">Clarify the objective in one sentence</li><li class="done">Ask about timeframe and metric</li><li>Structure out loud, then go deep on one branch</li><li>Close with a recommendation, risks and next steps</li></ul><h2>Profitability</h2><p>Revenue = price × volume. Costs = fixed + variable. <span class="hl-green">Segment before you calculate.</span></p>' },
    { id: 'dn-inter', title: 'valuation model: open questions', folderId: F.am, tags: ['models'], createdAt: at(5), updatedAt: at(0.2), body: '<ol><li>Working capital days: use the last three years or a five-year average?</li><li>Capex split between maintenance and growth</li><li>Check the debt schedule ties to the balance sheet</li></ol>' },
    { id: 'dn-books', title: 'Books to read', folderId: F.reading, tags: ['reading'], createdAt: at(40), updatedAt: at(6), body: '<ul class="clist"><li class="done">Thinking, Fast and Slow</li><li class="done">The Pyramid Principle</li><li>Poor Economics</li><li>The Hard Thing About Hard Things</li><li>Range</li></ul>' },
    { id: 'dn-pace', title: 'Marathon pacing', folderId: F.pers, tags: ['running'], links: { goalId: 'dg-marathon' }, createdAt: at(12), updatedAt: at(3), body: '<p>Target finish: <b>4h 15m</b>, which is about <span class="tc-blue">6:03 per km</span>.</p><ul><li>Long runs at 6:40 to 7:00</li><li>Tempo at 5:30</li><li>Taper the last two weeks</li></ul>' },
    { id: 'dn-in1', title: 'Weekly review on Sunday evenings', folderId: null, tags: [], createdAt: at(0.1), updatedAt: at(0.1), body: '<p>Use the Review tab in Goals. Fifteen minutes, then plan Monday.</p>' },
    { id: 'dn-in2', title: 'Ask about the go-to-market deck format', folderId: null, tags: [], createdAt: at(1), updatedAt: at(1), body: '' },
  ];
  N.forEach(n => setDoc('n', n.id, { archived: false, deletedAt: null, ...n, ...D }));
  S.setSettings({ dismissedWelcome: true });
}
