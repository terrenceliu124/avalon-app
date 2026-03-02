# Avalon App

A real-time, in-person assistant for the **Avalon** board game. Players join from their phones; the app handles role assignment, team proposals, voting, quests, and assassination — so you can focus on deduction and social deduction instead of card shuffling.

## Features

- **Room-based multiplayer** — host creates a room code, others join on their devices
- **Full game flow** — lobby → role reveal → night → team proposal ↔ voting → quest → assassination → game over
- **Private role delivery** — each player sees only their own role and night vision info
- **Bot support** — fill empty seats with bots (always approve votes, always play success)
- **Rejoin on refresh** — tab refresh or reopening the app reconnects you to your existing session
- **Avatar picker** — choose an emoji avatar that follows you through the game
- **Dev mode** — host tools for single-bot injection and a live room inspector overlay
- **Optional visual assets** — plug in background images and avatars via a single config file

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js · Express · Socket.io |
| Client | React · Vite |
| State | In-memory (server) · React Context + useReducer (client) |
| Tests | Jest (server) · Vitest + Testing Library (client) |

## Quick Start

### Prerequisites

- Node.js ≥ 18 (project uses v25)
- npm

### 1. Start the server

```bash
cd server
npm install
node server.js          # Runs on http://localhost:3001
```

### 2. Start the client

```bash
cd client
npm install
npm run dev             # Runs on http://localhost:5173
```

Open `http://localhost:5173` on each player's device (all must be on the same network, or the server must be publicly accessible).

## Project Structure

```
avalon-app/
├── server/
│   ├── server.js          # Socket event handlers, phase transitions, bot auto-play
│   ├── gameManager.js     # In-memory room registry (CRUD)
│   ├── gameLogic.js       # Pure functions: role assignment, win detection, team sizes
│   └── __tests__/         # Jest test suites (37 tests)
└── client/
    ├── src/
    │   ├── App.jsx                    # Phase-based routing switch
    │   ├── context/GameContext.jsx    # Global state + all socket listeners
    │   ├── socket.js                  # Singleton Socket.io client
    │   ├── assets.js                  # Visual asset config (backgrounds, avatars)
    │   ├── styles.css                 # Single global stylesheet (dark theme)
    │   ├── components/                # MissionTrack, PlayerAvatar, PlayerCard, DevPanel
    │   └── pages/                     # One file per game phase
    └── public/assets/                 # Drop image files here; served at /assets/*
```

## Game Phases

```
lobby → role_reveal → night → team_proposal ↔ voting → quest → (loop)
                                                                    ↓
                                                             assassination → game_over
```

## Supported Roles

| Role | Team | Always included |
|------|------|----------------|
| Loyal Servant of Arthur | Good | (fills remaining slots) |
| Merlin | Good | Yes |
| Percival | Good | Optional |
| Minion of Mordred | Evil | (fills remaining slots) |
| Assassin | Evil | Yes |
| Morgana | Evil | Optional |
| Mordred | Evil | Optional |
| Oberon | Evil | Optional |

## Running Tests

```bash
# Server (Jest)
cd server && npm test

# Client (Vitest)
cd client && npm test
```

## Visual Assets (Optional)

Drop image files into `client/public/assets/` and edit `client/src/assets.js` to map them to phases and player avatars. When all values are `null` the app looks identical to the default state — assets are purely additive.

## Socket Event Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create_room` | `{ playerName, avatar }` | Host creates a new room |
| `join_room` | `{ roomCode, playerName, avatar }` | Player joins or rejoins |
| `rejoin_room` | `{ roomCode, playerName }` | Auto-rejoin on page refresh |
| `update_roles` | `{ roomCode, selectedRoles }` | Host configures optional roles |
| `add_bots` | `{ roomCode, one? }` | Fill to 5 players (or add 1) with bots |
| `start_game` | `{ roomCode }` | Host starts; triggers role assignment |
| `propose_team` | `{ roomCode, team }` | Leader submits team array |
| `submit_vote` | `{ roomCode, vote }` | Player approves/rejects the team |
| `submit_quest_card` | `{ roomCode, card }` | Quest team member plays success/fail |
| `assassinate` | `{ roomCode, targetName }` | Assassin picks Merlin |
| `force_advance` | `{ roomCode, targetPhase }` | Host escape hatch |

### Server → Client

| Event | Description |
|-------|-------------|
| `room_updated` | Authoritative room snapshot broadcast to all members |
| `role_assigned` | Unicast to each player with their private role + night vision |
| `vote_update` | Live vote progress counter |
| `quest_update` | Live quest card progress counter |
| `vote_result` | Vote outcome overlay (2 s before `room_updated`) |
| `quest_result` | Quest outcome overlay (2 s before `room_updated`) |
| `rejoined` | Sent to a player who successfully rejoined |
| `error` | Inline error message |
