import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import { PAGE_BACKGROUND, cardScrollStyle, cardTexturedStyle } from '../assets';

export default function VotingPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode, voteProgress, voteResult } = state;

  const hasVoted = room.votes && player && room.votes[player.name] !== undefined;
  const team = room.proposedTeam || [];
  const [pendingVote, setPendingVote] = useState(null);

  const totalPlayers = room.players.length;
  const voteCount = voteProgress?.voteCount ?? Object.keys(room.votes || {}).length;
  const pct = totalPlayers > 0 ? Math.round((voteCount / totalPlayers) * 100) : 0;

  function handleVote(approve) {
    if (pendingVote !== null) return;
    setPendingVote(approve);
    socket.emit('submit_vote', { roomCode, vote: approve });
  }

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <div className="card" style={cardScrollStyle}>
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      </div>

      <div className="card" style={cardTexturedStyle}>
        <h2>Cast Your Vote</h2>
        <p style={{ marginBottom: 8 }}>Proposed party:</p>
        <ul className="player-list" style={{ marginBottom: 12 }}>
          {team.map(name => (
            <li key={name}>{name}</li>
          ))}
        </ul>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 12 }}>
          {voteCount} of {totalPlayers} have voted
        </p>

        {hasVoted ? (
          <p className="waiting">Your vote is cast. Awaiting the others…</p>
        ) : pendingVote !== null ? (
          <div className="btn-row" style={{ justifyContent: 'center', gap: 24 }}>
            <img
              src="/assets/backgrounds/vote_Approve.png"
              alt="Approve"
              style={{ width: 90, opacity: pendingVote === true ? 1 : 0.3, boxShadow: pendingVote === true ? '0 0 0 3px #fff' : 'none', borderRadius: 8, cursor: 'default' }}
            />
            <img
              src="/assets/backgrounds/vote_Reject.png"
              alt="Reject"
              style={{ width: 90, opacity: pendingVote === false ? 1 : 0.3, boxShadow: pendingVote === false ? '0 0 0 3px #fff' : 'none', borderRadius: 8, cursor: 'default' }}
            />
          </div>
        ) : (
          <>
            <div className="btn-row" style={{ justifyContent: 'center', gap: 24 }}>
              <img
                src="/assets/backgrounds/vote_Approve.png"
                alt="Approve"
                onClick={() => handleVote(true)}
                style={{ width: 90, cursor: 'pointer', borderRadius: 8, transition: 'transform 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
              <img
                src="/assets/backgrounds/vote_Reject.png"
                alt="Reject"
                onClick={() => handleVote(false)}
                style={{ width: 90, cursor: 'pointer', borderRadius: 8, transition: 'transform 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 10, textAlign: 'center' }}>
              Your vote is final once cast
            </p>
          </>
        )}
      </div>

      {voteResult && (
        <div className="overlay">
          <div className={`overlay-card${voteResult.approved ? ' overlay-card--approved' : ' overlay-card--rejected'}`}>
            <div className="overlay-result-glyph" style={{ color: voteResult.approved ? '#4a8ecf' : '#d04848' }}>
              {voteResult.approved ? '⚔' : '✕'}
            </div>
            <div className="overlay-title" style={{ color: voteResult.approved ? '#4a8ecf' : '#d04848' }}>
              {voteResult.approved ? 'The Party Sets Forth!' : 'The Party Is Turned Back!'}
            </div>
            {room.showVotingHistory !== false && (
              <ul className="sees-list" style={{ textAlign: 'left', margin: '12px 0' }}>
                {Object.entries(voteResult.votes).map(([name, v]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <span style={{ color: v ? '#4a8ecf' : '#d04848' }}>{v ? 'Approve' : 'Reject'}</span>
                  </li>
                ))}
              </ul>
            )}
            <p style={{ color: '#888', fontSize: '0.85rem' }}>Proceeding…</p>
          </div>
        </div>
      )}
    </div>
  );
}
