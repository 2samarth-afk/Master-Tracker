/* ===== Charts: hand-drawn SVG, theme tokens only ===== */
const CW = 640, CP = { l: 46, r: 16, t: 16, b: 30 };
function niceMax(v) { if (!v || v <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
function barPath(x, y, w, hgt, r = 3) { if (hgt <= 0.5) return ''; r = Math.min(r, w / 2, hgt); return `M${x},${y + hgt}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hgt}Z`; }
const st = v => ({ style: v });

function Frame({ labels, max, min = 0, fmt, tipFor, children, h = 220, band = true, aria, onPick }) {
  const ref = useRef(); const [tip, setTip] = useState(null);
  const n = Math.max(1, labels.length); const iw = CW - CP.l - CP.r, ih = h - CP.t - CP.b;
  const x = i => CP.l + (band ? (i + 0.5) * iw / n : (n <= 1 ? iw / 2 : i * iw / (n - 1)));
  const y = v => CP.t + ih - ((v - min) / ((max - min) || 1)) * ih;
  const bw = iw / n;
  const idxAt = e => { const r = ref.current.getBoundingClientRect(); const sx = (e.clientX - r.left) * CW / r.width; let i = band ? Math.floor((sx - CP.l) / bw) : Math.round((sx - CP.l) / (iw / Math.max(1, n - 1))); return [clamp(i, 0, n - 1), r]; };
  const move = e => { if (!tipFor) return; const [i, r] = idxAt(e); const c = tipFor(i); if (!c) { setTip(null); return; } setTip({ i, left: x(i) * r.width / CW, top: CP.t * r.width / CW, c }); };
  const click = e => { if (!onPick) return; const [i] = idxAt(e); onPick(i); };
  const ticks = [min, (min + max) / 2, max];
  return html`<div class="chart" ref=${ref} onPointerMove=${move} onPointerLeave=${() => setTip(null)} onClick=${click} style=${onPick ? { cursor: 'pointer' } : null}>
    <svg viewBox="0 0 ${CW} ${h}" role="img" aria-label=${aria || 'Chart'}>
      ${ticks.map(t => html`<line class="grid" x1=${CP.l} x2=${CW - CP.r} y1=${y(t)} y2=${y(t)}></line><text class="ax tnum" x=${CP.l - 8} y=${y(t) + 4} text-anchor="end">${fmt(t)}</text>`)}
      ${labels.map((l, i) => l ? html`<text class="ax" x=${x(i)} y=${h - 9} text-anchor="middle">${l}</text>` : null)}
      ${tip ? html`<line x1=${x(tip.i)} x2=${x(tip.i)} y1=${CP.t} y2=${CP.t + ih} ...${st({ stroke: 'var(--line-2)' })} stroke-dasharray="3 3"></line>` : null}
      ${children({ x, y, bw, iw, ih, n, h })}
    </svg>
    ${tip ? html`<div class="tip" style=${{ left: tip.left + 'px', top: tip.top + 'px' }}>${tip.c}</div>` : null}
  </div>`;
}
const axisFmt = (kind, unit) => v => kind === 'duration' ? (v >= 60 ? `${round1(v / 60)}h` : `${Math.round(v)}m`) : kind === 'pct' ? `${Math.round(v * 100)}%` : fmtNum(v);

function BarChart({ buckets, values, prev, fmt, axis, target, aria, onPick }) {
  const all = [...values, ...(prev || []), target || 0].filter(v => v != null);
  const max = niceMax(Math.max(1e-9, ...all));
  const tipFor = i => html`<div><b>${buckets[i].title}</b></div><div>${values[i] == null ? 'No entry' : fmt(values[i])}</div>${prev ? html`<div style=${{ opacity: .75 }}>Previous: ${prev[i] == null ? 'No entry' : fmt(prev[i])}</div>` : null}`;
  return html`<${Frame} labels=${buckets.map(b => b.label)} max=${max} fmt=${axis} tipFor=${tipFor} aria=${aria} onPick=${onPick}>${({ x, y, bw }) => {
    const gw = Math.min(28, bw * (prev ? 0.36 : 0.62)); const gap = 2;
    return html`<g>
      ${prev ? prev.map((v, i) => v == null ? null : html`<path d=${barPath(x(i) - gw - gap / 2, y(v), gw, y(0) - y(v))} ...${st({ fill: 'var(--prev)' })}></path>`) : null}
      ${values.map((v, i) => v == null ? null : html`<path d=${barPath(prev ? x(i) + gap / 2 : x(i) - gw / 2, y(v), gw, y(0) - y(v))} ...${st({ fill: 'var(--red)' })}></path>`)}
      ${target ? html`<line x1=${CP.l} x2=${CW - CP.r} y1=${y(target)} y2=${y(target)} ...${st({ stroke: 'var(--ink)' })} stroke-dasharray="5 4" stroke-width="1.2"></line><text class="ax" x=${CW - CP.r} y=${y(target) - 6} text-anchor="end">Target</text>` : null}
    </g>`;
  }}<//>`;
}

function LineChart({ buckets, values, prev, fmt, axis, target, aria, area, onPick }) {
  const all = [...values, ...(prev || []), target || 0].filter(v => v != null);
  const mx = Math.max(1e-9, ...all); const mn = Math.min(...all.filter(v => v != null), 0);
  const min = mn < 0 ? -niceMax(-mn) : (area ? 0 : (Math.min(...values.filter(v => v != null)) > mx * 0.6 ? Math.floor(Math.min(...all) * 0.9) : 0));
  const max = min > 0 ? min + niceMax(mx - min) : niceMax(mx);
  const tipFor = i => html`<div><b>${buckets[i].title}</b></div><div>${values[i] == null ? 'No entry' : fmt(values[i])}</div>${prev ? html`<div style=${{ opacity: .75 }}>Previous: ${prev[i] == null ? 'No entry' : fmt(prev[i])}</div>` : null}`;
  const path = (vals, x, y) => { let d = ''; let pen = false; vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; }); return d; };
  return html`<${Frame} labels=${buckets.map(b => b.label)} max=${max} min=${min} fmt=${axis} tipFor=${tipFor} band=${false} aria=${aria} onPick=${onPick}>${({ x, y }) => {
    const idx = values.map((v, i) => v == null ? -1 : i).filter(i => i >= 0); const last = idx[idx.length - 1];
    let areaD = ''; if (area && idx.length > 1) areaD = path(values, x, y) + `L${x(last)},${y(min)}L${x(idx[0])},${y(min)}Z`;
    return html`<g>
      ${areaD ? html`<path d=${areaD} ...${st({ fill: 'var(--red)', opacity: .12 })}></path>` : null}
      ${prev ? html`<path d=${path(prev, x, y)} fill="none" ...${st({ stroke: 'var(--prev)' })} stroke-width="2" stroke-dasharray="5 4"></path>` : null}
      <path d=${path(values, x, y)} fill="none" ...${st({ stroke: 'var(--red)' })} stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
      ${idx.length < 40 ? idx.map(i => html`<circle cx=${x(i)} cy=${y(values[i])} r=${i === last ? 4.5 : 2.6} ...${st({ fill: i === last ? 'var(--red)' : 'var(--raise)', stroke: 'var(--red)' })} stroke-width="1.6"></circle>`) : (last != null ? html`<circle cx=${x(last)} cy=${y(values[last])} r="4.5" ...${st({ fill: 'var(--red)' })}></circle>` : null)}
      ${target ? html`<line x1=${CP.l} x2=${CW - CP.r} y1=${y(target)} y2=${y(target)} ...${st({ stroke: 'var(--ink)' })} stroke-dasharray="5 4" stroke-width="1.2"></line><text class="ax" x=${CW - CP.r} y=${y(target) - 6} text-anchor="end">Target ${fmt(target)}</text>` : null}
    </g>`;
  }}<//>`;
}

