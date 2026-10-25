# Explainable intelligence

The default provider is `rules-1.0`, implemented in `server/src/intelligence/rules.js`. It runs locally on the Node server, needs no model download or API key, and sends no records to an external AI service. It implements decision-support heuristics, not machine learning or a conversational assistant.

The service layer obtains authorized data before invoking the provider. Recommendation endpoints are read-only. Human-confirmed changes use normal task/project endpoints, which repeat permission, membership and revision checks.

## 1. Resource and task assignment

Task candidates must be active, permitted employees who belong to the project. A selected task team further restricts candidates to that team. Each candidate receives a 0–100 suitability score:

| Factor | Maximum | Formula or rule |
| --- | ---: | --- |
| Skill match | 30 | Required skills matched ÷ required skills; case-insensitive exact matching |
| Availability | 20 | 20 if no approved leave overlaps the work window, otherwise 0 |
| Workload | 20 | `20 × clamp(1 − utilization / 100, 0, 1)` |
| Experience | 15 | `15 × clamp(recordedYears / 5, 0, 1)` |
| Project familiarity | 10 | Manager, explicit member or member of an assigned team |
| Deadline fit | 5 | Deadline not passed and free fourteen-day hours cover remaining effort |

Each factor is rounded before summation. If required skills are absent, skill match uses a neutral 15/30 and emits a warning. A candidate is marked eligible only when the planning horizon has positive capacity and no approved-leave overlap. Eligibility does not guarantee enough free hours; overload warnings remain visible. Eligible candidates sort first, then score, then name.

Project resource planning ranks visible people, teams and departments. It uses an eight-hour representative task against the project's dates and skills; this is a suitability probe, not an estimate of the whole project's effort. Team scores are the mean of visible members' suitability; department scores are the mean of visible team scores. The UI offers human review before modifying project membership.

Limitations: skills are self/admin-recorded tags, exact matches do not infer related technologies, experience is not a competence assessment, and a fourteen-day capacity view is not a full future scheduling solver.

## 2. Project health and risk

Start with 100. Subtract the following penalties, then clamp to 0–100 and round:

| Signal | Penalty |
| --- | --- |
| Unfinished overdue tasks | `30 × overdueCount / totalTaskCount` |
| Explicit blockers or unmet dependencies | `20 × blockedCount / totalTaskCount` |
| Any HIGH/CRITICAL overdue task | 15 |
| Any overloaded contributor on unfinished work | 15 |
| Task windows overlapping approved leave | `10 × overlappingOpenTasks / totalTaskCount` |
| Project deadline passed with unfinished work | 30 |
| Deadline within seven days with unfinished work | Up to 20, proportional to unfinished tasks |

At least 80 is HEALTHY; 55–79 NEEDS_ATTENTION; below 55 HIGH_RISK. Each triggering signal appears in the explanation. A project with no tasks has no score and reports insufficient data. Archived or cancelled projects have no active risk score. Progress is completed task count divided by visible task count; it is not an effort-weighted earned-value metric.

This is a diagnostic index, not an empirically calibrated probability of delay. A team leader or employee can have a narrower task view than an administrator, so their permitted project metrics may differ. The scope note is part of the result.

## 3. Workload and balancing

The horizon is today plus the next 13 calendar days, inclusive, in UTC. Working dates follow the organization's selected weekdays.

```text
daily capacity = employee weekly hours / number of working weekdays
available dates = working dates excluding approved leave
capacity hours = daily capacity × number of available dates
```

For each unfinished task:

- If its deadline has passed, charge all remaining hours to the current horizon.
- If it starts beyond the horizon, charge zero.
- Otherwise, distribute remaining hours over working dates from the later of today or task start through its deadline, and charge the fraction inside the horizon.
- A weekend-only window due inside the horizon is conservatively charged in full.

```text
utilization = committed hours / capacity hours × 100
free hours = max(0, capacity hours − committed hours)
overloaded = committed hours > capacity hours
```

Zero capacity is explicitly flagged as unavailable; a finite display value is used instead of infinity. Remaining effort is not removed merely because leave reduces capacity: the conflict must remain visible. Cancelled and archived project work does not reserve active capacity; ON_HOLD work does.

Balancing examines visible unfinished work of overloaded people, excluding tasks already in REVIEW or DONE. Suggestions require another eligible project/team member with enough free capacity for the task. At most ten independent suggestions are returned. Apply one and recalculate; accepting several from the same snapshot could overbook a recipient. The engine never bulk-reassigns autonomously.

## 4. Leave impact and coverage

For the requester, inspect unfinished visible tasks whose windows overlap the leave request, plus overdue unfinished work. Count task deadlines during leave, high/critical tasks, affected project deadlines, and visible downstream tasks depending on the affected work.

- HIGH: a high/critical affected task or an affected project deadline falls in the leave window.
- MEDIUM: affected tasks exist without those high-risk signals.
- LOW: no affected visible tasks were found.

Coverage suggestions reuse the existing planning snapshot, require eligible project/team membership, exclude the requester and require enough free hours. A manager may inspect the suggested person and confirm reassignment. A leave decision remains independent: high planning impact does not automatically prohibit leave.

Only tasks authorized for the requesting reviewer are exposed. A reporting manager might approve someone's leave without managing all their projects. The response therefore explicitly notes that other projects may have further conflicts.

## 5. Performance evidence and recognition

Only tasks currently DONE with a completion timestamp in the UTC calendar month contribute. The completion assignee snapshot identifies the responsible person. Each task's weight is:

```text
weight = max(0.25, estimated hours) × complexity
score = 100 × (0.70 × weighted on-time rate + 0.30 × weighted first-pass rate)
```

On-time compares completion against the task deadline extended by approved working-day leave overlapping its work window. First-pass means no recorded reopen. Approved leave never directly subtracts recognition points. At least three completed tasks in the month are needed for a score; otherwise it is withheld. Current versus previous month is shown only when both months qualify. Recognition selects up to three visible people scoring at least 80.

Team recognition is an effort-weighted average of members with sufficient evidence. Team capacity is aggregated separately and is not a performance score. Reopening a task removes it from current DONE evidence until it is completed again; this release does not preserve every intermediate completion as an independent contribution record.

The score measures recorded delivery signals, not total job performance, quality of code, collaboration, business impact or employee value. Estimates can be inaccurate or gamed. Use the explanation as a discussion aid, not an automatic compensation, discipline or hiring rule.

## Data boundaries and scale

Analysis supports at most 500 visible employees, 500 visible projects, and `ANALYSIS_TASK_LIMIT` visible tasks, default 3000. Capacity can examine up to 10000 commitments and 5000 approved leave records. Limits result in an explicit 413 response rather than a misleading complete-looking score. Filtering by project reduces task scope, although large employee/history sets may still exceed their own bounds.

For cross-project capacity, the service reads scheduling fields only: assignee, dates, remaining hours and state. It does not return inaccessible task titles or descriptions. There are no external calls, persistent score caches, model-training pipelines or claims of forecast accuracy. Complexity is bounded by these limits, but latency and throughput were not load-tested in the preparation environment.
