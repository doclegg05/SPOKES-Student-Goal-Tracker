# SPOKES V2 Manual QA Script

This script is for strict, repeatable classroom QA of:
1. New student flow
2. Legacy student (old schema) migration flow
3. Teacher override flow

## Preflight
1. Open PowerShell in project root: `C:\Users\Instructor\Dev\SPOKES Goal Setting Project`
2. Start server: `node server.js`
3. Open app: `http://localhost:8787`
4. Keep browser DevTools Console open (confirm no uncaught errors during each flow).

## Flow A: New Student (Progression + Gates)
### Goal
Verify BHAG -> Monthly unlock, weekly gate after 5 check-ins, and persistence after refresh.

### Click Path
1. `/` -> `Create Account` form
2. Enter:
   - `Student ID`: `qa_new_student_01`
   - `Display Name`: `QA New Student`
   - `Passcode`: `abc12345`
3. Click `Create Account`.
4. On `/lesson`, verify cards:
   - `#prompt-bhag` is unlocked
   - `#prompt-monthly` is locked
5. In `#bhag`, type: `Get an entry-level job in IT support within 6 months.`
6. Click `Lock In & Level Up` on BHAG card.
7. Verify `#prompt-monthly` becomes unlocked.
8. In `#monthly`, type: `Submit 10 targeted applications and complete 2 mock interviews this month.`
9. Click `Lock In & Level Up` on Monthly card.
10. Verify `#prompt-weekly` remains locked (activity gate active).
11. Click nav `Mission Control` (or open `/lesson?panel=mission`).
12. In `Quick Daily Check-In`, submit 5 entries:
   - `Top 1 Priority`: `QA task 1` .. `QA task 5`
   - `Status`: `Done`
   - `Minutes`: `25`
   - Click `Save Daily Entry` each time.
13. Press browser refresh (`Ctrl+R`).
14. Verify `#prompt-weekly` is now unlocked.

### Pass Criteria
1. Gate logic holds: no weekly unlock before 5 check-ins.
2. Weekly unlock appears after 5th check-in and refresh.
3. State persists across refresh.

## Flow B: Legacy Student (11-key -> 5-core Mapping)
### Goal
Verify old response keys map into canonical `bhag/monthly/weekly/daily/tasks`.

### Setup (PowerShell)
Run this once before sign-in:

```powershell
$register = Invoke-RestMethod -Method Post -Uri "http://localhost:8787/api/auth/register" -ContentType "application/json" -Body (@{
  studentId = "qa_legacy_01"
  displayName = "QA Legacy"
  passcode = "abc12345"
} | ConvertTo-Json)

$token = $register.token

$legacy = @{
  vision_goal = "Become financially stable through full-time employment."
  smart_goal = "Apply to 8 jobs in 4 weeks."
  why_goal = "I need steady income and career growth."
  monthly_actions = "Complete resume update; send 8 applications"
  weekly_actions = "Send 2 applications each week"
  daily_habit = "Spend 30 minutes on job search"
  likely_barrier = "Transportation issues"
  if_then_plan = "If ride fails, use bus + leave 45 minutes early"
  evidence_of_progress = "Applications sent + interviews scheduled"
  support_person = "Instructor and mentor"
  deadline_commitment = "By April 30, 2026"
}

Invoke-RestMethod -Method Put -Uri "http://localhost:8787/api/drafts/spokes-goal-journey-v1" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{
  responses = $legacy
} | ConvertTo-Json -Depth 8)
```

### Click Path
1. `/` -> `Sign In`
2. `Student ID`: `qa_legacy_01`
3. `Passcode`: `abc12345`
4. Click `Sign In`.
5. On `/lesson`, verify mapped fields are populated:
   - `#bhag` contains legacy `vision_goal` value
   - `#monthly` contains legacy `smart_goal`/`monthly_actions` mapping
   - `#weekly` contains legacy `weekly_actions`
   - `#daily` contains legacy `daily_habit`
   - `#tasks` is seeded from legacy action fields (merged task text)
6. Verify completion panel shows core progress based on mapped values.

### Pass Criteria
1. No blank canonical fields when legacy source exists.
2. No console errors related to missing old keys.

## Flow C: Teacher Override (Guided Unlock + Audit)
### Goal
Verify instructor can force unlock and that change appears in teacher metrics.

### Click Path
1. Open `/teacher`.
2. In `Instructor Key`, enter `spokes-teacher-demo`.
3. Click `Load Report`.
4. Confirm row for target student exists (use `qa_new_student_01` or `qa_legacy_01`).
5. Run override API from PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8787/api/teacher/students/qa_new_student_01/override" -Headers @{ "x-teacher-key" = "spokes-teacher-demo" } -ContentType "application/json" -Body (@{
  action = "unlock_level"
  target = "4"
  reason = "Instructor intervention for blocked student"
} | ConvertTo-Json)
```

6. Back on `/teacher`, click `Load Report` again.
7. Confirm student row now shows `Level` >= `4`.
8. Sign in as that student and open `/lesson?panel=mission`.
9. Verify Kanban Add/Edit controls are available (Level 4 feature access).

### Pass Criteria
1. Override endpoint returns success.
2. Teacher table reflects updated level.
3. Student UI reflects unlocked features.

## Exit Checklist
1. `Export CSV` from `/teacher` and confirm columns include:
   - `level`, `xp`, `current_streak`, `longest_streak`, `core_prompts_completed`, `growth_prompts_completed`
2. Confirm no auth regression:
   - Sign out works
   - Sign in works for both test students
3. Stop server (`Ctrl+C`).

