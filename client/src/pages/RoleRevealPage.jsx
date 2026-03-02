import React from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';

const ROLE_DESCRIPTIONS = {
  Merlin: 'You know all Evil players except Mordred. Guide Good to victory without revealing yourself.',
  Percival: 'You see two players — one is Merlin, one may be Morgana. Protect the true Merlin.',
  LoyalServant: 'You are a loyal servant of Arthur. Work with your teammates to succeed on quests.',
  Assassin: 'You are Evil. If Good wins 3 missions, you get one chance to assassinate Merlin.',
  Morgana: 'You are Evil. You appear as a possible Merlin to Percival — use this to deceive.',
  Mordred: 'You are Evil. Merlin cannot see you — stay hidden and sabotage quests.',
  Oberon: 'You are Evil but act alone. You cannot see your Evil allies, and they cannot see you.',
  Minion: 'You are a Minion of Mordred. Work secretly with your Evil teammates to fail quests.',
};

export default function RoleRevealPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode } = state;

  const myPlayer = room.players.find(p => p.name === player?.name);
  const isHost = myPlayer?.isHost;

  // Use private role from role_assigned event, not from room.players
  const role = player?.role || '?';
  const team = player?.team || 'unknown';
  const desc = ROLE_DESCRIPTIONS[role] || 'Your role information will appear here.';

  return (
    <div className="page">
      <div className="card">
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      </div>
      <div className="card role-card">
        <span className={`badge badge-${team}`}>{team === 'good' ? 'Good' : 'Evil'}</span>
        <div className="role-name">{role}</div>
        <p className="role-desc">{desc}</p>
      </div>
      {isHost && (
        <div className="card" style={{ maxWidth: 480 }}>
          <button
            className="btn btn-primary"
            onClick={() => socket.emit('advance_to_night', { roomCode })}
          >
            Advance to Night Phase
          </button>
        </div>
      )}
    </div>
  );
}
