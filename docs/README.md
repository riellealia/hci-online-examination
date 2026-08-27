# Project Documentation

HCI deliverables for the Online Examination System. Each file maps to entries in
`../.plans/plan.md` and `../.plans/progress/checklist.md`.

| Document | Deliverable it covers | Status |
|---|---|---|
| [requirements.md](requirements.md) | Requirements analysis for all four modules | Complete |
| [data-model-erd.md](data-model-erd.md) | ERD covering all implemented relationships | Complete |
| [flowcharts.md](flowcharts.md) | Main and module-level flowcharts | Complete |
| [storyboards.md](storyboards.md) | Admin, Faculty and Student storyboards | Complete |
| [interface-design.md](interface-design.md) | Interface/control designs; form, validation-state and dialog designs | Complete |
| [test-cases.md](test-cases.md) | Module test cases | Complete — generated from a live suite run |
| [usability-protocol.md](usability-protocol.md) | Usability findings | **Instrument only — you must run the sessions** |

## What still needs you

Three deliverables cannot be produced from the code and are deliberately not
attempted here:

1. **Usability findings.** `usability-protocol.md` gives you the tasks, recording
   sheets and heuristics. The findings themselves must come from real
   participants.
2. **Screenshots.** Open each page in a browser and capture it. The storyboards
   name every frame worth capturing, in order.
3. **The final report.** These documents are its raw material, not a substitute
   for it.

## Viewing the diagrams

The ERD and flowcharts are written in Mermaid. They render automatically on
GitHub, and in VS Code with the *Markdown Preview Mermaid Support* extension
(`Ctrl+Shift+V` to preview). To put them in a DOCX report, preview them first,
then screenshot.

## Relationship to the rest of the project

```
html/        the prototype itself
css/         style.css (page styles) + shared-ui.css (tokens, accents, components)
js/          auth.js (session gate) · grading.js (marks -> rating) · ui.js (toasts, dialogs, profile menu)
assets/      logo, background, sample CSV files
tests/       267 automated assertions against the real pages
docs/        this folder
.plans/      plan, checklist, audit log, completion dashboard
```

## Honesty note

Every rule stated in these documents was read from the implementation rather than
from the plan, so the documentation describes what the system *does*, not what it
was hoped it would do. Where something is not implemented — section-level exam
targeting, an exam timer, automatic essay marking, loading states — it is named
as a limitation rather than quietly omitted.
