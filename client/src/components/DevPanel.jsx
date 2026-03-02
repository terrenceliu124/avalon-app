import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function DevPanel() {
  const { socket, state } = useGame();
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
    socket.emit('get_all_rooms');
  }

  const rooms = state.allRooms || [];

  return (
    <>
      <button className="dev-fab" onClick={handleOpen} aria-label="Dev panel">DEV</button>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="overlay-card" style={{ textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <button className="info-close-btn" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            <h2 style={{ marginBottom: 16 }}>Active Rooms</h2>
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
          </div>
        </div>
      )}
    </>
  );
}
