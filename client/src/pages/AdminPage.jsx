import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

export default function AdminPage() {
  const { socket } = useGame();
  const [passkey, setPasskey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [authError, setAuthError] = useState('');
  const [authPending, setAuthPending] = useState(false);

  useEffect(() => {
    function onRooms(r) { setRooms(r); }
    socket.on('all_rooms', onRooms);
    return () => socket.off('all_rooms', onRooms);
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
      <div className="card" style={{ maxWidth: 480, width: '100%' }}>
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
      </div>
    </div>
  );
}
