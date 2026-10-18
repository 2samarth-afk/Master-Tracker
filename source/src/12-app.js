/* ===== App and boot ===== */
function App() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force(x => x + 1); DB.subs.add(f); f(); return () => DB.subs.delete(f); }, []);
  const s = S.settings();
  useEffect(() => { const r = document.documentElement; if (s.theme === 'light' || s.theme === 'dark') r.setAttribute('data-theme', s.theme); else r.removeAttribute('data-theme'); }, [s.theme]);
  useEffect(() => { const r = document.documentElement; if (s.typeface === 'serif') r.setAttribute('data-type', 'serif'); else r.removeAttribute('data-type'); }, [s.typeface]);
  useEffect(() => {
    const k = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return; const t = e.target;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (V.overlay || V.quick || UI.confirm) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); newNote(V.page === 'notes' && V.notesView ? V.notesView : { kind: 'inbox' }); }
      else if (e.key === '/') { e.preventDefault(); setV({ overlay: 'search' }); }
      else if (e.key === '?') { e.preventDefault(); setV({ overlay: 'shortcuts' }); }
    };
    window.addEventListener('keydown', k);
    const hc = () => { const p = location.hash.slice(1); if (PAGES.some(x => x[0] === p) && p !== V.page) go(p); };
    window.addEventListener('hashchange', hc);
    const t = setInterval(checkReminders, 30000);
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('hashchange', hc); clearInterval(t); };
  }, []);
  if (DB.mode === 'auth') return html`<${AuthScreen} />`;
  const Page = { today: Today, tracker: Tracker, goals: Goals, todo: Todo, notes: Notes }[V.page] || Today;
  return html`<${Fragment}>
    <${Strip} />
    <${Topbar} />
    <main id="main"><${Page} /></main>
    <${BottomNav} />
    ${V.quick ? html`<${QuickAdd} key=${V.quick} />` : null}
    ${V.overlay === 'search' ? html`<${SearchOverlay} />` : null}
    ${V.overlay === 'settings' ? html`<${Settings} />` : null}
    ${V.overlay === 'shortcuts' ? html`<${Shortcuts} />` : null}
    ${V.overlay === 'eod' ? html`<${EodPrompt} />` : null}
    ${V.overlay === 'exporttext' ? html`<${ExportText} />` : null}
    <${UiHost} />
  <//>`;
}

function onReady() {
  // Trash older than 30 days is emptied
  const cutoff = Date.now() - 30 * 864e5;
  S.notes().forEach(n => { if (n.deletedAt && Date.parse(n.deletedAt) < cutoff) S.deleteNoteForever(n.id); });
  // Unfinished full-day tasks from earlier days
  const s = S.settings(); const t0 = todayStr();
  if (s.carry === 'ask') { if (pendingCarry().length && s.lastEod !== t0 && !V.overlay) { setV({ overlay: 'eod' }); S.setSettings({ lastEod: t0 }); } }
  else autoCarry();
  checkReminders();
}
/* Browsers only honour autofocus on page load; focus inputs that appear later (inline adds, dialogs) */
function watchAutofocus() {
  const focusNew = root => { const list = root.querySelectorAll ? Array.from(root.querySelectorAll('[autofocus]:not([data-af])')) : []; if (root.matches && root.matches('[autofocus]:not([data-af])')) list.unshift(root); const el = list[list.length - 1]; list.forEach(x => x.setAttribute('data-af', '1')); if (el) requestAnimationFrame(() => { try { el.focus({ preventScroll: el.closest('.tl,.cal-grid') ? true : false }); } catch (e) { el.focus(); } }); };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) focusNew(n); }))).observe(document.body, { childList: true, subtree: true });
}
(function boot() {
  watchAutofocus();
  loadLocal();
  const p = (location.hash || '').slice(1); if (PAGES.some(x => x[0] === p)) V.page = p;
  render(html`<${App} />`, document.getElementById('app'));
  connectDb();
  let tries = 0;
  const wait = setInterval(() => { if (DB.mode === 'auth') return; tries++; if (DB.mode === 'synced' || DB.mode === 'local' || tries > 40) { clearInterval(wait); onReady(); } }, 300);
  // a tick on every minute keeps clocks, "now" lines and "next" up to date on every screen
  setTimeout(() => { emit(); setInterval(emit, 60000); }, (60 - new Date().getSeconds()) * 1000 + 50);
  // re-check at midnight so Today rolls over
  let day = todayStr(); setInterval(() => { if (todayStr() !== day) { day = todayStr(); setV({ todayDate: null, todoDate: null }); onReady(); } }, 60000);
})();
