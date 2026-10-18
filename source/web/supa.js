/* ===== Hosted build: Supabase storage, sign-in, images, downloads =====
   This file is appended after the core and replaces connectDb and flush.
   The anon key is public by design; row-level security in the database keeps every row private to its owner. */
const SUPA_URL = 'https://sdmbbgjfgwyxfblzvcjx.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkbWJiZ2pmZ3d5eGZibHp2Y2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMDMxMzgsImV4cCI6MjEwNzg3OTEzOH0.4pUUfGBXp1XnoYHCHHQwwDMpBLpZU_viphHNzEF9kJE';
const DIRTY_KEY = 'master-app.dirty';
DB.lastWrite = {};
DB.dirty = (() => { try { return JSON.parse(localStorage.getItem(DIRTY_KEY) || '{}'); } catch (e) { return {}; } })();
const saveDirty = () => { try { localStorage.setItem(DIRTY_KEY, JSON.stringify(DB.dirty)); } catch (e) { } };

function netErr(error) {
  const m = String((error && (error.message || error.details)) || '');
  const st = error && error.status;
  if (!navigator.onLine || /fetch|network|load failed|timeout/i.test(m) || st === 0 || st >= 500 || st === 429) return 'unavailable';
  if (st === 413 || /too large|payload/i.test(m)) return 'invalid_argument';
  if (st === 401 || st === 403 || /jwt|permission|policy/i.test(m)) return 'auth';
  return 'other';
}

/* Write path: same debounce as before; failed writes stay marked and retry until they land */
async function flush(col, id, retry = 0) {
  const key = col + '/' + id;
  if (!DB.db) return;
  const seq = DB.seq[key];
  const data = DB.docs[col][id];
  DB.dirty[key] = 1; saveDirty();
  try {
    const ref = DB.db.collection(col).doc(id);
    if (data) await ref.set(clone(data)); else await ref.delete();
    if (DB.seq[key] === seq) { delete DB.pending[key]; delete DB.dirty[key]; saveDirty(); DB.lastErr = ''; }
  } catch (e) {
    const code = e && e.code; DB.lastErr = (e && e.message) || String(e);
    if (code === 'unavailable' || code === 'auth') {
      clearTimeout(DB.timers[key]);
      DB.timers[key] = setTimeout(() => flush(col, id, retry + 1), Math.min(60000, 2000 * Math.pow(2, retry)));
      if (retry === 2) toast('Offline. Your changes are kept on this device and will sync when you reconnect.');
      return;
    }
    delete DB.pending[key]; delete DB.dirty[key]; saveDirty();
    if (code === 'invalid_argument') toast('That item is too large to save. Shorten it or remove an image.');
    else toast('Could not save a change. Try editing it again.');
  }
}

function makeShim(sb, uid) {
  return {
    collection: col => ({
      doc: id => ({
        async set(data) {
          const ts = new Date().toISOString(); DB.lastWrite[col + '/' + id] = ts;
          const { error } = await sb.from('docs').upsert({ user_id: uid, col, id, data, updated_at: ts }, { onConflict: 'user_id,col,id' });
          if (error) { const e = new Error(error.message); e.code = netErr(error); throw e; }
        },
        async delete() {
          DB.lastWrite[col + '/' + id] = new Date().toISOString();
          const { error } = await sb.from('docs').delete().match({ user_id: uid, col, id });
          if (error) { const e = new Error(error.message); e.code = netErr(error); throw e; }
        }
      })
    })
  };
}