/* Cumulative over dates, with optional pace and projection lines */
function CumChart({ from, to, daily, target, plan, fmt, axis, projection, aria }) {
  const n = Math.max(2, diffDays(from, to) + 1); const t0 = todayStr();
  const dates = Array.from({ length: n }, (_, i) => addDays(from, i));
  let run = 0; const cum = dates.map(d => { if (d > t0) return null; run += daily[d] || 0; return run; });
  const lastI = Math.min(n - 1, Math.max(0, diffDays(from, t0)));
  let proj = null, finish = null;
  if (projection) {
    const look = Math.min(28, lastI); const a = cum[lastI - look] ?? 0, b = cum[lastI] ?? 0; const rate = look ? (b - a) / look : 0;
    proj = dates.map((d, i) => i < lastI ? null : b + rate * (i - lastI));
    if (target && rate > 0 && b < target) { const k = Math.ceil((target - b) / rate); finish = addDays(t0, k); }
  }
  const planVals = plan ? dates.map(plan) : null;
  const all = [...cum, ...(proj || []), ...(planVals || []), target || 0].filter(v => v != null);
  const max = niceMax(Math.max(1e-9, ...all));
  const step = Math.ceil(n / 6);
  const labels = dates.map((d, i) => (i % step === 0 || i === n - 1) ? fmtDM(d) : '');
  const tipFor = i => html`<div><b>${fmtShort(dates[i])}</b></div>${cum[i] != null ? html`<div>So far: ${fmt(cum[i])}</div>` : null}${planVals ? html`<div style=${{ opacity: .75 }}>Pace needed: ${fmt(planVals[i])}</div>` : null}${proj && proj[i] != null && i > lastI ? html`<div style=${{ opacity: .75 }}>Projected: ${fmt(proj[i])}</div>` : null}`;
  const path = (vals, x, y) => { let d = ''; let pen = false; vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; }); return d; };
  return html`<div>
    <${Frame} labels=${labels} max=${max} fmt=${axis} tipFor=${tipFor} band=${false} aria=${aria}>${({ x, y }) => html`<g>
      ${cum[lastI] != null ? html`<path d=${path(cum, x, y) + `L${x(lastI)},${y(0)}L${x(0)},${y(0)}Z`} ...${st({ fill: 'var(--red)', opacity: .13 })}></path>` : null}
      ${planVals ? html`<path d=${path(planVals, x, y)} fill="none" ...${st({ stroke: 'var(--prev)' })} stroke-width="2" stroke-dasharray="5 4"></path>` : null}
      ${proj ? html`<path d=${path(proj.map(v => v != null && target && v > max ? null : v), x, y)} fill="none" ...${st({ stroke: 'var(--red)' })} stroke-width="1.6" stroke-dasharray="2 4"></path>` : null}
      <path d=${path(cum, x, y)} fill="none" ...${st({ stroke: 'var(--red)' })} stroke-width="2.2"></path>
      ${cum[lastI] != null ? html`<circle cx=${x(lastI)} cy=${y(cum[lastI])} r="4.5" ...${st({ fill: 'var(--red)' })}></circle>` : null}
      ${target ? html`<line x1=${CP.l} x2=${CW - CP.r} y1=${y(target)} y2=${y(target)} ...${st({ stroke: 'var(--ink)' })} stroke-dasharray="5 4" stroke-width="1.2"></line><text class="ax" x=${CP.l + 6} y=${y(target) - 6}>Target ${fmt(target)}</text>` : null}
    </g>`}<//>
    <div class="legend"><span><i style=${{ background: 'var(--red)' }}></i>Actual</span>${planVals ? html`<span><i style=${{ background: 'var(--prev)' }}></i>Pace needed</span>` : null}${proj ? html`<span><i style=${{ background: 'repeating-linear-gradient(90deg,var(--red) 0 2px,transparent 2px 5px)' }}></i>Projection</span>` : null}</div>
    ${projection ? html`<p class="muted" style=${{ marginTop: '8px', fontSize: '14px' }}>${target ? (cum[lastI] >= target ? 'Target reached.' : finish ? `At the current rate you finish on ${fmtFull(finish)}.` : 'Log a few more days to see a projected finish.') : 'Projection uses your last four weeks.'}</p>` : null}
  </div>`;
}

