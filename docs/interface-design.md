# Interface Design Specifications & Design System

## 1. Design Philosophy & HCI Principles
The interface design is anchored in Jakob Nielsen's 10 Usability Heuristics and Don Norman's Principles of Interaction Design:

1. **Visibility of System Status**: Real-time feedback for auto-saved drafts (`Saved at HH:MM:SS`), visual timers, and clear breadcrumb trails.
2. **Match Between System and Real World**: Academic terminology reflecting university registrar operations (Units, Terms, Offerings, Rosters, Overload).
3. **User Control & Freedom**: Save Draft & Exit options, repositionable navigation panels, confirmation dialogs preventing unintended actions.
4. **Consistency & Standards**: Uniform header bar, consistent typography, standard button placements (`Previous` on left, `Next` on right).
5. **Error Prevention**: Collision detection for overlapping courses, confirmation prompts prior to irreversible exam submission or account deactivation.
6. **Recognition Rather than Recall**: Clear visual question status badges (Answered `✓`, Unanswered ` `, Flagged `🚩`, Current `●`).
7. **Flexibility & Efficiency of Use**: Draggable navigator handle enabling users to place the question jump-palette wherever optimal on their screen.
8. **Aesthetic and Minimalist Design**: High-contrast, clean layout focusing student attention strictly on the active question without cognitive clutter.
9. **Help Users Recognize, Diagnose, and Recover from Errors**: Specific actionable error messages instead of generic error codes.
10. **Accessibility & Universal Design**: Strict WCAG 2.1 AA compliance across light and dark visual themes.

---

## 2. Design Tokens & Color Palette

### Primary Role Accent Colors
Each role features a distinct, cohesive accent palette to guarantee instant situational awareness:

| Role | Accent Color | Hex Code | Border / Highlight Tone | Purpose |
|---|---|---|---|---|
| **Administrator** | Deep Royal Navy | `#1A365D` | `#2B6CB0` | Authority, governance, audit controls |
| **College Dean** | Imperial Purple | `#44337A` | `#6B46C1` | Executive oversight, strategic approvals |
| **Faculty Coordinator** | Forest Teal | `#234E52` | `#319795` | Timetable coordination, section allocations |
| **Professor** | Burgundy / Crimson | `#742A2A` | `#9B2C2C` | Pedagogy, exam creation, grade evaluations |
| **Student** | Emerald Green | `#22543D` | `#38A169` | Focus, task execution, progress indicators |

### Availability Status Palette (Non-Color Dependent)
In compliance with accessibility standards, every color badge is paired with a distinct icon and explicit text label:

* **Available (6+ remaining slots)**:
  * Token: `var(--status-available)`: Background `#C6F6D5`, Text `#22543D`, Border `#9AE6B4`
  * Indicator: `🟢 Available (N slots)`
* **Low Availability (1–5 remaining slots)**:
  * Token: `var(--status-low)`: Background `#FEFCBF`, Text `#744210`, Border `#F6E05E`
  * Indicator: `🟡 Low Availability (N slots remaining)`
* **Full (0 remaining slots)**:
  * Token: `var(--status-full)`: Background `#FED7D7`, Text `#742A2A`, Border `#FEB2B2`
  * Indicator: `🔴 Full (0 slots)`

---

## 3. Typography & Hierarchy

The interface uses standard system sans-serif font stacks (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica Neue`, `sans-serif`) to ensure maximum legibility and zero external font network latency.

* **Display Heading (H1)**: 28px / Line Height 36px / Bold 700
* **Section Heading (H2)**: 22px / Line Height 28px / Semi-Bold 600
* **Card Heading (H3)**: 18px / Line Height 24px / Semi-Bold 600
* **Body Text**: 15px / Line Height 22px / Regular 400
* **Caption / Metadata**: 13px / Line Height 18px / Medium 500
* **Code / Timetable Monospace**: `Consolas`, `Monaco`, `Courier New` / 14px

---

## 4. UI Component Specifications

### 4.1 Draggable Floating Question Navigator
* **Behavior**: Mounted as a floating card over the examination workspace.
* **Handle**: Accessible draggable drag-handle (`⠿ Drag Navigator`) utilizing pointer-events with viewport boundary clamping so it cannot be dragged off-screen.
* **Grid**: 5-column grid of circular or rounded-rectangular question pills.
* **Pill States**:
  * Unanswered: Gray outline, transparent background.
  * Answered: Solid emerald background, white checkmark.
  * Flagged: Amber corner indicator with flag icon `🚩`.
  * Current: Thick high-contrast focus border with pulse outline.

### 4.2 Timetable Collision Alert Banner
* **Container**: Amber/Red striped accent border, light warning background.
* **Components**:
  * Icon: Warning triangle (`⚠️`).
  * Conflict Description: Names specific overlapping room, professor, or student section.
  * Recommendation: Automatically calculates and offers the next closest available timeslot.

### 4.3 Modal & Dialog Overlay Stack (`overlay-stack.js`)
* **Backdrop**: Semi-transparent dark overlay (`rgba(0, 0, 0, 0.55)` with CSS `backdrop-filter: blur(3px)`).
* **Keyboard Trapping**: Traps `Tab` key within the active modal; `Esc` key cancels safe dialogs.
* **Focus Management**: Initial focus shifts automatically to the safe action button (`Cancel`) rather than the destructive button to prevent accidental submissions.
