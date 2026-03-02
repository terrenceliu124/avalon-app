import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameContext } from '../context/GameContext';
import HomePage from '../pages/HomePage';

vi.mock('../socket', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
}));

const mockSocket = { emit: vi.fn() };
const mockDispatch = vi.fn();

function renderHomePage(stateOverrides = {}) {
  const state = { room: null, player: null, roomCode: null, error: null, nightVision: null, reconnecting: false, devMode: false, ...stateOverrides };
  return render(
    <GameContext.Provider value={{ state, dispatch: mockDispatch, socket: mockSocket }}>
      <HomePage />
    </GameContext.Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HomePage', () => {
  it('renders the Avalon heading', () => {
    renderHomePage();
    expect(screen.getByText('Avalon')).toBeInTheDocument();
  });

  it('renders player name input', () => {
    renderHomePage();
    expect(screen.getByTestId('player-name-input')).toBeInTheDocument();
  });

  it('renders Create Room and Join Room buttons', () => {
    renderHomePage();
    expect(screen.getAllByText('Create Room').length).toBeGreaterThan(0);
    expect(screen.getByText('Join Room')).toBeInTheDocument();
  });

  it('shows room code input after clicking Join Room', () => {
    renderHomePage();
    fireEvent.click(screen.getByText('Join Room'));
    expect(screen.getByTestId('room-code-input')).toBeInTheDocument();
  });

  it('does not show room code input in create mode', () => {
    renderHomePage();
    expect(screen.queryByTestId('room-code-input')).not.toBeInTheDocument();
  });

  it('emits create_room with player name on create submit', () => {
    renderHomePage();
    fireEvent.change(screen.getByTestId('player-name-input'), { target: { value: 'Alice' } });
    fireEvent.submit(screen.getByTestId('player-name-input').closest('form'));
    expect(mockSocket.emit).toHaveBeenCalledWith('create_room', expect.objectContaining({ playerName: 'Alice' }));
  });

  it('does not emit if player name is empty', () => {
    renderHomePage();
    fireEvent.submit(screen.getByTestId('player-name-input').closest('form'));
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('emits join_room with uppercased room code', () => {
    renderHomePage();
    fireEvent.click(screen.getByText('Join Room'));
    fireEvent.change(screen.getByTestId('player-name-input'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByTestId('room-code-input'), { target: { value: 'abcd' } });
    fireEvent.submit(screen.getByTestId('room-code-input').closest('form'));
    expect(mockSocket.emit).toHaveBeenCalledWith('join_room', expect.objectContaining({ playerName: 'Bob', roomCode: 'ABCD' }));
  });

  it('displays error message from state', () => {
    renderHomePage({ error: 'Room not found' });
    expect(screen.getByRole('alert')).toHaveTextContent('Room not found');
  });
});
