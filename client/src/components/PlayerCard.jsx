import React from 'react';

export default function PlayerCard({ player, selected, onClick, disabled }) {
  return (
    <button
      className={`player-card${selected ? ' selected' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      <span className="card-avatar">{player.avatar || '🎭'}</span>
      <span className="player-card-name">{player.name}</span>
      {player.isHost && (
        <span className="badge" style={{ background: '#2a2a1a', color: '#e2b96f', fontSize: '0.7rem' }}>Host</span>
      )}
      {player.isBot && <span className="badge badge-bot">Bot</span>}
    </button>
  );
}
