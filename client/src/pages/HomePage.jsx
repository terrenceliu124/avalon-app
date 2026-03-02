import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { PAGE_BACKGROUNDS } from '../assets';

const EMOJIS = ['🦁', '🐯', '🦊', '🐺', '🐻', '🐼', '🦄', '🐲', '🦅', '🦉', '🧙', '🧝', '🧛', '⚔️', '🛡️', '🎭'];

export default function HomePage() {
  const { socket, state, dispatch } = useGame();
  const params = new URLSearchParams(window.location.search);
  const urlRoomCode = params.get('room') || '';
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState('🦁');
  const [roomCode, setRoomCode] = useState(urlRoomCode.toUpperCase());
  const [mode, setMode] = useState(urlRoomCode ? 'join' : 'create'); // 'create' | 'join'
  const [pending, setPending] = useState(false);

  // Pre-fill from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('avalon_player') || 'null');
      if (saved) {
        if (saved.playerName) setPlayerName(saved.playerName);
        if (saved.avatar) setAvatar(saved.avatar);
      }
    } catch {}
  }, []);

  // Reset pending if server returns an error
  useEffect(() => {
    if (state.error) setPending(false);
  }, [state.error]);

  // Show reconnecting screen while attempting rejoin
  if (state.reconnecting) {
    const bgStyle = PAGE_BACKGROUNDS.home
      ? { backgroundImage: `url(${PAGE_BACKGROUNDS.home})` }
      : undefined;
    return (
      <div className="page" style={{ justifyContent: 'center', ...bgStyle }}>
        <div className="card reconnecting-card">
          <p>Reconnecting…</p>
        </div>
      </div>
    );
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!playerName.trim() || pending) return;
    setPending(true);
    dispatch({ type: 'CLEAR_ERROR' });
    socket.emit('create_room', { playerName: playerName.trim(), avatar });
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!playerName.trim() || !roomCode.trim() || pending) return;
    setPending(true);
    dispatch({ type: 'CLEAR_ERROR' });
    socket.emit('join_room', { playerName: playerName.trim(), roomCode: roomCode.trim().toUpperCase(), avatar });
  }

  function toggleDevMode() {
    dispatch({ type: 'SET_DEV_MODE', value: !state.devMode });
  }

  const bgStyle = PAGE_BACKGROUNDS.home
    ? { backgroundImage: `url(${PAGE_BACKGROUNDS.home})` }
    : undefined;

  return (
    <div className="page" style={{ justifyContent: 'center', ...bgStyle }}>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: 4 }}>Avalon</h1>
        <p style={{ textAlign: 'center', marginBottom: 24, color: '#888' }}>The Resistance</p>

        {state.error && <div className="error-msg" role="alert">{state.error}</div>}

        <div className="tab-row">
          <button
            className={`tab-btn${mode === 'create' ? ' active' : ''}`}
            onClick={() => setMode('create')}
          >
            Create Room
          </button>
          <button
            className={`tab-btn${mode === 'join' ? ' active' : ''}`}
            onClick={() => setMode('join')}
          >
            Join Room
          </button>
        </div>

        <form onSubmit={mode === 'create' ? handleCreate : handleJoin}>
          <label>
            Your Name
            <input
              className="input"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              data-testid="player-name-input"
              autoComplete="off"
            />
          </label>

          <label style={{ marginBottom: 4 }}>Choose Avatar</label>
          <div className="emoji-picker">
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                className={`emoji-btn${avatar === e ? ' selected' : ''}`}
                onClick={() => setAvatar(e)}
                aria-label={e}
              >
                {e}
              </button>
            ))}
          </div>

          {mode === 'join' && (
            <label>
              Room Code
              <input
                className="input"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                placeholder="Enter room code"
                data-testid="room-code-input"
                autoComplete="off"
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
              />
            </label>
          )}
          <button className="btn btn-primary" type="submit" style={{ marginTop: 20 }} disabled={pending}>
            {mode === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        </form>
      </div>

      <button
        onClick={toggleDevMode}
        style={{
          marginTop: 24, background: 'transparent', border: 'none',
          color: state.devMode ? '#e2b96f' : '#444', cursor: 'pointer',
          fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 700,
        }}
      >
        {state.devMode ? '◉ DEV MODE ON' : '○ DEV MODE'}
      </button>
    </div>
  );
}
