# Completion evidence

Last verified: 2026-10-08  
Branch: `oogabooga`

This evidence records the implemented behavior currently claimed by Natalia. It does not treat automated checks as representative-user usability findings, and it does not mark teammate-owned unfinished workflows complete.

## Verified workflows

| Issue | Outcome | Automated evidence | Visual evidence |
| --- | --- | --- | --- |
| #14 Dean Student-overload approvals | Dean sees current/proposed load, current policy limits, conflicts, reason, remarks, and history. Approval revalidates the Student, offering, load, policy ceiling, capacity, duplicate enrollment, and schedule conflicts. | `tests/t_academic_workflows.js`, `tests/t_approval_ui.js` | [Desktop](evidence/dean-overload-approvals.png), [mobile](evidence/dean-overload-approvals-mobile.png) |
| #15 Admin filterable logs | Admin filters all ten audit categories by date, actor, role, category, action, target, and result, with reset, summary, empty state, and export/table tools. | `tests/t_audit_log.js` | [Admin audit log](evidence/admin-audit-log.png) |
| #20 Dean logs and statistics | Dean sees scoped academic logs plus personnel, workload, approval-age, examination, grading, and participation summaries. | `tests/t_dean_reports.js` | [Statistics](evidence/dean-statistics.png), [activity logs](evidence/dean-activity-logs.png) |
| #29 Faculty Coordinator logs | Coordinator sees their own actions and related Dean decisions, classified and filtered across required workflow areas. | `tests/t_coordinator_logs.js` | [Desktop](evidence/coordinator-activity-logs.png), [mobile](evidence/coordinator-activity-logs-mobile.png) |
| #32 Demo accounts and filler data | All five roles, approvals, histories, notifications, schedules, intentional conflicts, load states, capacity states, examinations, reports, and audit activity are seeded with valid relationships. | `tests/t_rich_seed.js`, `tests/t_demo_sqlite_startup.js` | The role-workflow screenshots above use the versioned browser demo fixture. |

## Reproduce verification

Run every test file from the repository root:

```powershell
$failed = @()
$files = Get-ChildItem tests\t_*.js | Sort-Object Name
foreach ($file in $files) {
  node $file.FullName
  if ($LASTEXITCODE -ne 0) { $failed += $file.Name }
}
if ($failed.Count) { throw "Failed: $($failed -join ', ')" }
```

Regenerate screenshots with a locally installed Chrome or Edge browser:

```powershell
node scripts/capture-workflow-evidence.js
```

The capture script uses a temporary browser profile and the versioned browser demo fixture. It removes the temporary profile afterward and does not modify the SQLite database.

## Visual consistency and overlap check

- New Dean and Coordinator controls reuse `role-workspace`, `role-filter-bar`, `role-log-table`, `role-request-card`, existing topbar/sidebar components, and the established HTML-entity icon pattern.
- Desktop evidence uses a 1440-pixel viewport. Mobile evidence uses a 390-pixel viewport.
- The evidence pass found and corrected filter-bar clipping and request-card/action overflow before these screenshots were retained.
- Wide tables remain inside scroll containers; mobile action controls stack without extending the request card beyond the workspace.

## Current limitations

- This is an academic prototype, not a production deployment.
- Automated and headless-browser evidence does not replace usability sessions with representative users.
- Screenshots cover completed Natalia-owned workflows listed above. Final screenshots for teammate-owned offerings, full schedule editing, conflict-validation authoring, ordinary enrollment/transfers, and complete Professor/Student integration must be captured after those features are finished.
- Optional monitoring, advanced analytics/export, version-history, and production security/operations remain outside the completed evidence set.
