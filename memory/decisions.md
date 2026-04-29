# Agent Decisions Log

Log of significant architectural and design decisions made by agents. Future agents read this file to avoid reversing decisions that were made deliberately.

---

## Entry Format

```
## Decision: {short description}
ID: decision-{YYYY-MM-DD-HH-MM}
Timestamp: {ISO 8601}
Game: {game-name | "system-wide"}
Agent: {architect | planner | builder | human}
Decision: {what was decided}
Rationale: {why this decision was made — the constraint, trade-off, or insight that led to it}
Alternatives considered: {what else was considered and why it was not chosen}
Status: {active | revisited by decision-{id}}
```

---

## What Qualifies for This Log

- Choosing one implementation approach over another when multiple valid approaches exist.
- Deciding to scope a feature differently than the spec implied.
- Choosing a specific Roblox service or pattern over alternatives.
- Deciding to defer a task or feature to a later milestone.
- Deciding to use a community library vs building from scratch.
- Any ambiguity in the spec that was resolved by making an assumption.

---

## What Does NOT Belong Here

- Routine task completions (those go in `progress.md`).
- Bug fixes (those go in PR descriptions).
- Sprint planning choices (those go in `sprint-log.md`).

---

## Decisions

---

## Decision: ConveyorBelt uses server-side physical part movement
ID: decision-2026-04-29-0001
Timestamp: 2026-04-29T00:00:00Z
Game: industrial-tycoon
Agent: architect
Decision: The ConveyorBelt module moves resource parts (logs, planks, barrels) server-side using CFrame updates on each RunService.Heartbeat tick, not client-side tweening.
Rationale: Goods on conveyor belts must have authoritative server positions. The spec's post-launch Convoy Raid mechanic (Feature 9) requires that stolen goods have a real server-side location — a visual-only client tween would make steal position validation impossible. Establishing the authoritative model now avoids a refactor later.
Alternatives considered: (1) Visual-only client tween with server invisible checkpoints — rejected because it would break the steal mechanic. (2) Roblox's built-in `AlignPosition` physics — rejected because it does not give deterministic part positions needed for cash pad touch detection.
Status: active

---

## Decision: Upgrade state is round-scoped, not persistent
ID: decision-2026-04-29-0002
Timestamp: 2026-04-29T00:00:00Z
Game: industrial-tycoon
Agent: architect
Decision: Per-machine upgrade levels are stored in server memory and reset to 0 at the start of each new round. DataStore only records a history of which upgrades a player has ever purchased (for cosmetic/analytics purposes), not the current level.
Rationale: The spec says "upgrades persist for the duration of the round" (success criterion 3), implying they are round-scoped. Persisting upgrade levels across rounds would let early adopters snowball indefinitely and break the team-competitive balance designed for 15-minute sessions.
Alternatives considered: Persisting upgrade levels across rounds — rejected because it undermines the round-reset competitive design.
Status: active

---

## Decision: CashPad credits personal wallet; Sell Depot credits team wallet
ID: decision-2026-04-29-0003
Timestamp: 2026-04-29T00:00:00Z
Game: industrial-tycoon
Agent: architect
Decision: Cash Pads adjacent to machines (in Lumber zones) credit the player's personal wallet used for upgrade purchases. The central Sell Depot building credits the team's shared wallet used for the win condition.
Rationale: The spec describes both "walking over cash pads to collect $$" (Feature 5) and goods being "deposited at the Sell Depot" for team wallet credit (Feature 8). These must be two distinct flows or the upgrade shop (personal currency) and win condition (team currency) would conflict. This interpretation also creates a meaningful player decision: collect locally for upgrades, or deposit centrally for team win progress.
Alternatives considered: Single unified wallet credited at both locations — rejected because it collapses the upgrade-vs-team-win tension the spec implies.
Status: active

---