function Heatmap({ weeks = 17, level, title, onPick, anchor, selected }) {
  const end = anchor || todayStr(); const ws = S.settings().weekStart;
  const first = addDays(weekStart(end, ws), -(weeks - 1) * 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i));
  return html`<div class="heat" role="group" aria-label="Daily heatmap">
    ${days.map(d => d > end ? html`<span style=${{ width: '13px', height: '13px' }}></span>` : html`<button type="button" class=${'l' + level(d) + (d === todayStr() ? ' today' : '') + (selected && d === selected && d !== todayStr() ? ' sel' : '')} title=${title(d)} aria-label=${title(d)} onClick=${onPick ? () => onPick(d) : null}></button>`)}
  </div>`;
}
const HeatKey = () => html`<div class="heatkey"><span class="lbl-s">less</span>${[0, 1, 2, 3, 4].map(l => html`<i style=${{ background: `var(--heat${l})` }}></i>`)}<span class="lbl-s">more</span></div>`;

function Sparkline({ values, w = 120, hgt = 30 }) {
  const v = values.map(x => x == null ? null : x); const real = v.filter(x => x != null);
  if (real.length < 2) return html`<svg width=${w} height=${hgt} aria-hidden="true"><line x1="0" x2=${w} y1=${hgt - 2} y2=${hgt - 2} ...${st({ stroke: 'var(--line)' })}></line></svg>`;
  const mx = Math.max(...real), mn = Math.min(...real); const sx = i => i * w / (v.length - 1); const sy = x => hgt - 3 - (mx === mn ? 0.5 : (x - mn) / (mx - mn)) * (hgt - 6);
  let d = ''; let pen = false; v.forEach((x, i) => { if (x == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(x).toFixed(1)}`; pen = true; });
  const li = v.map((x, i) => x == null ? -1 : i).filter(i => i >= 0).pop();
  return html`<svg width=${w} height=${hgt} viewBox="0 0 ${w} ${hgt}" aria-hidden="true" style=${{ overflow: 'visible' }}><path d=${d} fill="none" ...${st({ stroke: 'var(--red)' })} stroke-width="1.6"></path><circle cx=${sx(li)} cy=${sy(v[li])} r="2.8" ...${st({ fill: 'var(--red)' })}></circle></svg>`;
}

function Ring({ pct, label, sub }) {
  const r = 70, c = 2 * Math.PI * r; const p = clamp(pct || 0, 0, 1);
  return html`<div style=${{ display: 'flex', alignItems: 'center', gap: '26px', flexWrap: 'wrap' }}>
    <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label=${`${Math.round(p * 100)} percent`}>
      <circle cx="85" cy="85" r=${r} fill="none" ...${st({ stroke: 'var(--line)' })} stroke-width="10"></circle>
      <circle cx="85" cy="85" r=${r} fill="none" ...${st({ stroke: 'var(--red)' })} stroke-width="10" stroke-dasharray=${`${c * p} ${c}`} transform="rotate(-90 85 85)" stroke-linecap="round"></circle>
      <text x="85" y="92" text-anchor="middle" ...${st({ fill: 'var(--hero)', fontSize: '34px', fontFamily: 'var(--display)', fontWeight: 500 })}>${Math.round(p * 100)}%</text>
    </svg>
    <div><div style=${{ fontSize: '20px' }}>${label}</div><div class="muted">${sub}</div></div>
  </div>`;
}
function PBar({ pct, label, sub }) {
  const p = clamp(pct || 0, 0, 1);
  return html`<div style=${{ padding: '18px 0 8px' }}>
    <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}><span style=${{ fontSize: '56px', color: 'var(--red)' }} class="tnum d">${Math.round(p * 100)}%</span><span class="muted">${label}</span></div>
    <div class="bar" style=${{ height: '10px', marginTop: '14px' }}><i style=${{ width: p * 100 + '%' }}></i></div>
    <div class="muted" style=${{ marginTop: '10px', fontSize: '14px' }}>${sub}</div>
  </div>`;
}
function StreakGrid({ daily, days = 56 }) {
  const end = todayStr(); const first = addDays(end, -(days - 1)); const list = Array.from({ length: days }, (_, i) => addDays(first, i));
  let cur = 0; let d = daily[end] != null ? end : addDays(end, -1); while (daily[d] != null && cur < 5000) { cur++; d = addDays(d, -1); }
  let best = 0, run = 0, prev = null; Object.keys(daily).sort().forEach(x => { run = prev && diffDays(prev, x) === 1 ? run + 1 : 1; prev = x; best = Math.max(best, run); });
  return html`<div>
    <div style=${{ display: 'flex', gap: '40px', marginBottom: '16px' }}><div><div class="lbl-s">current</div><div class="tnum d" style=${{ fontSize: '40px', color: 'var(--red)' }}>${cur} <span style=${{ fontSize: '15px', fontFamily: 'var(--body)', letterSpacing: 0, color: 'var(--soft)' }}>days</span></div></div><div><div class="lbl-s">longest</div><div class="tnum d" style=${{ fontSize: '40px', color: 'var(--red)' }}>${best} <span style=${{ fontSize: '15px', fontFamily: 'var(--body)', letterSpacing: 0, color: 'var(--soft)' }}>days</span></div></div></div>
    <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: '5px', maxWidth: '420px' }}>${list.map(x => html`<span title=${fmtShort(x) + (daily[x] != null ? ': logged' : ': not logged')} style=${{ aspectRatio: '1', borderRadius: '50%', background: daily[x] != null ? 'var(--red)' : 'transparent', border: '1.5px solid ' + (daily[x] != null ? 'var(--red)' : 'var(--line-2)'), outline: x === end ? '1.5px solid var(--ink)' : 'none', outlineOffset: '1px' }}></span>`)}</div>
    <div class="muted" style=${{ marginTop: '10px', fontSize: '13px' }}>Last ${days} days, oldest first</div>
  </div>`;
}
function weeksBack(n) { const ws = S.settings().weekStart; const cur = weekStart(todayStr(), ws); return Array.from({ length: n }, (_, i) => { const f = addDays(cur, -(n - 1 - i) * 7); return { from: f, to: addDays(f, 6), label: i % 3 === 0 || i === n - 1 ? fmtDM(f) : '', title: `Week of ${fmtDM(f)}` }; }); }
function StackedChart({ weeks, done, need, fmt, aria }) {
  const missed = done.map((d, i) => Math.max(0, (need[i] || 0) - d));
  const max = niceMax(Math.max(1, ...done.map((d, i) => d + missed[i])));
  const tipFor = i => html`<div><b>${weeks[i].title}</b></div><div>Done: ${fmt(done[i])}</div><div style=${{ opacity: .75 }}>Missed: ${fmt(missed[i])}</div>`;
  return html`<div><${Frame} labels=${weeks.map(w => w.label)} max=${max} fmt=${fmtNum} tipFor=${tipFor} aria=${aria}>${({ x, y, bw }) => { const w = Math.min(26, bw * 0.6); return html`<g>${done.map((d, i) => html`<g>
      <rect x=${x(i) - w / 2} y=${y(d)} width=${w} height=${Math.max(0, y(0) - y(d))} ...${st({ fill: 'var(--red)' })}></rect>
      ${missed[i] > 0 ? html`<path d=${barPath(x(i) - w / 2, y(d + missed[i]), w, Math.max(0, y(d) - y(d + missed[i]) - 2))} ...${st({ fill: 'var(--prev)' })}></path>` : null}
    </g>`)}</g>`; }}<//>
    <div class="legend"><span><i style=${{ background: 'var(--red)' }}></i>Done</span><span><i style=${{ background: 'var(--prev)' }}></i>Missed</span></div></div>`;
}
function RateChart({ weeks, rates, aria }) {
  const tipFor = i => html`<div><b>${weeks[i].title}</b></div><div>${rates[i] == null ? 'Not started' : Math.round(rates[i] * 100) + '% of target'}</div>`;
  return html`<${Frame} labels=${weeks.map(w => w.label)} max=${Math.max(1, niceMax(Math.max(1, ...rates.filter(r => r != null))))} fmt=${axisFmt('pct')} tipFor=${tipFor} aria=${aria}>${({ x, y, bw }) => { const w = Math.min(26, bw * 0.6); return html`<g>
    ${rates.map((r, i) => r == null ? null : html`<path d=${barPath(x(i) - w / 2, y(Math.min(r, 1.5)), w, y(0) - y(Math.min(r, 1.5)))} ...${st({ fill: r >= 1 ? 'var(--red)' : 'var(--prev)' })}></path>`)}
    <line x1=${CP.l} x2=${CW - CP.r} y1=${y(1)} y2=${y(1)} ...${st({ stroke: 'var(--ink)' })} stroke-dasharray="5 4" stroke-width="1.2"></line><text class="ax" x=${CW - CP.r} y=${y(1) - 6} text-anchor="end">Target</text>
  </g>`; }}<//>`;
}
function ScatterChart({ daily, from, fmt, axis, target, aria }) {
  const t0 = todayStr(); const n = diffDays(from, t0) + 1; const dates = Array.from({ length: n }, (_, i) => addDays(from, i));
  const pts = dates.map((d, i) => daily[d] != null ? [i, daily[d]] : null).filter(Boolean);
  const vals = pts.map(p => p[1]); const lo = Math.min(...vals, target ?? Infinity), hi = Math.max(...vals, target ?? -Infinity);
  const min = pts.length ? Math.max(0, Math.floor(lo - (hi - lo) * 0.15 - 0.01)) : 0; const max = pts.length ? Math.ceil(hi + (hi - lo) * 0.15 + 0.01) : 1;
  let trend = null; if (pts.length >= 3) { const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = vals.reduce((a, v) => a + v, 0) / pts.length; let num = 0, den = 0; pts.forEach(p => { num += (p[0] - mx) * (p[1] - my); den += (p[0] - mx) ** 2; }); const b = den ? num / den : 0; trend = [my - b * mx, b]; }
  const step = Math.ceil(n / 6); const labels = dates.map((d, i) => (i % step === 0 || i === n - 1) ? fmtDM(d) : '');
  const tipFor = i => daily[dates[i]] != null ? html`<div><b>${fmtShort(dates[i])}</b></div><div>${fmt(daily[dates[i]])}</div>` : null;
  return html`<${Frame} labels=${labels} max=${max} min=${min} fmt=${axis} tipFor=${tipFor} band=${false} aria=${aria}>${({ x, y }) => html`<g>
    ${trend ? html`<line x1=${x(0)} x2=${x(n - 1)} y1=${y(trend[0])} y2=${y(trend[0] + trend[1] * (n - 1))} ...${st({ stroke: 'var(--soft)' })} stroke-width="1.4" stroke-dasharray="6 4"></line>` : null}
    ${target != null ? html`<line x1=${CP.l} x2=${CW - CP.r} y1=${y(target)} y2=${y(target)} ...${st({ stroke: 'var(--ink)' })} stroke-dasharray="5 4" stroke-width="1.2"></line><text class="ax" x=${CW - CP.r} y=${y(target) - 6} text-anchor="end">Target</text>` : null}
    ${pts.map(p => html`<circle cx=${x(p[0])} cy=${y(p[1])} r="4.5" ...${st({ fill: 'var(--red)', stroke: 'var(--raise)' })} stroke-width="2"></circle>`)}
  </g>`}<//>`;
}
function RangeChart({ daily, weeks, fmt, axis, target, aria }) {
  const rows = weeks.map(w => { const v = Object.keys(daily).filter(d => d >= w.from && d <= w.to).map(d => daily[d]); return v.length ? { lo: Math.min(...v), hi: Math.max(...v), mean: v.reduce((a, b) => a + b, 0) / v.length } : null; });
  const real = rows.filter(Boolean); const lo = Math.min(...real.map(r => r.lo), target ?? Infinity), hi = Math.max(...real.map(r => r.hi), target ?? -Infinity);
  const min = real.length ? Math.max(0, Math.floor(lo - (hi - lo) * 0.2 - 0.01)) : 0, max = real.length ? Math.ceil(hi + (hi - lo) * 0.2 + 0.01) : 1;
  const tipFor = i => rows[i] ? html`<div><b>${weeks[i].title}</b></div><div>Low ${fmt(rows[i].lo)}, high ${fmt(rows[i].hi)}</div><div>Average ${fmt(rows[i].mean)}</div>` : null;
  return html`<${Frame} labels=${weeks.map(w => w.label)} max=${max} min=${min} fmt=${axis} tipFor=${tipFor} aria=${aria}>${({ x, y }) => html`<g>
    ${rows.map((r, i) => r ? html`<g><line x1=${x(i)} x2=${x(i)} y1=${y(r.lo)} y2=${y(r.hi)} ...${st({ stroke: 'var(--heat2)' })} stroke-width="10" stroke-linecap="round"></line><circle cx=${x(i)} cy=${y(r.mean)} r="4" ...${st({ fill: 'var(--red)', stroke: 'var(--raise)' })} stroke-width="2"></circle></g>` : null)}
    ${target != null ? html`<line x1=${CP.l} x2=${CW - CP.r} y1=${y(target)} y2=${y(target)} ...${st({ stroke: 'var(--ink)' })} stroke-dasharray="5 4" stroke-width="1.2"></line>` : null}
  </g>`}<//>`;
}

