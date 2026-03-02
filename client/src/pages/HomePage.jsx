import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

export default function HomePage() {
  const { socket, state, dispatch } = useGame();
  const params = new URLSearchParams(window.location.search);
  const urlRoomCode = params.get('room') || '';
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState(urlRoomCode.toUpperCase());
  const [mode, setMode] = useState(urlRoomCode ? 'join' : 'create'); // 'create' | 'join'
  const [pending, setPending] = useState(false);

  // Reset pending if server returns an error
  useEffect(() => {
    if (state.error) setPending(false);
  }, [state.error]);

  function handleCreate(e) {
    e.preventDefault();
    if (!playerName.trim() || pending) return;
    setPending(true);
    dispatch({ type: 'CLEAR_ERROR' });
    socket.emit('create_room', { playerName: playerName.trim() });
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!playerName.trim() || !roomCode.trim() || pending) return;
    setPending(true);
    dispatch({ type: 'CLEAR_ERROR' });
    socket.emit('join_room', { playerName: playerName.trim(), roomCode: roomCode.trim().toUpperCase() });
  }

  return (
    <div className="page" style={{ justifyContent: 'center' }}>
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
    </div>
  );
}
