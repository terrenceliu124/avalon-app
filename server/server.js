const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createRoom, joinRoom, getRoom, leaveRoom, makeBot, getRooms, findPlayerRoom } = require('./gameManager');
const { assignRoles, computeNightVision, getTeamSize, requiresTwoFails, checkWin, advanceLeader } = require('./gameLogic');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// Advance leader, skipping bots
function advanceToHumanLeader(room) {
  for (let i = 0; i < room.players.length; i++) {
    advanceLeader(room);
    if (!room.players[room.leaderIndex].isBot) break;
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // --- Room lifecycle ---

  socket.on('create_room', ({ playerName, avatar }) => {
    if (!playerName || !playerName.trim()) {
      return socket.emit('error', { message: 'Player name is required' });
    }
    const { code, player } = createRoom(playerName.trim(), socket.id, avatar || null);
    socket.join(code);
    socket.emit('room_created', { code, player, room: getRoom(code) });
  });

  socket.on('join_room', ({ roomCode, playerName, avatar }) => {
    if (!playerName || !playerName.trim()) {
      return socket.emit('error', { message: 'Player name is required' });
    }
    const code = (roomCode || '').toUpperCase().trim();
    const room = getRoom(code);

    // If game is in progress, only allow re-entry for existing players
    if (room && room.phase !== 'lobby') {
      const trimmedName = playerName.trim();
      const existingPlayer = room.players.find(p => p.name === trimmedName);
      if (!existingPlayer) return socket.emit('error', { message: 'Player not found' });
      const oldId = existingPlayer.id;
      existingPlayer.id = socket.id;
      if (room.host === oldId) room.host = socket.id;
      socket.join(code);
      socket.emit('rejoined', { room, player: existingPlayer });
      if (existingPlayer.role) {
        const nightVision = computeNightVision(existingPlayer, room.players);
        socket.emit('role_assigned', { player: existingPlayer, nightVision });
      }
      return;
    }

    const result = joinRoom(code, playerName.trim(), socket.id, avatar || null);
    if (result.error) {
      return socket.emit('error', { message: result.error });
    }
    socket.join(code);
    socket.emit('room_joined', { code, player: result.player, room: result.room });
    io.to(code).emit('room_updated', { room: result.room });
  });

  socket.on('rejoin_room', ({ roomCode, playerName }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = getRoom(code);
    if (!room) return socket.emit('rejoin_failed', { reason: 'Room not found' });

    const player = room.players.find(p => p.name === playerName);
    if (!player) return socket.emit('rejoin_failed', { reason: 'Player not found' });

    const oldId = player.id;
    player.id = socket.id;

    if (room.host === oldId) room.host = socket.id;

    socket.join(code);
    socket.emit('rejoined', { room, player });

    if (player.role) {
      const nightVision = computeNightVision(player, room.players);
      socket.emit('role_assigned', { player, nightVision });
    }
  });

  socket.on('update_roles', ({ roomCode, selectedRoles }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can update roles' });
    if (room.phase !== 'lobby') return socket.emit('error', { message: 'Cannot change roles after game has started' });
    room.selectedRoles = selectedRoles || [];
    io.to(roomCode).emit('room_updated', { room });
  });

  socket.on('add_bots', ({ roomCode, one }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can add bots' });
    if (room.phase !== 'lobby') return socket.emit('error', { message: 'Cannot add bots after game has started' });

    let botN = room.players.filter(p => p.isBot).length;
    if (one) {
      if (room.players.length >= 10) return socket.emit('error', { message: 'Room is full' });
      botN += 1;
      room.players.push(makeBot(botN));
    } else {
      while (room.players.length < 5) {
        botN += 1;
        room.players.push(makeBot(botN));
      }
    }

    io.to(roomCode).emit('room_updated', { room });
  });

  socket.on('get_all_rooms', () => {
    const roomSummaries = [];
    for (const [code, room] of getRooms().entries()) {
      roomSummaries.push({
        code,
        phase: room.phase,
        playerCount: room.players.length,
        playerNames: room.players.map(p => p.name),
      });
    }
    socket.emit('all_rooms', { rooms: roomSummaries });
  });

  socket.on('start_game', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can start' });
    if (room.phase !== 'lobby') return socket.emit('error', { message: 'Game already started' });
    if (room.players.length < 5) return socket.emit('error', { message: 'Need at least 5 players' });

    const result = assignRoles(room.players, room.selectedRoles, room.players.length);
    if (result.error) return socket.emit('error', { message: result.error });

    room.players = result.players;
    room.phase = 'role_reveal';
    io.to(roomCode).emit('room_updated', { room });

    // Send each non-bot player their private role info
    for (const player of room.players) {
      if (player.isBot) continue;
      const playerSocket = io.sockets.sockets.get(player.id);
      if (playerSocket) {
        const nightVision = computeNightVision(player, room.players);
        playerSocket.emit('role_assigned', { player, nightVision });
      }
    }
  });

  socket.on('advance_to_night', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can advance' });
    if (room.phase !== 'role_reveal') return;
    room.phase = 'night';
    io.to(roomCode).emit('room_updated', { room });
  });

  socket.on('advance_to_team_proposal', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can advance' });
    if (room.phase !== 'night') return;
    // If current leader is a bot, advance to first human leader
    if (room.players[room.leaderIndex] && room.players[room.leaderIndex].isBot) {
      advanceToHumanLeader(room);
    }
    room.phase = 'team_proposal';
    io.to(roomCode).emit('room_updated', { room });
  });

  // --- Team proposal ---

  socket.on('propose_team', ({ roomCode, team }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.phase !== 'team_proposal') return socket.emit('error', { message: 'Not in team proposal phase' });
    const leader = room.players[room.leaderIndex];
    if (!leader || leader.id !== socket.id) return socket.emit('error', { message: 'Only the leader can propose a team' });

    const required = getTeamSize(room.players.length, room.currentMission);
    if (team.length !== required) return socket.emit('error', { message: `Team must have exactly ${required} players` });

    const playerNames = room.players.map(p => p.name);
    if (team.some(name => !playerNames.includes(name)))
      return socket.emit('error', { message: 'Team contains unknown players' });

    room.proposedTeam = team;
    room.phase = 'voting';
    room.votes = {};
    io.to(roomCode).emit('room_updated', { room });

    // Auto-vote for bots (always approve)
    _autoBotVotes(room, roomCode);
  });

  // --- Voting ---

  socket.on('submit_vote', ({ roomCode, vote }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.phase !== 'voting') return socket.emit('error', { message: 'Not in voting phase' });

    if (typeof vote !== 'boolean')
      return socket.emit('error', { message: 'Vote must be true or false' });

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return socket.emit('error', { message: 'Player not found' });
    if (room.votes[player.name] !== undefined) return socket.emit('error', { message: 'Already voted' });

    room.votes[player.name] = vote;

    _resolveVotes(room, roomCode);
  });

  // --- Quest phase ---

  socket.on('submit_quest_card', ({ roomCode, card }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.phase !== 'quest') return socket.emit('error', { message: 'Not in quest phase' });

    if (card !== 'success' && card !== 'fail')
      return socket.emit('error', { message: 'Card must be success or fail' });

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return socket.emit('error', { message: 'Player not found' });
    if (!room.proposedTeam.includes(player.name)) return socket.emit('error', { message: 'Not on quest team' });
    if (room.questCards[player.name] !== undefined) return socket.emit('error', { message: 'Already submitted a card' });

    // Good players can only play success
    if (card === 'fail' && player.team === 'good') {
      return socket.emit('error', { message: 'Good players cannot play Fail' });
    }

    room.questCards[player.name] = card;

    _resolveQuest(room, roomCode);
  });

  // --- Assassination ---

  socket.on('assassinate', ({ roomCode, targetName }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.phase !== 'assassination') return socket.emit('error', { message: 'Not in assassination phase' });

    const assassin = room.players.find(p => p.role === 'Assassin');
    if (!assassin || assassin.id !== socket.id) return socket.emit('error', { message: 'Only the Assassin can assassinate' });

    const target = room.players.find(p => p.name === targetName);
    if (!target) return socket.emit('error', { message: 'Target not found' });

    const merlinKilled = target.role === 'Merlin';
    room.winner = merlinKilled ? 'evil' : 'good';
    room.phase = 'game_over';
    room.assassinationTarget = targetName;
    room.gameOverReason = merlinKilled ? 'Merlin assassinated' : 'Wrong target — Good wins';
    room.revealedPlayers = room.players.map(p => ({
      name: p.name, role: p.role, team: p.team, isBot: p.isBot || false, avatar: p.avatar || null,
    }));

    io.to(roomCode).emit('room_updated', { room });
  });

  // --- Force advance (host only) ---

  socket.on('force_advance', ({ roomCode, targetPhase }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can force advance' });
    room.phase = targetPhase;
    io.to(roomCode).emit('room_updated', { room });
  });

  // --- Disconnect ---

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const found = findPlayerRoom(socket.id);
    if (found && found.room.phase !== 'lobby') {
      // Game in progress — keep player so they can rejoin; just notify the room
      console.log(`[disconnect] ${socket.id} in in-progress room ${found.code} — keeping player for rejoin`);
      io.to(found.code).emit('room_updated', { room: found.room });
    } else {
      const result = leaveRoom(socket.id);
      if (result && !result.deleted) {
        io.to(result.code).emit('room_updated', { room: result.room });
      }
    }
  });
});