/* ---------- goal chart dispatcher ---------- */
function goalFmt(g) { const s = goalLogStyle(g); return v => v == null ? '–' : s === 'check' ? `${fmtNum(v)} day${v === 1 ? '' : 's'}` : s === 'steps' ? `${fmtNum(v)} step${v === 1 ? '' : 's'}` : s === 'rating' ? `${round1(v)} / 5` : `${fmtNum(v)}${g.unit ? ' ' + g.unit : ''}`; }
function GoalChart({ g, type, period, compare }) {
  const daily = goalDaily(g); const style = goalLogStyle(g); const agg = goalAgg(g); const fmt = goalFmt(g); const axis = v => fmtNum(v);
  const stats = goalStats(g); const t0 = todayStr(); const kind = goalKind(g);
  const target = g.showTarget !== false && g.target != null && g.target !== '' ? +g.target : null;
  const startDate = g.start || Object.keys(daily).sort()[0] || addDays(t0, -60);
  const steps = g.steps || [];
  const aria = `${(CHART_TYPES.find(c => c.id === type) || {}).name} for ${g.title}`;
  if (type === 'line' || type === 'bar' || type === 'grouped') {
    const useAmt = style === 'check' && g.detailUnit && Object.keys(goalAmounts(g)).length;
    const src = useAmt ? goalAmounts(g) : daily; const fmtA = useAmt ? (v => v == null ? '–' : `${fmtNum(v)} ${g.detailUnit}`) : fmt;
    const b = periodBuckets(period, t0, 0); const vals = bucketize(src, b, agg);
    const prev = (compare || type === 'grouped') ? bucketize(src, periodBuckets(period, t0, -1), agg) : null;
    const tl = (style === 'measure' || style === 'rating') ? target : null;
    const C = type === 'line' ? LineChart : BarChart;
    return html`<div><${C} buckets=${b} values=${vals} prev=${prev} fmt=${fmtA} axis=${axis} target=${tl} aria=${aria} />${prev ? html`<div class="legend"><span><i style=${{ background: 'var(--red)' }}></i>${PERIOD_NAMES[period][0]}</span><span><i style=${{ background: 'var(--prev)' }}></i>${PERIOD_NAMES[period][1]}</span></div>` : null}${useAmt ? html`<p class="muted" style=${{ fontSize: '13px', marginTop: '6px' }}>Showing ${g.detailUnit} logged each day.</p>` : null}${compareSummary(vals, prev, agg, fmtA, g.direction)}</div>`;
  }
  if (type === 'area' || type === 'burnup' || type === 'projection') {
    if (style === 'measure' && type === 'projection') {
      const from = addDays(t0, -60); return html`<${ScatterChart} daily=${daily} from=${from} fmt=${fmt} axis=${axis} target=${target} aria=${aria} />`;
    }
    const to = g.end && g.end > t0 ? g.end : (type === 'projection' ? addDays(t0, 30) : t0);
    let tgt = null, plan = null;
    if (style === 'steps') { tgt = steps.length; if (type === 'burnup') { const dated = steps.filter(s => s.date); plan = d => dated.filter(s => s.date <= d).length; } }
    else if (kind === 'progress') { tgt = +g.target || null; if (type === 'burnup' && g.end && tgt) { const span = Math.max(1, diffDays(startDate, g.end)); plan = d => tgt * clamp(diffDays(startDate, d), 0, span) / span; } }
    else if (kind === 'frequency' && type === 'burnup') { const pw = freqPerWeek(g); plan = d => pw * Math.max(0, diffDays(startDate, d) + 1) / 7; }
    const from = type === 'area' ? startDate : startDate;
    const dl = {}; Object.keys(daily).forEach(d => { if (d >= from) dl[d] = style === 'check' ? 1 : daily[d]; });
    return html`<${CumChart} from=${from} to=${to < from ? t0 : to} daily=${dl} target=${tgt} plan=${plan} fmt=${fmt} axis=${axis} projection=${type === 'projection'} aria=${aria} />`;
  }
  if (type === 'heatmap') {
    const weeks = period === 'week' ? 12 : period === 'month' ? 26 : 53; const vals = Object.values(daily); const mx = Math.max(1, ...vals);
    const lvl = d => { const v = daily[d]; if (v == null) return 0; if (style === 'check' || style === 'steps') return 4; if (style === 'rating') return clamp(Math.round(v) - 1, 1, 4); return clamp(Math.ceil(v / mx * 4), 1, 4); };
    return html`<div><${Heatmap} weeks=${weeks} level=${lvl} title=${d => `${fmtShort(d)}: ${daily[d] == null ? 'nothing logged' : fmt(daily[d])}`} /><div style=${{ marginTop: '14px' }}><${HeatKey} /></div></div>`;
  }
  if (type === 'streak') return html`<${StreakGrid} daily=${daily} days=${period === 'year' ? 84 : 56} />`;
  if (type === 'ring') return html`<${Ring} pct=${stats.pct} label=${stats.valueText} sub=${stats.statusText} />`;
  if (type === 'pbar') return html`<${PBar} pct=${stats.pct} label=${stats.valueText} sub=${stats.statusText + (stats.daysLeft != null ? ` · ${stats.daysLeft} days left` : '')} />`;
  if (type === 'stacked' || type === 'rate') {
    const weeks = weeksBack(12);
    const done = weeks.map(w => Object.keys(daily).filter(d => d >= w.from && d <= w.to).reduce((a, d) => a + (style === 'steps' ? daily[d] : 1), 0));
    let need = weeks.map(() => kind === 'frequency' ? freqPerWeek(g) : 7);
    if (style === 'steps') need = weeks.map(w => steps.filter(s => s.date && s.date >= w.from && s.date <= w.to).length);
    if (type === 'stacked') return html`<${StackedChart} weeks=${weeks} done=${done} need=${need} fmt=${fmtNum} aria=${aria} />`;
    const rates = weeks.map((w, i) => w.to < startDate ? null : need[i] ? done[i] / need[i] : null);
    return html`<${RateChart} weeks=${weeks} rates=${rates} aria=${aria} />`;
  }
  if (type === 'checklist') return html`<${StepList} g=${g} />`;
  if (type === 'scatter') { const from = addDays(t0, period === 'week' ? -29 : period === 'month' ? -89 : -364); return html`<${ScatterChart} daily=${daily} from=${from < startDate ? startDate : from} fmt=${fmt} axis=${axis} target=${style === 'measure' ? target : null} aria=${aria} />`; }
  if (type === 'range') return html`<${RangeChart} daily=${daily} weeks=${weeksBack(12)} fmt=${fmt} axis=${axis} target=${style === 'measure' ? target : null} aria=${aria} />`;
  return null;
}
function compareSummary(vals, prev, agg, fmt, direction) {
  if (!prev) return null;
  const a = aggregate(vals, agg), b = aggregate(prev, agg); if (a == null || b == null) return null;
  const d = a - b; const pct = b ? d / Math.abs(b) : null; const good = direction === 'down' ? d < 0 : d > 0;
  return html`<div class="delta ${d === 0 ? '' : good ? 'up' : 'down'}" style=${{ marginTop: '10px' }}>${agg === 'avg' ? 'Average' : 'Total'} ${fmt(a)} vs ${fmt(b)} · ${d >= 0 ? '+' : '−'}${fmt(Math.abs(d)).replace(/ day(s)?| step(s)?/, '')}${pct != null ? ` (${d >= 0 ? '+' : '−'}${Math.abs(Math.round(pct * 100))}%)` : ''}</div>`;
}
function StepList({ g }) {
  const steps = g.steps || []; const done = steps.filter(s => s.done).length; const t0 = todayStr();
  const toggle = s => { const n = steps.map(x => x.id === s.id ? { ...x, done: !x.done, doneAt: !x.done ? new Date().toISOString() : null } : x); S.saveGoal({ ...g, steps: n }); };
  return html`<div>
    <div class="lbl-s" style=${{ marginBottom: '10px' }}>${done} of ${steps.length} done</div>
    <div style=${{ maxHeight: '320px', overflowY: 'auto' }}>
      ${steps.map(s => html`<label class="taskrow ${s.done ? 'done' : ''}" style=${{ cursor: 'pointer' }}>
        <input type="checkbox" checked=${!!s.done} onChange=${() => toggle(s)} />
        <span class="n">${s.title}</span>
        ${s.date ? html`<span class="meta tnum" style=${{ color: !s.done && s.date < t0 ? 'var(--warn)' : null }}>${fmtShort(s.date)}</span>` : null}
      </label>`)}
      ${!steps.length ? html`<p class="muted">No steps yet. Edit the goal to add sessions or steps.</p>` : null}
    </div>
  </div>`;
}
