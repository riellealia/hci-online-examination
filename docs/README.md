# New Era University Online Examination System — HCI Documentation

This directory contains the complete Human–Computer Interaction (HCI) deliverables and engineering documentation for the **New Era University Online Examination System**.

---

## Deliverables Directory

| Document | Description | System Scope Covered | Status |
|---|---|---|---|
| [requirements.md](requirements.md) | Comprehensive requirements analysis: user roles, personas, inputs, outputs, business rules, and constraints | 5 roles, academic periods, lifecycle, exams & approvals | **Complete** |
| [data-model-erd.md](data-model-erd.md) | Entity-Relationship Diagrams (ERD), relational schemas, and data dictionary | Relational Supabase tables & SQLite persistence layer | **Complete** |
| [flowcharts.md](flowcharts.md) | End-to-end system and role workflow diagrams with Mermaid charts | Unified auth, exam lifecycle, Dean approvals, scheduling | **Complete** |
| [storyboards.md](storyboards.md) | Interaction storyboards, wireframes, and UI journey maps for all 5 roles | Admin, Dean, Coordinator, Professor, and Student | **Complete** |
| [interface-design.md](interface-design.md) | HCI design guidelines, component specifications, typography, contrast, and accessibility | Design tokens, color system, dialogs, responsive cards | **Complete** |
| [test-cases.md](test-cases.md) | Comprehensive test verification matrix, boundary conditions, and test results | 66 test suites across client, server, and database | **Complete** |
| [usability-protocol.md](usability-protocol.md) | Usability testing plan, participant task scripts, System Usability Scale (SUS), and heuristic review | Empirical HCI evaluation protocol & grading rubrics | **Complete** |
| [FINAL-HCI-PROJECT-REPORT.md](FINAL-HCI-PROJECT-REPORT.md) | Consolidated executive report and coursework submission package | Complete system synthesis, evaluation, and conclusion | **Complete** |

---

## System Architecture Summary

The prototype implements a unified academic management and examination environment with five distinct user roles:

1. **Administrator (`admin.html`)**: System maintenance, user lifecycle management (active/deactivate/archive/restore), curriculum versioning, academic terms/periods, role permissions, and full audit logs.
2. **College Dean (`dean.html`)**: Academic oversight, personnel appointments (Faculty Coordinators & Professors), approval workflows for subject offering assignments, student overload exceptions, and college-wide analytics.
3. **Faculty Coordinator (`coordinator.html`)**: Curriculum subject offerings, section allocation, weekly scheduling with collision detection, and student enrollment oversight.
4. **Professor (`faculty.html` / `professor.html`)**: Examination authoring (MCQ, Written/Essay, True/False, media questions), timer settings, draft management, manual grading, and roster insights.
5. **Student (`student.html`)**: Single-question examination runner with draggable navigation handle, question flagging, auto-save drafts, exam countdown timer, review modal, and transparent score breakdowns.

---

## Diagrams & Rendering
All diagrams in this directory use GitHub-native **Mermaid** markdown syntax. They render natively on GitHub and inside VS Code with Markdown Preview.
