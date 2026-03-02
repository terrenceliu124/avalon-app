import React from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import { PAGE_BACKGROUND } from '../assets';

export default function VotingPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode, voteProgress, voteResult } = state;

  const hasVoted = room.votes && player && room.votes[player.name] !== undefined;
  const team = room.proposedTeam || [];

  const totalPlayers = room.players.length;
  const voteCount = voteProgress?.voteCount ?? Object.keys(room.votes || {}).length;
  const pct = totalPlayers > 0 ? Math.round((voteCount / totalPlayers) * 100) : 0;

  function handleVote(approve) {
    socket.emit('submit_vote', { roomCode, vote: approve });
  }

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <div className="card">
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      </div>

      <div className="card">
        <h2>Vote on Team</h2>
        <p style={{ marginBottom: 8 }}>Proposed team:</p>
        <ul className="player-list" style={{ marginBottom: 12 }}>
          {team.map(name => (
            <li key={name}>{name}</li>
          ))}
        </ul>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 12 }}>
          {voteCount}/{totalPlayers} votes submitted
        </p>

        {hasVoted ? (
          <p className="waiting">Vote submitted. Waiting for others...</p>
        ) : (
          <div className="btn-row">
            <button className="btn btn-approve" onClick={() => handleVote(true)}>Approve</button>
            <button className="btn btn-reject" onClick={() => handleVote(false)}>Reject</button>
          </div>
        )}
      </div>

      {voteResult && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-title" style={{ color: voteResult.approved ? '#27ae60' : '#c0392b' }}>
              {voteResult.approved ? 'Team Approved!' : 'Team Rejected!'}
            </div>
            <ul className="sees-list" style={{ textAlign: 'left', margin: '12px 0' }}>
              {Object.entries(voteResult.votes).map(([name, v]) => (
                <li key={name}>
                  <span>{name}</span>
                  <span style={{ color: v ? '#27ae60' : '#c0392b' }}>{v ? 'Approve' : 'Reject'}</span>
                </li>
              ))}
            </ul>
            <p style={{ color: '#888', fontSize: '0.85rem' }}>Advancing…</p>
          </div>
        </div>
      )}
    </div>
  );
}
