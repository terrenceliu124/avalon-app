# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Server (Node.js + Express + Socket.io)
```bash
cd server && node server.js          # Run server on port 3001
cd server && npm test                # Run all server tests (Jest, --runInBand)
cd server && npx jest gameLogic      # Run a single test file by name pattern
```

### Client (React + Vite)
```bash
cd client && npm run dev             # Dev server on port 5173 (proxies /socket.io → 3001)
cd client && npm run build           # Production build
cd client && npm test                # Run all client tests (Vitest, single run)
cd client && npx vitest HomePage     # Run a single test file by name pattern
```

> Node.js is at `/opt/homebrew/bin/node` (v25.7.0). All deps are local only — never install globally.

## Architecture

### Overview
A real-time, multi-player Avalon board game assistant. Two processes:
- **Server** (`server/`) — stateful, in-memory room registry; all game logic lives here
- **Client** (`client/`) — React SPA; purely a display/input layer, no game logic

Communication is exclusively via **Socket.io events** (no REST except `/health`).

### Server Layer
| File | Role |
|------|------|
| `server.js` | Socket event handlers, bot auto-play helpers, phase transitions |
| `gameManager.js` | In-memory `rooms` Map — CRUD for room/player lifecycle |
| `gameLogic.js` | Pure functions: role assignment, night vision, team sizes, win detection |

Room state shape (set in `gameManager.createRoom`):
```js
{ code, players, phase, host, selectedRoles, missionResults, rejectionCount,
  currentMission, leaderIndex, proposedTeam, votes, questCards, history,
  revealedPlayers? }   // revealedPlayers added at game_over only
```

**Player shape:**
```js
// Human players:
{ id, name, isHost, isBot: false, role?, team? }
// Bot players:
{ id, name, isHost: false, isBot: true, role?, team? }
// (role and team only present after assignRoles is called)
```

**Game phase flow:**
`lobby` → `role_reveal` → `night` → `team_proposal` ↔ `voting` → `quest` → (loop or `assassination` → `game_over`)

Phase transitions are driven by socket events from the host. After every transition, the server broadcasts `room_updated` to all room members. Two events (`vote_result`, `quest_result`) are sent first with a 2-second delay before `room_updated` so the client can show overlays.

### Client Layer
**State management:** Single `GameContext` (React context + `useReducer`). All socket listeners are registered once in `GameContext`'s `useEffect`. Components read state via `useGame()` hook.

**Routing:** `App.jsx` switches on `room.phase` — no router library, just a switch statement.

**Persistence:** On connect, `GameContext` reads `sessionStorage` key `avalon_player` (`{ playerName, roomCode }`) and emits `rejoin_room` to recover from page refreshes.

**Transient state:** `voteResult`, `questResult`, `voteProgress`, and `questProgress` in context are cleared on every `ROOM_UPDATED` dispatch, so overlays and progress counters disappear automatically when the next phase starts.

### Socket Event Protocol

Client → Server (emitted by pages/components):
- `create_room` / `join_room` / `rejoin_room`
- `update_roles` — host selects optional roles before start
- `add_bots` — fills to 5 players with bot placeholders
- `start_game` — triggers role assignment, emits per-socket `role_assigned`
- `advance_to_night` / `advance_to_team_proposal`
- `propose_team` — leader submits team array of player names
- `submit_vote` — `{ vote: true|false }`
- `submit_quest_card` — `{ card: 'success'|'fail' }`
- `assassinate` — `{ targetName }`
- `force_advance` — host escape hatch to jump to any phase
- `transfer_host` — `{ roomCode, targetPlayerName }` — host transfers host role to another non-bot player

Server → Client (broadcast to room):
- `room_updated` — authoritative room snapshot; clears transient client state
- `role_assigned` — unicast to each player's socket with private role + night vision
- `vote_update` / `quest_update` — live progress counters
- `vote_result` / `quest_result` — outcome overlays (cleared by next `room_updated`)
- `error` — displayed inline by components

### Bot System
Bots are fake player objects (`{ id: 'bot-N', name: 'Bot N', isBot: true }`). They never hold a real socket. The server auto-plays bots synchronously:
- **Voting:** bots always approve (`_autoBotVotes`)
- **Quest:** bots always play success (`_autoBotQuestCards`)
- **Leader rotation:** `advanceToHumanLeader()` skips bot leaders

### Testing
- Server: Jest (`--runInBand`). Tests import `gameManager` and `gameLogic` directly; no server process needed.
- Client: Vitest + jsdom + `@testing-library/react`. Socket is mocked in test setup.

## Constraints

