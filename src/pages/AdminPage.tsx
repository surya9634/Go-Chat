import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdminSession {
  token: string;
  adminId: string;
  expiresAt: number;
}

interface PBUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
  online: boolean;
  verified: boolean;
  created: string;
}

interface PBMessage {
  id: string;
  content: string;
  sender: string;
  conversation: string;
  deleted: boolean;
  created: string;
  expand?: { sender?: { username?: string } };
}

interface PBConversation {
  id: string;
  is_group: boolean;
  name?: string;
  created: string;
  expand?: {
    conversation_members_via_conversation?: Array<{
      user: string;
      expand?: { user?: { username?: string } };
    }>;
  };
}

interface Stats {
  totalUsers: number;
  totalMessages: number;
  totalConversations: number;
  onlineUsers: number;
  messagesToday: number;
  newUsersThisWeek: number;
}

type Tab = 'dashboard' | 'users' | 'messages';

// ─── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@gochat.internal';
const PB_URL = (import.meta.env.VITE_POCKETBASE_URL as string) || 'http://127.0.0.1:8090';
const SESSION_KEY = '__gc_adm__';
const ATTEMPT_KEY = '__gc_att__';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const TOKEN_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: AdminSession = JSON.parse(raw);
    if (Date.now() > s.expiresAt) { sessionStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { return null; }
}

function saveSession(token: string, adminId: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    token, adminId, expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  }));
}

function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

interface AttemptState { count: number; lockedUntil: number; }

function getAttempts(): AttemptState {
  try { const r = sessionStorage.getItem(ATTEMPT_KEY); return r ? JSON.parse(r) : { count: 0, lockedUntil: 0 }; }
  catch { return { count: 0, lockedUntil: 0 }; }
}

function recordFail(): AttemptState {
  const a = getAttempts(); a.count += 1;
  if (a.count >= MAX_ATTEMPTS) { a.lockedUntil = Date.now() + LOCKOUT_MS; a.count = 0; }
  sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(a)); return a;
}

function clearAttempts() { sessionStorage.removeItem(ATTEMPT_KEY); }

async function adminFetch<T>(token: string, path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${PB_URL}${path}`, {
    ...opts,
    headers: { 'Authorization': `Admin ${token}`, 'Content-Type': 'application/json', ...(opts?.headers || {}) },
  });
  if (!res.ok) { const e = await res.json().catch(() => ({ message: res.statusText })); throw new Error(e.message || `Error ${res.status}`); }
  return res.json();
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(() => getSession());
  const [tab, setTab] = useState<Tab>('dashboard');

  if (!session) return <AdminLogin onLogin={s => setSession(s)} />;
  return <AdminDashboard session={session} tab={tab} onTabChange={setTab} onLogout={() => { clearSession(); setSession(null); }} />;
}

// ─── Login ─────────────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: (s: AdminSession) => void }) {
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const a = getAttempts();
    if (a.lockedUntil > Date.now()) startTimer(a.lockedUntil);
    return () => clearInterval(timer.current);
  }, []);

  const startTimer = (until: number) => {
    const tick = () => { const r = Math.max(0, until - Date.now()); setRemaining(Math.ceil(r / 1000)); if (r <= 0) clearInterval(timer.current); };
    tick(); timer.current = setInterval(tick, 1000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = getAttempts();
    if (a.lockedUntil > Date.now()) return;
    setErr(''); setLoading(true);
    try {
      // Uses custom hook at /api/go-admin/auth?pw= (v0.22 compatible)
      const res = await fetch(`${PB_URL}/api/go-admin/auth?pw=${encodeURIComponent(pw)}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const na = recordFail();
        if (na.lockedUntil > 0) { startTimer(na.lockedUntil); setErr('Too many failed attempts. Locked for 15 minutes.'); }
        else { setErr(`Wrong password. ${MAX_ATTEMPTS - na.count} attempt${MAX_ATTEMPTS - na.count !== 1 ? 's' : ''} left.`); }
        return;
      }
      const d: { token: string; admin: { id: string } } = await res.json();
      clearAttempts();
      const session = { token: d.token, adminId: d.admin.id, expiresAt: Date.now() + TOKEN_EXPIRY_MS };
      saveSession(d.token, d.admin.id);
      onLogin(session);
    } catch { setErr('Connection error. Is the backend running?'); }
    finally { setLoading(false); }
  };

  const locked = remaining > 0;

  return (
    <div className="admin-login-bg">
      <div className="admin-login-card">
        {/* Header */}
        <div className="admin-logo-row">
          <div className="admin-logo-icon">⚡</div>
          <div>
            <div className="admin-logo-title">NEXORA</div>
            <div className="admin-logo-sub">Admin Control Panel</div>
          </div>
        </div>

        <h1 className="admin-h1">Secure Access</h1>
        <p className="admin-desc">Authorized personnel only. All actions are logged.</p>

        <form onSubmit={submit} className="admin-form" autoComplete="off">
          <div className="admin-field">
            <label className="admin-label">Master Password</label>
            <div className="admin-input-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="Enter admin password"
                disabled={locked || loading}
                autoComplete="new-password"
                className={`admin-input${locked ? ' disabled' : ''}`}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="admin-eye" tabIndex={-1}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {err && <div className="admin-error">⚠️ {err}</div>}
          {locked && <div className="admin-lockout">🔒 Locked — retry in <strong>{fmt(remaining)}</strong></div>}

          <button type="submit" disabled={locked || loading || !pw} className={`admin-submit${locked || loading || !pw ? ' disabled' : ''}`}>
            {loading ? 'Authenticating…' : locked ? '🔒 Locked' : '→ Enter Admin Panel'}
          </button>
        </form>

        <div className="admin-security-badge">
          🛡️ TLS Encrypted · Session Token · Rate Limited · Auto-Expire 12h
        </div>
      </div>

      <style>{adminStyles}</style>
    </div>
  );
}

