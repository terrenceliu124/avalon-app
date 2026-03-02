import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';

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

  return (
    <div className="page">
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
            <ul className="player-list" style={{ marginBottom: 12 }}>
              {candidates.map(p => (
                <li
                  key={p.name}
                  className="check-row"
                  onClick={() => setTarget(p.name)}
                  style={{ cursor: 'pointer' }}
                >
                  <input type="radio" readOnly checked={target === p.name} />
                  <span>{p.name}</span>
                </li>
              ))}
            </ul>
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
