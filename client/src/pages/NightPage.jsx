import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import MissionTrack from '../components/MissionTrack';
import { PAGE_BACKGROUND, NIGHT_CEREMONY_CONFIG } from '../assets';

const { STEP_REPEAT_COUNT, STEP_INTERVAL_MS, FALLBACK_STEP_DURATION_MS } = NIGHT_CEREMONY_CONFIG;

function buildCeremonySteps(selectedRoles) {
  const hasOberon = selectedRoles.includes('Oberon');
  const hasPercival = selectedRoles.includes('Percival');
  const hasMorgana = selectedRoles.includes('Morgana');
  const hasMordred = selectedRoles.includes('Mordred');

  const openKey = hasOberon ? 'excl-oberon' : 'std';
  const thumbsKey =
    hasMordred && hasOberon ? 'excl-mordred-oberon' :
    hasMordred              ? 'excl-mordred' :
    hasOberon               ? 'excl-oberon' :
                              'std';
  const percivalKey = hasMorgana ? 'with-morgana' : 'no-morgana';

  const steps = [
    {
      text: 'Ask everyone to close their eyes and put out their fists.',
      audioSrc: '/assets/audio/night/01-close-eyes.mp3',
    },
    {
      text: hasOberon
        ? 'Ask Minions of Mordred (excluding Oberon) to open their eyes and look around to know their allies.'
        : 'Ask Minions of Mordred to open their eyes and look around to know their allies.',
      audioSrc: `/assets/audio/night/02-minions-open-${openKey}.mp3`,
    },
    {
      text: 'Ask Minions of Mordred to close their eyes.',
      audioSrc: '/assets/audio/night/02b-minions-close.mp3',
    },
    {
      text: hasMordred && hasOberon
        ? 'Ask Minions of Mordred (excluding Mordred and Oberon) to raise their thumbs so Merlin can see them.'
        : hasMordred
        ? 'Ask Minions of Mordred (excluding Mordred) to raise their thumbs so Merlin can see them.'
        : hasOberon
        ? 'Ask Minions of Mordred (excluding Oberon) to raise their thumbs so Merlin can see them.'
        : 'Ask Minions of Mordred to raise their thumbs so Merlin can see them.',
      audioSrc: `/assets/audio/night/03-minions-thumbs-${thumbsKey}.mp3`,
    },
    {
      text: 'Ask Merlin to open their eyes. The raised thumbs are Evil.',
      audioSrc: '/assets/audio/night/04-merlin-open.mp3',
    },
    {
      text: 'Ask Merlin to close their eyes. Ask Minions to lower their thumbs.',
      audioSrc: '/assets/audio/night/05-merlin-close.mp3',
    },
  ];

  if (hasPercival) {
    const who = hasMorgana ? 'Merlin and Morgana' : 'Merlin';
    steps.push(
      {
        text: `Ask ${who} to raise their thumbs.`,
        audioSrc: `/assets/audio/night/06-percival-thumbs-${percivalKey}.mp3`,
      },
      {
        text: 'Ask Percival to open their eyes. Find Merlin among the raised thumbs.',
        audioSrc: '/assets/audio/night/07-percival-open.mp3',
      },
      {
        text: `Ask Percival to close their eyes. Ask ${who} to lower their thumbs.`,
        audioSrc: `/assets/audio/night/08-percival-close-${percivalKey}.mp3`,
      },
    );
  }

  steps.push({
    text: 'Ask everyone to open their eyes. The night phase is over!',
    audioSrc: '/assets/audio/night/09-wake-up.mp3',
  });

  return steps;
}

export default function NightPage() {
  const { socket, state } = useGame();
  const { room, player, roomCode } = state;

  const myPlayer = room.players.find(p => p.name === player?.name);
  const isHost = myPlayer?.isHost;

  const bgStyle = PAGE_BACKGROUND ? { backgroundImage: `url(${PAGE_BACKGROUND})` } : undefined;

  // Non-host: simple waiting screen
  if (!isHost) {
    return (
      <div className="page" style={bgStyle}>
        <div className="card">
          <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
        </div>
        <div className="card">
          <h2>Night Phase</h2>
          <p className="waiting">Eyes closed. The host is running the night ceremony.</p>
        </div>
      </div>
    );
  }

  // Host view
  return <HostNightView socket={socket} room={room} roomCode={roomCode} bgStyle={bgStyle} />;
}

