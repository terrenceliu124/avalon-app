import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import PlayerCard from '../components/PlayerCard';
import { PAGE_BACKGROUND, cardScrollStyle, cardTexturedStyle } from '../assets';

export default function AssassinationPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode } = state;

  const isAssassin = player?.role === 'Assassin';
  const assassinName = isAssassin
    ? player.name
    : room.players.find(p => p.role === 'Assassin')?.name;

  const [target, setTarget] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Assassin picks from non-evil players (excluding themselves)
  const candidates = room.players.filter(p => p.name !== player?.name);

  function handleAssassinate() {
    if (!target || submitted) return;
    setSubmitted(true);
    socket.emit('assassinate', { roomCode, targetName: target });
  }

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page page--assassination" style={bgStyle}>
      <div className="card" style={cardTexturedStyle}>
        <h2>Assassination</h2>
        <p style={{ marginBottom: 16 }}>
          Three quests have fallen to the forces of good. The Assassin rises — one final chance to unmask and strike down Merlin.
        </p>

        {isAssassin ? (
          <>
            <h3>Name your target:</h3>
            <div className="player-grid" style={{ marginBottom: 12 }}>
              {candidates.map(p => (
                <PlayerCard
                  key={p.name}
                  player={p}
                  selected={target === p.name}
                  onClick={() => setTarget(p.name)}
                />
              ))}
            </div>
            <button
              className="btn btn-danger"
              disabled={!target || submitted}
              onClick={handleAssassinate}
            >
              {submitted ? 'Striking…' : `Assassinate ${target || '...'}`}
            </button>
          </>
        ) : (
          <p className="waiting">
            The Assassin ({assassinName}) deliberates. All fates hang in the balance…
          </p>
        )}
      </div>
    </div>
  );
}
