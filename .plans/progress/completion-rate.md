# Completion Rate Dashboard

Last reviewed: 2026-09-02 (rev. 42)

## Scoring method

Only the required project scope is included in the headline rate. Optional and future features do not reduce required completion.

- Complete item: 1 point
- Partial or unverified item: 0.5 point
- Not started item: 0 points

Implementation figures use focused tests plus direct interface review. The
2026-09-02 complete run reports 964 passing and 6 failing assertions. The six
failures are stale UI-structure checks following deliberate dashboard,
publication-action, and Faculty-roster changes.

## Current completion

| Area | Complete | Partial | Not started | Weighted rate |
|---|---:|---:|---:|---:|
| Foundation and authentication | 6 | 0 | 0 | 100% |
| Module 1 implementation | 6 | 0 | 0 | 100% |
| Module 1 HCI deliverables | 3 | 1 | 0 | 88% |
| Module 2 implementation | 6 | 0 | 0 | 100% |
| Module 2 HCI deliverables | 3 | 1 | 0 | 88% |
| Week 9 integration review | 0 | 2 | 2 | 25% |
| Module 3 implementation | 9 | 0 | 0 | 100% |
| Module 3 HCI deliverables | 3 | 1 | 0 | 88% |
| Module 4 implementation | 10 | 0 | 0 | 100% |
| Module 4 HCI deliverables | 3 | 1 | 0 | 88% |
| Shared HCI and visual design | 13 | 0 | 0 | 100% |
| Final assembled deliverables | 6 | 1 | 2 | 72% |

## Headline rate

**Required project completion: 91%**

Calculation: 68 complete points + 7 partial items at 0.5 point each = 71.5 weighted
points out of 79 required checklist points, rounded to 91%.

The percentage is unchanged because the latest work strengthens shared
navigation, course-page consistency, and question-authoring usability rather
than adding a missing graded module. Verification confidence remains partial
until the six stale assertions are reconciled.

## If the optional scope is included

The headline above deliberately excludes optional work, per the scoring method.
For reference, this is what including it looks like.

`addtional.md` and the checklist's *Optional and future work* section describe
**the same work at two granularities** — 157 detailed sub-requirements against a
42-item roll-up. Counting both would double-count, so each figure below counts
it once.

| View | Weighted | Total | Rate |
|---|---:|---:|---:|
| Required only (headline) | 71.5 | 79 | **91%** |
| Optional roll-up only | 20 | 42 | 48% |
| **Required + optional roll-up** | **91.5** | **121** | **76%** |
| Required + full `addtional.md` detail | 156.5 | 240 | 65% |

**76% is the fairer combined figure.** The 42 roll-up items sit at roughly the
same granularity as the 79 required ones, so the two are comparable. Using the
157 detailed items instead produces 56%, but that is an artefact of how finely
the optional work happens to be written: optional items would outweigh required
ones 2:1 by count alone, so the same amount of finished work scores lower purely
because the wishlist was documented in more detail than the assignment.

Neither combined figure should replace the headline. `addtional.md` states that
"the four assignment modules remain the priority", and none of its items are
graded.

## Supporting views

- **Core implementation only:** 100% by feature checklist. Focused suites pass, but six assertions in three complete-suite files need reconciliation.
- **HCI documentation and final deliverables:** 76% — requirements, ERD, flowcharts, storyboards, interface/dialog designs, documented test cases, and a 964-passing-assertion automated baseline now exist. What remains genuinely cannot be produced from the code: usability findings from real participants, screenshots, and the assembled report.
- **Shared visual/HCI polish:** 100% — one navigation model across all three roles, every save confirms itself, WCAG AA contrast throughout, and a completed small-screen pass.

## Interpretation

Both the prototype and its documentation are now largely complete. All four
modules are at 100% implementation, the foundation is at 100%, shared design is
at 100%, and the HCI deliverables have gone from 0% to 76%.

What remains cannot be generated from the code:

1. **Usability findings** (4 points) — the protocol, tasks and recording sheets are ready in `docs/usability-protocol.md`, but the sessions must be run with real participants. Fabricating findings would misrepresent the evaluation.
2. **Screenshots** (1 point) — capture each page from a browser. `docs/storyboards.md` names every frame worth capturing, in order.
3. **The final report** (1 point) — the documents in `docs/` are its raw material; assembling and writing it is the remaining authorship.
4. **Per-module report sections** (4 half-points) — narrative around the evidence already gathered.
The required feature scope is implemented. Remaining work includes coursework
deliverables and regression-test reconciliation.

## Latest verification status

- Full run: **964 passed, 6 failed**.
- `t_admin_modern.js`: one outdated management-card description assertion.
- `t_publish.js`: one outdated draft review/publish action assertion.
- `t_relationship_rules.js`: four outdated management-description and Faculty-roster/tab assertions.
- The former `t_m3.js` reorder-control crash is resolved; all 20 assertions pass.

## Update procedure

When work changes:

1. Update the related status in `checklist.md`.
2. Add an evidence-backed entry to `audit-log.md`.
3. Recount complete, partial, and not-started items here.
4. Recalculate the weighted percentage.
5. Change the review date.
