# Avalon App — Feature List

> **Status legend:**
> - `[x]` = Implemented
> - `[ ]` = Planned / Not yet started
> - `[~]` = Partially implemented / In progress

---

## 1. Room Lifecycle

- [x] Create a room — generates a unique 4-letter room code
- [x] Join a room by code — validates code exists and name is not taken
- [x] Rejoin a room after page refresh — server reconciles socket ID by player name
- [x] Session persistence via `sessionStorage` — stores `{ playerName, roomCode, avatar }`
- [x] Reconnecting screen on return — shown when saved session detected but socket not yet confirmed
- [x] Host transfer — host can pass host role to any non-bot human player mid-game (`transfer_host` event)
- [x] Room code pre-fill from URL param — `?room=XXXX` auto-populates join field on HomePage
- [ ] Auto-join via URL — opening a share URL should drop straight into join flow without extra tap

---

## 2. Player Management

- [x] Human player identity keyed by name string (not socket ID)
- [x] Host badge shown in lobby and player lists
- [x] Bot players — fake player objects, never hold a real socket
- [x] Add Bots button — fills room to 5 players with bots
- [x] Add 1 Bot (dev mode only) — adds a single bot regardless of current count
- [x] Bots filtered from selection UIs (team proposal, assassination) when not in dev mode
- [x] Emoji avatar picker on HomePage — 16 choices, default 🦁
- [x] Avatar persisted in `localStorage` and re-used on rejoin
- [x] Bot emoji avatars — cycle through a fixed `BOT_EMOJIS` list

---

## 3. Role System

- [x] 8 roles total: Merlin, Percival, LoyalServant, Assassin, Morgana, Mordred, Oberon, Minion
- [x] Merlin always present (prepended to good pool unconditionally)
- [x] Assassin always present (prepended to evil pool unconditionally)
- [x] Optional roles selectable by host before game start: Percival, Morgana, Mordred, Oberon
- [x] Remaining slots filled with LoyalServants (good) and Minions (evil)
- [x] Good/Evil ratio enforced by player count (5–10 players supported)
- [x] Roles assigned via Fisher-Yates shuffle (`assignRoles` in `gameLogic.js`)
- [x] Role and team unicast to each player via `role_assigned` (not in room broadcast)

---

## 4. Night Vision

- [x] Merlin sees all Evil except Mordred
- [x] Percival sees Merlin and Morgana (but not which is which — shown as "Merlin or Morgana")
- [x] Assassin, Morgana, Minion see all other Evil except Oberon (with role labels)
- [x] Mordred sees other Evil except Oberon (and is NOT visible to Merlin)
- [x] Oberon sees nobody; nobody among Evil sees Oberon
- [x] LoyalServant sees nobody
- [x] Night vision gated in InfoPanel — only visible during `team_proposal`, `voting`, `quest`, `assassination`, `game_over` phases (hidden during `role_reveal` and `night`)

---

## 5. Game Phase Flow

- [x] `lobby` — players join, host configures roles and starts game
- [x] `role_reveal` — each player privately sees their flip card; host advances when ready
- [x] `night` — host runs the ceremony; non-host players see "Eyes closed" waiting screen
- [x] `team_proposal` — rotating leader proposes a team
- [x] `voting` — all players approve or reject; bots auto-approve
- [x] `quest` — team members submit success/fail cards; bots auto-success
- [x] `assassination` — triggered when Good wins 3 missions; Assassin picks Merlin target
- [x] `game_over` — full role reveal shown to all players
- [x] Phase loop — after each quest result, rotate leader and return to `team_proposal`
- [x] 5-rejection loss — five consecutive rejections send game directly to `game_over` (Evil wins)

---

## 6. Team Proposal

- [x] Mission team sizes table (per player count 5–10, per mission 1–5)
- [x] Leader displayed prominently; rotates after each vote or quest
- [x] Leader selects exact required number of players; submit disabled until count matches
- [x] `propose_team` validated server-side (phase guard, names must be valid)
- [x] Rejection counter displayed (0–4 strikes before auto-loss)
- [x] `advanceToHumanLeader()` skips bot leaders automatically
- [x] Double-submit prevention (`submitted` flag in component state)

---

## 7. Voting

- [x] All human players submit Approve/Reject vote
- [x] Bots auto-approve synchronously via `_autoBotVotes`
- [x] Live vote count progress bar (`vote_update` event → `voteProgress` state)
- [x] Vote result overlay — shows outcome and individual votes after all submitted
- [x] `vote_result` sent 2 seconds before `room_updated` so client shows overlay
- [x] Transient `voteResult`/`voteProgress` state cleared on next `room_updated`
- [x] Rejection counter incremented on failed vote; triggers 5-rejection loss path

---

## 8. Quest