async function fetchAll(sb) {
  let rows = [], from = 0;
  for (;;) {
    const { data, error } = await sb.from('docs').select('col,id,data,updated_at').order('col').order('id').range(from, from + 999);
    if (error) { const e = new Error(error.message); e.code = netErr(error); throw e; }
    rows = rows.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

/* Server copy wins, except for keys this device changed and has not yet saved */
function applyServer(rows) {
  const next = { s: {}, n: {} };
  rows.forEach(r => { if (next[r.col]) next[r.col][r.id] = r.data; });
  const local = new Set([...Object.keys(DB.pending), ...Object.keys(DB.dirty)]);
  local.forEach(k => { const [c, ...rest] = k.split('/'); const id = rest.join('/'); if (!next[c]) return; if (DB.docs[c][id]) next[c][id] = DB.docs[c][id]; else delete next[c][id]; });
  DB.docs = next; DB.loaded = { s: true, n: true };
  Object.keys(DB.dirty).forEach(k => { if (!DB.pending[k]) { const [c, ...rest] = k.split('/'); queueWrite(c, rest.join('/')); } });
}

async function connectDb() {
  if (!window.supabase || !window.supabase.createClient) { DB.mode = 'local'; emit(); return; }
  const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  DB.sb = sb;
  let session = null;
  try { session = (await sb.auth.getSession()).data.session; } catch (e) { session = null; }
  if (!session) { DB.mode = 'auth'; emit(); return; }
  startSync(sb, session.user);
}

async function startSync(sb, user) {
  const uid = user.id;
  DB.userEmail = user.email || '';
  DB.signOut = async () => {
    flushAll(); await new Promise(r => setTimeout(r, 700));
    try { await sb.auth.signOut(); } catch (e) { }
    try { localStorage.removeItem(LS_KEY); localStorage.removeItem(DIRTY_KEY); } catch (e) { }
    location.hash = ''; location.reload();
  };
  DB.db = makeShim(sb, uid);
  DB.mode = 'syncing'; emit();
  const hadLocal = DB.localOnly && (Object.keys(DB.docs.s).length + Object.keys(DB.docs.n).length) > 0;
  const localCopy = clone(DB.docs);

  const load = async first => {
    try {
      const rows = await fetchAll(sb);
      applyServer(rows);
      if (first) {
        DB.mode = 'synced'; DB.localOnly = false;
        if (!rows.length && hadLocal) {
          ['s', 'n'].forEach(col => Object.entries(localCopy[col]).forEach(([id, d]) => { DB.docs[col][id] = d; queueWrite(col, id); }));
          toast('Moved your saved data into your account.');
        }
      } else DB.mode = 'synced';
      emit(); saveLocal();
      return true;
    } catch (e) {
      if (first) {
        DB.mode = 'local'; emit(); toast(e && e.code === 'unavailable' ? 'Offline. Showing the copy saved on this device.' : 'Could not load from the database: ' + ((e && e.message) || 'unknown error'));
        Object.keys(DB.dirty).forEach(k => { if (!DB.pending[k]) { const [c, ...rest] = k.split('/'); queueWrite(c, rest.join('/')); } });
        const retry = setInterval(async () => { if (await load(false)) clearInterval(retry); }, 15000);
      }
      return false;
    }
  };
  await load(true);

  // Live changes from other devices
  sb.channel('docs-' + uid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
      const row = p.eventType === 'DELETE' ? p.old : p.new;
      if (!row || (row.user_id && row.user_id !== uid) || !DB.docs[row.col]) return;
      const key = row.col + '/' + row.id;
      if (DB.pending[key] || DB.dirty[key]) return;
      const lw = DB.lastWrite[key];
      if (p.eventType === 'DELETE') { if (lw && Date.now() - Date.parse(lw) < 8000) return; delete DB.docs[row.col][row.id]; }
      else { if (lw && row.updated_at && row.updated_at < lw) return; DB.docs[row.col][row.id] = row.data; }
      emit(); saveLocal();
    })
    .subscribe();

  // Catch up after the phone wakes or the network returns
  let lastPull = Date.now();
  const catchUp = () => { if (Date.now() - lastPull < 5000) return; lastPull = Date.now(); load(false); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') catchUp(); });
  window.addEventListener('online', () => { lastPull = 0; catchUp(); });
  window.addEventListener('focus', catchUp);
  setInterval(() => { if (document.visibilityState === 'visible') catchUp(); }, 30000);

  // Note images: private bucket, long-lived signed links
  DB.assets = {
    async upload(file) {
      if (file.size > 20 * 1024 * 1024) { const e = new Error('too large'); e.code = 'too_large'; throw e; }
      const ext = ((file.type.split('/')[1] || 'png').replace('jpeg', 'jpg'));
      const path = uid + '/' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)) + '.' + ext;
      const up = await sb.storage.from('note-images').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const sg = await sb.storage.from('note-images').createSignedUrl(path, 60 * 60 * 24 * 365 * 20);
      if (sg.error) throw sg.error;
      return { id: path, url: sg.data.signedUrl };
    }
  };
  // Backups download straight to the device
  DB.downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }
  };
  emit();
}

