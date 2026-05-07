# Inscryption-like Game — Staged Build Plan

A roguelike deckbuilder in the spirit of Kaycee's Mod, with a content editor, scripted NPCs and bosses, async PvP, and an LLM voice layer added later. Original IP — no reused names, art, or sigil icons from Inscryption.

---

## Table of contents

- [Guiding principles](#guiding-principles)
- [Tech stack](#tech-stack)
- [Repo layout](#repo-layout)
- [Stage 0 — Foundations](#stage-0--foundations-35-days)
- [Stage 1 — Data-driven engine MVP](#stage-1--data-driven-engine-mvp-34-weeks)
- [Stage 2 — Roguelike run layer](#stage-2--roguelike-run-layer-23-weeks)
- [Stage 3 — Content editor v1](#stage-3--content-editor-v1-34-weeks)
- [Stage 4 — Scripted NPCs, dialogue, and boss scripts](#stage-4--scripted-npcs-dialogue-and-boss-scripts-23-weeks)
- [Stage 5 — Editor v2: narrative tools](#stage-5--editor-v2-narrative-tools-23-weeks)
- [Stage 6 — Polish, content, mobile](#stage-6--polish-content-mobile-46-weeks)
- [Stage 7 — LLM integration](#stage-7--llm-integration-23-weeks)
- [Stage 8 — Async PvP](#stage-8--async-pvp-34-weeks)
- [Stage 9 — Real-time PvP + matchmaking](#stage-9--real-time-pvp--matchmaking-34-weeks-deferred)
- [Stage 10 — Visual scripting for sigils & bosses](#stage-10--visual-scripting-for-sigils--bosses-34-weeks)
- [Stage 11 — Mod sharing](#stage-11--mod-sharing-23-weeks)
- [Cross-cutting tracks](#cross-cutting-tracks)
- [Timeline](#timeline)
- [Critical risks](#critical-risks)

---

## Guiding principles

1. **Data-driven from day one.** Cards, sigils, encounters, NPCs, events, bosses are all JSON. The engine interprets data; it does not hardcode content.
2. **Engine plays the game; characters are scripted first, LLM-voiced later.** Stages 4–5 ship hand-authored line banks, dialogue trees, and templated boss scripts. Stage 7 layers Claude on top of the same hook surface as a swappable implementation. The model never decides legal moves or rules.
3. **Server-authoritative for anything multiplayer.** The client never decides outcomes.
4. **Originality first.** Mechanics are not copyrightable. Names, art, and icons are. Audit at the end of every stage.
5. **Ship the smallest playable thing at each stage.** Each stage exits with something demoable.

---

## Tech stack

Hosting is **DreamHost shared (PHP 8.4 + Apache only — no SQL)**. Storage is JSON files on disk.

| Layer | Choice | Rationale |
|---|---|---|
| Hosting | DreamHost shared, PHP 8.4, Apache | Constraint: no Node, no SQL, no long-running processes |
| Server | Vanilla PHP 8.4 + FastRoute | Tiny router, no framework overhead, zero surprises on shared |
| Templating | Plates (or plain PHP includes) | Light; no compile cache to manage |
| Storage | JSON files on disk via a `Storage` class | No DB available; flat-file CMS pattern |
| Concurrency | `flock(LOCK_EX)` + atomic rename + append-only logs | Mandatory for any read-modify-write |
| Auth | PHP sessions, `password_hash()`, CSRF tokens | Standard, battle-tested |
| Client | HTML + vanilla JS + Vite | Engine runs in the browser; PHP serves data |
| Optional 2D framework | Phaser (only if needed) | Defer until plain canvas/DOM hits a wall |
| Build / test | Vite + Vitest + ESLint + Prettier | Standard JS toolchain |
| Schema validation | Zod (client) + matching PHP validators | Same schemas enforced both sides |
| LLM proxy | PHP + cURL + Server-Sent Events | **Stage 7+** — streams Claude output to the browser |
| LLM | Claude API (Haiku/Sonnet/Opus by use case) | **Stage 7+** — prompt caching keeps cost sane |
| Realtime PvP | **Deferred** — needs VPS or 3rd-party (Pusher/Ably) | Not feasible on shared hosting |
| Visual scripting (Stage 9) | Blockly | Mature, no arbitrary code execution |
| Mobile | PWA first, native wrapper later | Reuses the same codebase |

**No database.** All persistent state lives in `/data/**/*.json`. See "Storage architecture" below.

---

## Repo layout

```
/public                Apache docroot. index.php front controller, built /assets, art.
/api                   PHP route handlers (auth, packs, matches, llm-proxy).
/src                   PHP application code (Storage, Auth, Validators, etc.).
  /Storage             Atomic file I/O, locking, indexing.
  /Auth                Sessions, roles, CSRF, password reset.
  /Content             Pack validators, importers, exporters.
  /PvP                 Match state machine, turn timeout sweep.
  /Llm                 Claude proxy, prompt builder, SSE streamer.
/engine                Pure JS game logic. Takes JSON content, runs combat. No DOM.
/client                Browser app. Loads engine + content, renders, handles input.
/editor                Browser app for authoring content packs (talks to /api).
/shared                Schemas, types, constants used by JS + PHP (mirrored).
/data                  RUNTIME STATE — NEVER COMMITTED. See "Storage architecture".
  /users
  /content/packs
  /runs
  /matches
  /meta
  /audit
/scripts               CLI tools: rebuild-indexes, backup, migrate-schema.
/docs                  Design notes, this file, sigil reference, art guidelines.
/tests                 PHP unit tests (PHPUnit) + JS unit tests (Vitest).
```

`/data` is git-ignored and lives outside the docroot. Apache is configured to deny direct access regardless.

---

## Storage architecture (no SQL)

All persistent server state is JSON files. Three rules are non-negotiable:

1. **Atomic write**: write to `<file>.tmp` → `flock(LOCK_EX)` → `fsync` → `rename()` over the real file. Never write in place.
2. **Locked read-modify-write**: any "load → mutate → save" sequence holds an exclusive lock for the whole sequence.
3. **Append-only logs** for high-write data (move logs, audit, telemetry). Append is safer than rewrite under contention.

A single `Storage` class wraps these so no caller has to remember.

### Indexes (since there's no SQL)

For every "query" pattern, maintain a denormalized index file alongside the data. A `scripts/rebuild-indexes.php` rebuilds them all from source files when they drift.

| Index | Path | Purpose |
|---|---|---|
| Users by email | `/data/users/index.email.json` | Login lookup |
| Users by username | `/data/users/index.username.json` | Profile URLs, uniqueness |
| Packs catalog | `/data/content/packs/index.json` | Browse / search |
| Matches by user | `/data/matches/index.byUser.json` | "Your active games" list |
| Pending turns | `/data/matches/index.pending.json` | Notify whose turn it is |

### Roles

- **Visitor** — anonymous; can browse marketing, view pack catalog, possibly play a demo run.
- **Player** — registered; saves runs/meta, plays PvP, authors private packs (if creator-mode is granted).
- **Admin** — full access to editor, all packs, user moderation, audit log.

Role stored on the user JSON. Middleware checks role on every protected route.

### Backups

- Cron: `tar -czf /backups/data-$(date +%F).tgz /data` nightly, keep 14 days.
- Optional: `git push` `/data` to a private repo for offsite (encrypted if it contains user data).
- Restore = untar over `/data` after stopping writes.

---

## Stage 0 — Foundations (3–5 days)

**Goal:** lock decisions before writing code.

- [ ] Pick a working title; reserve domain + social handles
- [ ] Create a fresh repo (separate from any fan repo to avoid IP cross-contamination)
- [ ] Confirm DreamHost: PHP 8.4 active, `.htaccess` allowed, `flock` works, `cURL` enabled, SSE not buffered
- [ ] Initialize Vite + ESLint + Prettier + Vitest (client side)
- [ ] Initialize Composer + PHPUnit + PHPStan + PHP_CodeSniffer (server side)
- [ ] Install FastRoute and Plates via Composer
- [ ] Set up the repo layout above; create `/data` with restrictive perms outside docroot
- [ ] Configure `.htaccess`: deny `/data`, route everything to `/public/index.php`
- [ ] Implement minimal `Storage` class (atomic write, lock, read, append) with unit tests
- [ ] Implement minimal `Auth` skeleton (signup, login, logout, role check, CSRF)
- [ ] Decide front-end model: hybrid SSR pages + SPA-style game/editor (recommended) vs full SPA
- [ ] Decide pack asset location: inside pack dir (recommended) vs deduped `/uploads`
- [ ] Decide on email verification + password reset on day one (recommended yes) or later
- [ ] Decide on captcha provider (hCaptcha recommended over reCAPTCHA for privacy)
- [ ] Decide visitor capabilities: demo run allowed without account, or registration wall
- [ ] Decide backup strategy: cron+tar (default), optional git mirror
- [ ] Add CI: lint + test on PR (PHP and JS)
- [ ] Write a 1-page **design doc** (`/docs/design.md`): theme, tone, what's kept from KCM, what's different
- [ ] Write an **originality checklist** (`/docs/originality.md`): no reused names, art, sigil icons, sound effects
- [ ] Pick a license (MIT for code; CC-BY for first-party content if mods are a goal)
- [ ] Decide on art style (pixel / hand-drawn / woodcut / etc.) and write a 1-page art guide
- [ ] Set up project tracking (GitHub Projects or Linear)

**Exit criterion:** empty project boots on DreamHost, lints (PHP + JS), runs one passing PHP test and one passing JS test, and CI is green. Signup → login → logout works against a JSON user file.

---

## Stage 1 — Data-driven engine MVP (3–4 weeks)

**Goal:** two decks fight in the browser. No roguelike, no editor, no AI.

### Schemas

- [ ] **Card schema**: `id, name, costType, costAmount, power, health, sigils[], tribe, art, flavor`
- [ ] **Sigil schema**: `id, name, hooks[]` where each hook subscribes to engine events
- [ ] **Deck schema**: `id, name, cardIds[], starterHand[]`
- [ ] **Encounter schema**: opponent deck + scripted opening moves (per turn)

### Event bus

- [ ] Implement engine event bus with these events: `onPlay, onAttack, onDamaged, onDeath, onTurnStart, onTurnEnd, onDraw, onSacrifice, onSummon`
- [ ] Sigils register handlers; engine fires events; handlers mutate state via authorized API only

### First sigil set (~10)

- [ ] Strike (basic attack)
- [ ] Airborne (skips opposing card, hits avatar)
- [ ] Touch-of-Death-equivalent (any damage kills)
- [ ] OnDeathSpawn (summon X on death)
- [ ] Sprinter-equivalent (moves before attack)
- [ ] Buff-Adjacent (+1 power to neighbors)
- [ ] Draw-on-Play (cycle a card when played)
- [ ] Bone-on-Death (+1 bone)
- [ ] Bifurcated-Strike (hits two lanes)
- [ ] Trifurcated-Strike (hits three lanes)

### Combat loop

- [ ] State machine: draw → main (play/sacrifice) → attack → resolve → end
- [ ] 4-lane board (DOM or canvas — ugly is fine)
- [ ] Resource economy: blood (sacrifice cost), bones (gained on death), squirrel-equivalent autodraw deck
- [ ] Hand, deck, discard, exhaust zones
- [ ] **Deterministic RNG** seeded per fight (critical for replays + PvP)
- [ ] Damage scale, win/loss detection

### Tests

- [ ] Unit tests for each sigil in isolation
- [ ] Interaction tests: Touch-of-Death + Airborne, OnDeathSpawn + Sprinter, etc.
- [ ] Snapshot test for a scripted full fight

### Exit criterion

A single fight plays from draw to win/loss in the browser, using only JSON content.

---

## Stage 2 — Roguelike run layer (2–3 weeks)

**Goal:** Kaycee's-Mod-style run loop. One starter deck, one act, one boss.

### Map

- [ ] Map generator: 12-floor weighted graph
- [ ] Node types: combat, elite, campfire, trader, trapper, boss
- [ ] Map UI: nodes, connections, current position, visited highlight
- [ ] Click-to-advance with branching choice

### Encounters

- [ ] Encounter table per floor, scaled by floor depth
- [ ] Reward screen: pick 1 of 3 cards after each fight (rare pool for elites)

### Non-combat nodes

- [ ] **Campfire**: +1 power *or* +1 health, with stack-risk of burning the card
- [ ] **Trader**: trade pelts → cards
- [ ] **Trapper**: special fight that yields pelts
- [ ] **Boss**: scripted opener (e.g., starts with a 5/5 in lane 2)

### Persistence

- [ ] Run state saved to `localStorage` on every action
- [ ] Resume in-progress run on reload
- [ ] Meta-save: cards unlocked, max challenge cleared, death cards

### Death cards

- [ ] Game-over screen: pick name + portrait + 1–2 sigils from final deck
- [ ] Death cards added to meta-save pool
- [ ] Future runs roll a chance to encounter death cards

### Challenges

- [ ] Challenge token system (config-driven)
- [ ] First three tokens: "+1 boss HP", "no campfires", "starting -1 health"
- [ ] Difficulty score = sum of active token weights

### Exit criterion

A full run from start to boss is playable. Death produces a death card. Reload mid-run resumes correctly.

---

## Stage 3 — Content editor v1 (3–4 weeks)

**Goal:** form-over-JSON authoring. No scripting yet.

### Editor app

- [ ] Editor app skeleton (`/editor`), separate route from the game
- [ ] Auth gate (just to avoid accidental shared edits)
- [ ] File-system or Supabase storage backend for in-progress packs

### Editors

- [ ] **Card editor**: form, art upload, sigil multi-select, live preview
- [ ] **Sigil editor (template params)**: pick archetype → fill numbers → name + icon
- [ ] **Encounter editor**: build opponent deck + scripted opening hand per turn
- [ ] **Map template editor**: shape of node graph, weights per node type, floor count

### Validation

- [ ] Zod schemas with friendly error messages
- [ ] Bad packs reject loudly with line/field references
- [ ] **Versioned schema** (`schemaVersion: 1`) and a migration scaffold

### Pack pipeline

- [ ] Pack export: zip of `pack.json + /art + /audio`
- [ ] Pack import in the game client: drop a zip → it loads
- [ ] Pack metadata: id, name, author, version, description, dependencies[]

### Exit criterion

A non-programmer can author 10 cards + 3 sigils + a boss encounter and play them in the game.

---

## Stage 4 — Scripted NPCs, dialogue, and boss scripts (2–3 weeks)

**Goal:** every character in the game has a voice — built entirely from authored scripts and templates. **No LLM in this stage.** The hook surface is designed so Stage 7 can swap line lookups for live Claude calls without touching content.

### Content schemas

- [ ] **NPC schema**: `id, name, portrait, mood→portrait map, lineBankId, dialogueTreeId?`
- [ ] **Line bank schema**: `{moodKey: [line, line, ...]}` — random pick at runtime, deterministic under the run RNG
- [ ] **Dialogue tree schema** (Twine-style JSON): nodes with `text, choices[{label, next, effect, condition?}]`, optional one-shot flags, branching by run-state predicates
- [ ] **Boss script schema**: turn-keyed actions + conditional triggers (`onTurnStart`, `onPlayerCardPlayed`, `onSelfDamaged`, `onTurnX`, etc.) → list of effects from a fixed catalog. No code execution.

### Hook surface (the seam Stage 7 will plug into)

- [ ] Single `Speaker` interface: `say(npcId, mood, digest) → string`
- [ ] Stage-4 implementation: `LineBankSpeaker` — picks a line from the bank by mood, optionally filtered by digest tags
- [ ] Game code only ever talks to `Speaker`. Swapping to `LlmSpeaker` in Stage 7 is a one-line config change per NPC.
- [ ] Define the **digest builder** now (compact game-state summary, ~200 tokens worth of structured JSON) even though no LLM consumes it yet — exercises the same call sites in playtests.

### First boss

- [ ] One boss with a hand-authored personality: ~150 lines spread across moods (smug / angry / impressed / thinking / defeated)
- [ ] Mood selector: deterministic rules driven by digest (e.g., "took damage two turns running → angry"; "player sacrificed three same-turn → impressed")
- [ ] Line picker avoids repeats within N turns; reshuffles when the bank empties

### Trader / trapper / campfire / merchant NPCs

- [ ] Each gets a small line bank + optional dialogue tree
- [ ] Branching choice nodes (haggle / accept / leave) with effects from the existing event-effect catalog
- [ ] Conditions on choices (gate "haggle" on a stat, etc.)

### Rendering

- [ ] Mood → portrait swap, optional gesture animation
- [ ] Typewriter text reveal (the same renderer Stage 7 will reuse for streamed tokens)
- [ ] Pre-fetch and queue next line during the player's thinking time
- [ ] Idle gesture loop while waiting

### Tests

- [ ] Snapshot test: a scripted boss fight produces a deterministic line sequence under a fixed seed
- [ ] Coverage test: every mood has at least N lines so picks don't repeat too soon
- [ ] Dialogue tree dry-run: walk every reachable node, assert no dead ends and all `next` ids resolve

### Exit criterion

A full run feels alive — bosses banter, traders bargain, campfire whispers — driven entirely by authored content. No network calls leave the device. The `Speaker` seam is in place: Stage 7 can swap implementations without touching any content.

---

## Stage 5 — Editor v2: narrative tools (2–3 weeks)

**Goal:** the editor becomes capable of authoring full narrative content without programmers — entirely scripted. **No AI helpers yet** (those land in Stage 7 alongside the runtime LLM). Stage 5 ships pure authoring UX over the schemas defined in Stage 4.

### Editors

- [ ] **NPC editor**: portrait, mood→portrait map, line bank manager (add/edit/delete lines per mood, count badges, search, bulk import from CSV)
- [ ] **Line bank validator**: warn if any mood has fewer than N lines (configurable threshold for repeat avoidance)
- [ ] **Dialogue tree editor** (Twine-style visual graph): branching nodes with conditions, effects, one-shot flags; drag-arrange; minimap for big trees
- [ ] **Event editor** (campfire-type): trigger + parameterized effects from the fixed effect catalog
- [ ] **Boss script editor (templates)**: turn-keyed actions + condition pickers, no code; visualize the script as a timeline

### Pack preview

- [ ] Launch a test run using only the pack being edited
- [ ] "Quick playtest" button on every encounter and dialogue node
- [ ] Dialogue tree dry-run: walk every reachable path, surface dead ends and unreachable nodes
- [ ] Line bank "audition" mode: cycle through every line in a mood with the chosen portrait

### Diff + history

- [ ] Per-pack edit history appended to `/data/content/packs/<id>/.history.jsonl`
- [ ] Visual diff for line bank changes (added / removed / edited lines per mood)
- [ ] Undo last save (one step) via the history log

### Exit criterion

You can author a brand-new act (~50 cards, 5 NPCs with full line banks, 1 boss with branching dialogue and turn-keyed scripts) entirely in the editor — without writing any code or making any network calls beyond `/api`.

---

## Stage 6 — Polish, content, mobile (4–6 weeks)

**Goal:** stop being a prototype.

### Content

- [ ] First full content pack: ~80 cards, 20 sigils, 4 bosses, 3 starter decks
- [ ] Tutorial run (forced first-run experience)
- [ ] Difficulty tuning pass (data-driven from telemetry)
- [ ] ~15 challenge tokens with stackable difficulty levels
- [ ] Unlock progression: meta-save tracks max difficulty, unlocks new cards/decks
- [ ] Achievements

### Audio + art

- [ ] 1 ambient track per zone (3–5 zones)
- [ ] ~25 SFX (card draw, play, sacrifice, attack, death, win, lose, UI)
- [ ] Final card frame and portrait templates locked
- [ ] Boss intro illustrations

### UX

- [ ] Settings: volume, text speed, colorblind mode, text scale
- [ ] Pause / quit-to-menu
- [ ] Run history viewer
- [ ] Codex (cards + sigils encountered)

### Mobile

- [ ] Responsive layout for portrait phones (touch input, large hit targets)
- [ ] Pointer events (no hover-only tooltips)
- [ ] PWA: manifest + service worker → installable on phones
- [ ] Audio unlock on first tap (iOS)
- [ ] Performance: 60fps target on a 3-year-old mid-range phone

### Accessibility

- [ ] Keyboard navigation
- [ ] Screen-reader labels on cards and UI
- [ ] Reduced-motion mode
- [ ] High-contrast theme

### Exit criterion

You'd be comfortable handing the build to a stranger.

---

## Stage 7 — LLM integration (2–3 weeks)

**Goal:** swap scripted line lookups for live Claude calls *without changing any other system*. The `Speaker` seam from Stage 4 is the integration point. The game must remain fully playable when the API is unavailable, the cost cap is hit, or the user is offline — falling back silently to the line bank.

### Backend (PHP proxy)

- [ ] PHP endpoint `/api/llm/say` — POST receives digest, returns SSE stream
- [ ] API key stored outside docroot in a `secrets.php` config (never in git)
- [ ] cURL with `CURLOPT_WRITEFUNCTION` to stream chunks to the browser as SSE
- [ ] Disable PHP output buffering and `mod_deflate` for the SSE route
- [ ] Rate-limit per session via `/data/llm/rate/<userId>.json` token bucket
- [ ] Hard cost cap per user-day in config (kill switch via a single config flag)
- [ ] Logging of prompt/response to `/data/llm/log/<yyyy-mm-dd>.jsonl` for tuning (PII-free)

### Prompt design

- [ ] System prompt assembled from NPC's authored personality + sigil glossary + "stay in character" guardrails
- [ ] **Prompt caching** on the static system prompt
- [ ] Reuse the **digest builder** shipped in Stage 4 — no new call sites
- [ ] **Rolling memory**: last 3 lines + last 3 player moves; compress every 10 turns
- [ ] **Cross-run memory**: persist a 2-sentence summary in `/data/meta/<userId>.json` so next run's boss can reference past runs

### Wiring into existing content

- [ ] Add `useLlm: bool` flag per NPC; default **off**, opt-in per pack
- [ ] When on, `Speaker.say()` routes through `LlmSpeaker` with the same `(npcId, mood, digest)` arguments
- [ ] On any error, timeout, rate-limit hit, or cap reached → silent fallback to `LineBankSpeaker`
- [ ] Telemetry: count fallback rate per NPC; if >5% the cap or limits are too tight

### Editor AI helpers

- [ ] "Generate 20 sigil ideas for theme X" → designer picks 5 to keep
- [ ] "Generate 10 flavor lines for this card" → adds to the relevant line bank pending review
- [ ] "Generate a boss draft" → stats + personality + 3 script ideas
- [ ] All AI suggestions clearly marked "AI suggestion — review before saving"
- [ ] Editor LLM use governed by the same per-account cap as gameplay

### Output handling

- [ ] Structured JSON schema: `{mood, gesture, line}`
- [ ] Map mood → portrait, gesture → animation, line → text box (already wired in Stage 4)
- [ ] Streaming typewriter effect reuses the Stage 4 renderer
- [ ] Pre-fetch next line during the player's thinking time; mask latency with idle gesture if slow

### Safety

- [ ] Prompt-injection wrapper for any user-authored card / NPC names
- [ ] Output filter: length cap, profanity check, in-character check (regex + simple classifier)
- [ ] Per-IP and per-account rate limits enforced before any LLM call
- [ ] Cloudflare Turnstile gate on first LLM call per anonymous session
- [ ] Any uncaught error → fallback path; never surface a stack trace to a player

### Model selection

- [ ] Haiku for idle chatter / trader haggling
- [ ] Sonnet for boss banter and run recaps (default)
- [ ] Opus reserved for finale moments only

### Exit criterion

One boss reacts to player moves in-character with streamed text, indistinguishable from line-bank UX except for the dynamism. Disabling the network keeps the game fully playable. A botnet that signs up and spams demo runs cannot exceed the daily cap. No content authored in Stages 4–5 had to be modified.

---

## Stage 8 — Async PvP (3–4 weeks)

**Goal:** mail-chess PvP. Same engine, networked, server-authoritative — running on PHP + JSON files.

### Backend

- [ ] Refactor engine so its rules layer can run in **PHP** (mirror of the JS engine, same content schemas). Both languages share `/shared` schemas.
- [ ] Match state file `/data/matches/<matchId>.json`; append-only move log `/data/matches/<matchId>.log.jsonl`
- [ ] All RNG seeded server-side; clients only render
- [ ] Index files: `index.byUser.json`, `index.pending.json`

### Deckbuilding

- [ ] Constructed deck builder UI (separate from run decks)
- [ ] Deck stored at `/data/users/<userId>/decks/<deckId>.json`
- [ ] Server-side deck legality validator (PHP)
- [ ] Multiple saved decks per user

### Match flow

- [ ] Match creation: invite by code (random `/data/invites/<code>.json`), friends list, public queue file
- [ ] Move submission: POST to `/api/match/<id>/move` → PHP validates + applies + appends log
- [ ] Polling endpoint `/api/match/<id>/state?since=<seq>` returns incremental state
- [ ] Email notification when it's your turn (DreamHost mail)
- [ ] Cron job sweeps `index.pending.json`, applies 48h timeout forfeits

### Replays

- [ ] Match history viewer
- [ ] Replay = re-applying `<matchId>.log.jsonl` on the client
- [ ] Shareable replay link (read-only token)

### Concurrency

- [ ] Every match write goes through `Storage::lockedTransaction()` — load, validate, mutate, save with `flock`
- [ ] Move-submission is idempotent on `clientMoveId` so retries don't double-apply

### Exit criterion

Two players on different devices finish a full async match. A cheating client cannot affect outcomes. A simulated lost connection mid-turn does not corrupt state.

---

## Stage 9 — Real-time PvP + matchmaking (3–4 weeks, deferred)

**Status:** **deferred indefinitely.** DreamHost shared hosting cannot run persistent WebSocket servers. Revisit only if (a) you upgrade to VPS, or (b) you add a third-party realtime service (Pusher, Ably, Soketi).

**Goal (when revisited):** live ranked PvP that survives flaky networks.

- [ ] WebSocket layer (Pusher/Ably/Soketi, or a small Node server on a VPS)
- [ ] Lobby: create / join / friend invites
- [ ] Turn timers with grace period (e.g., 60s + 30s reserve)
- [ ] Reconnection: rejoin within 60s, state restored from server
- [ ] Spectate mode (read-only WebSocket subscription)
- [ ] Matchmaking queue + Glicko-2 rating
- [ ] Anti-cheat hardening: client never trusted, all actions validated
- [ ] Cosmetic ranks; seasonal reset
- [ ] Reporting + soft-ban for repeat AFKers

### Exit criterion

Live ranked PvP feels responsive on a normal home connection and recovers from a 30-second drop without losing the match.

---

## Stage 10 — Visual scripting for sigils & bosses (3–4 weeks)

**Goal:** let designers author complex sigils and boss scripts without engine code.

- [ ] Embed Blockly (or build a small node graph editor)
- [ ] Sigil blocks: events, conditions, effects, targets
- [ ] Compile blocks → JSON the engine interprets (no arbitrary code execution)
- [ ] Sigil simulator inside the editor (run a unit test against a mock board)
- [ ] Migrate complex existing sigils from templates to visual scripts where useful
- [ ] Same system for boss scripts (event-based: onTurnStart, onCardPlayed, etc.)
- [ ] Diff viewer for sigil changes

### Exit criterion

A designer can build a sigil like *"When this card kills another, transfer its power to a random ally"* without touching engine code.

---

## Stage 11 — Mod sharing (2–3 weeks)

**Goal:** community content with longevity.

- [ ] Pack hosting in `/data/content/packs/<id>/` (and an optional Cloudflare cache layer for art)
- [ ] Browse / search by tag, rating, author
- [ ] In-game install / uninstall
- [ ] Ratings + comments
- [ ] Versioning + dependency: a pack can require another (shared sigil pack)
- [ ] Moderation tools: report, hide, ban
- [ ] Featured packs front page
- [ ] Optional: in-editor "publish" button

### Exit criterion

Someone other than you ships a pack that someone else plays end-to-end.

---

## Cross-cutting tracks

These run alongside every stage.

### Art pipeline
- [ ] Card frame template locked early (Stage 1)
- [ ] Portrait template + naming convention
- [ ] Consistent palette + style guide

### Audio pipeline
- [ ] SFX naming convention
- [ ] Looped vs. one-shot rules
- [ ] Loudness normalization

### Telemetry
- [ ] Anonymous event log (`run_started, run_won, card_picked, boss_defeated`)
- [ ] Funnel + balance dashboards
- [ ] Tune from data, not vibes

### Legal hygiene
- [ ] Every contributed asset has a written license
- [ ] No "found on Pinterest" art
- [ ] Originality audit at end of every stage

### Backups
- [ ] Cron+tar nightly local snapshots, 14-day retention
- [ ] rclone → Backblaze B2 for offsite (~$0.06/mo)
- [ ] Weekly export of content packs and user data

### Documentation
- [ ] `/docs/sigils.md` — every sigil with examples
- [ ] `/docs/modding.md` — pack format reference (Stage 3+)
- [ ] `/docs/speaker.md` — Speaker interface + LineBank/Llm contracts (Stage 4, expanded in Stage 7)
- [ ] `/docs/api.md` — LLM proxy contract (Stage 7)
- [ ] CHANGELOG.md per release

---

## Timeline

One focused full-time developer:

| Phase | Stages | Duration |
|---|---|---|
| Playable single-player prototype | 0–2 | 6–8 weeks |
| Editor + scripted narrative | 3–5 | 7–9 weeks |
| Polished single-player release | 6 | 4–6 weeks |
| LLM voice layer (optional opt-in) | 7 | 2–3 weeks |
| PvP launch (real-time deferred) | 8 | 3–4 weeks |
| Power tools + community | 10–11 | 5–7 weeks |
| **Total** | | **6–9 months** |

A second contributor parallelizing Stage 6 (polish) and Stage 8 (PvP) drops the calendar by roughly 30%. Stage 7 (LLM) is independent and can slip without blocking PvP.

---

## Critical risks

1. **Editor scope creep** — easy to over-build. Ship template-based v1 in Stage 3; resist Blockly until Stage 10.
2. **LLM cost runaway** — only enabled in Stage 7, behind per-IP rate limits, per-account caps, a hard $/day kill switch, and a Turnstile gate before any anonymous call. Haiku for idle chatter, Sonnet for boss banter, Opus reserved for finales. Caching mandatory.
3. **Speaker seam drift** — if Stages 4–5 ship with `say()` calls bypassed in places, Stage 7 becomes a rewrite. Enforce the seam in code review and add a lint rule that flags direct dialogue rendering.
4. **PvP balance** — single-player tuning will not survive contact with PvP. Plan a separate balance pass in Stage 8.
5. **IP drift** — review art and copy at the end of every stage. Catching a copied sigil icon at Stage 9 is painful.
6. **Save format churn** — version your schemas now; write migrations as you go, not at the end.
7. **Content bottleneck** — the engine moves faster than content can fill it. Start authoring placeholder lines and decks during Stage 1 so Stage 6 isn't a wall.
8. **Mobile-only browser quirks** — test on real iOS Safari weekly from Stage 6 onward (audio unlock, viewport, touch events).

---

*Last updated: 2026-05-07 — revised for DreamHost shared (PHP 8.4, no SQL, JSON-file storage); LLM integration deferred to new Stage 7, Stages 4–5 recast as fully scripted narrative tooling, subsequent stages renumbered.*