- [x] Only team members submit quest cards
- [x] Good players cannot play Fail — enforced server-side; client hides Fail button by team
- [x] Bots on team auto-success via `_autoBotQuestCards`
- [x] Special rule: Mission 4 requires 2 Fails to fail when 7+ players (`requiresTwoFails`)
- [x] Live quest card count progress bar (`quest_update` event → `questProgress` state)
- [x] Quest result overlay — shows outcome and card counts before advancing
- [x] `quest_result` sent 2 seconds before `room_updated` so client shows overlay
- [x] Transient `questResult`/`questProgress` state cleared on next `room_updated`
- [x] Mission result recorded (`success`/`fail`) and appended to `missionResults`

---

## 9. Assassination

- [x] Triggered automatically when Good wins 3 missions
- [x] Assassin sees player list and selects a target
- [x] Non-assassin players see a waiting screen
- [x] `assassinate` validated server-side (phase guard, target must be valid name)
- [x] If target is Merlin → Evil wins; otherwise → Good wins
- [x] Outcome recorded and `game_over` phase entered with `revealedPlayers`
- [x] Double-submit prevention (`submitted` flag in component state)

---

## 10. Mission Tracking & Win Conditions

- [x] 5-dot `MissionTrack` component shows per-mission results (success/fail/pending)
- [x] Good wins when 3 missions succeed
- [x] Evil wins when 3 missions fail
- [x] Evil wins when 5 consecutive proposals are rejected
- [x] Evil wins when Assassin correctly identifies Merlin
- [x] `checkWin` in `gameLogic.js` — pure function, checks `missionResults` array

---

## 11. Night Ceremony Audio

- [x] Step-by-step voice-over sequencer runs on host's Night page
- [x] Steps built dynamically from `room.selectedRoles` — Oberon, Percival, and Morgana each add/alter steps
- [x] Each step plays an audio clip; configurable repeat count via `STEP_REPEAT_COUNT`
- [x] Configurable pause between steps via `STEP_INTERVAL_MS`
- [x] Graceful fallback when audio file is missing — auto-advances after `FALLBACK_STEP_DURATION_MS`
- [x] All pacing config in `NIGHT_CEREMONY_CONFIG` in `client/src/assets.js`
- [x] Audio file spec at `client/public/assets/audio/night/VOICE_SPEC.md`
- [ ] Actual audio `.mp3` files recorded and placed in `client/public/assets/audio/night/`

---

## 12. Role Reveal

- [x] Animated flip card — shows card back, flips to reveal role card image on tap
- [x] Role card images configured per role in `ROLE_CARDS` in `assets.js`
- [x] Card back image configurable (`ROLE_CARDS.back`)
- [x] Role cards displayed with `object-fit: contain` (2:3 aspect ratio, 1024×1536)
- [x] Multiple variant images per role (LoyalServant, Minion) — picked deterministically by name hash
- [x] Team badge shown (Good / Evil) after flip
- [x] Host has "Advance to Night" button; non-host sees waiting message
- [x] `getRoleCard(role, playerName)` helper in `assets.js` for deterministic variant selection

---

## 13. Info Panel

- [x] Slide-out panel accessible from all post-lobby phases
- [x] **Role tab** — shows current player's role, team badge, and night vision list
- [x] **History tab** — per-mission quest results and per-round vote logs
- [x] **Room tab** — player list with host badge, bot badge, and "Make Host" button (host only)
- [x] Night vision section hidden during `role_reveal` and `night` phases
- [x] Host transfer UI — "Make Host" button next to each eligible non-bot player (host-only view)
- [x] Share Room Link button in Room tab (Web Share API with clipboard fallback)
- [x] Room code copy button in Room tab

---

## 14. Dev Mode

- [x] Dev mode toggle button on HomePage (hidden in production unless toggled)
- [x] Passkey authentication required to enable server-side dev features (`verify_dev_passkey` event)
- [x] Passkey configurable via `DEV_PASSKEY` environment variable (default: `'avalon-dev'`)
- [x] Forced role assignment — dev-authed host can specify exact roles for start_game
- [x] Force advance — host can jump to any phase via `force_advance` event (dev-authed only)
- [x] Add 1 Bot button (dev mode only) — adds a single bot beyond normal fill-to-5 logic
- [x] All-rooms monitor in DevPanel — live list of all active rooms via `get_all_rooms`/`all_rooms` socket events
- [x] DevPanel UI — fixed FAB button, slide-out overlay showing all rooms
- [x] Dev socket auth cleared on disconnect

---

## 15. Session Persistence & Rejoin

