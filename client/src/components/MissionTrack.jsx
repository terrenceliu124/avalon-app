import React from 'react';

const TEAM_SIZES = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

const FINGER_IMAGES = {
  2: '/assets/backgrounds/FINGERS_2.png',
  3: '/assets/backgrounds/FINGERS_3.png',
  4: '/assets/backgrounds/FINGERS_4.png',
  5: '/assets/backgrounds/FINGERS_5.png',
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
        else cls += ' future';
        return (
          <div key={i} className={cls} title={`Mission ${missionNum}: ${size} players`}>
            <img src={FINGER_IMAGES[size]} alt={`${size} players`} className="mission-finger-img" />
            {result === 'success' && <div className="mission-overlay mission-overlay-success" style={{ maskImage: `url(${FINGER_IMAGES[size]})`, WebkitMaskImage: `url(${FINGER_IMAGES[size]})` }} />}
            {result === 'fail'    && <div className="mission-overlay mission-overlay-fail"    style={{ maskImage: `url(${FINGER_IMAGES[size]})`, WebkitMaskImage: `url(${FINGER_IMAGES[size]})` }} />}
          </div>
        );
      })}
    </div>
  );
}