## Decision: Bonus drop grants cosmetic_ticket stored in DataStore
ID: decision-2026-04-29-0004
Timestamp: 2026-04-29T00:00:00Z
Game: industrial-tycoon
Agent: architect
Decision: The win-condition bonus drop (Feature 8) grants a `cosmetic_ticket` integer stored in player DataStore rather than immediately awarding a cosmetic item from the Cosmetics Store.
Rationale: The Cosmetics Store (Feature 12) is explicitly out of scope for MVP. The spec's success criterion requires that the winning team receive a "rare cosmetic + bonus currency" drop. Deferring the cosmetic redemption to a ticket system allows the round reward to be implemented at MVP without requiring the cosmetics store. When the cosmetics store launches post-MVP, tickets will be redeemable.
Alternatives considered: (1) No cosmetic reward at MVP — rejected because it violates the success criterion. (2) Award a placeholder cosmetic ID now — rejected because there are no cosmetics yet to reference.
Status: active

---

## Decision: Boost Bucks placeholder conversion rate in constants
ID: decision-2026-04-29-0005
Timestamp: 2026-04-29T00:00:00Z
Game: industrial-tycoon
Agent: architect
Decision: The Boost Bucks Robux-to-currency ratio is set as a tunable constant (placeholder: 1 Boost Buck ≈ 0.80 Robux at cheapest bundle tier) rather than being hardcoded or blocked on human input.
Rationale: OQ-2 in the spec asks for a tuning-playtest to determine the correct ratio. The implementation can proceed with a placeholder — the ratio is a single constant value with no downstream code dependencies. A human must confirm or revise the value before launch. Blocking the entire monetisation milestone on this open question is disproportionate.
Alternatives considered: Block task it-024 until human provides ratio — rejected because the implementation is otherwise complete and blocking unnecessarily extends the critical path.
Status: active

---

## Decision: Mining and Oil production chains deferred post-launch
ID: decision-2026-04-29-0006
Timestamp: 2026-04-29T00:00:00Z
Game: industrial-tycoon
Agent: architect
Decision: No tasks have been created for Mining (Feature 2) or Oil (Feature 3) production chains.
Rationale: The spec's Out of Scope section explicitly states "Mining and Oil loops at MVP — MVP ships Lumber only." The Megamap geometry task (it-005) places zone placeholder labels (`MineZone`, `OilZone`) to reserve physical space for these features, but no machine assets or scripts are generated.
Alternatives considered: Scaffold module stubs for Mining/Oil — rejected because the CLAUDE.md rule prohibits creating tasks for out-of-scope items.
Status: active

---

## Decision: Sabotage, Steal, and Anti-Sabotage mechanics deferred post-launch
ID: decision-2026-04-29-0007
Timestamp: 2026-04-29T00:00:00Z
Game: industrial-tycoon
Agent: architect
Decision: No tasks have been created for Convoy Raid (Feature 9), Sabotage (Feature 10), or Anti-Sabotage Defenses (Feature 11).
Rationale: All three are explicitly listed in the spec's Out of Scope section. The ConveyorBelt server-side architecture decision (decision-2026-04-29-0001) has been made in a way that accommodates the Steal mechanic when it is eventually added, avoiding a future refactor.
Alternatives considered: None — out-of-scope items are not subject to architectural deliberation.
Status: active

---

## Decision: Cosmetics Store deferred post-launch
ID: decision-2026-04-29-0008
Timestamp: 2026-04-29T00:00:00Z
Game: industrial-tycoon
Agent: architect
Decision: No tasks have been created for the Cosmetics Store (Feature 12). The `cosmeticsOwned` field is included in the DataStore schema so that cosmetic ticket awards (from bonus drops) are not lost.
Rationale: Explicitly listed as out of scope in the spec.
Status: active

---

## Decision: Leaderboard is per-server only (no global leaderboard at MVP)
ID: decision-2026-04-29-0009
Timestamp: 2026-04-29T00:00:00Z
Game: industrial-tycoon
Agent: architect
Decision: The real-time leaderboard (Feature 13) and the round-history DataStore write (it-018) are server-scoped. No cross-server global leaderboard has been tasked.
Rationale: The spec's Out of Scope section states "Cross-server features (global leaderboards, cross-server matchmaking) — single-server only for v1." The open question about a global leaderboard is deferred.
Status: active
