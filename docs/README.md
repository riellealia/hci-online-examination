# Project Documentation

This directory contains the HCI documentation for the Online Examination System.

The repository now has two documentation layers:

- **Current-system documentation** describes the implemented Admin, Faculty, and Student prototype.
- **Next-phase planning** proposes Admin, Dean, Faculty Coordinator, Professor, and Student roles.

Planned features must not be presented as completed behavior until they have been implemented and verified.

## Start here

### Current implementation

- [Project README](../README.md) — setup, current capabilities, and repository notes.
- [Current implementation plan](../.plans/plan.md) — original four-module scope and implementation baseline.
- [Progress checklist](../.plans/progress/checklist.md) — implementation and coursework status.
- [Completion dashboard](../.plans/progress/completion-rate.md) — completion and test summary.
- [Audit log](../.plans/progress/audit-log.md) — meaningful project changes and verification history.

### Next development phase

- [Planned system changes](../.plans/new/things-to-change.md) — short summary, priorities, and links.
- [Work claims](../.plans/new/.claim-work.md) — separate tasks that may be distributed among the three team members.
- [Role hierarchy and terminology](../.plans/new/overview/heirarchy.md) — official role names, permissions, lifecycle terms, and academic terms.
- [System relationships](../.plans/new/overview/relationship-diagram.md) — role, data, approval, rollover, and scheduling relationships.
- [Admin extended plan](../.plans/new/extended-detailed.plans/admin-extended-plan.md)
- [Dean extended plan](../.plans/new/extended-detailed.plans/dean-extended-plan.md)
- [Faculty Coordinator extended plan](../.plans/new/extended-detailed.plans/faculty-extended-plan.md)
- [Shared features and rules](../.plans/new/extended-detailed.plans/shared-extended-plan.md)
- [Optional extensions](../.plans/new/extended-detailed.plans/optional-extended-plan.md)

## HCI deliverables

### Requirements analysis

[requirements.md](requirements.md) documents the users, goals, inputs, outputs, rules, and constraints for the original four modules.

**Status:** Complete for the current three-role implementation. It will require revision if the five-role plan is implemented.

### Data model and ERD

[data-model-erd.md](data-model-erd.md) documents the implemented records and relationships.

**Status:** Complete for the current implementation. The proposed approval, curriculum, academic-period, role, schedule, and lifecycle records are currently planning material.

### Flowcharts

[flowcharts.md](flowcharts.md) contains the main and module-level workflows.

**Status:** Complete for the current implementation. New Dean and Faculty Coordinator flows must be added after their behavior is finalized.

### Storyboards

[storyboards.md](storyboards.md) contains the Admin, Faculty, and Student storyboards.

**Status:** Complete for the current implementation. Dean and Faculty Coordinator storyboards remain future work.

### Interface design

[interface-design.md](interface-design.md) describes controls, forms, validation states, dialogs, and shared interface behavior.

**Status:** Complete for the current interface. Revise it alongside implemented role and management changes.

### Test cases

[test-cases.md](test-cases.md) records module test cases based on the browser-level suite.

**Status:** Complete for the current implementation. New role, approval, lifecycle, rollover, load, capacity, and schedule-conflict tests must be added with their features.

### Usability protocol

[usability-protocol.md](usability-protocol.md) provides participant tasks, recording sheets, and heuristic-review guidance.

**Status:** Instrument only. The team must conduct the sessions and record real findings.

## What still requires manual coursework

1. **Professor confirmation of unresolved rules.** Confirm approval ownership, Faculty Coordinator appointment authority, normal-enrollment approval, additional-term naming, room scheduling, and exact load limits.
2. **Usability findings.** Run sessions with representative users and record observed results.
3. **Screenshots.** Capture implemented workflows and required states in the browser.
4. **Final report.** Assemble the verified documentation, screenshots, findings, limitations, and team contributions.
5. **Planning updates.** When an agreed planned feature is implemented, update its claim status and the current-system documentation.

## Using the new plans

1. Read [the overview](../.plans/new/things-to-change.md).
2. Read the shared rules and the relevant role plan.
3. Claim one or more tasks in [the work-claim page](../.plans/new/.claim-work.md).
4. Coordinate before editing shared authentication, storage, permissions, approval, or audit behavior.
5. Implement and verify the feature.
6. Ask the other members to review it.
7. Update the claim status and applicable documentation.

The team has three members, but the claim page deliberately contains many tasks. Each member may own multiple tasks; one primary claimer should be recorded for each task.

## Viewing diagrams

The ERD, relationship diagrams, and flowcharts use Mermaid. They render automatically on GitHub. In VS Code, use a Mermaid-compatible Markdown preview. For a DOCX report, render the diagram first and capture a clear image.

## Repository map

```text
html/          Current prototype pages
css/           Page styles and shared design components
js/            Authentication, storage, examination, grading, and UI behavior
assets/        Images and demonstration CSV files
tests/         Browser-level automated checks
docs/          Current HCI documentation
.plans/        Plans, progress records, and next-phase requirements
```

## Documentation honesty

Current documents must distinguish among:

- **Implemented** — present in the code and verified.
- **Planned** — accepted direction but not yet implemented.
- **Optional** — may be omitted without blocking the core workflow.
- **Needs confirmation** — requires a decision before implementation.

The last recorded complete automated run for the current prototype reported **964 passing and 6 failing assertions**. The six failures were documented as stale UI-structure expectations. Run the suite again before using that result in the final report.
