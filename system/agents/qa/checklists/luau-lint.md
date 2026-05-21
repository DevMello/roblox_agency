# Luau Lint Checklist

Static code quality rules applied to every PR diff. Check each rule against every new or modified Luau script in the diff.

Mark each rule: `pass`, `fail — {specific finding}`, or `N/A — {reason}`.

---

## Strict Mode

- [ ] **LU-01** Every new script has `--!strict` as the first line.
- [ ] **LU-02** No script uses `--!nonstrict` or `--!nocheck` unless there is a documented reason in a comment on the same line explaining the exception.

---

## Type Annotations

- [ ] **LU-03** All function parameters have explicit type annotations (e.g. `function Dash(player: Player, direction: Vector3)`).
- [ ] **LU-04** All function return types are annotated (e.g. `): boolean`).
- [ ] **LU-05** Local variables assigned from external sources (RemoteEvent arguments, DataStore reads) are type-cast or validated before use, not left as `any`.

---

## Service Access

- [ ] **LU-06** All services are accessed via `game:GetService("ServiceName")` at the top of each script, not via `game.ServiceName` or inline.
- [ ] **LU-07** No service is accessed inside a loop, function body, or event handler — they must be at the module/script top level.

---

## Deprecated APIs

- [ ] **LU-08** No use of `wait()` — must use `task.wait()`.
- [ ] **LU-09** No use of `spawn()` — must use `task.spawn()`.
- [ ] **LU-10** No use of `delay()` — must use `task.delay()`.
- [ ] **LU-11** No use of `game.Players` directly — must use `game:GetService("Players")`.
- [ ] **LU-12** No use of `Instance.new("Script")` with a parent argument — create the instance first, then set its parent last.
- [ ] **LU-13** No use of `BodyVelocity`, `BodyPosition`, `BodyGyro`, or `BodyForce` — use `LinearVelocity`, `AlignPosition`, `AlignOrientation` (the constraint-based equivalents).

---

## RemoteEvent Security

- [ ] **LU-14** Every RemoteEvent `.OnServerEvent` handler validates the `player` argument is not nil before using it.
- [ ] **LU-15** Every RemoteEvent `.OnServerEvent` handler validates the type and range of all client-provided arguments.
- [ ] **LU-16** No server-side state change (DataStore write, game state mutation) happens based solely on unvalidated client arguments.
- [ ] **LU-17** No `RemoteFunction` is called from the server to the client in a way that could block server execution (invoke can be exploited by a client to never return).

---

## Naming Conventions

- [ ] **LU-18** RemoteEvent names follow `{Feature}{Action}` PascalCase (e.g. `DashRequested`, `InventoryUpdated`). No snake_case, no abbreviations.
- [ ] **LU-19** Local variables use camelCase. Module names use PascalCase. Constants use UPPER_SNAKE_CASE.
- [ ] **LU-20** No single-letter variable names except loop counters (`i`, `j`, `k`).

---

## Module Structure

- [ ] **LU-21** Shared modules in ReplicatedStorage return a table or class, not a bare value.
- [ ] **LU-22** Scripts do not `require()` a module more than once — cache the result in a local variable.
- [ ] **LU-23** No circular requires (Module A requires Module B which requires Module A).

---

## Script Length

- [ ] **LU-24** No single script exceeds 400 lines. Scripts over 300 lines should have a comment explaining why they could not be split, or a note flagged for Architect.

---

## Debug Code

- [ ] **LU-25** No bare `print()` statements in production scripts. If temporary logging is needed, it must use a `DEBUG_MODE` constant: `if DEBUG_MODE then print(...) end`.
- [ ] **LU-26** `DEBUG_MODE` constant, if present, must be `false` in any PR targeting `main`.
