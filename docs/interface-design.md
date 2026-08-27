# Interface and Control Design

Covers the final deliverables *"Interface and control designs"* and
*"Form, validation-state, and dialog-box designs"*.

Everything described here is implemented in `css/shared-ui.css` and `js/ui.js`.

---

## 1. Design tokens

One set of tokens drives all three roles. Only the accent changes.

| Token | Value | Used for |
|---|---|---|
| `--r-sm` | 8px | Buttons, inputs, small controls |
| `--r-md` | 12px | List items, cards inside panels, toasts |
| `--r-lg` | 18px | Panels, modals, sidebar edge, profile panel |
| `--r-pill` | 999px | Avatars, status chips, badges |
| `--sh-xs … --sh-lg` | Layered, low-opacity | Depth instead of hard borders |
| `--line` / `--line-strong` | 8% / 14% black | Hairlines |
| `--ink` / `--ink-soft` | `#1f2933` / `#667085` | Primary and secondary text |

**Role accents.** Applied through `<body data-role="...">`:

| Role | Accent | Contrast on white |
|---|---|---|
| Admin | `#4A6FA5` muted blue | 5.11:1 |
| Faculty | `#3A7D78` muted teal | 4.79:1 |
| Student | `#487F53` muted green | 4.73:1 |

All three exceed the WCAG AA threshold of 4.5:1. The teal and green were
darkened from their first values, which measured 4.20:1 and 4.10:1 and failed.

**Softening.** Hard 1px borders were replaced with layered shadows and 8%
hairlines; every control, surface, table and dialog carries a radius from the
scale above; the sidebar has a rounded outer edge and pill-shaped items.


### Type scale and reading comfort

| Token | Value | Used for |
|---|---|---|
| `--fs-label` | 12px | Uppercase chips and badges only |
| `--fs-sm` | 13px | Secondary text, captions |
| `--fs-body` | 14px | Tables, form text, list content |
| `--fs-md` | 15px | Primary reading text |
| `--fs-lg` | 17px | Section headings |
| `--lh-body` | 1.6 | Everything read in sentences |
| `--lh-tight` | 1.35 | Headings |
| `--measure` | 70ch | Maximum prose line length |
| `--tap` | 40px | Minimum click-target height |

An audit found four legibility problems, all now fixed:

1. **51% of type was under 14px** — 63 of 123 declarations, including ten at
   10–11px. The floor is now 12px, and only labels sit there. The two remaining
   sub-12px values are `!` glyphs inside fixed-size discs, not read as text.
2. **No `line-height` was set anywhere**, so text fell back to the browser
   default of roughly 1.2. Body text is now 1.6.
3. **Prose ran the full 1100–1200px container**, giving 130–150 characters per
   line against a comfortable 45–75. Prose is now capped at 70 characters;
   tables keep the full width and scroll instead.
4. **Nine click targets measured 30–33px.** All controls now meet 40px, with
   in-row table actions at 34px. `.btn-take-exam` — the most important button
   in the system — was the worst at 30px.

Measured before and after:

| | Before | After |
|---|---:|---:|
| Declarations under 12px | 10 | 2 (glyphs only) |
| Declarations 12–13.9px | 53 | 40 |
| Declarations 14px and above | 60 | 84 |

---

## 2. Controls

| Control | Design |
|---|---|
| Primary button | Accent fill, white text, `--r-sm`, lifts on hover, presses down 1px on active |
| Destructive button | Red fill, only in confirmation dialogs, never the default focus |
| Secondary button | Neutral grey fill |
| Text input / select / textarea | Hairline border, accent border plus a 3px soft ring on focus |
| Sidebar item | Pill shape, accent tint on hover, solid accent when active |
| Status chip | Pill, always an icon or a word alongside the colour |
| Avatar | Circle of initials in the accent colour, ringed in white |

**Keyboard focus.** Every interactive element shows a 2px accent outline with a
2px offset on `:focus-visible`. This is deliberately separate from the hover
state so keyboard users get an indicator mouse users do not see.

---

## 3. Form design

Forms are labelled, grouped, and validated at the point of failure.

**Validation states.**

| State | Presentation |
|---|---|
| Neutral | Hairline border |
| Focused | Accent border + 3px soft accent ring |
| Invalid | Red border + red ring, `aria-invalid="true"`, message directly beneath |
| Message | Red text preceded by a filled `!` disc, so it reads as an error without relying on hue |

The invalid field receives focus, so the caret lands where the problem is.

