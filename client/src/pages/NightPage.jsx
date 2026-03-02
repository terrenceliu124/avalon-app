import React from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import { PAGE_BACKGROUNDS } from '../assets';

export default function NightPage() {
  const { socket, state } = useGame();
  const { room, player, nightVision, roomCode } = state;

  const myPlayer = room.players.find(p => p.name === player?.name);
  const isHost = myPlayer?.isHost;

  const sees = nightVision?.sees || [];

  const bgStyle = PAGE_BACKGROUNDS.night
    ? { backgroundImage: `url(${PAGE_BACKGROUNDS.night})` }
    : undefined;

  return (
    <div className="page" style={bgStyle}>
      <div className="card">
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      </div>
      <div className="card">
        <h2>Night Phase</h2>
        <p style={{ marginBottom: 16 }}>Eyes closed. Special roles open yours to look.</p>
        {sees.length === 0 ? (
          <p className="waiting">You see nothing in the dark.</p>
        ) : (
          <>
            <h3>You see:</h3>
            <ul className="sees-list">
              {sees.map((entry, i) => (
                <li key={i}>
                  <span>{entry.name}</span>
                  <span className="sees-label">{entry.label}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {isHost && (
        <div className="card">
          <button
            className="btn btn-primary"
            onClick={() => socket.emit('advance_to_team_proposal', { roomCode })}
          >
            Start Day (Team Proposal)
          </button>
        </div>
      )}
    </div>
  );
}
