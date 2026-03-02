import React, { createContext, useContext, useEffect, useReducer } from 'react';
import socket from '../socket';

const initialState = {
  room: null,
  player: null,
  roomCode: null,
  nightVision: null,
  error: null,
  voteProgress: null,
  questProgress: null,
  voteResult: null,
  questResult: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'ROOM_JOINED':
      return { ...state, room: action.room, player: action.player, roomCode: action.code, error: null };
    case 'ROOM_UPDATED':
      return {
        ...state,
        room: action.room,
        // Clear transient fields when phase advances
        voteResult: null,
        questResult: null,
        voteProgress: null,
        questProgress: null,
      };
    case 'ROLE_ASSIGNED':
      return { ...state, player: action.player, nightVision: action.nightVision };
    case 'SET_ERROR':
      return { ...state, error: action.message };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'VOTE_UPDATE':
      return { ...state, voteProgress: { voteCount: action.voteCount, totalPlayers: action.totalPlayers } };
    case 'QUEST_UPDATE':
      return { ...state, questProgress: { cardCount: action.cardCount, teamSize: action.teamSize } };
    case 'VOTE_RESULT':
      return { ...state, voteResult: { votes: action.votes, approved: action.approved, room: action.room } };
    case 'QUEST_RESULT':
      return { ...state, questResult: { fails: action.fails, questFailed: action.questFailed } };
    case 'RESET':
      localStorage.removeItem('avalon_player');
      return initialState;
    default:
      return state;
  }
}

export const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    function handleConnect() {
      const saved = localStorage.getItem('avalon_player');
      if (saved) {
        try {
          const { playerName, roomCode } = JSON.parse(saved);
          if (playerName && roomCode) {
            socket.emit('rejoin_room', { roomCode, playerName });
          }
        } catch {
          localStorage.removeItem('avalon_player');
        }
      }
    }

    socket.connect();

    socket.on('connect', handleConnect);

    socket.on('room_created', ({ code, player, room }) => {
      localStorage.setItem('avalon_player', JSON.stringify({ playerName: player.name, roomCode: code }));
      dispatch({ type: 'ROOM_JOINED', code, player, room });
    });

    socket.on('room_joined', ({ code, player, room }) => {
      localStorage.setItem('avalon_player', JSON.stringify({ playerName: player.name, roomCode: code }));
      dispatch({ type: 'ROOM_JOINED', code, player, room });
    });

    socket.on('rejoined', ({ room, player }) => {
      localStorage.setItem('avalon_player', JSON.stringify({ playerName: player.name, roomCode: room.code }));
      dispatch({ type: 'ROOM_JOINED', code: room.code, player, room });
    });

    socket.on('rejoin_failed', () => {
      localStorage.removeItem('avalon_player');
    });

    socket.on('room_updated', ({ room }) => {
      dispatch({ type: 'ROOM_UPDATED', room });
    });

    socket.on('role_assigned', ({ player, nightVision }) => {
      dispatch({ type: 'ROLE_ASSIGNED', player, nightVision });
    });

    socket.on('vote_update', ({ voteCount, totalPlayers }) => {
      dispatch({ type: 'VOTE_UPDATE', voteCount, totalPlayers });
    });

    socket.on('quest_update', ({ cardCount, teamSize }) => {
      dispatch({ type: 'QUEST_UPDATE', cardCount, teamSize });
    });

    socket.on('vote_result', ({ votes, approved, room }) => {
      dispatch({ type: 'VOTE_RESULT', votes, approved, room });
    });

    socket.on('quest_result', ({ fails, questFailed }) => {
      dispatch({ type: 'QUEST_RESULT', fails, questFailed });
    });

    socket.on('error', ({ message }) => {
      dispatch({ type: 'SET_ERROR', message });
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('rejoined');
      socket.off('rejoin_failed');
      socket.off('room_updated');
      socket.off('role_assigned');
      socket.off('vote_update');
      socket.off('quest_update');
      socket.off('vote_result');
      socket.off('quest_result');
      socket.off('error');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (state.roomCode) {
        url.searchParams.set('room', state.roomCode);
      } else {
        url.searchParams.delete('room');
      }
      window.history.replaceState(null, '', url.toString());
    } catch {
      // jsdom (tests) may throw on about:blank — silently ignore
    }
  }, [state.roomCode]);

  return (
    <GameContext.Provider value={{ state, dispatch, socket }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
