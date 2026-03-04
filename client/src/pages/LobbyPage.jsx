import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { PAGE_BACKGROUND, cardScrollStyle, cardTexturedStyle } from '../assets';
import PlayerAvatar from '../components/PlayerAvatar';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortablePlayerRow({ p, isHost }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: p.id || p.name });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging && {
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      zIndex: 999,
      position: 'relative',
      background: '#2a2a3a',
    }),
  };
  return (
    <li ref={setNodeRef} style={style} {...(isHost ? { ...attributes, ...listeners } : {})}>
      <PlayerAvatar name={p.name} />
      <span style={{ flex: 1 }}>{p.name}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {p.isHost && <span className="badge" style={{ background: '#2a2a1a', color: '#e2b96f' }}>Host</span>}
        {p.isBot  && <span className="badge badge-bot">Bot</span>}
      </div>
    </li>
  );
}

const OPTIONAL_ROLES = ['Percival', 'Morgana', 'Mordred', 'Oberon'];

const ROLE_INFO = {
  Percival: { team: 'good', desc: 'Sees Merlin and Morgana' },
  Morgana:  { team: 'evil', desc: 'Seen by Percival' },
  Mordred:  { team: 'evil', desc: 'Hidden from Merlin' },
  Oberon:   { team: 'evil', desc: 'Hidden from evil team' },
};

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
  const { room, player, roomCode, devMode } = state;

  const myPlayer = room.players.find(p => p.name === player?.name);
  const isHost = myPlayer?.isHost;
  const [shareCopied, setShareCopied] = useState(false);
  const [forcedRoles, setForcedRoles] = useState({});
  const [localOrder, setLocalOrder] = useState(() => room.players.map(p => p.id || p.name));

  useEffect(() => {
    setLocalOrder(room.players.map(p => p.id || p.name));
  }, [room.players]);

  const displayPlayers = localOrder
    .map(id => room.players.find(p => (p.id || p.name) === id))
    .filter(Boolean);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function handleDragOver({ active, over }) {
    if (!over || active.id === over.id) return;
    const fromIndex = localOrder.indexOf(active.id);
    const toIndex   = localOrder.indexOf(over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      setLocalOrder(prev => arrayMove(prev, fromIndex, toIndex));
    }
  }

  function handleDragEnd({ active }) {
    const serverFromIndex = room.players.findIndex(p => (p.id || p.name) === active.id);
    const serverToIndex   = localOrder.indexOf(active.id);
    if (serverFromIndex !== -1 && serverToIndex !== -1 && serverFromIndex !== serverToIndex) {
      socket.emit('reorder_players', { roomCode, fromIndex: serverFromIndex, toIndex: serverToIndex });
    }
  }

  const showRoleAssign = isHost && devMode;
  const forcedCount = Object.keys(forcedRoles).length;

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
    const hasForced = Object.keys(forcedRoles).length > 0;
    socket.emit('start_game', { roomCode, ...(hasForced ? { forcedRoles } : {}) });
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
        if (err.name === 'AbortError') return;
      }
    }
    navigator.clipboard?.writeText(url)
      .then(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); })
      .catch(() => window.prompt('Copy this link:', url));
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt('Room code:', roomCode);
    }
  }

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  const playerCount = room.players.length;
  const needMore = Math.max(0, 5 - playerCount);

  return (
    <div className="page" style={bgStyle}>
      <div className="card" style={cardTexturedStyle}>
        <h2>The Gathering</h2>

        <div
          className="room-code-display"
          data-testid="room-code"
          onClick={handleCopyCode}
        >
          <span className="room-code-label">Room Code</span>
          <span className="room-code-value">{roomCode}</span>
          <span className="room-code-hint">{shareCopied ? 'Copied!' : 'Tap to copy'}</span>
        </div>

        <button className="btn btn-ghost" onClick={handleShare} style={{ marginTop: 0 }}>
          Share Room Link
        </button>

        <h3 style={{ marginTop: 16 }}>Players ({playerCount}/10)</h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayPlayers.map(p => p.id || p.name)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="player-list" data-testid="player-list">
              {displayPlayers.map(p => (
                <SortablePlayerRow key={p.id || p.name} p={p} isHost={isHost} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <p style={{ fontSize: '0.9rem', color: needMore > 0 ? '#888' : '#4caf50', margin: '4px 0 8px' }}>
          {needMore > 0
            ? `Awaiting ${needMore} more player${needMore !== 1 ? 's' : ''}…`
            : 'All players have gathered'}
        </p>

        {isHost && devMode && playerCount < 5 && (
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

      {isHost ? (
        <div className="card" style={cardTexturedStyle}>
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
                  <div className="role-toggle-text">
                    <span className="role-toggle-label">{role}</span>
                    <span className="role-toggle-meta">{info.desc}</span>
                  </div>
                  <span className={`badge ${info.team === 'good' ? 'badge-good' : 'badge-evil'}`}>
                    {info.team === 'good' ? 'Good' : 'Evil'}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid #333', paddingTop: 14, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 10px' }}>Game Options</h3>
            <div
              className={`role-toggle${room.showVotingHistory !== false ? ' selected' : ''}`}
              onClick={() => socket.emit('update_settings', { roomCode, settings: { showVotingHistory: !room.showVotingHistory } })}
              role="checkbox"
              aria-checked={room.showVotingHistory !== false}
            >
              <span className="role-toggle-check">{room.showVotingHistory !== false ? '✓' : ''}</span>
              <span className="role-toggle-label">Reveal vote history to all players</span>
            </div>
          </div>

          {showRoleAssign && (
            <div style={{ marginTop: 4, borderTop: '1px solid #333', paddingTop: 16 }}>
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
                        border: `1px solid ${forcedRoles[p.name] ? (GOOD_ROLE_SET.has(forcedRoles[p.name]) ? '#4a8ecf' : '#d04848') : '#444'}`,
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
              {forcedCount > 0 && (
                <p style={{ fontSize: '0.8rem', margin: '0 0 4px', color: '#4caf50' }}>
                  {`${forcedCount} of ${room.players.length} players force-assigned — others will be random`}
                </p>
              )}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={playerCount < 5}
            data-testid="start-game-btn"
            style={{ marginTop: 16 }}
          >
            Begin the Quest
          </button>
        </div>
      ) : (
        <div className="card" style={cardTexturedStyle}>
          <h3>Quest Configuration</h3>
          <div className="role-toggle-list">
            {OPTIONAL_ROLES.map(role => {
              const isSelected = (room.selectedRoles || []).includes(role);
              const info = ROLE_INFO[role];
              return (
                <div
                  key={role}
                  className={`role-toggle${isSelected ? ' selected' : ''}`}
                >
                  <span className="role-toggle-check">{isSelected ? '✓' : ''}</span>
                  <div className="role-toggle-text">
                    <span className="role-toggle-label">{role}</span>
                    <span className="role-toggle-meta">{info.desc}</span>
                  </div>
                  <span className={`badge ${info.team === 'good' ? 'badge-good' : 'badge-evil'}`}>
                    {info.team === 'good' ? 'Good' : 'Evil'}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '0.9rem', color: '#888', margin: '4px 0 0' }}>
            Vote history: {room.showVotingHistory !== false ? 'revealed' : 'concealed'}
          </p>
        </div>
      )}
    </div>
  );
}
