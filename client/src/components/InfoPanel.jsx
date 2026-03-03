import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from './MissionTrack';
import { getRoleCard } from '../assets';

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

function RoomTab({ room, roomCode, isCurrentUserHost, socket }) {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const leader = room.players[room.leaderIndex];

  function handleCopyCode() {
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => window.prompt('Room code:', roomCode));
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

  return (
    <div className="info-tab-content">
      <div className="room-code-display" onClick={handleCopyCode}>
        <span className="room-code-label">Room Code</span>
        <span className="room-code-value">{roomCode}</span>
        <span className="room-code-hint">{copied ? 'Copied!' : 'Tap to copy'}</span>
      </div>

      <div className="info-section">
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      </div>

      {leader && (
        <div className="info-section">
          <h3 style={{ fontSize: '0.85rem', marginBottom: 4 }}>Current Leader</h3>
          <p style={{ fontSize: '1rem', color: '#e2b96f', fontWeight: 700 }}>{leader.name}</p>
        </div>
      )}

      <div className="info-section">
        <h3 style={{ fontSize: '0.85rem', marginBottom: 4 }}>Players ({room.players.length})</h3>
        <ul className="player-list">
          {room.players.map(p => (
            <li key={p.id || p.name}>
              {p.avatar && <span className="emoji-avatar">{p.avatar}</span>}
              <span style={{ flex: 1 }}>{p.name}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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

      <button className="btn btn-ghost" onClick={handleShare} style={{ marginTop: 8 }}>
        {shareCopied ? 'Link Copied!' : 'Invite a Knight'}
      </button>
    </div>
  );
}

export default function InfoPanel() {
  const { state, socket } = useGame();
  const { room, roomCode, player, nightVision } = state;
  const isCurrentUserHost = room?.players.find(p => p.name === player?.name)?.isHost ?? false;
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('role');

  // Only show during active game phases (not on HomePage or LobbyPage)
  if (!room || room.phase === 'lobby') return null;

  return (
    <>
      <button
        className="info-fab"
        onClick={() => setOpen(true)}
        aria-label="Game info"
      >
        i
      </button>

      {open && (
        <div className="overlay info-overlay" onClick={() => setOpen(false)}>
          <div className="overlay-card info-overlay-card" onClick={e => e.stopPropagation()}>
            <button className="info-close-btn" onClick={() => setOpen(false)} aria-label="Close">✕</button>

            <div className="tab-row">
              {['role', 'history', 'room'].map(tab => (
                <button
                  key={tab}
                  className={`tab-btn${activeTab === tab ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'role' && <RoleTab player={player} nightVision={nightVision} phase={room.phase} />}
            {activeTab === 'history' && <HistoryTab history={room.history} showVotingHistory={room.showVotingHistory !== false} />}
            {activeTab === 'room' && <RoomTab room={room} roomCode={roomCode} isCurrentUserHost={isCurrentUserHost} socket={socket} />}
          </div>
        </div>
      )}
    </>
  );
}