// --- Helpers for bot auto-play ---

function _autoBotVotes(room, roomCode) {
  for (const p of room.players) {
    if (p.isBot && room.votes[p.name] === undefined) {
      room.votes[p.name] = true; // bots always approve
    }
  }
  _resolveVotes(room, roomCode);
}

function _resolveVotes(room, roomCode) {
  if (room.phase !== 'voting') return; // guard against stale calls after phase transition

  const totalPlayers = room.players.length;
  const voteCount = Object.keys(room.votes).length;

  io.to(roomCode).emit('vote_update', { voteCount, totalPlayers });

  if (voteCount === totalPlayers) {
    const approvals = Object.values(room.votes).filter(v => v).length;
    const rejected = approvals <= totalPlayers / 2;

    room.history.push({
      type: 'vote',
      missionNumber: room.currentMission,
      leader: room.players[room.leaderIndex].name,
      team: [...room.proposedTeam],
      votes: { ...room.votes },
      approved: !rejected,
    });

    if (rejected) {
      room.rejectionCount += 1;
      if (room.rejectionCount >= 5) {
        room.phase = 'game_over';
        room.winner = 'evil';
        room.gameOverReason = '5 team rejections';
        room.revealedPlayers = room.players.map(p => ({
          name: p.name, role: p.role, team: p.team, isBot: p.isBot || false, avatar: p.avatar || null,
        }));
      } else {
        advanceToHumanLeader(room);
        room.phase = 'team_proposal';
        room.proposedTeam = [];
        room.votes = {};
      }
    } else {
      room.rejectionCount = 0;
      room.phase = 'quest';
      room.questCards = {};

      // Auto-play bots on quest team (always success)
      _autoBotQuestCards(room, roomCode);
    }

    io.to(roomCode).emit('vote_result', { votes: room.votes, approved: !rejected, room });
    setTimeout(() => io.to(roomCode).emit('room_updated', { room }), 2000);
  }
}

