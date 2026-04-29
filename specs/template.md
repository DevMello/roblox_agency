# Game Spec Template

Copy this file to `specs/{your-game-name}/spec.md` and fill in all sections. Architect uses this exact structure to parse the spec. Do not rename sections or change their order.

---

## Game Title
{One-line title}

## Concept
{One sentence: what is this game?}

---

## Genre and Target Audience

**Genre:** {obby | simulator | tycoon | RPG | fighting | horror | social | racing | puzzle | survival}

**Target age range:** {e.g. 8–16}

**Target session length:** {e.g. 15–30 minutes per session}

**Player description:** {Who is the player? What are they looking for in a game like this?}

---

## Core Game Loop

**Every 30 seconds, the player:**
{What is the micro-loop? The action the player takes and the reward they receive.}

**Every 5 minutes, the player:**
{What is the mid-loop? The progression or goal that organises the 30-second actions.}

**Every session, the player:**
{What is the session arc? What changes between when the player starts and when they quit?}

---

## Feature List

List each feature as a separate subsection. Be specific: what does the feature do, how does it work mechanically, and what other features does it connect to?

### Feature 1: {Feature name}
{Description}

### Feature 2: {Feature name}
{Description}

*(Add as many as needed. Each feature becomes one or more tasks in the Architect's plan.)*

---

## Art Direction

**Visual style:** {e.g. low-poly, blocky/Roblox-native, realistic, cartoon, pixel-art inspired}

**Colour palette:** {describe the mood — e.g. warm earth tones, neon/cyberpunk, muted pastels}

**Asset mood:** {3–5 adjectives that describe how assets should feel — e.g. "chunky, friendly, slightly cartoonish"}

**Reference games or aesthetics:** {optional: 1–2 games or styles whose visuals are in the right direction}

---

## Monetisation Model

**Primary model:** {cosmetic-only | game-passes | battle-pass | hybrid | free}

**Game passes (if applicable):**
- {Pass name}: {what it gives the player}, price {Robux}

**Developer products (if applicable):**
- {Product name}: {what it does}, price {Robux}

**VIP servers:** {Yes/No — and price if yes}

**Notes:** {Any monetisation constraints — e.g. "this is a free game, no pay-to-win mechanics"}

---

## Technical Constraints

**Required Roblox services:**
- {e.g. DataStoreService — for player progression}
- {e.g. MarketplaceService — for game pass purchases}
- {e.g. TeleportService — if multi-server}

**Performance targets:**
- Target frame rate: {60fps | 30fps client minimum}
- Max concurrent players per server: {e.g. 20}
- Platforms: {PC | Mobile | Console | All}

**Other constraints:**
{Any hard technical constraints the Architect must respect — e.g. "all data must use ProfileService", "no third-party modules"}

---

## Out of Scope

Explicit list of things this spec does NOT include. Architect must not create tasks for these items. If a feature description implies one of these, it should be flagged as a conflict, not implemented.

- {Item 1}
- {Item 2}
- {Item 3}

*(If nothing is out of scope, write "Nothing explicitly excluded — use judgement.")*

---

## Success Criteria

What does a complete, shippable v1 look like? List 3–7 testable statements.

- [ ] {Criterion 1: e.g. "A player can join the game, complete the tutorial, and understand the core loop within 3 minutes."}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

---

## Open Questions

Anything the human is unsure about that the Architect should flag or make a documented assumption about. Architect will not create tasks for features that depend solely on unresolved open questions.

- {Question 1: e.g. "Should the leaderboard be per-server or global?"}
- {Question 2}

*(If there are no open questions, write "None.")*
