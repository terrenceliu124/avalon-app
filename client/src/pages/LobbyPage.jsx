import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { PAGE_BACKGROUND } from '../assets';
import PlayerAvatar from '../components/PlayerAvatar';

const OPTIONAL_ROLES = ['Percival', 'Morgana', 'Mordred', 'Oberon'];

export default function LobbyPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode, devMode } = state;

  const myPlayer = room.players.find(p => p.name === player?.name);
  const isHost = myPlayer?.isHost;
  const [shareCopied, setShareCopied] = useState(false);

  function handleRoleToggle(role) {
    const current = room.selectedRoles || [];
    const updated = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    socket.emit('update_roles', { roomCode, selectedRoles: updated });
  }

  function handleStart() {
    socket.emit('start_game', { roomCode });
  }

  function handleAddBots() {
    socket.emit('add_bots', { roomCode });
  }

  function handleAddOneBot() {
    socket.emit('add_bots', { roomCode, one: true });
  }

  function handleShare() {
    const url = `${window.location.origin}?room=${roomCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Join my Avalon game', url });
    } else {
      navigator.clipboard?.writeText(url)
        .then(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); })
        .catch(() => window.prompt('Copy this link:', url));
    }
  }

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <div className="card">
        <h2>Lobby</h2>
        <p style={{ marginBottom: 4, fontSize: '0.9rem', color: '#888' }}>Room Code</p>
        <div
          data-testid="room-code"
          style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.15em', color: '#e2b96f', marginBottom: 16 }}
        >
          {roomCode}
        </div>

        <button className="btn btn-ghost" onClick={handleShare} style={{ marginTop: 8 }}>
          {shareCopied ? 'Link Copied!' : 'Share Room Link'}
        </button>

        <h3 style={{ marginTop: 16 }}>Players ({room.players.length}/10)</h3>
        <ul className="player-list" data-testid="player-list">
          {room.players.map(p => (
            <li key={p.id || p.name}>
              <PlayerAvatar name={p.name} emoji={p.avatar} />
              <span>{p.name}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {p.isHost && <span className="badge" style={{ background: '#2a2a1a', color: '#e2b96f' }}>Host</span>}
                {p.isBot  && <span className="badge badge-bot">Bot</span>}
              </div>
            </li>
          ))}
        </ul>

        {isHost && devMode && room.players.length < 5 && (
          <button className="btn btn-ghost" onClick={handleAddBots} data-testid="add-bots-btn">
            Add Bots (fill to 5)
          </button>
        )}
        {isHost && devMode && (
          <button className="btn btn-ghost" onClick={handleAddOneBot} style={{ marginTop: 8 }}>
            Add 1 Bot
          </button>
        )}
      </div>

      {isHost && (
        <div className="card">
          <h3>Optional Roles</h3>
          <ul className="player-list" style={{ marginBottom: 12 }}>
            {OPTIONAL_ROLES.map(role => (
              <li key={role} className="check-row" onClick={() => handleRoleToggle(role)} style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  readOnly
                  checked={(room.selectedRoles || []).includes(role)}
                />
                <span>{role}</span>
              </li>
            ))}
          </ul>
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={room.players.length < 5}
            data-testid="start-game-btn"
          >
            Start Game
          </button>
        </div>
      )}
    </div>
  );
}
