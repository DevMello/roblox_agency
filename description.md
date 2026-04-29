# Agency file descriptions
> One section per markdown file. Each section explains what the file is for, what sections it should contain, what questions it must answer, and any rules or constraints that apply when writing the real content.

---

## README.md
**What it is:** The front door of the entire repo. Any human or agent reading this for the first time should understand the full system in under five minutes.

**Must answer:**
- What is this repository and what does it autonomously build?
- What are the two main actors (Claude Code = Builder, Claude Cowork = Planner/Monitor) and how do they divide responsibility?
- What are the three operational windows (night cycle, day cycle, weekly research) and what happens in each?
- How does a human kick off a new game (drop a spec file, run one script)?
- How does a human review progress each morning (where is the report, where are the PRs)?
- How does a human leave feedback (PR comments, TBD labels, live edit command)?
- What MCP servers are required and where is the config?
- What should a human never do manually that would break the system (e.g. committing directly to main, editing plan.md by hand)?

**Sections to include:** Overview, System architecture summary, Operational schedule, How to start a new game, Human review guide, Live edit guide, MCP server requirements, Repo conventions.

---

## config/schedule.md
**What it is:** The canonical source of truth for all time windows and activation order. Every agent and every GitHub Actions workflow derives its timing from this file.

**Must answer:**
- Exact start and end times for the night cycle, with timezone specified.
- Exact start time for the morning report generation.
- What day and time the weekly research runs.
- The ordered sequence in which agents activate during the night cycle (e.g. Planner first, then Builder + QA in parallel, then Reporter last).
- What happens if an agent runs over its time window — does it get killed, paused, or left to finish?
- Minimum and maximum task durations Builder should target per task so the night stays on schedule.

**Sections to include:** Time windows (with timezone), Night cycle activation order, Agent time budgets, Overflow policy, Weekly schedule.

---

## config/mcp-servers.md
**What it is:** A registry of every MCP server the agency uses, with enough information for any agent to know which server to call for which kind of task.

**Must answer:**
- What is the URL or connection method for each server (Roblox Studio MCP, Blender MCP, Chrome MCP, GitHub MCP)?
- Which agents are authorised to use which servers?
- Are there rate limits or session limits per server that agents must respect?
- What should an agent do if a server is unreachable (retry policy, fallback, abort task)?
- Where are credentials or auth tokens stored (reference only — never paste secrets here)?

**Sections to include:** Server registry table (name, URL, authorised agents, rate limits), Auth reference, Retry and fallback policy.

---

## config/agent-limits.md
**What it is:** Hard operational constraints for every agent — token budgets, retry counts, context window rules, and failure escalation paths.

**Must answer:**
- Max tokens per agent call for each agent type.
- Max retries before a task is marked failed.
- What counts as a failure vs a soft warning vs a hard abort.
- Which agent is allowed to escalate a failure (always Planner, never Builder or QA).
- Context window management rules — how much history each agent carries into a new call.
- Cost guardrails — is there a nightly API spend cap and what happens when it is hit?

**Sections to include:** Per-agent limits table, Failure classification, Escalation rules, Cost guardrails.

---

## agents/architect/AGENT.md
**What it is:** The complete operational spec for the Architect agent. Any model reading this file should know exactly what the Architect does, when it runs, what it reads, and what it writes.

**Must answer:**
- When does the Architect run? (Once per new spec file, or on spec changes — not nightly.)
- What is its exact input? (The spec file at `specs/{game-name}/spec.md`.)
- What are its exact outputs? (The task tree, milestones written to `games/{game-name}/plan.md`.)
- What tools and MCP servers does it use? (Researcher for lookups if needed, no Builder tools.)
- What is the decomposition strategy — how granular should tasks be?
- How does it handle ambiguity in the spec (flag it, make a documented assumption, or block)?
- What does it write to `memory/decisions.md` after running?
- Under what conditions does it re-run on an existing game (spec change, major replanning)?

**Sections to include:** Role summary, Trigger conditions, Inputs, Outputs, Tool access, Decomposition rules, Ambiguity handling, Memory writes, Re-run policy.

---

## agents/architect/prompts/parse-spec.md
**What it is:** The prompt used when the Architect reads a raw spec file and converts it into a structured task tree.

