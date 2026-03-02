import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import PlayerCard from '../components/PlayerCard';
import { PAGE_BACKGROUND } from '../assets';

const TEAM_SIZES = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

export default function TeamProposalPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode, devMode } = state;

  const leader = room.players[room.leaderIndex];
  const isLeader = leader?.name === player?.name;
  const required = (TEAM_SIZES[room.players.length] || TEAM_SIZES[5])[room.currentMission - 1] || 2;

  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  function togglePlayer(name) {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }

  function handleSubmit() {
    if (selected.length !== required || submitted) return;
    setSubmitted(true);
    socket.emit('propose_team', { roomCode, team: selected });
  }

  const rejectionWarning = room.rejectionCount > 0
    ? `${room.rejectionCount}/5 rejections used`
    : null;

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <div className="card">
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
        <p style={{ fontSize: '0.85rem', color: '#888' }}>
          Mission {room.currentMission} — needs {required} players
          {rejectionWarning && <span style={{ color: '#e05454', marginLeft: 8 }}>{rejectionWarning}</span>}
        </p>
      </div>

      <div className="card">
        <h2>Team Proposal</h2>
        <p style={{ marginBottom: 12 }}>
          Leader: <strong style={{ color: '#e2b96f' }}>{leader?.name}</strong>
        </p>

        {isLeader ? (
          <>
            <h3>Select {required} players:</h3>
            <div className="player-grid">
              {(devMode ? room.players : room.players.filter(p => !p.isBot)).map(p => (
                <PlayerCard
                  key={p.name}
                  player={p}
                  selected={selected.includes(p.name)}
                  onClick={() => togglePlayer(p.name)}
                  disabled={!selected.includes(p.name) && selected.length >= required}
                />
              ))}
            </div>
            <button
              className="btn btn-primary"
              disabled={selected.length !== required || submitted}
              onClick={handleSubmit}
            >
              {submitted ? 'Proposing…' : `Propose Team (${selected.length}/${required})`}
            </button>
          </>
        ) : (
          <>
            <p className="waiting">Waiting for {leader?.name} to propose a team...</p>
            {room.proposedTeam?.length > 0 && (
              <p>Current proposal: <strong>{room.proposedTeam.join(', ')}</strong></p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
