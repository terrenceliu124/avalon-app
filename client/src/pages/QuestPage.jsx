import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import MissionHeader from '../components/MissionHeader';
import TokenButton from '../components/TokenButton';
import { PAGE_BACKGROUND, cardTexturedStyle } from '../assets';

export default function QuestPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode, questProgress, questResult } = state;

  const team = room.proposedTeam || [];
  const isOnTeam = player && team.includes(player.name);
  const hasPlayed = room.questCards && player && room.questCards[player.name] !== undefined;

  const teamSize = room.proposedTeam?.length || 0;
  const cardCount = questProgress?.cardCount ?? Object.keys(room.questCards || {}).length;
  const pct = teamSize > 0 ? Math.round((cardCount / teamSize) * 100) : 0;

  const notPlayed = questProgress?.notPlayed
    ?? team
        .filter(name => !room.questCards || room.questCards[name] === undefined)
        .map(name => {
          const p = room.players.find(pl => pl.name === name);
          return { name, connected: p ? p.connected !== false : true };
        });

  const isEvil = player?.team === 'evil';
  const [pendingCard, setPendingCard] = useState(null);

  function handleCard(card) {
    if (pendingCard !== null) return;
    setPendingCard(card);
    socket.emit('submit_quest_card', { roomCode, card });
  }

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  return (
    <div className="page" style={bgStyle}>
      <MissionHeader room={room} />

      <div className="card" style={cardTexturedStyle}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 4, textAlign: 'center' }}>
          {cardCount} of {teamSize} cards played
        </p>
        {notPlayed.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: 4, textAlign: 'center' }}>
            Waiting for:{' '}
            {notPlayed.map((p, i) => (
              <span key={p.name}>
                {i > 0 && ', '}
                <span style={{ color: p.connected ? '#c8d8e8' : '#d04848', fontWeight: p.connected ? 'normal' : '600' }}>
                  {p.name}{!p.connected && ' (offline)'}
                </span>
              </span>
            ))}
          </p>
        )}
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 12, textAlign: 'center' }}>
          {room.players.length >= 7 && room.currentMission === 4 ? '2 fail cards required to fail this quest' : '1 fail card required to fail this quest'}
        </p>
        <h2>Quest</h2>
        <p style={{ marginBottom: 8 }}>Quest party:</p>
        <ul className="player-list" style={{ marginBottom: 12 }}>
          {team.map(name => (
            <li key={name}>{name}</li>
          ))}
        </ul>

        {isOnTeam ? (
          hasPlayed ? (
            <p className="waiting">Your card is played. Awaiting your companions…</p>
          ) : (
            <>
              <div className="btn-row" style={{ justifyContent: 'center', gap: 24 }}>
                <TokenButton
                  src="/assets/backgrounds/success.png"
                  alt="Success"
                  onClick={pendingCard === null ? () => handleCard('success') : undefined}
                  selected={pendingCard === 'success'}
                  isPending={pendingCard !== null}
                />
                {isEvil && (
                  <TokenButton
                    src="/assets/backgrounds/fail.png"
                    alt="Fail"
                    onClick={pendingCard === null ? () => handleCard('fail') : undefined}
                    selected={pendingCard === 'fail'}
                    isPending={pendingCard !== null}
                  />
                )}
              </div>
              {pendingCard === null && (
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 10, textAlign: 'center' }}>
                  Your card is final once played
                </p>
              )}
            </>
          )
        ) : (
          <p className="waiting">You were not chosen for this quest. The party acts in the shadows…</p>
        )}
      </div>

      {questResult && (
        <div className="overlay">
          <div className={`overlay-card${!questResult.questFailed ? ' overlay-card--success' : ' overlay-card--failed'}`}>
            <div className="overlay-result-glyph" style={{ color: questResult.questFailed ? '#d04848' : '#4a8ecf' }}>
              {questResult.questFailed ? '✕' : '✓'}
            </div>
            <div
              className="overlay-title"
              style={{ color: questResult.questFailed ? '#d04848' : '#4a8ecf' }}
            >
              Quest {questResult.questFailed ? 'Failed!' : 'Succeeded!'}
            </div>
            {questResult.fails > 0 && (
              <p style={{ color: '#d04848', margin: '8px 0' }}>
                {questResult.fails} fail card{questResult.fails > 1 ? 's' : ''} revealed
              </p>
            )}
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 8 }}>Proceeding…</p>
          </div>
        </div>
      )}
    </div>
  );
}