- **Server module system:** `server/` uses CommonJS exclusively (`require`/`module.exports`). Never use `import`/`export` there.
- **`gameLogic.js` is pure:** Its functions take data and return data — they never mutate room state directly and never access `io`. All mutations happen in `server.js` after calling these functions.
- **Good players cannot play Fail:** Enforced server-side in `submit_quest_card`; the client hides the Fail button by checking `player.team === 'evil'`, but the server is the authoritative guard.
- **Merlin and Assassin are always present:** `assignRoles` unconditionally prepends `Merlin` to the good pool and `Assassin` to the evil pool regardless of `selectedRoles`.
- **Player identity key is `player.name`:** `votes`, `questCards`, `proposedTeam`, and `nightVision` all key on name strings, not socket IDs.

## Patterns

- **Socket handler structure:** Every handler calls `getRoom()` first and returns an `error` emit immediately if the room is missing. Phase guards (`if (room.phase !== 'X') return socket.emit('error', ...)`) come next, before any mutation.
- **Broadcasting after transitions:** Every phase change ends with `io.to(roomCode).emit('room_updated', { room })`. For `vote_result`/`quest_result`, emit those first and delay `room_updated` by 2 seconds so clients can show the overlay before advancing.
- **Bot auto-play is synchronous and inline:** Call `_autoBotVotes` at the end of `propose_team`, and `_autoBotQuestCards` inside `_resolveVotes` when the vote passes. Both call their respective `_resolve*` function, which guards against stale calls with a phase check at the top.
- **Leader rotation:** Always use `advanceToHumanLeader()` (not the raw `advanceLeader()`) when rotating after a rejection or quest completion, to skip any bot leaders.
- **Client emits socket events directly:** Pages call `socket.emit(...)` using `socket` from `useGame()`. There are no wrapper action-creators in `GameContext` for emitting.

## Style Decisions

- **Single CSS file:** All styles live in `client/src/styles.css`. Use the existing utility classes — `.page`, `.card`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-approve`, `.btn-reject`, `.btn-danger`, `.btn-row`, `.overlay`, `.overlay-card`, `.badge`, `.badge-good`, `.badge-evil`, `.badge-bot`, `.waiting`, `.player-list`, `.check-row`, `.sees-list`, `.error-msg`, `.progress-bar`. Do not introduce CSS modules or styled-components.
- **Role info comes from `state.player`:** Components read the current player's role/team from `state.player` (populated by `role_assigned`), not from `state.room.players`.
- **Bots are filtered from selection UIs:** Use `room.players.filter(p => !p.isBot)` when rendering player lists that require human interaction (e.g., team selection).
- **Role reveal at game_over:** `GameOverPage` reads from `room.revealedPlayers` (populated by server at all game_over transitions), not from `room.players`.

## Visual Assets Workflow

Drop image files into `client/public/assets/` — Vite serves them at `/assets/filename.jpg` with no import needed.

**`client/src/assets.js`** is the single config file to edit each session:
- `PAGE_BACKGROUND` — single URL string or `null`; shared across all pages
- `AVATARS` — array of URL strings; assign avatars deterministically by player name hash via `getAvatar(name)`
- `ROLE_CARDS` — map of role name → URL or URL array; `getRoleCard(role, name)` picks deterministically
- `NIGHT_CEREMONY_CONFIG` — pacing config for the night ceremony audio sequencer (see below)

When all values are `null`/empty the app looks identical to no-asset state.

**`PlayerAvatar` component** (`client/src/components/PlayerAvatar.jsx`) returns `null` when `AVATARS` is empty — no layout change until avatars are added. Player lists in `LobbyPage`, `TeamProposalPage`, `AssassinationPage`, and `GameOverPage` already include `<PlayerAvatar name={p.name} />`.

## Night Ceremony Audio

The host's Night page runs a step-by-step voice-over ceremony. Steps are built dynamically from `room.selectedRoles` (Oberon, Percival, and Morgana each alter the script).

**Audio files** go in `client/public/assets/audio/night/`. See `client/public/assets/audio/night/VOICE_SPEC.md` for the full file list and voice scripts.

**Pacing** is controlled by `NIGHT_CEREMONY_CONFIG` in `client/src/assets.js`:
```js
export const NIGHT_CEREMONY_CONFIG = {
  STEP_REPEAT_COUNT: 1,              // times to repeat each audio clip per step
  STEP_INTERVAL_MS: 2500,            // pause between steps (ms)
  FALLBACK_STEP_DURATION_MS: 3000,   // auto-advance wait when audio file is missing
};
```
Missing audio files are handled gracefully — the sequencer falls back to a timer so the ceremony works with no files present.

**Non-host players** see only a "Eyes closed" waiting screen during the night phase — no role or vision info is shown until `team_proposal`.

## Host Transfer

`transfer_host` socket event (valid in all phases): validates the caller is the current host, target is a non-bot human player, then flips `isHost` on all players, updates `room.host`, and broadcasts `room_updated`. UI is in InfoPanel → Room tab ("Make Host" button, visible to the host only next to each eligible player).

## Night Vision Gating

`InfoPanel` only shows the Night Vision section in the Role tab during post-night phases: `team_proposal`, `voting`, `quest`, `assassination`, `game_over`. It is hidden during `role_reveal` and `night`.
