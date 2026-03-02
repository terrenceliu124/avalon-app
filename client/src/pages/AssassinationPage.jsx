import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import PlayerCard from '../components/PlayerCard';
import { PAGE_BACKGROUND } from '../assets';

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
  const candidates = room.players.filter(p => !p.isBot && p.name !== player?.name);

  function handleAssassinate() {
    if (!target || submitted) return;
    setSubmitted(true);
    socket.emit('assassinate', { roomCode, targetName: target });
  }

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <div className="card">
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      </div>

      <div className="card">
        <h2>Assassination</h2>
        <p style={{ marginBottom: 16 }}>
          Good has won 3 missions. The Assassin now gets one chance to kill Merlin.
        </p>

        {isAssassin ? (
          <>
            <h3>Choose your target:</h3>
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
              {submitted ? 'Assassinating…' : `Assassinate ${target || '...'}`}
            </button>
          </>
        ) : (
          <p className="waiting">
            Waiting for the Assassin ({assassinName}) to choose a target...
          </p>
        )}
      </div>
    </div>
  );
}
