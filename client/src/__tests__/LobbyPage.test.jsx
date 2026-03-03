import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameContext } from '../context/GameContext';
import LobbyPage from '../pages/LobbyPage';

vi.mock('../socket', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
}));

const mockSocket = { emit: vi.fn() };

function makeRoom(overrides = {}) {
  return {
    code: 'ABCD',
    phase: 'lobby',
    host: 'socket-1',
    players: [
      { id: 'socket-1', name: 'Alice', isHost: true },
      { id: 'socket-2', name: 'Bob', isHost: false },
    ],
    selectedRoles: [],
    missionResults: [],
    rejectionCount: 0,
    currentMission: 1,
    leaderIndex: 0,
    proposedTeam: [],
    votes: {},
    questCards: {},
    ...overrides,
  };
}

function renderLobbyPage(room, player) {
  const state = { room, player, roomCode: room.code, error: null, nightVision: null, devMode: false };
  return render(
    <GameContext.Provider value={{ state, dispatch: vi.fn(), socket: mockSocket }}>
      <LobbyPage />
    </GameContext.Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LobbyPage', () => {
  it('displays the room code', () => {
    const room = makeRoom();
    renderLobbyPage(room, room.players[0]);
    expect(screen.getByTestId('room-code')).toHaveTextContent('ABCD');
  });

  it('renders all players in the list', () => {
    const room = makeRoom();
    renderLobbyPage(room, room.players[0]);
    const list = screen.getByTestId('player-list');
    expect(list).toHaveTextContent('Alice');
    expect(list).toHaveTextContent('Bob');
  });

  it('marks host player with (Host) label', () => {
    const room = makeRoom();
    renderLobbyPage(room, room.players[0]);
    const list = screen.getByTestId('player-list');
    expect(list).toHaveTextContent('Alice');
    expect(list).toHaveTextContent('Host');
  });

  it('shows optional roles and start button for host', () => {
    const room = makeRoom();
    renderLobbyPage(room, room.players[0]);
    expect(screen.getByText('Percival')).toBeInTheDocument();
    expect(screen.getByText('Morgana')).toBeInTheDocument();
    expect(screen.getByTestId('start-game-btn')).toBeInTheDocument();
  });

  it('shows roles read-only and hides start button for non-host', () => {
    const room = makeRoom();
    renderLobbyPage(room, room.players[1]);
    expect(screen.queryByTestId('start-game-btn')).not.toBeInTheDocument();
    // Non-host sees roles in read-only view (no click handler)
    expect(screen.getByText('Percival')).toBeInTheDocument();
    const percivalToggle = screen.getByText('Percival').closest('[role="checkbox"]');
    expect(percivalToggle).toBeNull();
  });

  it('disables start button when fewer than 5 players', () => {
    const room = makeRoom();
    renderLobbyPage(room, room.players[0]);
    expect(screen.getByTestId('start-game-btn')).toBeDisabled();
  });

  it('enables start button with 5+ players', () => {
    const room = makeRoom({
      players: [
        { id: 'socket-1', name: 'Alice', isHost: true },
        { id: 'socket-2', name: 'Bob', isHost: false },
        { id: 'socket-3', name: 'Carol', isHost: false },
        { id: 'socket-4', name: 'Dave', isHost: false },
        { id: 'socket-5', name: 'Eve', isHost: false },
      ],
    });
    renderLobbyPage(room, room.players[0]);
    expect(screen.getByTestId('start-game-btn')).not.toBeDisabled();
  });

  it('emits start_game when Start Game clicked', () => {
    const room = makeRoom({
      players: [
        { id: 'socket-1', name: 'Alice', isHost: true },
        { id: 'socket-2', name: 'Bob', isHost: false },
        { id: 'socket-3', name: 'Carol', isHost: false },
        { id: 'socket-4', name: 'Dave', isHost: false },
        { id: 'socket-5', name: 'Eve', isHost: false },
      ],
    });
    renderLobbyPage(room, room.players[0]);
    fireEvent.click(screen.getByTestId('start-game-btn'));
    expect(mockSocket.emit).toHaveBeenCalledWith('start_game', { roomCode: 'ABCD' });
  });

  it('emits update_roles when role checkbox toggled', () => {
    const room = makeRoom();
    renderLobbyPage(room, room.players[0]);
    fireEvent.click(screen.getByText('Percival'));
    expect(mockSocket.emit).toHaveBeenCalledWith('update_roles', {
      roomCode: 'ABCD',
      selectedRoles: ['Percival'],
    });
  });

  it('removes role from selectedRoles when unchecked', () => {
    const room = makeRoom({ selectedRoles: ['Percival'] });
    renderLobbyPage(room, room.players[0]);
    fireEvent.click(screen.getByText('Percival'));
    expect(mockSocket.emit).toHaveBeenCalledWith('update_roles', {
      roomCode: 'ABCD',
      selectedRoles: [],
    });
  });
});
