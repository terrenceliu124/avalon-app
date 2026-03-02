import React from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import { PAGE_BACKGROUND } from '../assets';

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

  function handleCard(card) {
    socket.emit('submit_quest_card', { roomCode, card });
  }

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <div className="card">
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      </div>

      <div className="card">
        <h2>Quest</h2>
        <p style={{ marginBottom: 8 }}>Quest team:</p>
        <ul className="player-list" style={{ marginBottom: 12 }}>
          {team.map(name => (
            <li key={name}>{name}</li>
          ))}
        </ul>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 12 }}>
          {cardCount}/{teamSize} cards submitted
        </p>

        {isOnTeam ? (
          hasPlayed ? (
            <p className="waiting">Card submitted. Waiting for teammates...</p>
          ) : (
            <div className="btn-row">
              <button className="btn btn-approve" onClick={() => handleCard('success')}>Success</button>
              {isEvil && (
                <button className="btn btn-reject" onClick={() => handleCard('fail')}>Fail</button>
              )}
            </div>
          )
        ) : (
          <p className="waiting">You are not on this quest. Waiting for the team...</p>
        )}
      </div>

      {questResult && (
        <div className="overlay">
          <div className="overlay-card">
            <div
              className="overlay-title"
              style={{ color: questResult.questFailed ? '#c0392b' : '#27ae60' }}
            >
              Quest {questResult.questFailed ? 'Failed!' : 'Succeeded!'}
            </div>
            {questResult.fails > 0 && (
              <p style={{ color: '#e05454', margin: '8px 0' }}>
                {questResult.fails} Fail card{questResult.fails > 1 ? 's' : ''} played
              </p>
            )}
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 8 }}>Advancing…</p>
          </div>
        </div>
      )}
    </div>
  );
}
