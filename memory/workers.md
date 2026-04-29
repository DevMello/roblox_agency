# Worker Registry

This file lists all machines registered to participate in the nightly build cycle.
Planner reads this before sprint generation to know which workers are available tonight.

**Write rules:**
- Each machine appends its own entry via `register-worker.sh`. Do not hand-edit.
- `last_seen` is updated by the worker after each task completion.
- Planner treats any worker with `last_seen` older than 2 hours as unavailable for tonight's sprint.
- A worker with `status: retired` is never assigned tasks.

---

<!-- Workers will be appended below by register-worker.sh -->