// ─── Dashboard Shell ───────────────────────────────────────────────────────────

function AdminDashboard({ session, tab, onTabChange, onLogout }: {
  session: AdminSession; tab: Tab; onTabChange: (t: Tab) => void; onLogout: () => void;
}) {
  return (
    <div className="admin-dash">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="admin-logo-icon sm">⚡</div>
          <span className="admin-sidebar-title">NEXORA</span>
        </div>

        <nav className="admin-nav">
          {([['dashboard', '📊', 'Dashboard'], ['users', '👥', 'Users'], ['messages', '💬', 'Chats']] as [Tab, string, string][]).map(([t, icon, label]) => (
            <button key={t} onClick={() => onTabChange(t)} className={`admin-nav-btn${tab === t ? ' active' : ''}`}>
              <span>{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-session-info">
            <div className="admin-session-dot" />
            <span>Session expires {new Date(session.expiresAt).toLocaleTimeString()}</span>
          </div>
          <button onClick={onLogout} className="admin-logout-btn">🚪 Logout</button>
        </div>
      </aside>

      <main className="admin-main">
        {tab === 'dashboard' && <StatsPanel session={session} />}
        {tab === 'users' && <UsersPanel session={session} />}
        {tab === 'messages' && <MessagesPanel session={session} />}
      </main>

      <style>{adminStyles}</style>
    </div>
  );
}

// ─── Stats Panel ───────────────────────────────────────────────────────────────

function StatsPanel({ session }: { session: AdminSession }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const enc = encodeURIComponent;
      const [u, m, c, o, td, nw] = await Promise.all([
        adminFetch<{ totalItems: number }>(session.token, '/api/collections/users/records?perPage=1'),
        adminFetch<{ totalItems: number }>(session.token, '/api/collections/messages/records?perPage=1'),
        adminFetch<{ totalItems: number }>(session.token, '/api/collections/conversations/records?perPage=1'),
        adminFetch<{ totalItems: number }>(session.token, `/api/collections/users/records?perPage=1&filter=${enc('online=true')}`),
        adminFetch<{ totalItems: number }>(session.token, `/api/collections/messages/records?perPage=1&filter=${enc(`created>='${today.toISOString()}'`)}`),
        adminFetch<{ totalItems: number }>(session.token, `/api/collections/users/records?perPage=1&filter=${enc(`created>='${weekAgo.toISOString()}'`)}`),
      ]);
      setStats({ totalUsers: u.totalItems, totalMessages: m.totalItems, totalConversations: c.totalItems, onlineUsers: o.totalItems, messagesToday: td.totalItems, newUsersThisWeek: nw.totalItems });
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [session.token]);

  useEffect(() => { load(); }, [load]);

  const cards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: '#10b981' },
    { label: 'Total Messages', value: stats.totalMessages, icon: '💬', color: '#3b82f6' },
    { label: 'Conversations', value: stats.totalConversations, icon: '🗨️', color: '#8b5cf6' },
    { label: 'Online Now', value: stats.onlineUsers, icon: '🟢', color: '#10b981' },
    { label: 'Messages Today', value: stats.messagesToday, icon: '📈', color: '#f59e0b' },
    { label: 'New Users (7d)', value: stats.newUsersThisWeek, icon: '✨', color: '#ec4899' },
  ] : [];

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Dashboard Overview</h2>
        <button onClick={load} className="admin-refresh-btn" disabled={loading}>{loading ? '⏳' : '🔄'} Refresh</button>
      </div>
      {error && <div className="admin-error">{error}</div>}
      {loading && !stats ? <div className="admin-loading">Loading stats…</div> : (
        <div className="admin-stats-grid">
          {cards.map(c => (
            <div key={c.label} className="admin-stat-card">
              <div style={{ fontSize: 28 }}>{c.icon}</div>
              <div className="admin-stat-value" style={{ color: c.color }}>{c.value.toLocaleString()}</div>
              <div className="admin-stat-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}
      <div className="admin-info-box">
        <strong>⏱️ Auto-Cleanup Active</strong>: Messages older than 7 days are deleted every Sunday at 2:00 AM server time.
      </div>
    </div>
  );
}

// ─── Users Panel ───────────────────────────────────────────────────────────────

function UsersPanel({ session }: { session: AdminSession }) {
  const [users, setUsers] = useState<PBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmDel, setConfirmDel] = useState<PBUser | null>(null);
  const [deleting, setDeleting] = useState('');
  const PER_PAGE = 15;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const filter = search ? `username~'${search}' || email~'${search}'` : '';
      const q = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE), sort: '-created', ...(filter ? { filter } : {}) });
      const d = await adminFetch<{ items: PBUser[]; totalPages: number }>(session.token, `/api/collections/users/records?${q}`);
      setUsers(d.items); setTotalPages(d.totalPages);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [session.token, search, page]);

  useEffect(() => { load(); }, [load]);

  const deleteUser = async (user: PBUser) => {
    setDeleting(user.id);
    try {
      await adminFetch(session.token, `/api/collections/users/records/${user.id}`, { method: 'DELETE' });
      setUsers(u => u.filter(x => x.id !== user.id));
      setConfirmDel(null);
    } catch (e) { setError(String(e)); }
    finally { setDeleting(''); }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Users Management</h2>
        <button onClick={load} className="admin-refresh-btn" disabled={loading}>{loading ? '⏳' : '🔄'} Refresh</button>
      </div>

      <div className="admin-search-row">
        <input type="text" placeholder="🔍 Search username or email…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} className="admin-search" />
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? <div className="admin-loading">Loading users…</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>{['User', 'Email', 'Status', 'Joined', 'Actions'].map(h => <th key={h} className="admin-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="admin-tr">
                  <td className="admin-td">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="admin-avatar">
                        {u.avatar
                          ? <img src={`${PB_URL}/api/files/users/${u.id}/${u.avatar}?thumb=36x36`} className="admin-avatar-img" alt="" />
                          : <span className="admin-avatar-fallback">{(u.username || '?')[0].toUpperCase()}</span>}
                      </div>
                      <div>
                        <div className="admin-username">{u.username}</div>
                        <div className="admin-uid">{u.id.slice(0, 10)}…</div>
                      </div>
                    </div>
                  </td>
                  <td className="admin-td"><span className="admin-email">{u.email || '—'}</span></td>
                  <td className="admin-td">
                    <span className={`admin-badge ${u.online ? 'green' : 'gray'}`}>{u.online ? '● Online' : '○ Offline'}</span>
                  </td>
                  <td className="admin-td"><span className="admin-date">{new Date(u.created).toLocaleDateString()}</span></td>
                  <td className="admin-td">
                    <button onClick={() => setConfirmDel(u)} disabled={deleting === u.id} className="admin-delete-btn">
                      {deleting === u.id ? '⏳' : '🗑️ Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="admin-empty">No users found.</div>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="admin-page-btn">← Prev</button>
          <span className="admin-page-info">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="admin-page-btn">Next →</button>
        </div>
      )}

      {confirmDel && (
        <ConfirmModal
          title="Delete User"
          message={`Permanently delete "${confirmDel.username}"? This will remove all their messages and conversations. Cannot be undone.`}
          onConfirm={() => deleteUser(confirmDel)}
          onCancel={() => setConfirmDel(null)}
          loading={deleting === confirmDel.id}
        />
      )}
    </div>
  );
}

// ─── Messages Panel ────────────────────────────────────────────────────────────

function MessagesPanel({ session }: { session: AdminSession }) {
  const [convs, setConvs] = useState<PBConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, PBMessage[]>>({});
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const q = new URLSearchParams({ page: String(page), perPage: '10', sort: '-created', expand: 'conversation_members_via_conversation.user' });
      const d = await adminFetch<{ items: PBConversation[]; totalPages: number }>(session.token, `/api/collections/conversations/records?${q}`);
      setConvs(d.items); setTotalPages(d.totalPages);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [session.token, page]);

  useEffect(() => { load(); }, [load]);

  const loadMsgs = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    if (!msgs[id]) {
      try {
        const d = await adminFetch<{ items: PBMessage[] }>(session.token,
          `/api/collections/messages/records?filter=${encodeURIComponent(`conversation='${id}'`)}&sort=-created&perPage=50&expand=sender`);
        setMsgs(m => ({ ...m, [id]: d.items }));
      } catch (e) { setError(String(e)); return; }
    }
    setExpanded(id);
  };

  const deleteConv = async (id: string) => {
    setDeleting(id);
    try {
      await adminFetch(session.token, `/api/collections/conversations/records/${id}`, { method: 'DELETE' });
      setConvs(c => c.filter(x => x.id !== id)); setConfirmDel(null);
    } catch (e) { setError(String(e)); }
    finally { setDeleting(''); }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Conversations & Messages</h2>
        <button onClick={load} className="admin-refresh-btn" disabled={loading}>{loading ? '⏳' : '🔄'} Refresh</button>
      </div>
      {error && <div className="admin-error">{error}</div>}

      {loading ? <div className="admin-loading">Loading conversations…</div> : (
        <div className="admin-conv-list">
          {convs.map(conv => {
            const members = conv.expand?.conversation_members_via_conversation
              ?.map(m => m.expand?.user?.username || m.user.slice(0, 6)).join(' ↔ ') || conv.id.slice(0, 12) + '…';
            const isExp = expanded === conv.id;
            return (
              <div key={conv.id} className="admin-conv-card">
                <div className="admin-conv-header">
                  <div className="admin-conv-info">
                    <div className="admin-conv-name">{conv.name || members}</div>
                    <div className="admin-conv-meta">{conv.is_group ? '👥 Group' : '💬 DM'} · {new Date(conv.created).toLocaleDateString()}</div>
                  </div>
                  <div className="admin-conv-actions">
                    <button onClick={() => loadMsgs(conv.id)} className="admin-view-btn">{isExp ? '▲ Hide' : '▼ Messages'}</button>
                    <button onClick={() => setConfirmDel(conv.id)} className="admin-delete-btn">🗑️</button>
                  </div>
                </div>
                {isExp && msgs[conv.id] && (
                  <div className="admin-msg-list">
                    {msgs[conv.id].length === 0
                      ? <div className="admin-empty">No messages.</div>
                      : msgs[conv.id].map(msg => (
                          <div key={msg.id} className="admin-msg-row">
                            <span className="admin-msg-sender">{msg.expand?.sender?.username || msg.sender.slice(0, 8)}:</span>
                            <span className={`admin-msg-content${msg.deleted ? ' deleted' : ''}`}>{msg.deleted ? '[Deleted]' : msg.content}</span>
                            <span className="admin-msg-time">{new Date(msg.created).toLocaleString()}</span>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
            );
          })}
          {convs.length === 0 && <div className="admin-empty">No conversations found.</div>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="admin-page-btn">← Prev</button>
          <span className="admin-page-info">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="admin-page-btn">Next →</button>
        </div>
      )}

      {confirmDel && (
        <ConfirmModal
          title="Delete Conversation"
          message="Permanently delete this conversation and all its messages? Cannot be undone."
          onConfirm={() => deleteConv(confirmDel)}
          onCancel={() => setConfirmDel(null)}
          loading={deleting === confirmDel}
        />
      )}
    </div>
  );
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onCancel, loading }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal">
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <h3 className="admin-modal-title">{title}</h3>
        <p className="admin-modal-msg">{message}</p>
        <div className="admin-modal-actions">
          <button onClick={onCancel} className="admin-cancel-btn" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} className="admin-confirm-btn" disabled={loading}>
            {loading ? '⏳ Deleting…' : '🗑️ Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Styles ─────────────────────────────────────────────────────────────

const adminStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .admin-login-bg {
    min-height: 100vh;
    background: radial-gradient(ellipse at top, #0a1a12 0%, #0a0a0a 60%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', system-ui, sans-serif;
    padding: 20px;
  }
  .admin-login-card {
    background: rgba(255,255,255,0.025);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px; padding: 40px 36px;
    width: 100%; max-width: 420px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .admin-logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
  .admin-logo-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, #10b981, #059669);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; box-shadow: 0 4px 14px rgba(16,185,129,0.45); flex-shrink: 0;
  }
  .admin-logo-icon.sm { width: 34px; height: 34px; font-size: 16px; border-radius: 9px; }
  .admin-logo-title { font-size: 18px; font-weight: 800; color: #fff; letter-spacing: 2px; }
  .admin-logo-sub { font-size: 11px; color: #6b7280; letter-spacing: 0.5px; margin-top: 1px; }
  .admin-h1 { font-size: 26px; font-weight: 700; color: #fff; margin: 0 0 6px; }
  .admin-desc { font-size: 13px; color: #6b7280; margin: 0 0 28px; }
  .admin-form { display: flex; flex-direction: column; gap: 16px; }
  .admin-field { display: flex; flex-direction: column; gap: 6px; }
  .admin-label { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.8px; text-transform: uppercase; }
  .admin-input-wrap { position: relative; display: flex; align-items: center; }
  .admin-input {
    width: 100%; padding: 12px 44px 12px 14px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px; color: #fff; font-size: 14px; outline: none;
    box-sizing: border-box; font-family: 'Inter', sans-serif;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .admin-input:focus { border-color: rgba(16,185,129,0.5); box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
  .admin-input.disabled { opacity: 0.5; cursor: not-allowed; }
  .admin-eye {
    position: absolute; right: 12px; background: none; border: none;
    cursor: pointer; font-size: 15px; padding: 4px; color: #6b7280;
  }
  .admin-error {
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
    border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #fca5a5;
  }
  .admin-lockout {
    background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.25);
    border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #fde68a; text-align: center;
  }
  .admin-submit {
    background: linear-gradient(135deg, #10b981, #059669); color: #fff;
    border: none; border-radius: 10px; padding: 13px 20px;
    font-size: 14px; font-weight: 700; cursor: pointer; letter-spacing: 0.3px;
    box-shadow: 0 4px 14px rgba(16,185,129,0.35); transition: opacity 0.2s, transform 0.1s;
    font-family: 'Inter', sans-serif;
  }
  .admin-submit:hover:not(.disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.45); }
  .admin-submit.disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; transform: none; }
  .admin-security-badge { margin-top: 24px; text-align: center; font-size: 11px; color: #374151; letter-spacing: 0.3px; }

  /* Dashboard Layout */
  .admin-dash { min-height: 100vh; background: #070707; display: flex; font-family: 'Inter', system-ui, sans-serif; }
  .admin-sidebar {
    width: 220px; background: rgba(255,255,255,0.018);
    border-right: 1px solid rgba(255,255,255,0.055);
    display: flex; flex-direction: column; padding: 24px 14px; flex-shrink: 0;
  }
  .admin-sidebar-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 30px; padding-left: 2px; }
  .admin-sidebar-title { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: 2px; }
  .admin-nav { display: flex; flex-direction: column; gap: 3px; flex: 1; }
  .admin-nav-btn {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border-radius: 10px; border: none; background: transparent;
    color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer;
    text-align: left; transition: background 0.15s, color 0.15s;
    font-family: 'Inter', sans-serif; width: 100%;
  }
  .admin-nav-btn:hover { background: rgba(255,255,255,0.04); color: #d1d5db; }
  .admin-nav-btn.active { background: rgba(16,185,129,0.1); color: #10b981; }
  .admin-sidebar-footer { padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.055); display: flex; flex-direction: column; gap: 10px; }
  .admin-session-info { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #4b5563; }
  .admin-session-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; flex-shrink: 0; }
  .admin-logout-btn {
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18);
    border-radius: 8px; color: #f87171; padding: 8px 12px;
    font-size: 12px; cursor: pointer; font-weight: 500; text-align: left;
    font-family: 'Inter', sans-serif; transition: background 0.15s;
  }
  .admin-logout-btn:hover { background: rgba(239,68,68,0.14); }
  .admin-main { flex: 1; padding: 28px 32px; overflow-y: auto; max-height: 100vh; }
  
  /* Panels */
  .admin-panel { max-width: 1080px; }
  .admin-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .admin-panel-title { font-size: 20px; font-weight: 700; color: #f3f4f6; margin: 0; }
  .admin-refresh-btn {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px; color: #9ca3af; padding: 7px 14px; font-size: 12px; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: background 0.15s;
  }
  .admin-refresh-btn:hover { background: rgba(255,255,255,0.07); }

  /* Stats */
  .admin-stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .admin-stat-card {
    background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px; padding: 20px 16px; display: flex; flex-direction: column; gap: 8px;
    transition: border-color 0.2s, transform 0.15s;
  }
  .admin-stat-card:hover { border-color: rgba(16,185,129,0.2); transform: translateY(-2px); }
  .admin-stat-value { font-size: 26px; font-weight: 800; line-height: 1; }
  .admin-stat-label { font-size: 12px; color: #6b7280; font-weight: 500; }
  .admin-loading { text-align: center; color: #6b7280; padding: 48px 0; font-size: 14px; }
  .admin-info-box {
    background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.15);
    border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #6ee7b7; margin-top: 8px;
  }

  /* Users */
  .admin-search-row { margin-bottom: 16px; }
  .admin-search {
    width: 100%; max-width: 360px; padding: 9px 14px;
    background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; color: #fff; font-size: 13px; outline: none;
    box-sizing: border-box; font-family: 'Inter', sans-serif;
    transition: border-color 0.2s;
  }
  .admin-search:focus { border-color: rgba(16,185,129,0.4); }
  .admin-search::placeholder { color: #4b5563; }
  .admin-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
  .admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .admin-th {
    padding: 12px 14px; text-align: left; font-size: 10px; font-weight: 700;
    color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px;
    background: rgba(255,255,255,0.018); border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .admin-tr { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.1s; }
  .admin-tr:hover { background: rgba(255,255,255,0.015); }
  .admin-td { padding: 12px 14px; color: #d1d5db; vertical-align: middle; }
  .admin-avatar { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: rgba(16,185,129,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.08); }
  .admin-avatar-img { width: 100%; height: 100%; object-fit: cover; }
  .admin-avatar-fallback { font-size: 14px; font-weight: 700; color: #10b981; }
  .admin-username { font-weight: 600; color: #f3f4f6; font-size: 13px; }
  .admin-uid { font-size: 10px; color: #4b5563; font-family: monospace; margin-top: 1px; }
  .admin-email { color: #9ca3af; font-size: 12px; }
  .admin-badge { padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .admin-badge.green { background: rgba(16,185,129,0.1); color: #34d399; }
  .admin-badge.gray { background: rgba(107,114,128,0.1); color: #6b7280; }
  .admin-date { font-size: 12px; color: #6b7280; }
  .admin-delete-btn {
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18);
    border-radius: 6px; color: #f87171; padding: 5px 10px;
    font-size: 12px; cursor: pointer; font-weight: 500; white-space: nowrap;
    font-family: 'Inter', sans-serif; transition: background 0.15s;
  }
  .admin-delete-btn:hover { background: rgba(239,68,68,0.15); }
  .admin-empty { text-align: center; color: #4b5563; padding: 32px 0; font-size: 13px; }
  .admin-pagination { display: flex; align-items: center; gap: 12px; margin-top: 16px; justify-content: center; }
  .admin-page-btn {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
    border-radius: 6px; color: #9ca3af; padding: 7px 14px; font-size: 12px; cursor: pointer;
    font-family: 'Inter', sans-serif;
  }
  .admin-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .admin-page-info { font-size: 12px; color: #6b7280; }

  /* Conversations */
  .admin-conv-list { display: flex; flex-direction: column; gap: 8px; }
  .admin-conv-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055); border-radius: 10px; overflow: hidden; }
  .admin-conv-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; gap: 12px; }
  .admin-conv-info { flex: 1; min-width: 0; }
  .admin-conv-name { font-size: 14px; font-weight: 600; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-conv-meta { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .admin-conv-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .admin-view-btn {
    background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.18);
    border-radius: 6px; color: #93c5fd; padding: 5px 10px;
    font-size: 12px; cursor: pointer; font-weight: 500; white-space: nowrap;
    font-family: 'Inter', sans-serif; transition: background 0.15s;
  }
  .admin-view-btn:hover { background: rgba(59,130,246,0.14); }
  .admin-msg-list { border-top: 1px solid rgba(255,255,255,0.05); max-height: 280px; overflow-y: auto; padding: 6px 0; }
  .admin-msg-row { display: flex; align-items: baseline; gap: 8px; padding: 6px 16px; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); }
  .admin-msg-sender { font-weight: 700; color: #10b981; white-space: nowrap; flex-shrink: 0; }
  .admin-msg-content { flex: 1; color: #d1d5db; word-break: break-word; }
  .admin-msg-content.deleted { color: #4b5563; font-style: italic; }
  .admin-msg-time { color: #374151; font-size: 10px; white-space: nowrap; flex-shrink: 0; }

  /* Modal */
  .admin-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8);
    backdrop-filter: blur(6px); display: flex; align-items: center;
    justify-content: center; z-index: 9999;
  }
  .admin-modal {
    background: #0f1117; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 18px; padding: 36px 28px; max-width: 400px; width: 90%;
    text-align: center; box-shadow: 0 30px 60px rgba(0,0,0,0.7);
    animation: adminModalIn 0.2s ease;
  }
  @keyframes adminModalIn { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .admin-modal-title { font-size: 18px; font-weight: 700; color: #fff; margin: 0 0 10px; }
  .admin-modal-msg { font-size: 13px; color: #9ca3af; margin: 0 0 28px; line-height: 1.6; }
  .admin-modal-actions { display: flex; gap: 10px; justify-content: center; }
  .admin-cancel-btn {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; color: #9ca3af; padding: 10px 20px;
    font-size: 13px; cursor: pointer; font-weight: 500; font-family: 'Inter', sans-serif;
  }
  .admin-confirm-btn {
    background: linear-gradient(135deg, #dc2626, #b91c1c); border: none;
    border-radius: 8px; color: #fff; padding: 10px 20px;
    font-size: 13px; cursor: pointer; font-weight: 600;
    box-shadow: 0 4px 14px rgba(220,38,38,0.3); font-family: 'Inter', sans-serif;
    transition: opacity 0.15s;
  }
  .admin-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 640px) {
    .admin-sidebar { width: 60px; padding: 16px 8px; }
    .admin-sidebar-title, .admin-session-info span, .admin-logo-sub { display: none; }
    .admin-nav-btn span:last-child { display: none; }
    .admin-nav-btn { justify-content: center; padding: 10px; }
    .admin-main { padding: 16px; }
    .admin-stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;
