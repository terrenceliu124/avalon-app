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

const FILTER_PRESETS = [
  { label: 'Reconnect', cats: ['connect', 'disconnect', 'rejoin'] },
  { label: 'Game flow', cats: ['start', 'phase', 'team', 'vote', 'quest', 'assassinate'] },
  { label: 'Room', cats: ['create', 'join', 'lobby', 'host'] },
];

const PHASE_COLORS = {
  lobby: '#5bb85d',
  role_reveal: '#9c6dd9',
  night: '#5b8dd9',
  team_proposal: '#d9a14a',
  voting: '#d9a14a',
  quest: '#d9a14a',
  assassination: '#d95b5b',
  game_over: '#888',
};

function formatTs(ts) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

function shortId(id) {
  if (!id) return '—';
  return id.slice(0, 8) + '…';
}

function LogPanel({ logs }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="log-panel">
      {logs.length === 0 && (
        <div style={{ color: '#555', padding: '8px 0', fontStyle: 'italic' }}>No log entries yet</div>
      )}
      {logs.map((entry, i) => (
        <div key={i} className="log-entry">
          <span className="log-ts">{formatTs(entry.ts)}</span>
          <span className="log-category-badge" style={{ background: CATEGORY_COLORS[entry.category] || '#555' }}>
            {entry.category}
          </span>
          <span className="log-message">{entry.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function CategoryChip({ category, active, onToggle }) {
  const color = CATEGORY_COLORS[category] || '#555';
  return (
    <button
      onClick={() => onToggle(category)}
      style={{
        padding: '2px 8px', borderRadius: 999,
        border: `1px solid ${active ? color : '#333'}`,
        background: active ? color + '33' : 'transparent',
        color: active ? color : '#555',
        fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
        lineHeight: 1.6, transition: 'all 0.15s',
      }}
    >
      {category}
    </button>
  );
}

function Pill({ children, color = '#555' }) {
  return (
    <span style={{
      padding: '1px 7px', borderRadius: 999, fontSize: '0.72rem',
      fontWeight: 700, background: color + '22', color, border: `1px solid ${color}44`,
    }}>
      {children}
    </span>
  );
}

function RoomDetail({ detail, onBack, onRefresh }) {
  if (detail.error) {
    return (
      <div>
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 12 }}>← Back</button>
        <p style={{ color: '#d95b5b' }}>{detail.error}</p>
      </div>
    );
  }

  const phaseColor = PHASE_COLORS[detail.phase] || '#888';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '4px 10px', minHeight: 'unset' }}>←</button>
        <strong style={{ color: '#e2b96f', fontSize: '1.2rem' }}>{detail.code}</strong>
        <Pill color={phaseColor}>{detail.phase}</Pill>
        <button
          className="btn btn-ghost"
          onClick={onRefresh}
          style={{ marginLeft: 'auto', padding: '2px 8px', minHeight: 'unset', fontSize: '0.75rem' }}
        >
          Refresh
        </button>
      </div>

      {/* Room state */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <Pill color="#b0b0c0">Mission {detail.currentMission ?? '—'}</Pill>
        <Pill color="#b0b0c0">Rejections {detail.rejectionCount ?? 0}</Pill>
        {detail.leader && <Pill color="#e2b96f">Leader: {detail.leader}</Pill>}
        {detail.winner && <Pill color={detail.winner === 'good' ? '#5bb85d' : '#d95b5b'}>{detail.winner} wins</Pill>}
        {detail.selectedRoles?.length > 0 && (
          <Pill color="#9c6dd9">{detail.selectedRoles.join(', ')}</Pill>
        )}
      </div>

      {detail.proposedTeam?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Proposed Team</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {detail.proposedTeam.map(n => <Pill key={n} color="#d9a14a">{n}</Pill>)}
          </div>
        </div>
      )}

      {/* Players table */}
      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Players ({detail.players.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {detail.players.map(p => (
          <div
            key={p.name}
            style={{
              background: '#1a1a2a',
              border: '1px solid #2a2a3a',
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            {/* Row 1: name + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: '#e2e2f0', flex: 1 }}>{p.name}</span>
              {p.isHost && <Pill color="#e2b96f">host</Pill>}
              {p.isBot && <Pill color="#888">bot</Pill>}
              {p.team && <Pill color={p.team === 'good' ? '#5bb85d' : '#d95b5b'}>{p.team}</Pill>}
              {p.role && <Pill color="#9c6dd9">{p.role}</Pill>}
            </div>
            {/* Row 2: connection + socket + activity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: p.isBot ? '#555' : p.connected ? '#5bb85d' : '#d95b5b',
              }}>
                {p.isBot ? 'bot' : p.connected ? '● online' : '● offline'}
              </span>
              {!p.isBot && (
                <span style={{ fontSize: '0.68rem', color: '#444', fontFamily: 'monospace' }}>
                  {shortId(p.socketId)}
                </span>
              )}
              {p.onProposedTeam && <Pill color="#d9a14a">on team</Pill>}
              {p.hasVoted && (
                <Pill color={p.vote ? '#5bb85d' : '#d95b5b'}>
                  voted {p.vote ? 'approve' : 'reject'}
                </Pill>
              )}
              {p.hasPlayedQuestCard && <Pill color="#9c6dd9">card played</Pill>}
            </div>
          </div>
        ))}
      </div>
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
  const [activeFilters, setActiveFilters] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null); // room detail data

  const allCategories = Object.keys(CATEGORY_COLORS);
  const isFiltered = activeFilters !== null;
  const filteredLogs = isFiltered ? logs.filter(e => activeFilters.has(e.category)) : logs;

  function toggleCategory(cat) {
    setActiveFilters(prev => {
      const current = prev ?? new Set(allCategories);
      const next = new Set(current);
      if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
      return next.size === allCategories.length ? null : next;
    });
  }

  function applyPreset(cats) { setActiveFilters(new Set(cats)); }
  function clearFilters() { setActiveFilters(null); }

  function openRoom(code) {
    socket.emit('get_room_detail', { roomCode: code });
  }

  function refreshRoom() {
    if (!selectedRoom?.code) return;
    socket.emit('get_room_detail', { roomCode: selectedRoom.code });
  }

  useEffect(() => {
    function onRooms({ rooms }) { setRooms(rooms); }
    function onServerLogs({ logs }) { setLogs(logs); }
    function onServerLog(entry) { setLogs(prev => [...prev, entry]); }
    function onRoomDetail(detail) { setSelectedRoom(detail); }

    socket.on('all_rooms', onRooms);
    socket.on('server_logs', onServerLogs);
    socket.on('server_log', onServerLog);
    socket.on('room_detail', onRoomDetail);
    return () => {
      socket.off('all_rooms', onRooms);
      socket.off('server_logs', onServerLogs);
      socket.off('server_log', onServerLog);
      socket.off('room_detail', onRoomDetail);
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
            <label style={{ display: 'block', marginBottom: 8, color: '#888', fontSize: '0.85rem' }}>Passkey</label>
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
            <button className="btn btn-primary" type="submit" style={{ marginTop: 12, width: '100%' }} disabled={authPending}>
              {authPending ? 'Verifying…' : 'Unlock'}
            </button>
          </form>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className={`btn ${activeTab === 'rooms' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setActiveTab('rooms'); setSelectedRoom(null); }}
                style={{ flex: 1 }}
              >
                Rooms
              </button>
              <button
                className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('logs')}
                style={{ flex: 1 }}
              >
                Logs {logs.length > 0 && <span style={{ opacity: 0.7, fontSize: '0.8em' }}>({filteredLogs.length}{isFiltered ? `/${logs.length}` : ''})</span>}
              </button>
            </div>

            {activeTab === 'rooms' && (
              selectedRoom ? (
                <RoomDetail
                  detail={selectedRoom}
                  onBack={() => setSelectedRoom(null)}
                  onRefresh={refreshRoom}
                />
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                      Active Rooms
                    </h3>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                      onClick={() => socket.emit('get_all_rooms')}
                    >
                      Refresh
                    </button>
                  </div>
                  {rooms.length === 0 ? (
                    <p className="waiting">No active rooms</p>
                  ) : (
                    <ul className="player-list">
                      {rooms.map(r => (
                        <li
                          key={r.code}
                          onClick={() => openRoom(r.code)}
                          style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, cursor: 'pointer' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                            <strong style={{ color: '#e2b96f', fontSize: '1.1rem' }}>{r.code}</strong>
                            <Pill color={PHASE_COLORS[r.phase] || '#888'}>{r.phase}</Pill>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>{r.playerCount} players</span>
                            <span style={{ marginLeft: 'auto', color: '#444', fontSize: '0.8rem' }}>›</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>{r.playerNames.join(', ')}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )
            )}

            {activeTab === 'logs' && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#555', marginRight: 2 }}>Presets:</span>
                    {FILTER_PRESETS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => applyPreset(p.cats)}
                        style={{
                          padding: '2px 8px', borderRadius: 999,
                          border: '1px solid #444', background: '#1e1e2e',
                          color: '#aaa', fontSize: '0.72rem', cursor: 'pointer',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                    {isFiltered && (
                      <button
                        onClick={clearFilters}
                        style={{
                          padding: '2px 8px', borderRadius: 999,
                          border: '1px solid #555', background: 'transparent',
                          color: '#e2b96f', fontSize: '0.72rem', cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.72rem', padding: '2px 8px', marginLeft: 'auto' }}
                      onClick={() => setLogs([])}
                    >
                      Clear logs
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {allCategories.map(cat => (
                      <CategoryChip
                        key={cat}
                        category={cat}
                        active={!isFiltered || activeFilters.has(cat)}
                        onToggle={toggleCategory}
                      />
                    ))}
                  </div>
                </div>
                <LogPanel logs={filteredLogs} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