- [x] `sessionStorage` key `avalon_player` stores `{ playerName, roomCode }` for rejoin
- [x] `localStorage` key `avalon_player` stores `{ playerName, roomCode, avatar }` for pre-fill on next visit
- [x] On connect, `GameContext` emits `rejoin_room` if saved session found
- [x] Reconnecting screen shown while rejoin is in-flight
- [x] Server reconciles socket ID on `rejoin_room` — restores player to room at current phase
- [x] `ROOM_JOINED` reducer clears `reconnecting` flag
- [x] `safeLSGet(key)` wrapper handles missing localStorage in test/SSR environments

---

## 16. Visual Asset System

- [x] Single background image shared across all pages (`PAGE_BACKGROUND` in `assets.js`)
- [x] Null fallback — when `PAGE_BACKGROUND` is null, solid-color CSS background used
- [x] Card-level scroll background (`CARD_BG_SCROLL` / `cardScrollStyle`) — parchment scroll image for mission-track cards
- [x] Card-level textured background (`CARD_BG_TEXTURED` / `cardTexturedStyle`) — textured parchment for main content cards
- [x] Avatar image pool (`AVATARS` array) — assigned deterministically by player name hash
- [x] `getAvatar(name)` returns null when pool is empty (no layout change)
- [x] Role card images per role (`ROLE_CARDS` map), with array support for variants
- [x] All image assets served from `client/public/assets/` with no import needed
- [x] `PlayerAvatar` component returns null when `AVATARS` is empty

---

## 17. UI Components

- [x] `MissionTrack` — 5-dot tracker showing success/fail/pending per mission
- [x] `PlayerCard` — card-style player selector with emoji avatar, name, and badges; gold border when selected
- [x] `PlayerAvatar` — renders emoji (`.emoji-avatar`) or image URL from asset pool; null-safe
- [x] `DevPanel` — fixed FAB, overlay with all active rooms
- [x] `InfoPanel` — slide-out panel with Role/History/Room tabs; available post-lobby
- [x] Player grid layout (2-column) via `.player-grid` CSS class for team/assassination selection
- [x] Single CSS file (`client/src/styles.css`) — dark theme, utility classes only, no CSS modules

---

## 18. Sharing

- [x] Share Room Link button in LobbyPage — uses Web Share API; falls back to clipboard copy
- [x] Share Room Link button in InfoPanel Room tab — same API/fallback pattern
- [x] Room code displayed and copyable in InfoPanel
- [x] URL param `?room=XXXX` pre-populates room code field on HomePage (`URLSearchParams`)
- [ ] Auto-join flow — share URL should skip manual join and land directly in the room

---

## 19. Testing

- [x] Server: Jest (`--runInBand`), 37 tests across `gameManager.test.js` and `gameLogic.test.js`
- [x] Client: Vitest + jsdom + `@testing-library/react`, 19 tests across `HomePage.test.jsx` and `LobbyPage.test.jsx`
- [x] Socket mocked in Vitest test setup — no real server needed for client tests
- [x] Server tests import `gameManager`/`gameLogic` directly — no server process needed
- [ ] End-to-end tests covering full game flow
- [ ] Client tests for game phase pages (RoleReveal, Night, TeamProposal, Voting, Quest, Assassination, GameOver)

---

## 20. Design & Animations

- [x] Typography baseline — 16px root, 18px body, 0.75rem badges
- [x] Card entrance animation — fade + slide-up on mount with nth-child stagger delays (1–4)
- [x] Card depth shadow — subtle gold ring + drop shadow on all `.card` elements
- [x] Role-reveal flip card exempt from card entrance animation (preserves 3D transform)
- [x] Player list stagger animation — items slide in sequentially on mount (up to 10, 50ms steps)
- [x] Mission track enlarged dots (36px → 44px) with gold pulse ring on current mission
- [x] Mission dot glow on completed dots (green/red per result)
- [x] Progress bar height increased (8px → 10px)
- [x] Overlay animations — backdrop fade-in, card scale-up with spring easing
- [x] Info panel slide-up animation on open
- [x] Vote/quest result overlays — colored top accent bar and large result glyph (⚔/✓/✕)
- [x] Assassination page — subtle red ambient tint via `::before` pseudo-element; red card borders
- [x] GameOver winner reveal — scale + fade animation on h1 with spring easing; team-colored card glow
- [x] Homepage decorative gold divider (⚔ crest with gradient rules) between title and subtitle
- [x] Role toggle selected glow — enhanced gold box-shadow on selected state

---

## 21. Planned / Backlog

- [ ] Actual night ceremony audio `.mp3` files recorded and committed
- [ ] Auto-join via share URL (skip manual room code entry)
- [ ] Spectator mode — join a room without taking a player slot
- [ ] Room expiry / cleanup — remove inactive rooms after a timeout
- [ ] Rejoin after host disconnects — reassign host automatically
- [ ] Player kick — host can remove a disruptive player
- [ ] Configurable bot behavior — evil bots play fail cards on quest
- [ ] Sound effects for vote/quest overlays
- [ ] Mobile PWA manifest / installable app