**Must answer (as prompt instructions):**
- How to read the spec format (refer to `specs/template.md` for field definitions).
- How to identify the top-level features vs sub-tasks vs implementation details.
- How to assign a task type to each task (scripting, asset, UI, game mechanic, data, config).
- How to flag anything in the spec that is ambiguous or underspecified.
- What the output format must look like (reference `schemas/task-tree.schema.json`).
- What the agent must NOT do (e.g. start estimating time, that is the milestone-planner's job).

---

## agents/architect/prompts/milestone-planner.md
**What it is:** The prompt used when the Architect takes a completed task tree and groups tasks into ordered, time-boxed milestones.

**Must answer (as prompt instructions):**
- How to group tasks into milestones (by feature area, by dependency order, or both).
- How to estimate the number of nights each milestone will take.
- How to identify the critical path — which milestones block all others.
- What a milestone definition must include (name, goal, tasks, estimated nights, success criteria).
- How to write the milestone list to `games/{game-name}/plan.md`.
- Rules for milestone sizing — no milestone should be smaller than one night or larger than five nights.

---

## agents/architect/prompts/dependency-mapper.md
**What it is:** The prompt used to identify dependencies between tasks so Builder never tries to implement a feature whose prerequisite hasn't been built yet.

**Must answer (as prompt instructions):**
- How to identify a hard dependency (task B cannot start until task A is merged).
- How to identify a soft dependency (task B is easier after task A but can start independently).
- How to express dependencies in the task tree schema.
- What to do when a circular dependency is detected.
- How to output a dependency summary that Planner can read when scheduling nightly sprints.

---

## agents/architect/schemas/task-tree.schema.json
**What it is:** The JSON schema defining the exact shape of a task tree object output by the Architect.

**Must define:** Task ID format, task title, task type enum, description, estimated complexity, dependencies array, assignee agent, status enum (pending / in-progress / done / failed / blocked), and any optional metadata fields.

---

## agents/architect/schemas/milestone.schema.json
**What it is:** The JSON schema defining the exact shape of a milestone object.

**Must define:** Milestone ID, name, goal statement, task ID list, estimated nights, success criteria list, status enum, and actual completion date field.

---

## agents/researcher/AGENT.md
**What it is:** The complete operational spec for the Researcher agent. Defines when it is called, by whom, and what it produces.

**Must answer:**
- Who calls the Researcher? (Architect calls it during planning; Builder calls it when hitting an unknown API or pattern mid-task.)
- What sources is it authorised to access? (DevForum, Roblox documentation, GitHub, `sources.md`.)
- What does it write and where? (Research notes go into `games/{game-name}/progress.md` under a research log section, or returned inline to the calling agent.)
- How does it decide when enough research has been done?
- What does it do when a source is paywalled or unavailable?
- Does it cache results to avoid re-researching the same topic? If so, where?

**Sections to include:** Role summary, Callers, Source access list, Output format, Research sufficiency rules, Unavailable source policy, Caching policy.

---

## agents/researcher/prompts/api-research.md
**What it is:** The prompt used when Researcher is asked to find Roblox API methods, events, or properties needed for a specific mechanic.

**Must answer (as prompt instructions):**
- How to identify the right Roblox service or class for the mechanic being researched.
- How to find and verify the API signature (including deprecated vs current methods).
- What output to produce: the relevant API names, a short usage note, and a code pattern example.
- When to escalate to the competitor-analysis prompt instead (if the mechanic has no direct API and must be built from primitives).

---

## agents/researcher/prompts/pattern-research.md
**What it is:** The prompt used when Researcher looks for established Luau code patterns, architecture patterns, or Roblox community conventions for a given problem.

**Must answer (as prompt instructions):**
- How to search for patterns (DevForum, open-source Roblox GitHub repos, Roblox documentation examples).
- How to evaluate a pattern for quality (recency, upvotes, compatibility with current Roblox engine version).
- What to include in the output: the pattern name, a description, a short code sketch, and known limitations.
- How to handle conflicting patterns (pick the most recent, document the conflict).

---

## agents/researcher/prompts/asset-research.md
**What it is:** The prompt used when Researcher is asked to find or recommend assets (models, audio, textures) available on the Roblox marketplace or as free sources.

**Must answer (as prompt instructions):**
- How to search the Roblox marketplace via Chrome MCP.
- What quality criteria to apply (polygon budget, license type, review score).
- How to output a shortlist: asset name, asset ID, source URL, license, recommended use.
- What to do if no suitable asset is found (flag for Blender generation instead).

---

## agents/researcher/prompts/competitor-analysis.md
**What it is:** The prompt used when Researcher is asked how a competing Roblox game implements a specific mechanic that the spec requires.

**Must answer (as prompt instructions):**
- How to identify the top 3–5 Roblox games that implement the mechanic being studied.
- What to observe and document: UI patterns, feel of the mechanic, likely implementation approach.
- What NOT to do: do not attempt to extract or copy code from competitor games.
- How to translate observations into implementation suggestions for Builder.

---

## agents/researcher/sources.md
**What it is:** A curated list of trusted sources Researcher is allowed to consult, with notes on how reliable each source is and how to access it.

**Must include:** Roblox Creator Documentation URL, DevForum URL, Roblox GitHub org, community-trusted open source repo list, known unreliable or outdated sources to avoid, and how to handle a source that requires login.

---

## agents/planner/AGENT.md
**What it is:** The complete operational spec for the Planner agent, which is powered by Claude Cowork and runs at two points: once at the start of the night to generate the sprint, and continuously through the night to monitor and replan.

**Must answer:**
- What are the Planner's two distinct modes: sprint generation (start of night) and live monitoring (during night)?
- What does it read before generating a sprint? (plan.md, memory/human-overrides.md, memory/blockers.md, open PRs tagged tbd-human.)
- What does it write? (`games/{game-name}/sprint-log.md` for tonight's sprint, updated `plan.md` for milestone changes.)
- How does it monitor Builder's progress without interrupting it?
- Under what conditions does it intervene and replan mid-night? (Task marked failed, task takes more than 2x estimate, QA blocks a PR.)
- What is its communication channel with Builder? (Written sprint file — Builder polls it, Planner updates it.)
- What does it write to `memory/decisions.md` after the night?

**Sections to include:** Role summary, Two modes (sprint generation vs monitoring), Inputs, Outputs, Monitoring mechanism, Replanning triggers, Memory writes.

---

## agents/planner/prompts/nightly-sprint.md
**What it is:** The prompt used at the start of each night to generate the specific task list Builder will execute.

**Must answer (as prompt instructions):**
- How to read the current milestone from `plan.md` and select tonight's tasks.
- How to apply `memory/human-overrides.md` — any task in overrides that conflicts with the plan must be skipped or adapted.
- How to check `memory/blockers.md` and skip any task that is currently blocked.
- How to order tasks within the sprint (critical path first, independent tasks last).
- How to write the sprint to `sprint-log.md` in a format Builder can parse task by task.
- Time-boxing rules: total estimated work must fit within the 6-hour night window with 20% buffer.

---

## agents/planner/prompts/replan-on-failure.md
**What it is:** The prompt used mid-night when Planner detects a task has failed or is severely over time.

**Must answer (as prompt instructions):**
- How to assess the impact of the failure on the rest of tonight's sprint.
- How to decide between three options: retry the task, skip it and continue, or abort the sprint.
- How to rewrite the remaining sprint tasks in `sprint-log.md` after the decision.
- How to log the failure to `memory/blockers.md` with enough detail for a human to understand it tomorrow.
- What to flag in the morning report about the failure.

---

## agents/planner/prompts/pr-triage.md
**What it is:** The prompt used at the start of the night to review any open PRs that a human has left with a `tbd-human` label.

**Must answer (as prompt instructions):**
- How to read a TBD PR: what to look for in the PR description, comments, and diff.
- How to convert the PR's intent into one or more concrete tasks for tonight's sprint.
- How to assign those tasks an appropriate position in the sprint order.
- How to update the PR itself (add a comment noting the agent has picked it up, change label from `tbd-human` to `in-progress`).
- What to do if the PR is too ambiguous to act on (flag it in the morning report, do not guess).

---

## agents/planner/prompts/override-check.md
**What it is:** The prompt used every night before sprint generation to scan `memory/human-overrides.md` and ensure the upcoming sprint does not contradict any human decision.

**Must answer (as prompt instructions):**
- How to read each entry in `human-overrides.md` and understand what it prohibits or requires.
- How to match override entries against planned tasks (by feature name, file path, or tag).
- What to do when a planned task conflicts with an override: remove the task, adapt it, or flag it.
- How to produce a conflict report as part of the sprint log so the human can see what was excluded and why.

---

## agents/planner/schemas/sprint.schema.json
**What it is:** The JSON schema for a nightly sprint object written by Planner and read by Builder.

**Must define:** Sprint ID, date, game name, milestone reference, task list (ordered), total estimated duration, actual start time, actual end time, status (planned / running / complete / partial / failed), and a notes field for Planner's mid-night updates.

---

## agents/planner/schemas/task.schema.json
**What it is:** The JSON schema for an atomic task within a sprint.

**Must define:** Task ID, title, type (scripting / asset / ui / config / fix / research), description, estimated minutes, actual minutes, assigned agent, depends-on list, status enum, PR reference (if applicable), failure reason (if applicable).

---

## agents/builder/AGENT.md
**What it is:** The complete operational spec for the Builder agent, which is powered by Claude Code and is the only agent that directly modifies game source files.

**Must answer:**
- What is Builder's only input each night? (The current sprint from `sprint-log.md`.)
- What tools and MCP servers does Builder have direct access to? (Roblox Studio MCP, Blender MCP, Chrome MCP for docs, GitHub MCP for version control.)
- What is the mandatory git workflow for every task? (Branch from main, implement, commit, open PR — never commit directly to main.)
- What branch naming and commit message conventions must Builder follow?
- When is Builder allowed to call Researcher? (When blocked on an unknown API or pattern — not for general curiosity.)
- When must Builder stop a task and mark it failed rather than guessing? (When three implementation attempts have failed, or when a dependency is missing.)
- What does Builder write to `progress.md` after each task?
- What does Builder never do? (Modify `plan.md`, `memory/`, or any agent config file.)

**Sections to include:** Role summary, Inputs, Tool access, Git workflow, Branch and commit conventions, When to call Researcher, Failure rules, Progress logging, Off-limits files.

---

## agents/builder/prompts/feature-impl.md
**What it is:** The core prompt used when Builder implements a single feature task from the sprint.

**Must answer (as prompt instructions):**
- How to read a task definition and understand the full scope before writing any code.
- How to check if a dependency task's PR has been merged before starting.
- The implementation sequence: create branch, write code, write basic test or validation, commit, open PR.
- Code quality requirements: Luau style guide adherence, no hardcoded magic numbers, services accessed via GetService, RemoteEvents named clearly.
- How to write the PR description (what was built, how to test it, what it connects to in the spec).
- When to call the asset-integration prompt instead of writing code (if the task is primarily an asset task).

---

## agents/builder/prompts/bug-fix.md
**What it is:** The prompt used when Builder is assigned a bug fix task, either from a QA failure or a human PR comment.

**Must answer (as prompt instructions):**
- How to read the bug report and identify the root cause before touching code.
- How to scope the fix to the minimum change required (do not refactor unrelated code).
- How to verify the fix without breaking adjacent features.
- How to reference the original bug in the commit message and PR description.
- When a bug indicates a deeper architectural problem that needs Architect involvement (flag it, do not fix the symptom and move on).

---

## agents/builder/prompts/asset-integration.md
**What it is:** The prompt used when Builder needs to bring a 3D asset (created by Blender MCP or sourced from marketplace) into the Roblox game.

**Must answer (as prompt instructions):**
- The pipeline: model generation or sourcing → export from Blender → import via Roblox Studio MCP → position and configure in Workspace.
- Polygon and texture budget limits that must not be exceeded.
- How to name and organise imported assets in the Roblox asset hierarchy.
- How to tag assets in the Workspace so QA can identify them.
- How to handle an asset import failure (retry, reduce complexity, flag for human).

---

## agents/builder/prompts/pr-creation.md
**What it is:** The prompt used when Builder opens a pull request after completing a task.

**Must answer (as prompt instructions):**
- Required sections in every PR description: Summary, Spec reference, How to test, Screenshots or output logs if applicable, Known limitations.
- How to label PRs correctly (feature / fix / asset / config, plus the game name tag).
- How to request QA review within the PR (tag the QA agent or use a specific label).
- When to mark a PR as draft vs ready for review.
- How to link the PR back to the task in `sprint-log.md`.

---

## agents/builder/prompts/live-edit.md
**What it is:** The prompt used when a human requests an immediate change during the day (outside the night cycle).

**Must answer (as prompt instructions):**
- Before touching any file, write the change to `memory/human-overrides.md` with: timestamp, what the human asked for, what files will be changed.
- Implement the change on a branch named `live/{game-name}/{short-description}`.
- Open a PR immediately after implementation, labelled `live-edit`.
- Write a note to `games/{game-name}/overrides.md` summarising what was changed and why, so Planner will not reverse it.
- Do not combine live edits with any in-progress sprint tasks — treat it as an isolated change.

---

## agents/builder/mcp-usage/roblox-mcp.md
**What it is:** Builder's internal guide for using the Roblox Studio MCP server — what it can do, what it cannot do, and the patterns that work reliably.

**Must cover:** How to open and connect to a Roblox Studio session, how to read and write scripts via MCP, how to manipulate the Workspace hierarchy, known operations that require Studio to be in a specific mode (edit vs test), operations that are not supported and must be done via direct Luau script instead, and how to confirm that a change has been saved correctly.

---

## agents/builder/mcp-usage/blender-mcp.md
**What it is:** Builder's internal guide for using the Blender MCP server for 3D asset creation and export.

**Must cover:** How to open Blender and create a new scene, the standard export pipeline (FBX or OBJ for Roblox import), polygon budget guidelines, texture size limits, how to batch-export multiple assets in one session, known Blender operations that fail via MCP and must be avoided, and how to clean up temp scene files after export.

---

## agents/builder/mcp-usage/chrome-mcp.md
**What it is:** Builder's internal guide for using Chrome MCP for documentation lookups and DevForum access.

**Must cover:** When Builder is allowed to use Chrome (documentation lookup only, not general browsing), how to navigate to Roblox Creator Docs efficiently, how to search DevForum for a specific topic, how to extract and return a relevant code snippet, and what to do when a page requires login (do not attempt login, mark the source as unavailable).

---

## agents/builder/mcp-usage/github-mcp.md
**What it is:** Builder's internal guide for all version control operations via GitHub MCP.

**Must cover:** How to create a branch, how to commit with the correct message format, how to open a PR with the required labels and description, how to add a PR comment, how to check if a dependency PR has been merged before starting a task, branch naming conventions (`feature/{game}/{task-id}`, `fix/{game}/{pr-number}`, `live/{game}/{description}`), and what to do if a merge conflict is detected (abort, flag in sprint log, do not attempt to resolve automatically).

---

## agents/qa/AGENT.md
**What it is:** The complete operational spec for the QA agent, which validates every Builder PR before it can be merged.

**Must answer:**
- When does QA run? (Triggered by a new PR from Builder — not on a schedule.)
- What does QA check? (Luau lint, spec compliance, absence of regressions, basic playtest validation.)
- What are QA's two possible verdicts: approve (merge is allowed) or block (PR is sent back to Builder with a failure report).
- How does QA communicate a block? (PR comment with specific failure reasons, label change to `qa-failed`, entry in sprint log.)
- What does QA never do? (Modify source files, merge PRs, communicate directly with Planner — only Builder and the PR system.)
- Under what circumstances does QA escalate to a human? (Security-relevant change, data-loss risk, spec conflict it cannot resolve.)

**Sections to include:** Role summary, Trigger, Checks performed, Verdict system, Communication channels, Off-limits actions, Human escalation criteria.

---

## agents/qa/prompts/feature-test.md
**What it is:** The prompt used when QA validates a feature PR against the original task spec.

**Must answer (as prompt instructions):**
- How to read the PR diff and understand what was changed.
- How to look up the original task in `sprint-log.md` and the original spec in `specs/{game-name}/spec.md`.
- The specific checks: does the implementation match the spec, are all required services used correctly, are there any obvious runtime errors in the code, are RemoteEvents named and secured correctly.
- How to write a structured test result (pass/fail per check, with evidence for any failure).
- The threshold for a pass verdict (all critical checks pass; minor style issues are comments, not blockers).

---

## agents/qa/prompts/regression-check.md
**What it is:** The prompt used when QA checks that a new PR does not break previously merged features.

**Must answer (as prompt instructions):**
- How to identify which existing files the PR diff touches.
- How to look up what features depend on those files (via `progress.md` and the task dependency map).
- What a regression looks like in a Luau codebase (changed function signature, renamed RemoteEvent, removed service).
- How to produce a regression risk report even if no regression is confirmed (so Builder knows what to watch for during playtest).

---

## agents/qa/prompts/playtest-eval.md
**What it is:** The prompt used when QA does a high-level evaluation of whether a feature behaves correctly in a Roblox Studio playtest session.

**Must answer (as prompt instructions):**
- How to trigger a playtest via Roblox Studio MCP.
- What to observe during the playtest (console errors, UI responsiveness, game mechanic behaviour).
- How to document observations in a structured format.
- The pass criteria for a playtest eval (no console errors, mechanic triggers correctly, no visible broken state).
- How to capture evidence (console output, Studio output log) and attach it to the PR.

---

## agents/qa/checklists/luau-lint.md
**What it is:** A static checklist of Luau-specific code quality rules that QA applies to every PR diff.

**Must include:** Rules about strict mode usage, type annotations, service access patterns (`game:GetService()` only), RemoteEvent security (server-side validation always), no use of deprecated APIs, no `wait()` (use `task.wait()` instead), variable naming conventions, module structure expectations, and maximum script length guidelines.

---

## agents/qa/checklists/roblox-publish.md
**What it is:** A pre-publish readiness checklist that QA applies before a game milestone is considered complete enough to publish or share for playtesting.

**Must include:** All required game services are present and configured, DataStore is correctly implemented (if used), monetisation items are correctly configured (if in spec), game description and thumbnail placeholder exist, no `print()` debug statements remain in production scripts, all RemoteEvents are secured, and performance basics (no unbounded loops in RunService, no memory leaks in cleanup).

---

## agents/reporter/AGENT.md
**What it is:** The complete operational spec for the Reporter agent, which generates the morning digest and tonight's plan every day at 5 am.

**Must answer:**
- What does Reporter read to build the morning digest? (`sprint-log.md` for last night's tasks, PR status via GitHub MCP, `memory/blockers.md`, `memory/decisions.md` for any new decisions.)
- What does Reporter read to build tonight's plan? (`games/{game-name}/plan.md` current milestone, Planner's sprint preview if available.)
- What file does Reporter produce? (`reports/morning/{YYYY-MM-DD}.md`.)
- What does Reporter never do? (Modify source files, plan.md, or any agent config — it is read-only.)
- Who is the intended reader of the report? (A human who has not been watching the night cycle.)

**Sections to include:** Role summary, Trigger, Inputs, Outputs, Intended audience, Off-limits actions.

---

## agents/reporter/prompts/morning-digest.md
**What it is:** The prompt used to generate the "last night" section of the morning report.

**Must answer (as prompt instructions):**
- How to read `sprint-log.md` and extract: tasks completed, tasks failed, tasks skipped, total PRs opened, total PRs merged.
- How to summarise failures in plain human language (what failed, why, what Planner did about it).
- How to summarise the state of each active game in one paragraph each.
- How to list open PRs that still need human review.
- How to flag any blockers in `memory/blockers.md` that a human needs to resolve.
- Tone: factual, concise, no filler text. A human should be able to read the digest in under 3 minutes.

---

## agents/reporter/prompts/tonights-plan.md
**What it is:** The prompt used to generate the "coming night" section of the morning report.

**Must answer (as prompt instructions):**
- How to read the current milestone for each active game and identify what tasks are next.
- How to present the plan in a human-readable format (not raw JSON — a short bulleted list per game).
- How to flag anything that will block tonight's sprint if not resolved by the human today (e.g. a TBD PR that needs clarification, a blocker that requires human input).
- How to include an estimated completion percentage for the current milestone.

---

## agents/reporter/prompts/weekly-summary.md
**What it is:** The prompt used once a week to generate a cross-game rollup covering the past seven days.

**Must answer (as prompt instructions):**
- How to read all morning reports from the past seven days and extract key metrics (tasks completed, PRs merged, failures, blockers resolved).
- How to summarise progress per game (milestone achieved, estimated nights remaining).
- How to incorporate the weekly market research output.
- How to highlight any systemic issues that recurred across multiple nights (same agent failing repeatedly, same type of task always taking longer than estimated).

---

## agents/reporter/templates/morning-report.md
**What it is:** The fixed-structure template that every morning report file follows. Reporter fills in the variable sections; the section headers and order never change.

**Sections the template must define:** Report date and night window covered, Last night summary (tasks done / failed / skipped counts), Per-game status table, PRs merged last night, PRs awaiting human review, Active blockers (human action required), Tonight's plan per game, Any notes from Planner's mid-night replanning.

---

## agents/reporter/templates/weekly-summary.md
**What it is:** The fixed-structure template for the weekly rollup report.

**Sections the template must define:** Week number and date range, Total tasks completed this week, Total PRs merged, Failures and resolutions, Per-game milestone progress, Market research highlights, New game ideas proposed, Recommended focus for next week.

---

## agents/market-researcher/AGENT.md
**What it is:** The complete operational spec for the Market Researcher agent, which runs once a week and is entirely separate from the nightly build cycle.

**Must answer:**
- Exactly when does it run and how is it triggered?
- What sources does it access? (Roblox game charts via Chrome MCP, DevForum trending posts, community Discords if accessible.)
- What are its two outputs? (A market research report in `reports/weekly/market-research/` and a game ideas file in `reports/weekly/game-ideas/`.)
- What format should new game ideas follow so they can be promoted directly into a spec file?
- Does it ever modify existing game plans or memory? (No — it only writes to `reports/weekly/`.)

**Sections to include:** Role summary, Trigger, Source access, Outputs, Idea format standard, Off-limits actions.

---

## agents/market-researcher/prompts/trending-scan.md
**What it is:** The prompt used when Market Researcher scrapes and analyses the current Roblox top games charts.

**Must answer (as prompt instructions):**
- How to navigate to the Roblox charts via Chrome MCP.
- What data to extract per game: name, genre, active players, monthly visits, approximate age (when published).
- How to identify which games are newly trending vs long-term incumbents.
- How to identify games that are trending upward vs games that have peaked.
- How to output a structured table of findings.

---

## agents/market-researcher/prompts/revenue-analysis.md
**What it is:** The prompt used when Market Researcher analyses how top games monetise.

**Must answer (as prompt instructions):**
- What monetisation signals to look for: game passes, developer products, VIP servers, cosmetic systems, battle passes.
- How to identify the primary monetisation model of each top game from public signals.
- How to estimate relative revenue tier (top 10%, top 25%, etc.) from active player counts and known Roblox economy benchmarks.
- How to summarise monetisation patterns across the top 20 games into 3–5 dominant models.

---

## agents/market-researcher/prompts/gap-analysis.md
**What it is:** The prompt used to identify under-served niches in the current Roblox market — genres or mechanics that have high player demand but low-quality supply.

**Must answer (as prompt instructions):**
- How to identify genres with high search volume but few well-rated games.
- How to identify mechanics that appear in player wishlist threads or DevForum requests but are not well-executed in existing games.
- How to cross-reference gaps against games already being built in this agency (do not propose a game that duplicates active work).
- How to output a ranked shortlist of gaps with supporting evidence.

---

## agents/market-researcher/prompts/idea-generation.md
**What it is:** The prompt used to convert gap analysis findings into new game concept proposals that are ready to be turned into spec files.

**Must answer (as prompt instructions):**
- How to structure a game idea proposal so it can be directly promoted into a spec file.
- Required fields per idea: title, genre, core mechanic (one sentence), monetisation model, why now (the market signal that supports it), estimated complexity (small / medium / large), suggested first milestone.
- How many ideas to generate per weekly run (aim for 3–5 high-quality ideas, not a long list of shallow ones).
- Quality bar: an idea should not be proposed unless there is a clear market signal and a believable core mechanic.

---

## agents/market-researcher/sources.md
**What it is:** The curated list of sources Market Researcher is allowed to use, with notes on reliability and access method.

**Must include:** Roblox games chart URL, Roblox DevForum trending section URL, known community analytics sites (e.g. Rolimons, RTrack if publicly accessible), and a list of known unreliable or SEO-gamed sources to avoid.

---

## workflows/night-cycle.md
**What it is:** The authoritative step-by-step runbook for what happens between 11 pm and 5 am. Any agent or human reading this should be able to understand the full sequence without looking at any other file.

**Must cover:**
1. Pre-flight checks (are all MCP servers reachable, is there an active sprint-log for each game).
2. Planner: read overrides, read blockers, read TBD PRs, generate sprint.
3. Builder: read sprint, begin tasks in order.
4. QA: triggered per PR, runs in parallel with Builder.
5. Planner monitoring: how often it checks progress, what triggers a replan.
6. Error handling: what happens if Builder crashes mid-task, what if QA is unreachable.
7. Wind-down at 5 am: Builder marks in-progress tasks as paused, Planner writes final sprint status, Reporter is triggered.
8. Diagram or table showing the full timeline visually.

---

## workflows/day-cycle.md
**What it is:** A guide for the human reviewer covering what to do each day between 5 am and 11 pm.

**Must cover:**
- How to read the morning report (where the file is, what to look for first).
- How to review PRs (which ones need human sign-off vs which are auto-merged after QA).
- How to leave feedback on a PR (comment format the agents can parse, TBD label for work to be picked up at night).
- How to request a live edit (what command or process triggers the apply-live-edit script).
- How to mark a blocker as resolved.
- What a human should never do during the day cycle (commit directly to main, edit `plan.md` or `memory/` manually, merge a PR that QA has blocked).

---

## workflows/weekly-research.md
**What it is:** The runbook for the weekly market research run.

**Must cover:**
1. When it runs and how it is triggered.
2. The sequence: trending-scan → revenue-analysis → gap-analysis → idea-generation.
3. Where outputs are written.
4. How a human reviews and acts on the outputs (how to promote an idea to a spec file).
5. How long the run typically takes and what to do if it exceeds the time budget.

---

## workflows/live-edit-protocol.md
**What it is:** The exact protocol for handling a human's real-time change request. This is the most human-safety-critical workflow in the system because it involves immediately modifying game files and permanently logging the change as an override.

**Must cover:**
- Step 1: Human makes a request (what format/command).
- Step 2: Builder reads the request and writes to `memory/human-overrides.md` BEFORE touching any code.
- Step 3: Builder creates a `live/` branch and implements the change.
- Step 4: Builder opens a PR labelled `live-edit`.
- Step 5: QA validates the PR.
- Step 6: Human reviews and merges (or rejects).
- Step 7: `games/{game-name}/overrides.md` is updated.
- What happens if the human reverses their own live edit the next day (it replaces the previous override entry, does not stack).
- What happens if a live edit conflicts with a task in tonight's planned sprint (the sprint task is removed).

---

## workflows/pr-review-protocol.md
**What it is:** The protocol covering how agents handle every type of PR that exists in the system.

**Must cover:** The four PR types (feature, fix, asset, live-edit) and their different review paths, how QA approval works, how auto-merge is triggered, how human-required review is flagged, how TBD PRs are processed by Planner at night, and what happens to a PR that has been open for more than 3 nights without resolution.

---

## memory/README.md
**What it is:** The operating manual for the memory system — explaining to any agent or human what the memory files are, who can write to them, and why they are the most important files in the repo.

**Must answer:**
- What is the purpose of the memory system? (Persist human intent and agent decisions across nights so context is never lost.)
- Which files exist and what each one tracks.
- Who can write to each file (strict permissions: only specified agents, never Builder, never QA).
- The append-only rule for `human-overrides.md` — entries are never deleted, only superseded.
- How Planner reads memory at the start of every night.
- How Reporter reads memory each morning.
- What happens if a memory file becomes too long (archiving policy).

---

## memory/human-overrides.md
**What it is:** The append-only log of every change a human has made or requested. This file is the system's guarantee that human decisions are never reversed by autonomous agents.

**Entry format must include:** Timestamp, game name, what the human changed or requested, which files were affected, which agent applied the change, and a flag indicating whether this override is still active or has been superseded by a later override.

**Rules to document in the file header:**
- Entries are never deleted.
- A newer entry can supersede an older one on the same feature — mark the old one superseded.
- Planner must read this entire file before every sprint and remove any planned tasks that conflict with active overrides.

---

## memory/decisions.md
**What it is:** A log of significant architectural or design decisions made by agents, with the rationale recorded so future agents do not reverse them without cause.

**Entry format must include:** Timestamp, game name, which agent made the decision, what was decided, why (the reasoning or constraint that led to the decision), and whether the decision is still active or has been revisited.

**What qualifies as a decision worth logging:** Choosing one implementation approach over another, deciding to scope a feature differently than the spec implied, choosing a specific Roblox service or pattern, deciding to defer a task to a later milestone.

---

## memory/blockers.md
**What it is:** The current list of all known blockers across all active games — things that prevent a task from being worked on.

**Entry format must include:** Timestamp added, game name, task ID blocked, blocker description, blocker type (missing dependency / human input required / MCP server issue / spec ambiguity), who is responsible for resolving it, and resolved timestamp when cleared.

**Rules to document in the file header:**
- Planner reads this before every sprint and skips any task with an active blocker.
- When a blocker is resolved, it is marked resolved with a timestamp — not deleted.
- Reporter surfaces all active unresolved blockers in every morning report.

---

## memory/game-states/{game-name}.md
**What it is:** A running snapshot of the current state of a single game. One file per game, updated after every night.

**Must track:** Current milestone name and number, percentage complete, list of completed features (by task ID), list of in-progress features, list of deferred features (and why deferred), last night's sprint result summary, known technical debt items, and estimated nights remaining to completion.

---

## specs/template.md
**What it is:** The canonical format that every game spec file must follow. When a human writes a new spec, they fill in this template. When Architect reads a spec, it expects this exact structure.

**Sections the template must define:**
- Game title and one-sentence concept.
- Genre and target audience.
- Core game loop (what does a player do every 30 seconds, every 5 minutes, every session).
- Feature list (each feature as a short paragraph: what it is, how it works, what it connects to).
- Art direction notes (style, colour palette, asset mood).
- Monetisation model (which game passes, developer products, or cosmetic systems).
- Technical constraints (any Roblox services required, performance targets, platform targets).
- Out of scope (explicit list of things the spec does NOT include, to prevent scope creep).
- Success criteria (what does a complete, shippable v1 look like).
- Open questions (anything the human is unsure about that the Architect should flag).

---

## games/{game-name}/plan.md
**What it is:** The living milestone and task plan for a single game. Created by Architect, updated by Planner. This is the primary source of truth for what needs to be built.

**Must contain:** List of all milestones in order, each milestone's tasks with status, estimated vs actual nights per milestone, current active milestone highlighted, dependency graph summary, and a changelog section showing when and why the plan was updated.

**Write rules:** Only Planner and Architect may update this file. Builder and QA are read-only. Humans should not edit this directly — they influence it via spec changes or override entries.

---

## games/{game-name}/progress.md
**What it is:** A running human-readable log of what has been built, when, and any notable notes from Builder or QA. The difference from `sprint-log.md` is that progress.md is cumulative and narrative; sprint-log.md is per-night and structured.

**Entry format:** Date, task completed, PR number, any notes (e.g. "implemented with a workaround due to Roblox API limitation — see decisions.md entry 2024-03-15").

---

## games/{game-name}/sprint-log.md
**What it is:** The structured per-night record of every sprint. Planner writes to this at the start of each night; Builder and QA update task statuses during the night.

**Entry format per night:** Sprint ID, date, tasks (each with status and timing), Planner's mid-night replan notes if any, QA results summary, final sprint status (complete / partial / failed), and a brief Planner summary of what was accomplished.

---

## games/{game-name}/overrides.md
**What it is:** A game-scoped copy of the overrides relevant to this specific game, extracted from `memory/human-overrides.md` for quick reference. This is a read convenience — the canonical record is always `memory/human-overrides.md`.

**Must contain:** Same entry format as the global overrides file, but filtered to this game only. Updated by the live-edit process whenever a new override is added for this game.

---

## reports/morning/{YYYY-MM-DD}.md
**What it is:** The daily morning report generated by the Reporter agent. One file per day. Follows the structure defined in `agents/reporter/templates/morning-report.md`.

**Note for file description purposes:** This file is generated, not hand-written. Its structure is determined by the template. What matters here is that the file is named correctly, stored in the right directory, and that the Reporter is writing it by 5 am every morning.

---

## reports/weekly/market-research/{YYYY-WW}.md
**What it is:** The weekly market research output generated by Market Researcher. Named by ISO year and week number.

**Must contain:** Trending game table (top 20), monetisation model breakdown, gap analysis findings, and a comparison to last week's findings to identify what has changed.

---

## reports/weekly/game-ideas/{YYYY-WW}.md
**What it is:** The new game ideas generated by Market Researcher each week, ready for human review and potential promotion into spec files.

**Must contain:** 3–5 game idea proposals, each in the format defined by `agents/market-researcher/prompts/idea-generation.md`, plus a recommendation ranking with brief rationale for why one idea is prioritised over the others.

---

## scripts/launch-night-cycle.sh *(description only)*
**What it does:** Entrypoint script that kicks off the full night cycle. Runs pre-flight checks, invokes Planner, then Builder, then monitors until the 5 am cutoff at which point it triggers the morning report.

---

## scripts/launch-morning-report.sh *(description only)*
**What it does:** Entrypoint script that invokes the Reporter agent to generate today's morning report from last night's sprint logs and PR data.

---

## scripts/launch-weekly-research.sh *(description only)*
**What it does:** Entrypoint script that invokes the Market Researcher agent for the full weekly research and idea generation run.

---

## scripts/apply-live-edit.sh *(description only)*
**What it does:** Entrypoint script that a human runs to trigger a live edit. Takes the change request as an argument or reads it from a prompt. Invokes Builder in live-edit mode, which writes to overrides first, then implements the change.