import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from './MissionTrack';
import { getRoleCard } from '../assets';
import RoleCompositionSummary from './RoleCompositionSummary';

const NIGHT_VISION_PHASES = ['team_proposal', 'voting', 'quest', 'assassination', 'game_over'];

const ROLE_DESCRIPTIONS = {
  Merlin: 'You know all Evil players except Mordred. Guide Good to victory without revealing yourself.',
  Percival: 'You see two players — one is Merlin, one may be Morgana. Protect the true Merlin.',
  LoyalServant: 'You are a loyal servant of Arthur. Work with your teammates to succeed on quests.',
  Assassin: 'You are Evil. If Good wins 3 missions, you get one chance to assassinate Merlin.',
  Morgana: 'You are Evil. You appear as a possible Merlin to Percival — use this to deceive.',
  Mordred: 'You are Evil. Merlin cannot see you — stay hidden and sabotage quests.',
  Oberon: 'You are Evil but act alone. You cannot see your Evil allies, and they cannot see you.',
  Minion: 'You are a Minion of Mordred. Work secretly with your Evil teammates to fail quests.',
};

const ROLE_TIPS = {
  Merlin: 'Guide good players subtly. Vote to reject suspicious teams but vary your pattern — consistency identifies you.',
  Percival: 'Watch both Merlin/Morgana candidates closely. Protect the real Merlin from the Assassin.',
  LoyalServant: 'Observe voting patterns. Push for transparent proposals and trust your instincts.',
  Assassin: 'At game end, identify Merlin by who avoided evil-heavy teams. Save your guess.',
  Morgana: 'Act like Merlin to confuse Percival. Approve some good teams to blend in.',
  Mordred: 'Merlin cannot see you — exploit this by acting fully loyal. Get on quest teams without suspicion.',
  Oberon: 'You act alone. Focus on failing quests when on a team, and identify allies through deduction.',
  Minion: 'Coordinate with your known evil allies. Get onto quests to fail them.',
};