function _autoBotQuestCards(room, roomCode) {
  for (const name of room.proposedTeam) {
    const p = room.players.find(pl => pl.name === name);
    if (p && p.isBot && room.questCards[p.name] === undefined) {
      room.questCards[p.name] = 'success';
    }
  }
  _resolveQuest(room, roomCode);
}

function _resolveQuest(room, roomCode) {
  if (room.phase !== 'quest') return; // guard against stale calls after phase transition

  const cardCount = Object.keys(room.questCards).length;

  io.to(roomCode).emit('quest_update', { cardCount, teamSize: room.proposedTeam.length });

  if (cardCount === room.proposedTeam.length) {
    const fails = Object.values(room.questCards).filter(c => c === 'fail').length;
    const twoFails = requiresTwoFails(room.players.length, room.currentMission);
    const questFailed = twoFails ? fails >= 2 : fails >= 1;

    room.history.push({
      type: 'quest',
      missionNumber: room.currentMission,
      team: [...room.proposedTeam],
      result: questFailed ? 'fail' : 'success',
      failCount: fails,
    });

    room.missionResults.push(questFailed ? 'fail' : 'success');
    room.currentMission += 1;

    const winResult = checkWin(room);
    if (winResult === 'good') {
      room.phase = 'assassination';
      room.winner = null;
    } else if (winResult === 'evil') {
      room.phase = 'game_over';
      room.winner = 'evil';
      room.gameOverReason = '3 mission failures';
      room.revealedPlayers = room.players.map(p => ({
        name: p.name, role: p.role, team: p.team, isBot: p.isBot || false, avatar: p.avatar || null,
      }));
    } else {
      advanceToHumanLeader(room);
      room.phase = 'team_proposal';
      room.proposedTeam = [];
      room.questCards = {};
      room.votes = {};
    }

    io.to(roomCode).emit('quest_result', {
      fails,
      questFailed,
      missionResults: room.missionResults,
      room,
    });
    setTimeout(() => io.to(roomCode).emit('room_updated', { room }), 2000);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Avalon server running on port ${PORT}`);
});

module.exports = { app, server, io };
