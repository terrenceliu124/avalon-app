```
        ⚔️  THE REALM OF AVALON  ⚔️
    ╔══════════════════════════════════╗
    ║   /\      /\   /\      /\       ║
    ║  /  \    /  \ /  \    /  \      ║
    ║ / /\ \  / /\ / /\ \  / /\ \     ║
    ║ \/  \/ \/  \/ /  \/ \/  \/      ║
    ╚══════════════════════════════════╝
```

# Avalon App

*"Let the servants of Arthur prove their worth — for among you walks the shadow of Mordred."*

A real-time, in-person assistant for the **Avalon** board game. Players join from their phones; the app handles role assignment, team proposals, voting, quests, and assassination — so you can focus on deduction and social deduction instead of card shuffling.

---

⚔️ ─────────────────────────────────── ⚔️

## Screenshots

> *Images will appear once added to `docs/screenshots/`.*

<table>
<tr>
  <td align="center">
    <img src="docs/screenshots/01-home.png" alt="Home — join or create a room" width="280" /><br/>
    <sub><b>Home</b> — Join or create a room</sub>
  </td>
  <td align="center">
    <img src="docs/screenshots/02-lobby.png" alt="Lobby — player list and role configuration" width="280" /><br/>
    <sub><b>Lobby</b> — Player list &amp; role config</sub>
  </td>
</tr>
<tr>
  <td align="center">
    <img src="docs/screenshots/03-role-reveal.png" alt="Role reveal — private role card" width="280" /><br/>
    <sub><b>Role Reveal</b> — Private role card</sub>
  </td>
  <td align="center">
    <img src="docs/screenshots/04-night.png" alt="Night ceremony — host view with audio sequencer" width="280" /><br/>
    <sub><b>Night Ceremony</b> — Host audio sequencer</sub>
  </td>
</tr>
<tr>
  <td align="center">
    <img src="docs/screenshots/05-team-proposal.png" alt="Team proposal — leader selects players" width="280" /><br/>
    <sub><b>Team Proposal</b> — Leader selects players</sub>
  </td>
  <td align="center">
    <img src="docs/screenshots/06-voting.png" alt="Voting — approve or reject the proposed team" width="280" /><br/>
    <sub><b>Voting</b> — Approve or reject the team</sub>
  </td>
</tr>
</table>

⚔️ ─────────────────────────────────── ⚔️

## Features

- **Room-based multiplayer** — host creates a room code, others join on their devices
- **Full game flow** — lobby → role reveal → night → team proposal ↔ voting → quest → assassination → game over
- **Private role delivery** — each player sees only their own role and night vision info
- **Bot support** — fill empty seats with bots (always approve votes, always play success)
- **Rejoin on refresh** — tab refresh or reopening the app reconnects you to your existing session
- **Avatar picker** — choose an emoji avatar that follows you through the game
- **Dev mode** — host tools for single-bot injection and a live room inspector overlay
- **Optional visual assets** — plug in background images and avatars via a single config file
- **Night ceremony voice-over** — host-driven audio sequencer guides the night phase step-by-step; non-host players see only a waiting screen
- **Host transfer** — host can hand off host duties to any human player mid-game

⚔️ ─────────────────────────────────── ⚔️

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js · Express · Socket.io |
| Client | React · Vite |
| State | In-memory (server) · React Context + useReducer (client) |
| Tests | Jest (server) · Vitest + Testing Library (client) |

⚔️ ─────────────────────────────────── ⚔️

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

⚔️ ─────────────────────────────────── ⚔️

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
    └── public/assets/
        ├── audio/night/               # Night ceremony MP3s (see VOICE_SPEC.md)
        └── ...                        # Background images, role cards, avatars
```

⚔️ ─────────────────────────────────── ⚔️

## Game Phases

```
lobby          — host configures roles and waits for players to join
  ↓
role_reveal    — each player privately views their assigned role
  ↓
night          — host guides the night ceremony; evil players learn each other
  ↓
team_proposal  — the current leader nominates a quest team
  ↕
voting         — all players approve or reject the proposed team
  ↓  (if approved)
quest          — team members secretly play success or fail cards
  ↓  (loop back to team_proposal until 3 wins or 3 fails, or 5 rejections)
assassination  — evil team attempts to identify and eliminate Merlin
  ↓
game_over      — winner revealed; all roles exposed
```

⚔️ ─────────────────────────────────── ⚔️

## Supported Roles

| Role | Team | Always included |
|------|------|----------------|
| 🔵 Loyal Servant of Arthur | Good | (fills remaining slots) |
| 🔮 Merlin | Good | Yes |
| 🛡️ Percival | Good | Optional |
| 🔴 Minion of Mordred | Evil | (fills remaining slots) |
| ⚔️ Assassin | Evil | Yes |
| 🦊 Morgana | Evil | Optional |
| 💀 Mordred | Evil | Optional |
| 👁️ Oberon | Evil | Optional |

⚔️ ─────────────────────────────────── ⚔️

## Running Tests

```bash
# Server (Jest)
cd server && npm test

# Client (Vitest)
cd client && npm test
```

⚔️ ─────────────────────────────────── ⚔️

## Visual Assets (Optional)

Drop image files into `client/public/assets/` and edit `client/src/assets.js` to map them to phases and player avatars. When all values are `null` the app looks identical to the default state — assets are purely additive.

| Export | Purpose |
|--------|---------|
| `PAGE_BACKGROUND` | Single background image shared across all pages (`null` for solid color) |
| `AVATARS` | Avatar URL pool; assigned to players deterministically by name hash |
| `ROLE_CARDS` | Role card illustrations keyed by role name (supports arrays for per-player variants) |
| `NIGHT_CEREMONY_CONFIG` | Audio pacing for the night ceremony sequencer |

⚔️ ─────────────────────────────────── ⚔️

## Night Ceremony

The host's Night page runs an auto-advancing voice-over ceremony. Steps are built from `room.selectedRoles` — Oberon, Percival, and Morgana each change the script.

**Audio files** go in `client/public/assets/audio/night/`. See [`VOICE_SPEC.md`](client/public/assets/audio/night/VOICE_SPEC.md) for the complete file list, exact filenames, and voice scripts. Missing files are handled gracefully — the sequencer falls back to a timer, so the ceremony works with no audio present.

**Pacing** is configured in `client/src/assets.js`:

```js
export const NIGHT_CEREMONY_CONFIG = {
  STEP_REPEAT_COUNT: 1,              // times to repeat each audio clip per step
  STEP_INTERVAL_MS: 2500,            // pause between steps (ms)
  FALLBACK_STEP_DURATION_MS: 3000,   // auto-advance wait when audio file is missing
};
```

Non-host players see only a "Eyes closed" waiting screen during the night phase. Night Vision info in the Info Panel is hidden until `team_proposal`.

⚔️ ─────────────────────────────────── ⚔️

## Host Transfer

The host can pass host duties to any human (non-bot) player at any phase: tap **i** → **Room** tab → **Make Host** next to a player. The server updates `room.host` and broadcasts `room_updated` immediately.

⚔️ ─────────────────────────────────── ⚔️

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
| `transfer_host` | `{ roomCode, targetPlayerName }` | Transfer host to another player |

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