function HostNightView({ socket, room, roomCode, bgStyle }) {
  const steps = buildCeremonySteps(room.selectedRoles || []);
  const total = steps.length;

  const [playState, setPlayState] = useState('idle'); // 'idle' | 'playing' | 'done'
  const [stepIndex, setStepIndex] = useState(0);
  const seqRef = useRef({ timeout: null, cancelled: false });
  const audioRef = useRef(null);

  function stopSequencer() {
    seqRef.current.cancelled = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    if (seqRef.current.timeout) { clearTimeout(seqRef.current.timeout); seqRef.current.timeout = null; }
  }

  function startSequencer() {
    stopSequencer();
    // Create the Audio element here — directly inside the user gesture handler — so iOS
    // Safari grants autoplay permission for all subsequent .play() calls on this element.
    audioRef.current = new Audio();
    seqRef.current = { timeout: null, cancelled: false };
    setPlayState('playing');
    setStepIndex(0);

    function advance(idx) {
      if (seqRef.current.cancelled) return;
      if (idx >= steps.length) { setPlayState('done'); return; }

      setStepIndex(idx);
      const step = steps[idx];

      const playRepeat = (r) => {
        if (seqRef.current.cancelled) return;
        const audio = audioRef.current;

        // Guard: call onDone at most once per playRepeat invocation (prevents double-advance
        // when both onerror and play().catch() fire for a missing file).
        let handled = false;
        const onDone = () => {
          if (seqRef.current.cancelled || handled) return;
          handled = true;
          if (r < STEP_REPEAT_COUNT - 1) {
            seqRef.current.timeout = setTimeout(() => playRepeat(r + 1), 500);
          } else {
            seqRef.current.timeout = setTimeout(() => advance(idx + 1), STEP_INTERVAL_MS);
          }
        };

        audio.onended = onDone;
        audio.onerror = () => {
          seqRef.current.timeout = setTimeout(onDone, FALLBACK_STEP_DURATION_MS);
        };
        // Reuse the single Audio element by swapping src — keeps iOS autoplay unlock intact.
        audio.src = step.audioSrc;
        audio.play().catch(() => {
          seqRef.current.timeout = setTimeout(onDone, FALLBACK_STEP_DURATION_MS);
        });
      };

      playRepeat(0);
    }

    advance(0);
  }

  useEffect(() => () => stopSequencer(), []);

  const progressPct = playState !== 'idle' ? ((stepIndex + 1) / total) * 100 : 0;

  return (
    <div className="page" style={bgStyle}>
      <div className="card">
        <MissionTrack results={room.missionResults} current={room.currentMission} playerCount={room.players.length} />
      </div>

      <div className="card">
        <h2>Night Ceremony</h2>

        {playState !== 'idle' && (
          <>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 8 }}>
              Step {stepIndex + 1} of {total}
            </p>
            <div className="progress-bar" style={{ marginBottom: 16 }}>
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </>
        )}

        {playState === 'idle' && (
          <p style={{ color: '#b0b0c0', marginBottom: 16, fontSize: '0.95rem' }}>
            {steps[0].text}
          </p>
        )}

        {playState === 'playing' && (
          <p style={{ fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 16 }}>
            {steps[stepIndex].text}
          </p>
        )}

        {playState === 'done' && (
          <p style={{ color: '#7ec87e', fontSize: '1rem', marginBottom: 16 }}>
            Ceremony complete.
          </p>
        )}

        <div className="btn-row">
          {playState === 'idle' && (
            <button className="btn btn-primary" onClick={startSequencer}>
              Start Ceremony
            </button>
          )}
          {playState === 'playing' && (
            <button className="btn btn-ghost" onClick={() => { stopSequencer(); setPlayState('idle'); }}>
              Stop
            </button>
          )}
          {playState === 'done' && (
            <button className="btn btn-ghost" onClick={startSequencer}>
              Restart
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <button
          className="btn btn-primary"
          onClick={() => socket.emit('advance_to_team_proposal', { roomCode })}
        >
          Start Day (Team Proposal)
        </button>
      </div>
    </div>
  );
}
