import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import MissionHeader from '../components/MissionHeader';
import TokenButton from '../components/TokenButton';
import { PAGE_BACKGROUND, cardTexturedStyle } from '../assets';
import { getRequiredPlayers } from '../gameUtils';

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
      <MissionHeader room={room} />

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
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 4 }}>
          {voteCount} of {totalPlayers} have voted
        </p>
        {room.players.length >= 7 && room.currentMission === 4 && (
          <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: 12 }}>2 fail cards required to fail this quest</p>
        )}

        {hasVoted ? (
          <p className="waiting">Your vote is cast. Awaiting the others…</p>
        ) : (
          <>
            <div className="btn-row" style={{ justifyContent: 'center', gap: 24 }}>
              <TokenButton
                src="/assets/backgrounds/vote_Approve.png"
                alt="Approve"
                onClick={pendingVote === null ? () => handleVote(true) : undefined}
                selected={pendingVote === true}
                isPending={pendingVote !== null}
              />
              <TokenButton
                src="/assets/backgrounds/vote_Reject.png"
                alt="Reject"
                onClick={pendingVote === null ? () => handleVote(false) : undefined}
                selected={pendingVote === false}
                isPending={pendingVote !== null}
              />
            </div>
            {pendingVote === null && (
              <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 10, textAlign: 'center' }}>
                Your vote is final once cast
              </p>
            )}
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
