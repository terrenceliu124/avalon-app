import React from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import { PAGE_BACKGROUND, cardScrollStyle, cardTexturedStyle } from '../assets';
import PlayerAvatar from '../components/PlayerAvatar';

export default function GameOverPage() {
  const { dispatch, state } = useGame();
  const { room, devMode, devWinner } = state;

  const isGoodWin = devMode && devWinner !== null ? devWinner === 'good' : room.winner === 'good';

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <div className={`card ${isGoodWin ? 'game-over-glow-good' : 'game-over-glow-evil'}`} style={{ textAlign: 'center', ...cardTexturedStyle }}>
        <h1 className={`${isGoodWin ? 'winner-good' : 'winner-evil'} winner-reveal`}>
          {isGoodWin ? 'The Light Prevails!' : 'Darkness Triumphs!'}
        </h1>
        <img
          src={isGoodWin ? '/assets/backgrounds/goodWin.png' : '/assets/backgrounds/evilWin.png'}
          alt={isGoodWin ? 'Good wins' : 'Evil wins'}
          style={{ width: '100%', borderRadius: 8, marginTop: 12 }}
        />
        {room.gameOverReason && (
          <p style={{ marginTop: 8 }}>{room.gameOverReason}</p>
        )}
        {room.assassinationTarget && (
          <p style={{ marginTop: 8, color: '#888' }}>
            The Assassin struck: <strong>{room.assassinationTarget}</strong>
          </p>
        )}
      </div>

      <div className="card" style={cardTexturedStyle}>
        <h3>The Unmasking</h3>
        <ul className="player-list">
          {(room.revealedPlayers || room.players).map(p => (
            <li key={p.name}>
              <PlayerAvatar name={p.name} emoji={p.avatar} />
              <span>{p.name}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className={`badge badge-${p.team || 'good'}`}>{p.role || '?'}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={cardTexturedStyle}>
        <button
          className="btn btn-ghost"
          onClick={() => {
            window.history.replaceState({}, '', window.location.pathname);
            dispatch({ type: 'RESET' });
          }}
        >
          New Game
        </button>
      </div>
    </div>
  );
}