/* Sign-in screen */
function AuthScreen() {
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const submit = async e => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setMsg('');
    const sb = DB.sb;
    try {
      if (mode === 'reset') {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname });
        if (error) throw error;
        setMsg('Check your email for a reset link.'); setBusy(false); return;
      }
      const fn = mode === 'up' ? sb.auth.signUp.bind(sb.auth) : sb.auth.signInWithPassword.bind(sb.auth);
      const { data, error } = await fn({ email: email.trim(), password: pw, options: mode === 'up' ? { emailRedirectTo: location.origin + location.pathname } : undefined });
      if (error) throw error;
      if (!data.session) { setMsg('Check your email to confirm the account, then sign in here.'); setMode('in'); setBusy(false); return; }
      startSync(sb, data.session.user);
    } catch (err) {
      const m = String(err && err.message || '');
      setMsg(/invalid login/i.test(m) ? 'Wrong email or password.' : /not allowed|signups/i.test(m) ? 'New accounts are switched off for this app.' : /confirm/i.test(m) ? 'Confirm your email first, then sign in.' : /password/i.test(m) ? m : 'Could not reach the server. Check your connection.');
      setBusy(false);
    }
  };
  return html`<div class="auth">
    <div class="auth-in">
      <div class="mark">master<span>.</span></div>
      <p class="auth-q">The curse of discipline is that every day looks the same. The curse of indiscipline is that every year does.</p>
      <form onSubmit=${submit} class="fields">
        <div class="field"><label for="au-e">Email</label><input id="au-e" class="input" type="email" autocomplete="email" required value=${email} onInput=${e => setEmail(e.target.value)} /></div>
        ${mode !== 'reset' ? html`<div class="field"><label for="au-p">Password</label><input id="au-p" class="input" type="password" autocomplete=${mode === 'up' ? 'new-password' : 'current-password'} minlength="6" required value=${pw} onInput=${e => setPw(e.target.value)} /></div>` : null}
        <button class="btn accent" type="submit" disabled=${busy}>${busy ? 'One moment…' : mode === 'up' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button>
      </form>
      ${msg ? html`<p class="auth-msg">${msg}</p>` : null}
      <div class="auth-alt">
        ${mode === 'in' ? html`<button class="txtbtn" onClick=${() => { setMode('up'); setMsg(''); }}>First time? Create your account</button><button class="txtbtn" onClick=${() => { setMode('reset'); setMsg(''); }}>Forgot password</button>` : html`<button class="txtbtn" onClick=${() => { setMode('in'); setMsg(''); }}>Back to sign in</button>`}
      </div>
    </div>
  </div>`;
}

/* Password reset links land here with a recovery session: ask for the new password once */
(function watchRecovery() {
  const t = setInterval(() => {
    if (!DB.sb) return; clearInterval(t);
    DB.sb.auth.onAuthStateChange(async ev => {
      if (ev !== 'PASSWORD_RECOVERY') return;
      const np = prompt('Choose a new password (6+ characters)');
      if (np && np.length >= 6) { const { error } = await DB.sb.auth.updateUser({ password: np }); toast(error ? 'Could not update the password.' : 'Password updated.'); }
    });
  }, 200);
})();
