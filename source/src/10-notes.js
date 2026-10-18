/* ===== Notes ===== */
const TEXT_COLORS = [['ink', 'Default', 'var(--ink)', 'rgb(255, 0, 0)'], ['red', 'Red', 'var(--tc-red)', 'rgb(255, 0, 1)'], ['blue', 'Blue', 'var(--tc-blue)', 'rgb(255, 0, 2)'], ['green', 'Green', 'var(--tc-green)', 'rgb(255, 0, 3)'], ['amber', 'Amber', 'var(--tc-amber)', 'rgb(255, 0, 4)']];
const HL_COLORS = [['none', 'No highlight', 'transparent', 'rgb(254, 0, 0)'], ['yellow', 'Yellow', 'var(--hl-yellow)', 'rgb(254, 0, 1)'], ['green', 'Green', 'var(--hl-green)', 'rgb(254, 0, 2)'], ['rose', 'Rose', 'var(--hl-rose)', 'rgb(254, 0, 3)']];
const noteTitle = n => n.title || firstLine(stripHtml(n.body)) || 'Untitled';
const noteThumb = n => { const m = (n.body || '').match(/<img[^>]+src="([^"]+)"/); return m ? m[1] : null; };
const notePreview = n => { const t = stripHtml(n.body); return n.title ? t : t.slice(noteTitle(n).length).trim(); };
let notesLayout = (() => { try { return localStorage.getItem('master-notes-layout') || 'grid'; } catch (e) { return 'grid'; } })();

function Notes() {
  if (V.noteOpen && S.note(V.noteOpen)) return html`<${NoteEditor} key=${V.noteOpen} n=${S.note(V.noteOpen)} />`;
  return html`<${NotesHome} />`;
}
function filterNotes(view) {
  const all = S.notes();
  if (view.kind === 'trash') return all.filter(n => n.deletedAt);
  const live = all.filter(n => !n.deletedAt);
  if (view.kind === 'inbox') return live.filter(n => !n.folderId && !n.archived);
  if (view.kind === 'pinned') return live.filter(n => n.pinned && !n.archived);
  if (view.kind === 'archive') return live.filter(n => n.archived);
  if (view.kind === 'folder') { const set = S.folderDesc(view.id); return live.filter(n => !n.archived && set.has(n.folderId)); }
  if (view.kind === 'tag') return live.filter(n => (n.tags || []).includes(view.id) && !n.archived);
  return live.filter(n => !n.archived);
}
function viewName(view) {
  return view.kind === 'inbox' ? 'inbox' : view.kind === 'pinned' ? 'pinned' : view.kind === 'archive' ? 'archive' : view.kind === 'trash' ? 'trash' : view.kind === 'folder' ? S.folderPath(view.id) : view.kind === 'tag' ? '#' + view.id : 'all notes';
}
function newNote(view, day) {
  const id = uid(); const folderId = view.kind === 'folder' ? view.id : null; const tags = view.kind === 'tag' ? [view.id] : [];
  S.saveNote({ id, title: '', body: '', folderId, tags, pinned: view.kind === 'pinned', createdAt: new Date().toISOString(), day: day && day !== todayStr() ? day : null });
  openNote(id);
}
function trashNote(n) { S.saveNote({ ...n, deletedAt: new Date().toISOString() }); toast('Moved to Trash.', { label: 'Undo', fn: () => S.saveNote({ ...S.note(n.id), deletedAt: null }) }); }

