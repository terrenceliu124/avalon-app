import React from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';

export default function GameOverPage() {
  const { dispatch, state } = useGame();
  const { room } = state;

  const isGoodWin = room.winner === 'good';

  return (
    <div className="page">
      <div className="card">
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <h1 className={isGoodWin ? 'winner-good' : 'winner-evil'}>
          {isGoodWin ? 'Good Wins!' : 'Evil Wins!'}
        </h1>
        {room.gameOverReason && (
          <p style={{ marginTop: 8 }}>{room.gameOverReason}</p>
        )}
        {room.assassinationTarget && (
          <p style={{ marginTop: 8, color: '#888' }}>
            Assassin targeted: <strong>{room.assassinationTarget}</strong>
          </p>
        )}
      </div>

      <div className="card">
        <h3>Role Reveal</h3>
        <ul className="player-list">
          {(room.revealedPlayers || room.players).map(p => (
            <li key={p.name}>
              <span>{p.name}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className={`badge badge-${p.team || 'good'}`}>{p.role || '?'}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <button
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'RESET' })}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
