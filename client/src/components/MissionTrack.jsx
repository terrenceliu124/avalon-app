import React from 'react';

const TEAM_SIZES = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

export default function MissionTrack({ results = [], current = 1, playerCount = 5 }) {
  const sizes = TEAM_SIZES[playerCount] || TEAM_SIZES[5];
  return (
    <div className="mission-track" style={{ alignSelf: 'center' }}>
      {sizes.map((size, i) => {
        const missionNum = i + 1;
        const result = results[i];
        let cls = 'mission-dot';
        if (result === 'success') cls += ' success';
        else if (result === 'fail') cls += ' fail';
        else if (missionNum === current) cls += ' current';
        return (
          <div key={i} className={cls} title={`Mission ${missionNum}: ${size} players`}>
            {size}
          </div>
        );
      })}
    </div>
  );
}
