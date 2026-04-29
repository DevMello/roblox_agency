# Game Spec Template

Copy this file to `specs/{your-game-name}/spec.md` and fill in all sections. Architect uses this exact structure to parse the spec. Do not rename sections or change their order.

---

## Game Title
Industrial Megamap Tycoon

## Concept
A team-based competitive industrial tycoon on Roblox where two teams share a massive map split into Lumber, Mining, and Oil zones, building production chains while stealing and sabotaging the enemy team to win the round.

---

## Genre and Target Audience

**Genre:** tycoon

**Target age range:** 9–16

**Target session length:** 15–30 minutes per session (one full round is ~15 min)

**Player description:** Roblox tycoon fans who like Lumber Tycoon 2, Mining Tycoon, and Factory Simulator but want a competitive, team-based twist. They enjoy production chains, upgrade grinds, and the social thrill of raiding/sabotaging an enemy base. They want to physically move around the map (clicking machines, walking over cash pads, raiding) rather than sitting idle.

---

## Core Game Loop

**Every 30 seconds, the player:**
Harvests a resource (clicks a tree/drill/pump or watches an auto-machine), watches it travel via conveyor to a processor, then walks over a cash pad to convert the processed goods into money. They may also click a machine to manually trigger a production batch.

**Every 5 minutes, the player:**
Spends accumulated money on per-machine upgrades (speed, output rate, conveyor width), buys adjacent land tiles to place more machines, and works toward unlocking the next resource tier (Mining after Lumber, then Oil). They may also begin raiding enemy belts or sabotaging an enemy machine with a wrench.

**Every session, the player:**
Starts the round with only Lumber unlocked and a bare plot, progresses through Mining and into Oil if their team is efficient, contributes to the Team Wallet competing against the enemy team, and ends the 15-minute round either celebrating a win bonus drop (rare cosmetic + bonus currency) or losing — with their personal cosmetics and Boost Bucks persisting across sessions.

---

## Feature List

List each feature as a separate subsection. Be specific: what does the feature do, how does it work mechanically, and what other features does it connect to?

### Feature 1: Lumber Production Chain
The Tier 1 (always-unlocked) resource loop. Players click a tree or buy an auto-chopper machine; logs roll down a conveyor belt to a Sawmill that processes them into Planks; players walk over the Plank Cash Pad to collect $$. Upgradeable via faster chopper speed, wider conveyor belt, higher-capacity sawmill, and an auto-collector worker. Connects to: Cash Pad system, ClickDetector, ConveyorBelt module, Upgrade Shop.

### Feature 2: Mining Production Chain
Tier 2 resource loop, unlocked at $X earned total. Players drill ore from a mine shaft (click or auto-drill); ore carts carry it to a Refinery that smelts it into Metal Bars; players walk over the Metal Cash Pad to collect $$. Upgradeable via deeper drill (higher yield), faster cart, multi-furnace refinery, and auto-collector. Connects to: Resource Unlock gate, Upgrade Shop.

### Feature 3: Oil Production Chain
Tier 3 resource loop, unlocked at $XX earned total (late game). An Oil Pump auto-extracts crude (slow at first) into a Pipeline that feeds a Refinery Tank, which converts it to Barrels; players walk over the Barrel Cash Pad to collect $$. Upgradeable via pump pressure, pipeline diameter, extra refinery tanks, and an export drone (auto-sells without walking). Highest income ceiling, highest capital cost.

### Feature 4: Megamap with Mirrored Team Halves
The map is split into two mirrored halves (Team A / Team B), each containing all three resource zones, connected by conveyor belts and roads. A neutral center zone holds the Sell Depot (where processed goods convert to money) and is the Sabotage Zone where enemy warehouses are accessible. Layout: `[Team A Lumber][Team A Mine][Team A Oil] | CENTER | [Team B Oil][Team B Mine][Team B Lumber]`.

