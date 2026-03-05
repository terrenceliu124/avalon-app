import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import PlayerCard from '../components/PlayerCard';
import MissionHeader from '../components/MissionHeader';
import { PAGE_BACKGROUND, cardTexturedStyle } from '../assets';
import { getRequiredPlayers } from '../gameUtils';

export default function TeamProposalPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode } = state;

  const leader = room.players[room.leaderIndex];
  const isLeader = leader?.name === player?.name;
  const required = getRequiredPlayers(room.players.length, room.currentMission);

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

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <MissionHeader room={room} />

      <div className="card" style={cardTexturedStyle}>
        <h2>Quest Proposal</h2>
        <p style={{ marginBottom: 12 }}>
          Leader: <strong style={{ color: '#e2b96f' }}>{leader?.name}</strong>
        </p>

        {isLeader ? (
          <>
            <h3>Choose {required} for the quest:</h3>
            <div className="player-grid">
              {room.players.map(p => (
                <PlayerCard
                  key={p.name}
                  player={p}
                  selected={selected.includes(p.name)}
                  onClick={() => togglePlayer(p.name)}
                  disabled={!selected.includes(p.name) && selected.length >= required}
                  hideAvatar
                />
              ))}
            </div>
            <button
              className="btn btn-primary"
              disabled={selected.length !== required || submitted}
              onClick={handleSubmit}
            >
              {submitted ? 'Sending…' : `Send Proposal (${selected.length}/${required})`}
            </button>
          </>
        ) : (
          <>
            <p className="waiting">Awaiting {leader?.name}'s proposal…</p>
            {room.proposedTeam?.length > 0 && (
              <p>Proposed party: <strong>{room.proposedTeam.join(', ')}</strong></p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