**Ordering as prevention.** The student-allotment form asks for Subject before
Faculty so the lecturer list can be filtered to valid choices. This removes the
error rather than reporting it — Nielsen's *error prevention* in preference to
*error recognition*.

---

## 4. Feedback: toasts

Replaces every `alert()`. Non-blocking, so the form stays visible and editable
while the message is read.

| Type | Icon | Word | Accent |
|---|---|---|---|
| Success | ✓ | "Success:" | Green |
| Error | ! | "Problem:" | Red |
| Info | i | "Note:" | Role accent |

- Anchored top-right, stacked, dismissible, auto-clearing after ~4 seconds.
- Rendered inside a `role="status" aria-live="polite"` region.
- Every toast carries an **icon and a word**, so meaning survives without colour.

---

## 5. Dialog design

**Confirmation dialog** — replaces every `confirm()`.

```
┌───────────────────────────────────────────────┐
│  Delete faculty F1?                           │
│                                               │
│  Reyes, Maria will be removed, along with     │
│  their login, 3 exam(s) and all their         │
│  questions, their subject assignments, and    │
│  2 student enrolment(s).                      │
│                                               │
│  This cannot be undone.                       │
│                                               │
│                   [ Cancel ]  [ Delete ]      │
│                      ^focus     ^red          │
└───────────────────────────────────────────────┘
```

Design rules:

1. The title names **the specific record**, never "this item".
2. The body states **everything else that will be removed**, with counts.
3. Irreversible actions say so explicitly.
4. The destructive button is red; the safe one is neutral.
5. **Focus starts on Cancel**, so pressing Enter never destroys anything.
6. `role="alertdialog"`, `aria-modal`, labelled by title and described by body.
7. Escape and backdrop-click both cancel.
8. Focus returns to the element that opened the dialog.

**Content dialogs** (add/edit forms, CSV preview, exam preview, grading, settings)
share the same soft surface, heading, body, and a right-aligned action row.

---

## 6. Page states

| State | Where it appears |
|---|---|
| Empty | "No subjects enrolled yet…", "No questions added yet…", "No submissions yet…", "No exams created yet…" |
| Success | Toast after import, save, or grading |
| Validation | Inline field error plus a toast |
| Error | Toast; on login, a persistent inline region |
| Confirmation | Dialog for every irreversible action |
| Pending | "Pending" chip and "(so far)" marks while written answers await marking |

Loading states are not implemented: `localStorage` is synchronous, so no
operation in this prototype takes long enough to need one. This is a deliberate
omission, not an oversight.

---

## 7. Authentication error

The login page uses a persistent inline region rather than a toast, because the
message must stay visible while the user retypes.

- `role="alert"` and `aria-live="assertive"` — announced immediately.
- Both fields marked `aria-invalid`.
- Clears as soon as the user types.
- Does **not** reveal which field was wrong, so it cannot be used to discover
  which usernames exist.

---

## 8. Header profile menu

```
┌──────────────────────────────┐
│           ╭────╮             │
│           │ MR │  ← 76px     │
│           ╰────╯             │
│        Maria Reyes           │
│         ( FACULTY )          │
│           F1                 │
│ ──────────────────────────── │
│  ⚙  Settings                 │
│  ⏻  Log out                  │
└──────────────────────────────┘
```

A 42px circle of initials sits in the header. Clicking it opens the panel above:
enlarged avatar, name, role badge in the accent colour, ID, then the two actions.
Closes on click-away and Escape; `aria-expanded` tracks its state.

This replaced the standalone "Log out" button — two controls performing the same
action is redundant.

---

## 9. Grade presentation

| Element | Design |
|---|---|
| Rating chip | Pill: rating (`1.75`) plus a word (`Passed` / `Failed`) |
| Pass | Green tint, 5.57:1 |
| Fail | Red tint, 5.49:1 |
| Pending | Amber tint, 5.07:1, reads "Pending" |
| Partial marks | Suffixed "(so far)" and never given a rating |
| Scale reference | Collapsible panel showing the formula and all bands |

The rating is always accompanied by a word, so pass/fail never depends on hue.

---

## 10. Responsive behaviour

Desktop-first, as the plan specifies. Below 900px the admin card grid collapses
to one column and padding tightens; below 640px the profile panel becomes nearly
full-width. Wide tables scroll within their container rather than forcing the
page sideways.

A full small-screen pass is still outstanding and is recorded as partial in the
checklist.
