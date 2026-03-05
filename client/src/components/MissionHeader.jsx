import React from 'react';
import MissionTrack from './MissionTrack';
import { cardScrollStyle } from '../assets';
import { getRequiredPlayers } from '../gameUtils';

export default function MissionHeader({ room }) {
  const required = getRequiredPlayers(room.players.length, room.currentMission);
  const twoFailCards = room.players.length >= 7 && room.currentMission === 4;

  return (
    <div className="card" style={{ ...cardScrollStyle, alignItems: 'center', textAlign: 'center' }}>
      <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      <p style={{ fontSize: '0.85rem', color: '#3a2a0a' }}>
        Needs {required} players{twoFailCards && '. 2 fail cards.'}
      </p>
    </div>
  );
}
