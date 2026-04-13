# Agent Spawn Notes

Simple working note for improving multi-agent execution in this repo.

## Configuration Used

- Main supervisor: Codex
- Subagent model: `gpt-5.4`
- Preferred subagent reasoning effort: `xhigh`
- Typical subagent type used: `worker`

## Instructions To Try Next

- Read all project docs first.
- Read and follow backlog workflows before task work.
- Read the other tasks under the current parent task for context, but stay focused on the assigned task only.
- Give each agent exactly one task.
- Keep write ownership explicit.
- Tell agents not to commit and not to mark the task done.
- Require a short status format:
  - files changed
  - validation run
  - blockers
  - whether they need help
- Replace silent agents quickly instead of waiting.

## What Worked

- Single-task ownership reduced cross-task confusion.
- Explicit write-scope instructions helped avoid overlap.
- Backlog-driven planning worked when the task was spawned only once it was actually ready.
- Independent review after implementation caught real issues on completed tasks.
- Immediate per-task commits worked once enforced directly by the supervisor.
- Taking the blocking path locally prevented long stalls when agents were weak.

## What Did Not Work

- Some agents ignored the instruction to stay in discovery only and drifted.
- Some agents became non-responsive during planning.
- Some agents returned orchestration summaries instead of actual implementation progress.
- Some agents did not reliably answer status polls with the requested format.
- Spawning too early created supervision overhead before the task was truly ready.
- Waiting for weak agents was more expensive than replacing them or taking over locally.

## Concrete Failure Modes Seen

- Planner agents stalled and had to be shut down.
- A worker responded with repo orchestration text instead of task code progress.
- Review agents sometimes hung and needed replacement.
- Polling alone was not enough to recover low-signal agents.

## Better Rules For Next Iteration

- Spawn only when the task is fully unblocked and ready to move through the normal backlog workflow.
- Use a stricter first reply requirement:
  - discovery brief for planners
  - changed files plus validation for implementers
- Replace an agent after one missed meaningful status check.
- Default to local execution for the critical path.
- Use agents mainly for clearly bounded sidecar implementation or review work.
- Keep one supervisor-owned checklist per active task:
  - plan approved
  - implementation landed
  - validation run
  - review complete
  - commit created
