import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function DevPanel() {
  const { socket, state, dispatch } = useGame();
  const { devMode } = state;
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
    if (devMode) socket.emit('get_all_rooms');
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
          </div>
        </div>
      )}
    </>
  );
}
