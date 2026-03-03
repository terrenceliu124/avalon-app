import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import { PAGE_BACKGROUND, cardScrollStyle, cardTexturedStyle } from '../assets';

export default function QuestPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode, questProgress, questResult } = state;

  const team = room.proposedTeam || [];
  const isOnTeam = player && team.includes(player.name);
  const hasPlayed = room.questCards && player && room.questCards[player.name] !== undefined;

  const teamSize = room.proposedTeam?.length || 0;
  const cardCount = questProgress?.cardCount ?? Object.keys(room.questCards || {}).length;
  const pct = teamSize > 0 ? Math.round((cardCount / teamSize) * 100) : 0;

  const isEvil = player?.team === 'evil';
  const [pendingCard, setPendingCard] = useState(null);

  function handleCard(card) {
    if (pendingCard !== null) return;
    setPendingCard(card);
    socket.emit('submit_quest_card', { roomCode, card });
  }

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <div className="card" style={cardScrollStyle}>
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
        <div className="progress-bar" style={{ marginTop: 12 }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginTop: 6 }}>
          {cardCount} of {teamSize} cards played
        </p>
      </div>

      <div className="card" style={cardTexturedStyle}>
        <h2>Quest</h2>
        <p style={{ marginBottom: 8 }}>Quest party:</p>
        <ul className="player-list" style={{ marginBottom: 12 }}>
          {team.map(name => (
            <li key={name}>{name}</li>
          ))}
        </ul>

        {isOnTeam ? (
          hasPlayed ? (
            <p className="waiting">Your card is played. Awaiting your companions…</p>
          ) : pendingCard !== null ? (
            <div className="btn-row">
              <button className="btn btn-approve" disabled style={{ opacity: pendingCard === 'success' ? 1 : 0.3, boxShadow: pendingCard === 'success' ? '0 0 0 3px #fff' : 'none' }}>✓ Success</button>
              {isEvil && (
                <button className="btn btn-reject" disabled style={{ opacity: pendingCard === 'fail' ? 1 : 0.3, boxShadow: pendingCard === 'fail' ? '0 0 0 3px #fff' : 'none' }}>✕ Fail</button>
              )}
            </div>
          ) : (
            <>
              <div className="btn-row">
                <button className="btn btn-approve" onClick={() => handleCard('success')}>✓ Success</button>
                {isEvil && (
                  <button className="btn btn-reject" onClick={() => handleCard('fail')}>✕ Fail</button>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 10, textAlign: 'center' }}>
                Your card is final once played
              </p>
            </>
          )
        ) : (
          <p className="waiting">You were not chosen for this quest. The party acts in the shadows…</p>
        )}
      </div>

      {questResult && (
        <div className={`overlay${!questResult.questFailed ? ' overlay--success' : ' overlay--failed'}`}>
          <div className={`overlay-card${!questResult.questFailed ? ' overlay-card--success' : ' overlay-card--failed'}`}>
            <div className="overlay-result-glyph" style={{ color: questResult.questFailed ? '#c0392b' : '#27ae60' }}>
              {questResult.questFailed ? '✕' : '✓'}
            </div>
            <div
              className="overlay-title"
              style={{ color: questResult.questFailed ? '#c0392b' : '#27ae60' }}
            >
              Quest {questResult.questFailed ? 'Failed!' : 'Succeeded!'}
            </div>
            {questResult.fails > 0 && (
              <p style={{ color: '#e05454', margin: '8px 0' }}>
                {questResult.fails} fail card{questResult.fails > 1 ? 's' : ''} revealed
              </p>
            )}
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 8 }}>Proceeding…</p>
          </div>
        </div>
      )}
    </div>
  );
}
