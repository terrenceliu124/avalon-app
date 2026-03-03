import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function DevPanel() {
  const { socket, state, dispatch } = useGame();
  const { devMode, devAuthed } = state;
  const [open, setOpen] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [authError, setAuthError] = useState('');
  const [authPending, setAuthPending] = useState(false);

  function handleOpen() {
    setOpen(true);
    setPasskey('');
    setAuthError('');
    setAuthPending(false);
    if (devAuthed && devMode) socket.emit('get_all_rooms');
  }

  function handlePasskeySubmit(e) {
    e.preventDefault();
    if (!passkey.trim() || authPending) return;
    setAuthPending(true);
    setAuthError('');

    function onResult({ success }) {
      setAuthPending(false);
      if (success) {
        setPasskey('');
        socket.emit('get_all_rooms');
      } else {
        setAuthError('Incorrect passkey.');
        setPasskey('');
      }
      socket.off('dev_auth_result', onResult);
    }

    socket.once('dev_auth_result', onResult);
    socket.emit('verify_dev_passkey', { passkey: passkey.trim() });
  }

  function toggleDevMode() {
    const next = !devMode;
    dispatch({ type: 'SET_DEV_MODE', value: next });
    if (next) socket.emit('get_all_rooms');
  }

  const rooms = state.allRooms || [];

  return (
    <>
      <button
        className="dev-fab"
        onClick={handleOpen}
        aria-label="Dev panel"
        style={{ opacity: devMode ? 1 : 0.35 }}
      >
        DEV
      </button>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="overlay-card" style={{ textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <button className="info-close-btn" onClick={() => setOpen(false)} aria-label="Close">✕</button>

            {!devAuthed ? (
              <>
                <h2 style={{ marginBottom: 16 }}>Dev Panel</h2>
                <form onSubmit={handlePasskeySubmit}>
                  <label style={{ display: 'block', marginBottom: 8, color: '#888', fontSize: '0.85rem' }}>
                    Passkey
                  </label>
                  <input
                    className="input"
                    type="password"
                    value={passkey}
                    onChange={e => setPasskey(e.target.value)}
                    placeholder="Enter passkey"
                    autoFocus
                    autoComplete="off"
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
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ margin: 0 }}>Dev Panel</h2>
                  <button
                    onClick={toggleDevMode}
                    style={{
                      background: 'transparent', border: '2px solid #e2b96f',
                      color: '#e2b96f', borderRadius: 6, padding: '4px 10px',
                      fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {devMode ? '◉ ON' : '○ OFF'}
                  </button>
                </div>

                {devMode ? (
                  rooms.length === 0 ? (
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
                  )
                ) : (
                  <p style={{ color: '#888', fontSize: '0.9rem' }}>Enable dev mode to see active rooms and unlock extra controls.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
