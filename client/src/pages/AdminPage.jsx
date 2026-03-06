import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

const CATEGORY_COLORS = {
  connect: '#5b8dd9',
  disconnect: '#7a8fa8',
  rejoin: '#7a8fa8',
  create: '#5bb85d',
  join: '#5bb85d',
  lobby: '#5bb85d',
  start: '#9c6dd9',
  phase: '#9c6dd9',
  team: '#d9a14a',
  vote: '#d9a14a',
  quest: '#d9a14a',
  assassinate: '#d95b5b',
  host: '#888',
  admin: '#888',
  cleanup: '#888',
};

function formatTs(ts) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

function LogPanel({ logs }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="log-panel">
      {logs.length === 0 && (
        <div style={{ color: '#555', padding: '8px 0', fontStyle: 'italic' }}>No log entries yet</div>
      )}
      {logs.map((entry, i) => (
        <div key={i} className="log-entry">
          <span className="log-ts">{formatTs(entry.ts)}</span>
          <span
            className="log-category-badge"
            style={{ background: CATEGORY_COLORS[entry.category] || '#555' }}
          >
            {entry.category}
          </span>
          <span className="log-message">{entry.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

export default function AdminPage() {
  const { socket } = useGame();
  const [passkey, setPasskey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [logs, setLogs] = useState([]);
  const [authError, setAuthError] = useState('');
  const [authPending, setAuthPending] = useState(false);
  const [activeTab, setActiveTab] = useState('rooms');

  useEffect(() => {
    function onRooms({ rooms }) { setRooms(rooms); }
    function onServerLogs({ logs }) { setLogs(logs); }
    function onServerLog(entry) { setLogs(prev => [...prev, entry]); }

    socket.on('all_rooms', onRooms);
    socket.on('server_logs', onServerLogs);
    socket.on('server_log', onServerLog);
    return () => {
      socket.off('all_rooms', onRooms);
      socket.off('server_logs', onServerLogs);
      socket.off('server_log', onServerLog);
    };
  }, [socket]);

  useEffect(() => {
    if (authed) socket.emit('get_all_rooms');
  }, [authed, socket]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!passkey.trim() || authPending) return;
    setAuthPending(true);
    setAuthError('');
    socket.once('dev_auth_result', ({ success }) => {
      setAuthPending(false);
      if (success) { setPasskey(''); setAuthed(true); }
      else { setAuthError('Incorrect passkey.'); setPasskey(''); }
    });
    socket.emit('verify_dev_passkey', { passkey: passkey.trim() });
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 600, width: '100%' }}>
        <h2 style={{ marginBottom: 4 }}>Admin</h2>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 20 }}>Server state viewer</p>

        {!authed ? (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: 8, color: '#888', fontSize: '0.85rem' }}>
              Passkey
            </label>
            <input
              className="input"
              type="password"
              value={passkey}
              onChange={e => setPasskey(e.target.value)}
              placeholder="Enter passkey"
              autoComplete="off"
              autoFocus
            />
            {authError && <div className="error-msg" style={{ marginTop: 8 }}>{authError}</div>}
            <button
              className="btn btn-primary"
              type="submit"
              style={{ marginTop: 12, width: '100%' }}
              disabled={authPending}
            >
              {authPending ? 'Verifying…' : 'Unlock'}
            </button>
          </form>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className={`btn ${activeTab === 'rooms' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('rooms')}
                style={{ flex: 1 }}
              >
                Rooms
              </button>
              <button
                className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('logs')}
                style={{ flex: 1 }}
              >
                Logs {logs.length > 0 && <span style={{ opacity: 0.7, fontSize: '0.8em' }}>({logs.length})</span>}
              </button>
            </div>

            {activeTab === 'rooms' && (
              <>
                <h3 style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                  Active Rooms
                </h3>
                {rooms.length === 0 ? (
                  <p className="waiting">No active rooms</p>
                ) : (
                  <ul className="player-list">
                    {rooms.map(r => (
                      <li key={r.code} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ color: '#e2b96f', fontSize: '1.1rem' }}>{r.code}</strong>
                          <span className="badge" style={{ background: '#2a2a4a', color: '#b0b0c0' }}>{r.phase}</span>
                          <span style={{ color: '#888', fontSize: '0.85rem' }}>{r.playerCount} players</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#888' }}>{r.playerNames.join(', ')}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {activeTab === 'logs' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                    Server Logs
                  </h3>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    onClick={() => setLogs([])}
                  >
                    Clear
                  </button>
                </div>
                <LogPanel logs={logs} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
