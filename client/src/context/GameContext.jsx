import React, { createContext, useContext, useEffect, useReducer } from 'react';
import socket from '../socket';

function safeLSGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSsGet(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function hasSavedSession() {
  try {
    const saved = JSON.parse(safeSsGet('avalon_player') || 'null');
    return !!(saved && saved.playerName && saved.roomCode);
  } catch { return false; }
}

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
  devMode: safeLSGet('avalon_dev_mode') === 'true',
  devWinner: null,
  devAuthed: false,
  reconnecting: hasSavedSession(),
  allRooms: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'ROOM_JOINED':
      return { ...state, room: action.room, player: action.player, roomCode: action.code, error: null, reconnecting: false };
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
      return { ...state, voteProgress: { voteCount: action.voteCount, totalPlayers: action.totalPlayers, notVoted: action.notVoted } };
    case 'QUEST_UPDATE':
      return { ...state, questProgress: { cardCount: action.cardCount, teamSize: action.teamSize, notPlayed: action.notPlayed } };
    case 'VOTE_RESULT':
      return { ...state, voteResult: { votes: action.votes, approved: action.approved, room: action.room } };
    case 'QUEST_RESULT':
      return { ...state, questResult: { fails: action.fails, questFailed: action.questFailed } };
    case 'SET_RECONNECTING':
      return { ...state, reconnecting: action.value };
    case 'SET_DEV_MODE':
      localStorage.setItem('avalon_dev_mode', action.value ? 'true' : 'false');
      return { ...state, devMode: action.value };
    case 'SET_DEV_WINNER':
      return { ...state, devWinner: action.value };
    case 'SET_DEV_AUTHED':
      return { ...state, devAuthed: action.value };
    case 'SET_ALL_ROOMS':
      return { ...state, allRooms: action.rooms };
    case 'RESET':
      sessionStorage.removeItem('avalon_player');
      return { ...initialState, devMode: state.devMode, devAuthed: state.devAuthed, reconnecting: false };
    default:
      return state;
  }
}

export const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    function handleConnect() {
      console.log('[socket] connected, id=', socket.id);
      const saved = sessionStorage.getItem('avalon_player');
      if (saved) {
        try {
          const { playerName, roomCode } = JSON.parse(saved);
          if (playerName && roomCode) {
            console.log(`[rejoin] attempting rejoin: player="${playerName}" room="${roomCode}"`);
            dispatch({ type: 'SET_RECONNECTING', value: true });
            socket.emit('rejoin_room', { roomCode, playerName });
          }
        } catch {
          console.log('[rejoin] bad session data, clearing');
          sessionStorage.removeItem('avalon_player');
          dispatch({ type: 'SET_RECONNECTING', value: false });
        }
      } else {
        console.log('[socket] connected, no saved session');
      }
    }

    socket.connect();

    socket.on('connect', handleConnect);
    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
    });
    socket.on('connect_error', (err) => {
      console.log('[socket] connect_error:', err.message);
    });
    socket.on('reconnect_attempt', (n) => {
      console.log('[socket] reconnect_attempt #', n);
    });
    socket.on('reconnect', (n) => {
      console.log('[socket] reconnected after', n, 'attempt(s)');
    });

    socket.on('room_created', ({ code, player, room }) => {
      sessionStorage.setItem('avalon_player', JSON.stringify({ playerName: player.name, roomCode: code, avatar: player.avatar }));
      dispatch({ type: 'ROOM_JOINED', code, player, room });
    });

    socket.on('room_joined', ({ code, player, room }) => {
      sessionStorage.setItem('avalon_player', JSON.stringify({ playerName: player.name, roomCode: code, avatar: player.avatar }));
      dispatch({ type: 'ROOM_JOINED', code, player, room });
    });

    socket.on('rejoined', ({ room, player }) => {
      console.log(`[rejoin] SUCCESS: back in room ${room.code} as "${player.name}" (phase: ${room.phase})`);
      sessionStorage.setItem('avalon_player', JSON.stringify({ playerName: player.name, roomCode: room.code, avatar: player.avatar }));
      dispatch({ type: 'ROOM_JOINED', code: room.code, player, room });
    });

    socket.on('rejoin_failed', ({ reason } = {}) => {
      console.log('[rejoin] FAILED:', reason);
      sessionStorage.removeItem('avalon_player');
      dispatch({ type: 'SET_RECONNECTING', value: false });
    });

    socket.on('room_updated', ({ room }) => {
      dispatch({ type: 'ROOM_UPDATED', room });
    });

    socket.on('role_assigned', ({ player, nightVision }) => {
      dispatch({ type: 'ROLE_ASSIGNED', player, nightVision });
    });

    socket.on('vote_update', ({ voteCount, totalPlayers, notVoted }) => {
      dispatch({ type: 'VOTE_UPDATE', voteCount, totalPlayers, notVoted });
    });

    socket.on('quest_update', ({ cardCount, teamSize, notPlayed }) => {
      dispatch({ type: 'QUEST_UPDATE', cardCount, teamSize, notPlayed });
    });

    socket.on('vote_result', ({ votes, approved, room }) => {
      dispatch({ type: 'VOTE_RESULT', votes, approved, room });
    });

    socket.on('quest_result', ({ fails, questFailed }) => {
      dispatch({ type: 'QUEST_RESULT', fails, questFailed });
    });

    socket.on('all_rooms', ({ rooms }) => {
      dispatch({ type: 'SET_ALL_ROOMS', rooms });
    });

    socket.on('dev_auth_result', ({ success }) => {
      dispatch({ type: 'SET_DEV_AUTHED', value: success });
    });

    socket.on('error', ({ message }) => {
      dispatch({ type: 'SET_ERROR', message });
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnect_attempt');
      socket.off('reconnect');
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
      socket.off('all_rooms');
      socket.off('dev_auth_result');
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