function VoteHistoryCard({ record, showVotingHistory }) {
  return (
    <div className="history-card">
      <div className="history-header">
        <span className="history-label">Mission {record.missionNumber} — Vote</span>
        <span className={record.approved ? 'badge-approve' : 'badge-reject'}>
          {record.approved ? 'Approved' : 'Rejected'}
        </span>
      </div>
      <div className="history-meta">Leader: {record.leader} · Team: {record.team.join(', ')}</div>
      {showVotingHistory && (
        <ul className="sees-list">
          {Object.entries(record.votes).map(([name, vote]) => (
            <li key={name}>
              <span>{name}</span>
              <span className={vote ? 'badge-approve' : 'badge-reject'} style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
                {vote ? 'Approve' : 'Reject'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuestHistoryCard({ record }) {
  return (
    <div className="history-card">
      <div className="history-header">
        <span className="history-label">Mission {record.missionNumber} — Quest</span>
        <span className={record.result === 'success' ? 'badge-approve' : 'badge-reject'}>
          {record.result === 'success' ? 'Success' : 'Fail'}
        </span>
      </div>
      <div className="history-meta">
        Team: {record.team.join(', ')} · Fail cards: {record.failCount}
      </div>
    </div>
  );
}

function RoleTab({ player, nightVision, phase }) {
  const role = player?.role || '?';
  const team = player?.team || 'unknown';
  const desc = ROLE_DESCRIPTIONS[role] || '';
  const tip = ROLE_TIPS[role] || '';
  const sees = nightVision?.sees || [];
  const cardImg = getRoleCard(role, player?.name);

  return (
    <div className="info-tab-content">
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span className={`badge badge-${team}`}>{team === 'good' ? 'Good' : 'Evil'}</span>
        {cardImg
          ? <img src={cardImg} alt={role} className="role-card-img-sm" />
          : <div className="role-name" style={{ fontSize: '1.6rem', margin: '12px 0 6px' }}>{role}</div>
        }
        <p className="role-desc" style={{ fontSize: '0.9rem' }}>{desc}</p>
      </div>
      {sees.length > 0 && NIGHT_VISION_PHASES.includes(phase) && (
        <div className="info-section">
          <h3 style={{ fontSize: '0.85rem', marginBottom: 4 }}>Night Vision</h3>
          <ul className="sees-list">
            {sees.map(entry => (
              <li key={entry.name}>
                <span>{entry.name}</span>
                <span className="sees-label">{entry.as}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tip && (
        <div className="info-section">
          <h3 style={{ fontSize: '0.85rem', marginBottom: 6 }}>Counsel</h3>
          <p style={{ fontSize: '0.88rem', color: '#b0b0c0', lineHeight: 1.5 }}>{tip}</p>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ history, showVotingHistory }) {
  if (!history || history.length === 0) {
    return <p className="waiting">No deeds recorded yet.</p>;
  }
  return (
    <div className="info-tab-content">
      {[...history].reverse().map((record, i) => (
        record.type === 'vote'
          ? <VoteHistoryCard key={i} record={record} showVotingHistory={showVotingHistory} />
          : <QuestHistoryCard key={i} record={record} />
      ))}
    </div>
  );
}

function RoomTab({ room, roomCode, isCurrentUserHost, socket, devMode, devWinner, dispatch }) {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const leader = room.players[room.leaderIndex];

  function handleCopyCode() {
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => window.prompt('Room code:', roomCode));
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

  return (
    <div className="info-tab-content">
      <div className="room-code-display" onClick={handleCopyCode}>
        <span className="room-code-label">Room Code</span>
        <span className="room-code-value">{roomCode}</span>
        <span className="room-code-hint">{copied ? 'Copied!' : 'Tap to copy'}</span>
      </div>
      
      <button className="btn btn-ghost" onClick={handleShare} style={{ marginTop: 8 }}>
        {shareCopied ? 'Link Copied!' : 'Share Room Link'}
      </button>

      {leader && (
        <div className="info-section">
          <h3 style={{ fontSize: '0.85rem', marginBottom: 4 }}>Current Quest Leader</h3>
          <p style={{ fontSize: '1rem', color: '#e2b96f', fontWeight: 700 }}>{leader.name}</p>
        </div>
      )}

      <div className="info-section">
        <h3 style={{ fontSize: '0.85rem', marginBottom: 6 }}>Role Composition</h3>
        <RoleCompositionSummary playerCount={room.players.length} selectedRoles={room.selectedRoles} />
      </div>

      <div className="info-section">
        <h3 style={{ fontSize: '0.85rem', marginBottom: 4 }}>Players ({room.players.length})</h3>
        <ul className="player-list">
          {room.players.map(p => (
            <li key={p.id || p.name}>
              {p.avatar && <span className="emoji-avatar">{p.avatar}</span>}
              <span style={{ flex: 1 }}>{p.name}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {!p.isBot && p.connected === false && (
                  <span className="badge badge-offline">Offline</span>
                )}
                {p.isHost && <span className="badge" style={{ background: '#2a2a1a', color: '#e2b96f' }}>Host</span>}
                {p.isBot && <span className="badge badge-bot">Bot</span>}
                {isCurrentUserHost && !p.isBot && !p.isHost && (
                  <button
                    className="btn btn-ghost"
                    style={{ minHeight: 'unset', padding: '3px 10px', fontSize: '0.75rem', marginTop: 0, width: 'auto' }}
                    onClick={() => socket.emit('transfer_host', { roomCode, targetPlayerName: p.name })}
                  >
                    Make Host
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ borderTop: '1px solid #333', marginTop: 16, paddingTop: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', color: '#888' }}>Dev Mode</span>
        <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!devMode}
            onChange={() => dispatch({ type: 'SET_DEV_MODE', value: !devMode })}
            style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
          />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: 11,
            background: devMode ? '#e2b96f' : '#444',
            transition: 'background 0.2s',
          }} />
          <span style={{
            position: 'absolute', top: 3, left: devMode ? 21 : 3, width: 16, height: 16,
            borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s',
          }} />
        </label>
      </div>

      {devMode && room.phase === 'game_over' && (
        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: '0.78rem', padding: '5px 8px' }}
            onClick={() => {
              const effective = devWinner !== null ? devWinner : room.winner;
              dispatch({ type: 'SET_DEV_WINNER', value: effective === 'good' ? 'evil' : 'good' });
            }}
          >
            {`Toggle Win: → ${(devWinner !== null ? devWinner : room.winner) === 'good' ? 'Evil' : 'Good'} Wins`}
          </button>
        </div>
      )}

      {devMode && isCurrentUserHost && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, fontSize: '0.78rem', padding: '5px 8px' }}
            onClick={() => socket.emit('force_advance', { roomCode, targetPhase: 'assassination' })}
          >
            → Assassination
          </button>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, fontSize: '0.78rem', padding: '5px 8px' }}
            onClick={() => socket.emit('force_advance', { roomCode, targetPhase: 'game_over' })}
          >
            → Game Over
          </button>
        </div>
      )}
    </div>
  );
}

const TAB_ORDER = ['role', 'history', 'room'];
const TAB_LABELS = { role: 'Role', history: 'History', room: 'Room' };

export default function InfoPanel() {
  const { state, socket, dispatch } = useGame();
  const { room, roomCode, player, nightVision, devMode, devWinner } = state;
  const isCurrentUserHost = room?.players.find(p => p.name === player?.name)?.isHost ?? false;
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const isLobby = room?.phase === 'lobby';
  const [activeTab, setActiveTab] = useState('role');

  function closePanel() {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 300);
  }

  const cardRef = useRef(null);

  function switchTab(tab) {
    setActiveTab(tab);
  }

  // Lock body scroll while panel is open (prevents background scroll on iOS)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);


  if (!room) return null;

  return (
    <>
      <button className="info-fab" onClick={() => setOpen(true)} aria-label="Game info">
        i
      </button>

      {open && (
        <div className={`overlay info-overlay${closing ? ' is-closing' : ''}`} onClick={closePanel}>
          <div
            className={`overlay-card info-overlay-card${closing ? ' is-closing' : ''}`}
            onClick={e => e.stopPropagation()}
            ref={cardRef}
          >
            <div className="info-panel-header">
              <div className="info-panel-drag-pill" />
              <div className="info-panel-title-row">
                <span className="info-panel-title">Game Info</span>
                <button className="info-panel-close" onClick={closePanel} aria-label="Close">✕</button>
              </div>
              {!isLobby && (
                <div className="tab-row tab-row-pill">
                  {TAB_ORDER.map(tab => (
                    <button
                      key={tab}
                      className={`tab-btn${activeTab === tab ? ' active' : ''}`}
                      onClick={() => switchTab(tab)}
                    >
                      {TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="info-panel-body">
              {isLobby ? (
                <RoomTab room={room} roomCode={roomCode} isCurrentUserHost={isCurrentUserHost} socket={socket} devMode={devMode} devWinner={devWinner} dispatch={dispatch} />
              ) : (
                <>
                  {activeTab === 'role' && <RoleTab player={player} nightVision={nightVision} phase={room.phase} />}
                  {activeTab === 'history' && <HistoryTab history={room.history} showVotingHistory={room.showVotingHistory !== false} />}
                  {activeTab === 'room' && <RoomTab room={room} roomCode={roomCode} isCurrentUserHost={isCurrentUserHost} socket={socket} devMode={devMode} devWinner={devWinner} dispatch={dispatch} />}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
