import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import { PAGE_BACKGROUND, getRoleCard, ROLE_CARDS, cardScrollStyle, cardTexturedStyle } from '../assets';

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
  const [revealed, setRevealed] = useState(false);

  const myPlayer = room.players.find(p => p.name === player?.name);
  const isHost = myPlayer?.isHost;

  // Use private role from role_assigned event, not from room.players
  const role = player?.role || '?';
  const team = player?.team || 'unknown';
  const desc = ROLE_DESCRIPTIONS[role] || 'Your role information will appear here.';

  const cardImg = getRoleCard(role, player?.name);
  const backImg = ROLE_CARDS.back;

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <div className="card" style={cardTexturedStyle}>
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      </div>
      <div className="card role-card" style={cardTexturedStyle}>
        {revealed && <span className={`badge badge-${team}`}>{team === 'good' ? 'Good' : 'Evil'}</span>}

        {cardImg ? (
          <div className="flip-card-wrap" onClick={() => setRevealed(true)}>
            <div className={`flip-card-inner${revealed ? ' revealed' : ''}`}>
              <div className="flip-card-face flip-card-face--back">
                {backImg
                  ? <img src={backImg} alt="card back" />
                  : <div className="flip-card-back-design" />}
              </div>
              <div className="flip-card-face flip-card-face--front">
                <img src={cardImg} alt={role} />
              </div>
            </div>
            {!revealed && <p className="flip-card-tap-hint">Tap to reveal</p>}
          </div>
        ) : (
          revealed
            ? <div className="role-name">{role}</div>
            : <div className="flip-card-tap-hint" style={{ cursor: 'pointer', marginTop: 32 }} onClick={() => setRevealed(true)}>Tap to reveal</div>
        )}

        {revealed && <p className="role-desc">{desc}</p>}
      </div>
      {isHost && (
        <div className="card" style={{ maxWidth: 480, ...cardTexturedStyle }}>
          <button
            className="btn btn-primary"
            onClick={() => socket.emit('advance_to_night', { roomCode })}
          >
            Begin the Night
          </button>
        </div>
      )}
    </div>
  );
}
