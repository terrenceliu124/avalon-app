import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { PAGE_BACKGROUND } from '../assets';
import PlayerAvatar from '../components/PlayerAvatar';

const OPTIONAL_ROLES = ['Percival', 'Morgana', 'Mordred', 'Oberon'];

const ROLE_INFO = {
  Percival: { team: 'good', desc: 'Sees Merlin' },
  Morgana:  { team: 'evil', desc: 'Appears as Merlin' },
  Mordred:  { team: 'evil', desc: 'Hidden from Merlin' },
  Oberon:   { team: 'evil', desc: 'Hidden from evil team' },
};

const TEAM_COUNTS_MAP = { 5:{good:3,evil:2}, 6:{good:4,evil:2}, 7:{good:4,evil:3}, 8:{good:5,evil:3}, 9:{good:6,evil:3}, 10:{good:6,evil:4} };
const GOOD_ROLE_SET = new Set(['Merlin','Percival','LoyalServant']);
const ALL_ROLE_OPTIONS = [
  { value:'Merlin',       label:'Merlin',        team:'good' },
  { value:'Percival',     label:'Percival',       team:'good' },
  { value:'LoyalServant', label:'Loyal Servant',  team:'good' },
  { value:'Assassin',     label:'Assassin',       team:'evil' },
  { value:'Morgana',      label:'Morgana',        team:'evil' },
  { value:'Mordred',      label:'Mordred',        team:'evil' },
  { value:'Oberon',       label:'Oberon',         team:'evil' },
  { value:'Minion',       label:'Minion',         team:'evil' },
];

export default function LobbyPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode, devMode, devAuthed } = state;

  const myPlayer = room.players.find(p => p.name === player?.name);
  const isHost = myPlayer?.isHost;
  const [shareCopied, setShareCopied] = useState(false);
  const [forcedRoles, setForcedRoles] = useState({});

  const showRoleAssign = isHost && devMode && devAuthed;
  const expectedCounts = TEAM_COUNTS_MAP[room.players.length] || { good: 3, evil: 2 };
  const allAssigned = room.players.every(p => forcedRoles[p.name]);
  const assignedGood = room.players.filter(p => GOOD_ROLE_SET.has(forcedRoles[p.name])).length;
  const assignedEvil = room.players.filter(p => forcedRoles[p.name] && !GOOD_ROLE_SET.has(forcedRoles[p.name])).length;
  const rolesValid = allAssigned && assignedGood === expectedCounts.good && assignedEvil === expectedCounts.evil;

  function setPlayerRole(name, role) {
    setForcedRoles(prev => {
      const next = { ...prev };
      if (role) { next[name] = role; } else { delete next[name]; }
      return next;
    });
  }

  function handleRoleToggle(role) {
    const current = room.selectedRoles || [];
    const updated = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    socket.emit('update_roles', { roomCode, selectedRoles: updated });
  }

  function handleStart() {
    if (rolesValid) {
      socket.emit('start_game', { roomCode, forcedRoles });
    } else {
      socket.emit('start_game', { roomCode });
    }
  }

  function handleAddBots() {
    socket.emit('add_bots', { roomCode });
  }

  function handleAddOneBot() {
    socket.emit('add_bots', { roomCode, one: true });
  }

  async function handleShare() {
    const url = `${window.location.origin}?room=${roomCode}`;
    const shareData = { title: 'Join my Avalon game', url };

    if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // user cancelled
        // otherwise fall through to clipboard
      }
    }
    navigator.clipboard?.writeText(url)
      .then(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); })
      .catch(() => window.prompt('Copy this link:', url));
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
              <PlayerAvatar name={p.name} />
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
          <div className="role-toggle-list">
            {OPTIONAL_ROLES.map(role => {
              const isSelected = (room.selectedRoles || []).includes(role);
              const info = ROLE_INFO[role];
              return (
                <div
                  key={role}
                  className={`role-toggle${isSelected ? ' selected' : ''}`}
                  onClick={() => handleRoleToggle(role)}
                  role="checkbox"
                  aria-checked={isSelected}
                >
                  <span className="role-toggle-check">{isSelected ? '✓' : ''}</span>
                  <span className="role-toggle-label">{role}</span>
                  <span className="role-toggle-meta">{info.desc}</span>
                  <span className={`badge ${info.team === 'good' ? 'badge-good' : 'badge-evil'}`}>
                    {info.team === 'good' ? 'Good' : 'Evil'}
                  </span>
                </div>
              );
            })}
          </div>
          {showRoleAssign && (
            <div style={{ marginTop: 20, borderTop: '1px solid #333', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>
                  Assign Roles{' '}
                  <span style={{ color: '#888', fontWeight: 400, fontSize: '0.75rem' }}>dev</span>
                </h3>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  onClick={() => setForcedRoles({})}
                >
                  Clear
                </button>
              </div>
              <ul className="player-list" style={{ marginBottom: 8 }}>
                {room.players.map(p => (
                  <li key={p.name} style={{ justifyContent: 'space-between' }}>
                    <span>
                      {p.name}
                      {p.isBot && <span className="badge badge-bot" style={{ marginLeft: 6 }}>Bot</span>}
                    </span>
                    <select
                      value={forcedRoles[p.name] || ''}
                      onChange={e => setPlayerRole(p.name, e.target.value)}
                      style={{
                        background: '#1a1a2e', color: '#e0e0e0',
                        border: `1px solid ${forcedRoles[p.name] ? (GOOD_ROLE_SET.has(forcedRoles[p.name]) ? '#5b8dd9' : '#c05454') : '#444'}`,
                        borderRadius: 4, padding: '3px 6px', fontSize: '0.8rem', cursor: 'pointer',
                      }}
                    >
                      <option value="">— random —</option>
                      <optgroup label="Good">
                        {ALL_ROLE_OPTIONS.filter(r => r.team === 'good').map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Evil">
                        {ALL_ROLE_OPTIONS.filter(r => r.team === 'evil').map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: '0.8rem', margin: '0 0 4px', color: rolesValid ? '#4caf50' : '#888' }}>
                {!allAssigned
                  ? `${room.players.filter(p => forcedRoles[p.name]).length}/${room.players.length} assigned — start will use random`
                  : rolesValid
                    ? `✓ ${assignedGood} good + ${assignedEvil} evil — forced roles will be used`
                    : `✗ Need ${expectedCounts.good} good + ${expectedCounts.evil} evil (have ${assignedGood}G ${assignedEvil}E)`
                }
              </p>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={room.players.length < 5}
            data-testid="start-game-btn"
            style={{ marginTop: 16 }}
          >
            {rolesValid ? 'Start Game (forced roles)' : 'Start Game'}
          </button>
        </div>
      )}
    </div>
  );
}