function NotesHome() {
  const view = V.notesView || { kind: 'all' };
  const [q, setQ] = useState(''); const [sort, setSort] = useState('updated'); const [layout, setLayout] = useState(notesLayout); const [sel, setSel] = useState([]); const [bulk, setBulk] = useState(null);
  const ql = q.trim().toLowerCase();
  let list = filterNotes(view);
  if (ql) list = list.filter(n => noteTitle(n).toLowerCase().includes(ql) || stripHtml(n.body).toLowerCase().includes(ql) || (n.tags || []).some(t => t.includes(ql)) || S.folderPath(n.folderId).toLowerCase().includes(ql));
  const sorter = { updated: (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''), created: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''), oldest: (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''), title: (a, b) => noteTitle(a).localeCompare(noteTitle(b)) }[sort];
  list = list.slice().sort((a, b) => (view.kind !== 'trash' ? (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) : 0) || sorter(a, b));
  const setL = l => { setLayout(l); notesLayout = l; try { localStorage.setItem('master-notes-layout', l); } catch (e) { } };
  const toggleSel = id => setSel(sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  const selNotes = sel.map(S.note).filter(Boolean);
  const crumbs = view.kind === 'folder' ? S.folderPath(view.id).split(' / ') : null;
  return html`<section class="wrap page">
    <div class="pagehead">
      <div><div class="meta"><span>${crumbs ? html`folders${crumbs.map(c => html` / <span style=${{ color: 'var(--ink)' }}>${c}</span>`)}` : viewName(view)}</span><span>${list.length} ${list.length === 1 ? 'note' : 'notes'}</span></div><h1 class="pagetitle">notes</h1></div>
      <div class="toolbar">${view.kind === 'trash' ? (list.length ? html`<button class="btn ghost" onClick=${async () => { if (await ask({ title: 'Empty Trash?', body: `Delete ${list.length} notes for good. This cannot be undone.`, confirm: 'Empty Trash', danger: true })) list.forEach(n => S.deleteNoteForever(n.id)); }}>Empty Trash</button>` : null) : html`<button class="btn accent" onClick=${() => newNote(view)}>New note</button>`}</div>
    </div>
    <div class="notes">
      <${NotesRail} view=${view} />
      <div style=${{ minWidth: 0 }}>
        <div class="toolbar" style=${{ marginBottom: '22px' }}>
          <div style=${{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 260px', borderBottom: '1px solid var(--line-2)' }}><span class="muted">${I.search}</span><input class="input" style=${{ border: 0 }} aria-label="Search notes only" placeholder=${`Search ${view.kind === 'all' ? 'all notes' : viewName(view)}`} value=${q} onInput=${e => setQ(e.target.value)} />${q ? html`<button class="iconbtn" aria-label="Clear search" onClick=${() => setQ('')}>${I.close}</button>` : null}</div>
          <select class="input" style=${{ width: 'auto' }} aria-label="Sort notes" value=${sort} onChange=${e => setSort(e.target.value)}><option value="updated">Last edited</option><option value="created">Newest</option><option value="oldest">Oldest</option><option value="title">A to Z</option></select>
          <div class="seg" role="group" aria-label="Layout"><button class=${layout === 'grid' ? 'on' : ''} aria-label="Grid" onClick=${() => setL('grid')}>${I.grid}</button><button class=${layout === 'list' ? 'on' : ''} aria-label="List" onClick=${() => setL('list')}>${I.list}</button></div>
        </div>
        ${sel.length ? html`<div class="bulk"><span>${sel.length} selected</span><button class="txtbtn" onClick=${() => setBulk('move')}>Move to folder</button><button class="txtbtn" onClick=${() => setBulk('tag')}>Add tag</button><button class="txtbtn" onClick=${() => { selNotes.forEach(n => S.saveNote({ ...n, archived: !n.archived })); setSel([]); }}>Archive</button><button class="txtbtn" onClick=${() => { selNotes.forEach(n => S.saveNote({ ...n, deletedAt: new Date().toISOString() })); setSel([]); toast(`${selNotes.length} notes moved to Trash.`, { label: 'Undo', fn: () => selNotes.forEach(n => S.saveNote({ ...S.note(n.id), deletedAt: null })) }); }}>Delete</button><span class="spacer"></span><button class="txtbtn" onClick=${() => setSel([])}>Clear</button></div>` : null}
        ${list.length ? html`<div class=${(layout === 'grid' ? 'ncards' : 'nlist') + (sel.length ? ' selecting' : '')}>${list.map(n => html`<${NoteCard} n=${n} q=${ql} sel=${sel.includes(n.id)} onSel=${() => toggleSel(n.id)} trash=${view.kind === 'trash'} />`)}</div>`
          : html`<div class="empty"><div class="big">${ql ? 'no notes match.' : view.kind === 'inbox' ? 'inbox is empty.' : view.kind === 'trash' ? 'trash is empty.' : 'no notes here yet.'}</div><p>${ql ? 'Try another word, or search everything from the top bar.' : view.kind === 'trash' ? 'Deleted notes stay here for 30 days.' : 'Press N anywhere to jot something down.'}</p></div>`}
      </div>
    </div>
    ${bulk === 'move' ? html`<${Modal} title="move to folder" size="narrow" onClose=${() => setBulk(null)}><${FolderBox} value=${null} autofocus onPick=${fid => { selNotes.forEach(n => S.saveNote({ ...n, folderId: fid, archived: false })); toast(`Moved ${selNotes.length} notes to ${fid ? S.folderPath(fid) : 'Inbox'}.`); setSel([]); setBulk(null); }} /><//>` : null}
    ${bulk === 'tag' ? html`<${TagModal} onDone=${tag => { if (tag) selNotes.forEach(n => S.saveNote({ ...n, tags: Array.from(new Set([...(n.tags || []), tag])) })); setSel([]); setBulk(null); }} />` : null}
  </section>`;
}
function TagModal({ onDone }) {
  const [v, setV2] = useState('');
  const done = () => onDone(v.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-'));
  return html`<${Modal} title="add a tag" size="narrow" onClose=${() => onDone(null)} actions=${html`<button class="btn" onClick=${done}>Add tag</button>`}><input class="input" autofocus aria-label="Tag" placeholder="reading, ideas, q4" value=${v} onInput=${e => setV2(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') done(); }} /><//>`;
}
function NoteCard({ n, q, sel, onSel, trash }) {
  const thumb = noteThumb(n); const title = noteTitle(n); const prev = notePreview(n);
  const act = (e, fn) => { e.stopPropagation(); fn(); };
  return html`<div class=${'ncard' + (sel ? ' sel' : '')} role="button" tabindex="0" aria-label=${`Open note ${title}`} draggable=${!trash} onDragStart=${e => { e.dataTransfer.setData('text/plain', 'note:' + n.id); }}
    onClick=${() => trash ? null : openNote(n.id)} onKeyDown=${e => { if (e.key === 'Enter' && !trash) openNote(n.id); }}>
    <span class="selbox" onClick=${e => e.stopPropagation()}><input type="checkbox" aria-label=${`Select ${title}`} checked=${sel} onChange=${onSel} /></span>
    ${n.pinned && !trash ? html`<span class="pin" role="img" aria-label="Pinned"></span>` : null}
    ${thumb ? html`<div class="thumb" style=${{ backgroundImage: `url("${thumb}")` }}></div>` : null}
    <div class="nt" style=${{ paddingLeft: sel ? '22px' : 0, paddingRight: n.pinned && !trash ? '22px' : 0 }}>${highlight(title, q)}</div>
    <div class="np">${q ? highlight(snippet(prev, q) || prev.slice(0, 160), q) : prev.slice(0, 200)}</div>
    <div class="nf"><span style=${{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${n.folderId ? S.folderPath(n.folderId) : 'Inbox'}${(n.tags || []).length ? ' · #' + n.tags.join(' #') : ''}</span><span class="tnum" style=${{ whiteSpace: 'nowrap' }}>${fmtDM((n.updatedAt || n.createdAt || new Date().toISOString()).slice(0, 10))}</span></div>
    <div class="acts">${trash ? html`
      <button class="iconbtn" title="Restore" aria-label="Restore" onClick=${e => act(e, () => { S.saveNote({ ...n, deletedAt: null }); toast('Restored.'); })}>↺</button>
      <button class="iconbtn" title="Delete for good" aria-label="Delete for good" onClick=${e => act(e, async () => { if (await ask({ title: 'Delete for good?', body: `“${title}” will be gone. This cannot be undone.`, confirm: 'Delete', danger: true })) S.deleteNoteForever(n.id); })}>${I.trash}</button>` : html`
      <button class="iconbtn" title=${n.pinned ? 'Unpin' : 'Pin'} aria-label=${n.pinned ? 'Unpin' : 'Pin'} onClick=${e => act(e, () => S.saveNote({ ...n, pinned: !n.pinned }))}>${I.pin}</button>
      <button class="iconbtn" title=${n.archived ? 'Unarchive' : 'Archive'} aria-label=${n.archived ? 'Unarchive' : 'Archive'} onClick=${e => act(e, () => { S.saveNote({ ...n, archived: !n.archived }); toast(n.archived ? 'Back in notes.' : 'Archived.'); })}>${I.archive}</button>
      <button class="iconbtn" title="Delete" aria-label="Delete" onClick=${e => act(e, () => trashNote(n))}>${I.trash}</button>`}
    </div>
  </div>`;
}

function NotesRail({ view }) {
  const [adding, setAdding] = useState(null); const [name, setName] = useState(''); const liveF = useRef(false); const [renaming, setRenaming] = useState(null); const [closed, setClosed] = useState([]);
  const live = S.notes().filter(n => !n.deletedAt);
  const count = v => filterNotes(v).length;
  const fs = S.folders();
  const tags = {}; live.forEach(n => (n.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; }));
  const is = v => view.kind === v.kind && (view.id || null) === (v.id || null);
  const pick = v => setV({ notesView: v });
  const drop = (e, folderId) => { e.preventDefault(); e.currentTarget.classList.remove('dropzone'); const d = e.dataTransfer.getData('text/plain'); if (!d.startsWith('note:')) return; const n = S.note(d.slice(5)); if (!n) return; S.saveNote({ ...n, folderId, archived: false }); toast(`Filed in ${folderId ? S.folderPath(folderId) : 'Inbox'}.`); };
  const dz = { onDragOver: e => { e.preventDefault(); e.currentTarget.classList.add('dropzone'); }, onDragLeave: e => e.currentTarget.classList.remove('dropzone') };
  // Enter blurs the input; blur saves once. The guard stops a second save when the input disappears.
  const openAdd = where => { liveF.current = true; setAdding(where); setName(''); };
  const addFolder = () => {
    if (!liveF.current) return; liveF.current = false;
    const nm = name.trim(); const parentId = adding === 'root' ? null : adding;
    if (nm && !S.folders().some(x => (x.parentId || null) === parentId && x.name.toLowerCase() === nm.toLowerCase())) { S.setList('folders', [...S.folders(), { id: uid(), name: nm, parentId }]); if (parentId) setClosed(closed.filter(x => x !== parentId)); toast(`Folder “${nm}” created.`); }
    setAdding(null); setName('');
  };
  const delFolder = async f => {
    const set = S.folderDesc(f.id); const n = live.filter(x => set.has(x.folderId)).length;
    if (!(await ask({ title: `Delete folder “${f.name}”?`, body: `${set.size > 1 ? 'Its subfolders go too. ' : ''}${n} ${n === 1 ? 'note moves' : 'notes move'} to the Inbox. No notes are deleted.`, confirm: 'Delete folder', danger: true }))) return;
    S.notes().filter(x => set.has(x.folderId)).forEach(x => S.saveNote({ ...x, folderId: null }));
    S.setList('folders', S.folders().filter(x => !set.has(x.id)));
    if (view.kind === 'folder' && set.has(view.id)) pick({ kind: 'inbox' });
  };
  const tree = (parent, depth) => fs.filter(f => (f.parentId || null) === parent).sort((a, b) => a.name.localeCompare(b.name)).map(f => {
    const kids = fs.some(x => x.parentId === f.id); const open = !closed.includes(f.id);
    return html`<${Fragment}>
      <div style=${{ position: 'relative' }} class="frow">
        ${renaming === f.id ? html`<input class="input" style=${{ marginLeft: depth * 16 + 10 + 'px', width: 'calc(100% - ' + (depth * 16 + 10) + 'px)', fontSize: '15px' }} autofocus value=${name} onInput=${e => setName(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') { if (name.trim()) S.setList('folders', S.folders().map(x => x.id === f.id ? { ...x, name: name.trim() } : x)); setRenaming(null); } if (e.key === 'Escape') setRenaming(null); }} onBlur=${() => setRenaming(null)} aria-label="Folder name" />`
        : html`<button class=${'item' + (is({ kind: 'folder', id: f.id }) ? ' on' : '')} style=${{ '--d': depth }} onClick=${() => pick({ kind: 'folder', id: f.id })} ...${dz} onDrop=${e => drop(e, f.id)}>
          <span class="tw" role="button" aria-label=${open ? 'Collapse' : 'Expand'} onClick=${e => { e.stopPropagation(); setClosed(open ? [...closed, f.id] : closed.filter(x => x !== f.id)); }}>${kids ? (open ? '▾' : '▸') : ''}</span>
          <span style=${{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${f.name}</span><span class="c tnum">${count({ kind: 'folder', id: f.id })}</span>
        </button>`}
        <span class="facts" style=${{ position: 'absolute', right: '34px', top: '4px', display: 'none', gap: 0 }}>
          <button class="iconbtn" style=${{ minWidth: '26px', minHeight: '28px', padding: '2px' }} title="Add subfolder" aria-label=${`Add subfolder in ${f.name}`} onClick=${() => openAdd(f.id)}>+</button>
          <button class="iconbtn" style=${{ minWidth: '26px', minHeight: '28px', padding: '2px', fontSize: '12px' }} title="Rename" aria-label=${`Rename ${f.name}`} onClick=${() => { setRenaming(f.id); setName(f.name); }}>✎</button>
          <button class="iconbtn" style=${{ minWidth: '26px', minHeight: '28px', padding: '2px' }} title="Delete folder" aria-label=${`Delete ${f.name}`} onClick=${() => delFolder(f)}>${I.close}</button>
        </span>
      </div>
      ${adding === f.id ? html`<input class="input" style=${{ marginLeft: (depth + 1) * 16 + 10 + 'px', width: 'calc(100% - ' + ((depth + 1) * 16 + 10) + 'px)', fontSize: '15px' }} autofocus placeholder="Subfolder name" aria-label="Subfolder name" value=${name} onInput=${e => setName(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } if (e.key === 'Escape') { liveF.current = false; setAdding(null); } }} onBlur=${addFolder} />` : null}
      ${open ? tree(f.id, depth + 1) : null}
    <//>`;
  });
  return html`<nav class="rail" aria-label="Note folders">
    <style>.frow:hover .facts{display:flex!important}.frow:focus-within .facts{display:flex!important}</style>
    ${[['inbox', 'Inbox'], ['all', 'All notes'], ['pinned', 'Pinned']].map(([k, l]) => html`<button class=${'item' + (is({ kind: k }) ? ' on' : '')} onClick=${() => pick({ kind: k })} ...${k === 'inbox' ? dz : {}} onDrop=${k === 'inbox' ? e => drop(e, null) : null}>${l}<span class="c tnum">${count({ kind: k })}</span></button>`)}
    <div class="grp"><span class="gt">folders</span><button class="iconbtn" style=${{ minWidth: '28px', minHeight: '28px', padding: '2px' }} aria-label="New folder" title="New folder" onClick=${() => openAdd('root')}>+</button></div>
    <div class="tree">
      ${adding === 'root' ? html`<input class="input" style=${{ marginLeft: '10px', width: 'calc(100% - 10px)', fontSize: '15px' }} autofocus placeholder="Folder name" aria-label="Folder name" value=${name} onInput=${e => setName(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } if (e.key === 'Escape') { liveF.current = false; setAdding(null); } }} onBlur=${addFolder} />` : null}
      ${tree(null, 0)}
      ${!fs.length && adding !== 'root' ? html`<p class="muted" style=${{ fontSize: '13px', padding: '4px 10px' }}>No folders yet. Use + or type a path in a note’s folder box.</p>` : null}
    </div>
    ${Object.keys(tags).length ? html`<div class="grp"><span class="gt">tags</span></div>${Object.keys(tags).sort().map(t => html`<button class=${'item' + (is({ kind: 'tag', id: t }) ? ' on' : '')} onClick=${() => pick({ kind: 'tag', id: t })}>#${t}<span class="c tnum">${tags[t]}</span></button>`)}` : null}
    <div class="grp"><span class="gt">more</span></div>
    ${[['archive', 'Archive'], ['trash', 'Trash']].map(([k, l]) => html`<button class=${'item' + (is({ kind: k }) ? ' on' : '')} onClick=${() => pick({ kind: k })}>${l}<span class="c tnum">${count({ kind: k })}</span></button>`)}
  </nav>`;
}

/* Tag-to-folder box: type a folder or subfolder path, pick it, or create it */
function FolderBox({ value, onPick, autofocus }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(!!autofocus); const [hi, setHi] = useState(0);
  const paths = S.folders().map(f => ({ id: f.id, path: S.folderPath(f.id) })).sort((a, b) => a.path.localeCompare(b.path));
  const ql = q.trim().toLowerCase().replace(/\s*\/\s*/g, ' / ');
  const matches = paths.filter(p => !ql || p.path.toLowerCase().includes(ql));
  const exact = paths.some(p => p.path.toLowerCase() === ql);
  const opts = [{ id: null, path: 'Inbox (no folder)', inbox: true }, ...matches];
  if (ql && !exact) opts.push({ create: q.trim().replace(/\s*\/\s*/g, ' / ') });
  const choose = o => { const id = o.create ? S.ensureFolderPath(o.create) : o.id; setQ(''); setOpen(false); onPick(id); };
  const key = e => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi(h => Math.min(opts.length - 1, h + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)); } if (e.key === 'Enter') { e.preventDefault(); const o = opts[clamp(ql && !exact && matches.length === 0 ? opts.length - 1 : hi, 0, opts.length - 1)]; if (o) choose(o); } if (e.key === 'Escape') { setOpen(false); e.stopPropagation(); } };
  return html`<div class="ftag">
    <div style=${{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--line-2)' }}>
      <span class="lbl-s" style=${{ whiteSpace: 'nowrap' }}>Folder</span>
      <input class="input" style=${{ border: 0 }} autofocus=${autofocus} aria-label="Tag to folder" placeholder=${value ? S.folderPath(value) : 'Tag to folder, e.g. Academic / Goals'} value=${q} onFocus=${() => setOpen(true)} onBlur=${() => setTimeout(() => setOpen(false), 160)} onInput=${e => { setQ(e.target.value); setOpen(true); setHi(e.target.value ? 1 : 0); }} onKeyDown=${key} />
    </div>
    ${open ? html`<div class="opts menu" role="listbox">${opts.map((o, i) => html`<button role="option" aria-selected=${i === hi} class=${i === hi ? 'on' : ''} onMouseDown=${e => e.preventDefault()} onClick=${() => choose(o)}>${o.create ? html`<span>Create <b>“${o.create}”</b></span>` : o.inbox ? html`<span class="muted">${o.path}</span>` : html`<span>${highlight(o.path, ql)}</span>${o.id === value ? html`<span class="muted" style=${{ float: 'right' }}>current</span>` : null}`}</button>`)}</div>` : null}
  </div>`;
}