### Feature 5: Dual Income Triggers (Click + Cash Pad)
Players generate income two ways: (1) clicking machines to manually process a batch (critical early-game when auto-machines aren't bought yet), and (2) walking over cash pads placed near output points to collect processed goods as money. Designed to keep players physically moving rather than sitting idle.

### Feature 6: Per-Machine Upgrade Shop
In-game shop where earned currency buys upgrades. Categories: Machine Speed (chopper RPM, drill bit tier, pump pressure), Output Rate (wider conveyors, extra sawmill blades, multi-barrel tank), Plot Expansion (adjacent land tiles), Resource Unlock (pay threshold to unlock Mining, then Oil), and Cosmetics. Upgrades are per-machine, not global, so players spend deliberately.

### Feature 7: Team System and Wallets
Players are auto-balanced onto Team A or Team B on spawn. Each team shares a factory and contributes to the same machines (role division is emergent, not forced). A Team Wallet tracks combined earnings for the round leaderboard; each player also has a personal wallet for upgrades and cosmetics.

### Feature 8: Round Manager and Win Condition
A round timer (default 15 minutes) governs play. The team with the highest total dollars earned and deposited at the Sell Depot wins. The winning team receives a bonus drop (rare cosmetic + bonus currency).

### Feature 9: Convoy Raid (Steal)
Processed goods (Planks, Metal Bars, Barrels) sit on conveyor belts briefly before reaching the cash pad. Players can enter enemy territory (risky — proximity alarms can eject them) and grab goods off the belt. Stolen goods deposit into the raider's team's sell depot at full value. 30-second cooldown per player between successful steals.

### Feature 10: Sabotage (Wrench Throw)
Players carry a limited supply of Sabotage Tools (replenish over time or buy more). Throwing a wrench at an enemy machine stops it for 60–120 seconds. Sabotaged machines display sparks/smoke and can be repaired by walking over and clicking. Only one machine per enemy zone can be sabotaged at once — prevents griefing the entire enemy base.

### Feature 11: Anti-Sabotage Defenses
Defensive purchases for a player's plot. The Guard Tower auto-ejects enemy players who linger too long. The Chain Lock makes a specific machine immune to one sabotage per round.

### Feature 12: Cosmetics Store
Robux-only purely-visual store. Includes factory skins (Industrial Rust, Arctic Facility, Neon Cyberpunk), character outfits (Foreman, Oil Baron, Mining Hardhat), and machine skins (Golden Sawmill, Chrome Drill, Diamond Pump). No gameplay advantage.

### Feature 13: Real-Time Team Leaderboard
Persistent on-screen display of both teams' current Sell Depot earnings, updating live so players always see who is ahead and can decide whether to push production or pivot to sabotage.

*(Add as many as needed. Each feature becomes one or more tasks in the Architect's plan.)*

---

## Art Direction

**Visual style:** chunky low-poly, blocky/Roblox-native industrial — readable from a distance so machines, belts, and resources pop on a busy megamap.

**Colour palette:** warm industrial earth tones (rust orange, oiled steel, lumber brown, dirt) for the core map, with bright saturated team-color accents (e.g. red Team A vs. blue Team B) on factories and territory borders. Premium cosmetic skins introduce neon/chrome/gold variants.

**Asset mood:** chunky, industrial, slightly cartoonish, friendly, satisfying

**Reference games or aesthetics:** Lumber Tycoon 2 and Factory Simulator for tycoon machine readability; Mining Tycoon for upgrade pacing visuals.

---

## Monetisation Model

**Primary model:** hybrid (cosmetics + game-passes + premium currency)

**Game passes (if applicable):**
- VIP Worker Pass: unlocks an auto-collector NPC that follows the player and collects cash pads automatically, price TBD Robux
- Turbo Drill Pass: exclusive Mining machine with 2x base output, cosmetically distinct (glows), price TBD Robux
- Oil Baron Pass: unlocks the Oil tier 1 upgrade for free at round start (skips early grind), price TBD Robux

**Developer products (if applicable):**
- Boost Bucks (premium currency): Robux-purchased in-game currency used to buy upgrades mid-round and skip upgrade wait timers; tuned so F2P players can compete with 2–3 hours of play vs. Robux players in 30 min, price varies by bundle
- Cosmetic packs (factory skins, character outfits, machine skins): purely visual, no gameplay advantage, price varies per item

**VIP servers:** TBD (open question)

**Notes:** Soft pay-to-win is acceptable via Boost Bucks — purchases shorten the grind but should not make a player unbeatable. Cosmetics must remain strictly visual. Game passes are one-time purchases per pass, not consumable.

---

## Technical Constraints

**Required Roblox services:**
- DataStoreService — saves player money, upgrades purchased, and cosmetics owned across sessions
- MarketplaceService — for game pass and developer product purchases (Boost Bucks, VIP Worker, Turbo Drill, Oil Baron, cosmetics)
- Teams / TeamService — assigns players to Team A or Team B and tracks team wallets

**Performance targets:**
- Target frame rate: 60fps desktop, 30fps mobile minimum
- Max concurrent players per server: 20 (10 per team)
- Platforms: All (PC, Mobile, Console)

**Other constraints:**
Custom systems the Architect must build: ConveyorBelt module (moves resource parts along a fixed path at variable speed), CashPad detector (`Touched` event → adds money to player wallet on walk-over), ClickDetector-based machine activation, Round Manager (timer + win condition + reward distribution), Sabotage system (projectile throw, machine disable state, repair prompt), Proximity Alert (detects enemy players, triggers alarm/eject), Shop GUI (in-game upgrade and cosmetics store), and a real-time team Leaderboard. Per-machine (not global) upgrade state must be supported.

---

## Out of Scope

Explicit list of things this spec does NOT include. Architect must not create tasks for these items. If a feature description implies one of these, it should be flagged as a conflict, not implemented.

- Mining and Oil loops at MVP — MVP ships Lumber only; Mining and Oil are post-launch updates
- Sabotage and Steal mechanics at MVP — added in a later update once the core loop is stable
- Guard Tower and Chain Lock anti-sabotage upgrades — post-launch only
- Cosmetics store at MVP — added once core monetization is validated
- Cross-server features (global leaderboards, cross-server matchmaking) — single-server only for v1

*(If nothing is out of scope, write "Nothing explicitly excluded — use judgement.")*

---

## Success Criteria

What does a complete, shippable v1 look like? List 3–7 testable statements.

- [ ] A player can join, be auto-assigned to Team A or Team B, and complete a full Lumber loop (chop → conveyor → sawmill → cash pad) within 60 seconds of spawning.
- [ ] Both teams' factories are present on a mirrored megamap with a neutral center Sell Depot, and goods deposited there count toward the team's wallet.
- [ ] The per-machine upgrade shop allows players to buy at least Speed and Output upgrades using earned currency, and upgrades persist for the duration of the round.
- [ ] A 15-minute round timer ends the round, declares the team with the highest deposited dollars the winner, and grants the winning team a bonus drop.
- [ ] Player money, owned upgrades, and owned cosmetics persist across sessions via DataStoreService.
- [ ] A real-time team leaderboard shows both teams' current totals and updates live as goods are deposited.
- [ ] The game runs at 30fps minimum on mobile with 20 concurrent players per server.

---

## Open Questions

Anything the human is unsure about that the Architect should flag or make a documented assumption about. Architect will not create tasks for features that depend solely on unresolved open questions.

- What exact dollar threshold unlocks Mining ($X) and Oil ($XX)? Needs tuning playtest.
- What is the Boost Bucks conversion rate (Robux → in-game currency) that lets F2P compete in 2–3 hours vs. Robux players in 30 min?
- Should the leaderboard be per-server only, or also feed a global daily/weekly leaderboard?
- Are VIP servers offered, and at what Robux price?
- What is the exact Sabotage Tool replenishment rate (over time) and the price to buy more?
- Should role division ever be enforced (assigned roles) or always remain emergent as currently specified?

*(If there are no open questions, write "None.")*