function NoteEditor({ n }) {
  const ed = useRef(); const timer = useRef(); const fileRef = useRef();
  const [title, setTitle] = useState(n.title || ''); const [saved, setSaved] = useState('Saved'); const [pop, setPop] = useState(null); const [tag, setTag] = useState(''); const [links, setLinks] = useState(false); const [state, setState] = useState({}); const [picker, setPicker] = useState(null); const [pq, setPq] = useState('');
  useEffect(() => { ed.current.innerHTML = n.body || ''; if (!n.title && !n.body) setTimeout(() => { const t = document.getElementById('note-title'); if (t) t.focus(); }, 30); }, []);
  useEffect(() => { const f = () => { if (!ed.current || !ed.current.contains(document.getSelection().anchorNode)) return; setState({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline') }); }; document.addEventListener('selectionchange', f); return () => document.removeEventListener('selectionchange', f); }, []);
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); commit(); } const cur = S.note(n.id); if (cur && !(cur.title || '').trim() && !stripHtml(cur.body) && !noteThumb(cur)) S.deleteNoteForever(n.id); }, []);
  const commit = () => { const cur = S.note(n.id); if (!cur || !ed.current) return; S.saveNote({ ...cur, title: document.getElementById('note-title') ? document.getElementById('note-title').value : cur.title, body: ed.current.innerHTML }); setSaved('Saved'); };
  const schedule = () => { setSaved('Saving…'); clearTimeout(timer.current); timer.current = setTimeout(() => { timer.current = null; commit(); }, 800); };
  const cleanSpans = () => {
    ed.current.querySelectorAll('font[color]').forEach(fn => { const sp = document.createElement('span'); sp.style.color = fn.getAttribute('color'); while (fn.firstChild) sp.appendChild(fn.firstChild); fn.replaceWith(sp); });
    ed.current.querySelectorAll('span[style]').forEach(sp => {
      const c = sp.style.color, bg = sp.style.backgroundColor;
      const tc = TEXT_COLORS.find(x => x[3] === c); if (tc) { sp.style.color = ''; TEXT_COLORS.forEach(x => sp.classList.remove('tc-' + x[0])); if (tc[0] !== 'ink') sp.classList.add('tc-' + tc[0]); sp.querySelectorAll('[class*="tc-"]').forEach(k => TEXT_COLORS.forEach(x => k.classList.remove('tc-' + x[0]))); }
      const hc = HL_COLORS.find(x => x[3] === bg); if (hc) { sp.style.backgroundColor = ''; HL_COLORS.forEach(x => sp.classList.remove('hl-' + x[0])); if (hc[0] !== 'none') sp.classList.add('hl-' + hc[0]); }
      if (!sp.getAttribute('style')) sp.removeAttribute('style');
      if (!sp.getAttribute('style') && !sp.className) { while (sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp); sp.remove(); }
    });
    ed.current.querySelectorAll('[style*="font-weight"],[style*="font-style"]').forEach(x => { if (x.style.fontWeight === 'bold' || x.style.fontWeight === '700') { x.style.fontWeight = ''; const b = document.createElement('b'); while (x.firstChild) b.appendChild(x.firstChild); x.appendChild(b); } if (x.style.fontStyle === 'italic') { x.style.fontStyle = ''; const i = document.createElement('i'); while (x.firstChild) i.appendChild(x.firstChild); x.appendChild(i); } if (!x.getAttribute('style')) x.removeAttribute('style'); });
  };
  const exec = (cmd, val = null) => { ed.current.focus(); try { document.execCommand('styleWithCSS', false, cmd === 'foreColor' || cmd === 'hiliteColor'); } catch (e) { } document.execCommand(cmd, false, val); cleanSpans(); schedule(); setPop(null); };
  const block = tag2 => exec('formatBlock', `<${tag2}>`);
  const checklist = () => { ed.current.focus(); document.execCommand('insertUnorderedList'); const s = document.getSelection(); let nd = s.anchorNode; while (nd && nd !== ed.current && nd.nodeName !== 'UL') nd = nd.parentNode; if (nd && nd.nodeName === 'UL') nd.classList.add('clist'); schedule(); };
  const onInput = e => {
    schedule();
    if (e.inputType === 'insertText' && (e.data === ' ' || e.data === '[')) {
      const s = document.getSelection(); const node = s.anchorNode; if (!node || node.nodeType !== 3) return;
      const before = node.textContent.slice(0, s.anchorOffset).replace(/ /g, ' ');
      if (e.data === '[' && before.endsWith('[[')) { const r = s.getRangeAt(0).getBoundingClientRect(); const wr = ed.current.parentNode.getBoundingClientRect(); setPicker({ node, off: s.anchorOffset, x: r.left - wr.left, y: r.bottom - wr.top + 6 }); setPq(''); return; }
      let blk = node.parentNode; while (blk && blk !== ed.current && !/^(P|DIV|H1|H2|LI)$/.test(blk.nodeName)) blk = blk.parentNode;
      const first = blk === ed.current ? node === ed.current.firstChild || node.previousSibling == null : blk && blk.textContent.replace(/ /g, ' ').startsWith(before);
      if (!first || (blk && blk.nodeName === 'LI')) return;
      const rule = { '* ': 'ul', '- ': 'ul', '1. ': 'ol', '[] ': 'check' }[before];
      if (!rule) return;
      node.textContent = node.textContent.slice(before.length); const rg = document.createRange(); rg.setStart(node, 0); rg.collapse(true); s.removeAllRanges(); s.addRange(rg);
      if (rule === 'ol') document.execCommand('insertOrderedList'); else if (rule === 'check') checklist(); else document.execCommand('insertUnorderedList');
    }
  };
  const onClick = e => {
    const a = e.target.closest && e.target.closest('a.nlink'); if (a) { e.preventDefault(); commit(); openNote(a.dataset.note); return; }
    const li = e.target.closest && e.target.closest('ul.clist > li'); if (li && e.clientX - li.getBoundingClientRect().left < 24) { li.classList.toggle('done'); schedule(); }
  };
  const insertLink = target => {
    const { node, off } = picker; setPicker(null);
    try { const r = document.createRange(); r.setStart(node, Math.max(0, off - 2)); r.setEnd(node, off); r.deleteContents(); const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (err) { }
    ed.current.focus(); document.execCommand('insertHTML', false, `<a class="nlink" data-note="${target.id}" contenteditable="false">${esc(noteTitle(target))}</a>&nbsp;`); schedule();
  };
  const upload = async file => {
    if (!DB.assets) { toast('Images need your account storage, which is not available in this view.'); return; }
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) { toast('Use a PNG, JPEG, GIF or WebP image.'); return; }
    setSaved('Uploading image…');
    try { const r = await DB.assets.upload(file); ed.current.focus(); document.execCommand('insertHTML', false, `<img src="${r.url || '/_blob/' + r.id}" alt="">`); schedule(); }
    catch (err) { setSaved('Saved'); toast(err && err.code === 'too_large' ? 'That image is over 20 MB.' : err && err.code === 'quota_or_state' ? 'Image storage is full.' : 'The image could not be uploaded. Try again.'); }
  };
  const onPaste = e => {
    const files = Array.from(e.clipboardData.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); files.forEach(upload); return; }
    const text = e.clipboardData.getData('text/plain'); if (text) { e.preventDefault(); document.execCommand('insertText', false, text); }
  };
  const note = S.note(n.id) || n;
  const set = p => S.saveNote({ ...note, ...p });
  const addTag = () => { const t = tag.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-'); if (t && !(note.tags || []).includes(t)) set({ tags: [...(note.tags || []), t] }); setTag(''); };
  const back = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; commit(); } const cur = S.note(n.id); if (cur && !cur.title.trim() && !stripHtml(cur.body) && !noteThumb(cur)) S.deleteNoteForever(n.id); setV({ noteOpen: null }); };
  const others = S.notes().filter(x => !x.deletedAt && x.id !== n.id && noteTitle(x).toLowerCase().includes(pq.toLowerCase())).slice(0, 8);
  const B = (label, onClick, content, on) => html`<button title=${label} aria-label=${label} aria-pressed=${on ? 'true' : null} class=${on ? 'on' : ''} onMouseDown=${e => e.preventDefault()} onClick=${onClick}>${content}</button>`;
  return html`<section class="wrap page" style=${{ paddingTop: '30px' }}>
    <div class="editor-wrap" style=${{ margin: '0 auto' }}>
      <div class="ed-top">
        <button class="ulink" onClick=${back}>← ${viewName(V.notesView || { kind: 'all' })}</button>
        <span class="spacer"></span>
        <span class="muted" style=${{ fontSize: '13px' }} aria-live="polite">${saved}</span>
        <button class="iconbtn" title=${note.pinned ? 'Unpin' : 'Pin'} aria-label=${note.pinned ? 'Unpin' : 'Pin'} aria-pressed=${!!note.pinned} style=${{ color: note.pinned ? 'var(--green)' : null }} onClick=${() => set({ pinned: !note.pinned })}>${I.pin}</button>
        <button class="iconbtn" title=${note.archived ? 'Unarchive' : 'Archive'} aria-label=${note.archived ? 'Unarchive' : 'Archive'} onClick=${() => { set({ archived: !note.archived }); toast(note.archived ? 'Back in notes.' : 'Archived.'); }}>${I.archive}</button>
        <button class="iconbtn" title="Delete" aria-label="Delete note" onClick=${() => { commit(); trashNote(S.note(n.id)); setV({ noteOpen: null }); }}>${I.trash}</button>
      </div>
      <div class="toolbar" style=${{ marginBottom: '10px', alignItems: 'flex-start' }}>
        <${FolderBox} value=${note.folderId} onPick=${fid => { set({ folderId: fid }); toast(fid ? `Filed in ${S.folderPath(fid)}.` : 'Moved to Inbox.'); }} />
        <div style=${{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: '1 1 240px', borderBottom: '1px solid var(--line-2)', minHeight: '42px' }}>
          <span class="lbl-s">Tags</span>
          ${(note.tags || []).map(t => html`<span class="chip">#${t}<button aria-label=${`Remove tag ${t}`} onClick=${() => set({ tags: note.tags.filter(x => x !== t) })}>×</button></span>`)}
          <input class="input" style=${{ border: 0, width: '120px', flex: 1, fontSize: '15px' }} aria-label="Add a tag" placeholder="add tag" value=${tag} onInput=${e => setTag(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} onBlur=${addTag} />
        </div>
      </div>
      <div class="muted" style=${{ fontSize: '13px', marginBottom: '6px' }}>${note.folderId ? html`In <b style=${{ color: 'var(--ink)' }}>${S.folderPath(note.folderId)}</b>` : 'In the Inbox'} · created ${fmtDM((note.createdAt || '').slice(0, 10) || todayStr())}
        <button class="txtbtn" style=${{ marginLeft: '14px', fontSize: '11px' }} onClick=${() => setLinks(!links)}>${links ? 'Hide links' : 'Link to a goal or metric'}</button></div>
      ${links ? html`<div class="fields" style=${{ margin: '10px 0 6px' }}>
        <div class="field"><label for="nl-g">Goal</label><select id="nl-g" class="input" value=${(note.links || {}).goalId || ''} onChange=${e => set({ links: { ...(note.links || {}), goalId: e.target.value || null } })}><option value="">None</option>${S.goals().map(g => html`<option value=${g.id}>${g.title}</option>`)}</select></div>
        <div class="field"><label for="nl-m">Metric</label><select id="nl-m" class="input" value=${(note.links || {}).metricId || ''} onChange=${e => set({ links: { ...(note.links || {}), metricId: e.target.value || null } })}><option value="">None</option>${S.metrics().map(m => html`<option value=${m.id}>${m.name}</option>`)}</select></div>
      </div>` : null}
      <input id="note-title" class="ed-title" aria-label="Title" placeholder="Title" value=${title} onInput=${e => { setTitle(e.target.value); schedule(); }} onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); ed.current.focus(); } }} />
      <div class="edbar" role="toolbar" aria-label="Formatting">
        ${B('Header', () => block('h1'), html`<span style=${{ fontWeight: 700 }}>H1</span>`)}
        ${B('Subheading', () => block('h2'), html`<span style=${{ fontWeight: 600, fontSize: '13px' }}>H2</span>`)}
        ${B('Normal text', () => block('p'), html`<span style=${{ fontSize: '13px' }}>Text</span>`)}
        <span class="sep"></span>
        ${B('Bold', () => exec('bold'), html`<b>B</b>`, state.bold)}
        ${B('Italic', () => exec('italic'), html`<i>I</i>`, state.italic)}
        ${B('Underline', () => exec('underline'), html`<u>U</u>`, state.underline)}
        <span class="sep"></span>
        <span style=${{ position: 'relative' }}>${B('Text color', () => setPop(pop === 'color' ? null : 'color'), html`<span style=${{ borderBottom: '3px solid var(--tc-red)', lineHeight: 1, padding: '0 2px' }}>A</span>`)}
          ${pop === 'color' ? html`<div class="pop menu" style=${{ top: '40px', left: 0 }}>${TEXT_COLORS.map(c => html`<button onMouseDown=${e => e.preventDefault()} onClick=${() => exec('foreColor', c[3].replace(/rgb\((\d+), (\d+), (\d+)\)/, (m, r, g, b) => '#' + [r, g, b].map(x => (+x).toString(16).padStart(2, '0')).join('')))} style=${{ display: 'flex', gap: '10px', alignItems: 'center' }}><span class="sw" style=${{ background: c[2] }}></span>${c[1]}</button>`)}</div>` : null}</span>
        <span style=${{ position: 'relative' }}>${B('Highlight', () => setPop(pop === 'hl' ? null : 'hl'), html`<span style=${{ background: 'var(--hl-yellow)', padding: '0 4px' }}>ab</span>`)}
          ${pop === 'hl' ? html`<div class="pop menu" style=${{ top: '40px', left: 0 }}>${HL_COLORS.map(c => html`<button onMouseDown=${e => e.preventDefault()} onClick=${() => exec('hiliteColor', c[3].replace(/rgb\((\d+), (\d+), (\d+)\)/, (m, r, g, b) => '#' + [r, g, b].map(x => (+x).toString(16).padStart(2, '0')).join('')))} style=${{ display: 'flex', gap: '10px', alignItems: 'center' }}><span class="sw" style=${{ background: c[2] }}></span>${c[1]}</button>`)}</div>` : null}</span>
        <span class="sep"></span>
        ${B('Bulleted list', () => exec('insertUnorderedList'), '•')}
        ${B('Numbered list', () => exec('insertOrderedList'), html`<span style=${{ fontSize: '13px' }}>1.</span>`)}
        ${B('Checklist', checklist, '☐')}
        ${DB.assets ? html`<span class="sep"></span>${B('Insert image', () => fileRef.current.click(), I.image)}<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden ref=${fileRef} onChange=${e => { Array.from(e.target.files).forEach(upload); e.target.value = ''; }} />` : null}
      </div>
      <div style=${{ position: 'relative' }}>
        <div ref=${ed} class="ce" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Note" data-ph="Start writing. Type * for bullets, 1. for numbers, [] for a checklist, [[ to link a note." onInput=${onInput} onClick=${onClick} onPaste=${onPaste} onBlur=${() => { if (timer.current) { clearTimeout(timer.current); timer.current = null; commit(); } }}></div>
        ${picker ? html`<div class="pop" style=${{ top: picker.y + 'px', left: Math.max(0, picker.x) + 'px', width: '280px' }}>
          <input class="input" autofocus aria-label="Find a note to link" placeholder="Link to note…" value=${pq} onInput=${e => setPq(e.target.value)} onKeyDown=${e => { if (e.key === 'Escape') { setPicker(null); ed.current.focus(); } if (e.key === 'Enter' && others[0]) insertLink(others[0]); }} />
          <div class="menu" style=${{ marginTop: '6px', maxHeight: '220px', overflowY: 'auto' }}>${others.map(o => html`<button onMouseDown=${e => e.preventDefault()} onClick=${() => insertLink(o)}>${noteTitle(o)}</button>`)}${!others.length ? html`<p class="muted" style=${{ padding: '8px 12px', fontSize: '14px' }}>No matching notes.</p>` : null}</div>
        </div>` : null}
      </div>
    </div>
  </section>`;
}
