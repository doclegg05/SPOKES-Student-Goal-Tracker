# SPOKES Employability Skills Curriculum -- Project Plan

**Date:** 2026-02-27
**Goal:** Deliver 18 interactive HTML lessons built from the SPOKES Builder system
**Current State:** 3 of 18 lessons exist (1 brand-compliant, 2 needing fixes)

---

## Project Summary

| Metric | Value |
|--------|-------|
| Total lessons required | 18 |
| Lessons built (brand-compliant) | 1 (Employee Accountability) |
| Lessons built (needs fixing) | 2 (Time Management, Interview Skills) |
| Lessons remaining to build | 15 |
| Template variants needed | 3-4 |
| Content teams delivering source material | 6 |
| Build format | Single self-contained index.html per lesson |
| Source material format | PowerPoint + PDFs from human teams |

---

## Phase 1: Foundation

**Duration estimate:** 1-2 weeks
**Goal:** Stabilize existing work, lock down the template system, and prepare the intake pipeline for the 6 content teams.

### Task 1.1: Fix Time Management Lesson

**Effort:** 3-5 hours
**Dependencies:** Access to the source PowerPoint (`NEW_TIME_MANAGEMENT_MODULE.pptx`) and the brand-compliant Employee Accountability lesson as reference.

**Work items:**
- Audit `lesson-time-management/index.html` against the 8-phase verification checklist from `build-process.md`
- Run brand color compliance check: search for any hex color not in the 11-color palette
- Verify WIPPEA chapter structure (sequential `data-chapter`, section dividers present)
- Check that `<style id="theme-override">` is placed AFTER the main CSS block
- Confirm video placeholder slides use the standard placeholder pattern (no broken iframes)
- Verify sidebar auto-population, slide counter, keyboard navigation, confetti on closing slide
- Fix all identified issues
- Standardize lesson folder naming (completed for Time Management as `lesson-time-management`; continue applying to all lessons)
- Convert any `.docx` handouts to `.pdf` format
- Re-run verification checklist, confirm zero issues

**Definition of done:** Time Management lesson passes all 14 items on the Phase 8 verification checklist and matches the brand compliance standard set by Employee Accountability.

---

### Task 1.2: Fix Interview Skills Lesson

**Effort:** 3-5 hours
**Dependencies:** Same as Task 1.1. Can run in parallel with Task 1.1.

**Work items:**
- Audit `Interview-Skills/index.html` against the verification checklist
- Run brand color compliance check
- Verify WIPPEA chapter structure
- Check theme-override placement
- Confirm video placeholder pattern
- Verify sidebar, slide counter, keyboard nav, confetti
- Convert `.docx` handouts (STAR_Interview_Worksheet, ChatGPT_Interview_Practice, Interviews_Rubric) to `.pdf`
- Fix all identified issues
- Re-run verification checklist

**Definition of done:** Interview Skills lesson passes all 14 verification checklist items.

**Parallelization note:** Tasks 1.1 and 1.2 are fully independent and can be done simultaneously by two agents or in parallel sessions.

---

### Task 1.3: Define and Document Template Variants

**Effort:** 4-6 hours
**Dependencies:** Employee Accountability must be confirmed as the "Variant A" reference. Should follow Tasks 1.1 and 1.2 so all 3 lessons inform the variant definitions.

**Work items:**
- Analyze Employee Accountability's CSS patterns: section divider gradients, card styling, header treatments, spacing, background textures
- Define Variant A based on Employee Accountability's actual patterns
- Design Variant B: different section divider style (e.g., geometric split vs gradient), different card border treatment, different header decoration
- Design Variant C: a third distinct treatment (e.g., minimal/clean vs the other two)
- Optionally design Variant D if 3 variants do not provide enough rotation across 18 lessons (18 / 3 = 6 lessons per variant; 18 / 4 = 4-5 lessons per variant)
- Document each variant's CSS differences in a new file: `SPOKES Builder/template-variants.md`
- For each variant, create the specific CSS overrides that go into the `<style id="theme-override">` block
- Create a variant assignment plan: which lessons get which variant to ensure visual contrast between adjacent lessons

**Definition of done:** 3-4 template variants are fully documented with copy-paste CSS, and a rotation plan assigns each of the 18 lessons to a variant.

---

### Task 1.4: Create Content Intake Template

**Effort:** 2-3 hours
**Dependencies:** None. Can run in parallel with all other Phase 1 tasks.

**Work items:**
- Design a structured document (Markdown or Word) that the 6 human content teams fill out for each lesson they deliver
- Structure must map directly to the WIPPEA stages so content arrives pre-organized
- Include all fields the build process needs: title, subtitle, content per WIPPEA stage, video topics, handout inventory, key quotes, activity descriptions
- Include examples from Employee Accountability to show teams what good input looks like
- Include a "common mistakes" section so teams avoid delivering content that requires rework
- Deliver as `SPOKES Builder/content-intake-template.md`

**Definition of done:** Template is complete, includes field-level instructions, and has been reviewed against the build-process.md to confirm no required information is missing.

(See the full Content Intake Template specification at the end of this document.)

---

### Task 1.5: Create Font Pairing Library

**Effort:** 3-4 hours
**Dependencies:** None. Can start immediately, though reviewing the 3 fixed lessons helps inform choices.

**Work items:**
- Curate 18-20 Google Font pairings (heading + body), each visually distinct
- Ensure all heading fonts are legible at 4rem-5rem
- Ensure all body fonts are readable at 1.5rem-2rem
- Organize into a reference document: `SPOKES Builder/font-pairings.md`
- For each pairing, include: font names, Google Fonts import URL, preview description, recommended lesson type (professional/approachable/energetic/serious)
- Mark the 3 pairings already used by Employee Accountability, Time Management, and Interview Skills
- This library gives the user a menu to approve from rather than proposing blind each time

**Definition of done:** Library contains 18+ curated pairings with import URLs, organized by mood/style, ready for user selection during each lesson build.

---

### Phase 1 Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Time Management or Interview Skills have deep structural issues beyond cosmetic fixes | Adds 1-2 days to Phase 1 | Medium | Scope the audit first; if rebuild is faster than repair, rebuild from template |
| Template variants are too similar, not providing enough visual contrast | Lessons look repetitive across the curriculum | Low | Test variants side-by-side before finalizing; get user sign-off on at least 3 distinct variants |
| Content teams do not adopt the intake template | Unstructured input continues, slowing builds | High | Keep the template simple; provide a filled-out example; get team lead buy-in before distributing |

### Phase 1 Definition of Done

- [ ] All 3 existing lessons pass the full verification checklist
- [ ] 3-4 template variants documented with CSS and rotation plan
- [ ] Content intake template created and ready for distribution
- [ ] Font pairing library curated with 18+ options
- [ ] All files organized in `SPOKES Builder/` directory

---

## Phase 2: Pipeline

**Duration estimate:** 1 week
**Goal:** Establish the repeatable, scalable build process so lessons can be produced efficiently in batches. This phase turns the one-off build process into a production pipeline.

### Task 2.1: Build a Pilot Lesson End-to-End Using the New Pipeline

**Effort:** 4-6 hours
**Dependencies:** All Phase 1 tasks complete. Requires one content team to have delivered materials using the intake template.

**Work items:**
- Select one lesson where source materials are ready
- Walk through the full pipeline: intake template review, WIPPEA mapping, template variant selection, font pairing approval, slide building, verification
- Time each step to establish baseline effort estimates
- Document any friction points, missing instructions, or unclear decisions
- Update `build-process.md` with any improvements discovered

**Definition of done:** One new lesson (lesson #4) is built, verified, and delivered. Actual timings recorded for each build phase.

---

### Task 2.2: Create Component Usage Tracker

**Effort:** 1-2 hours
**Dependencies:** All 4 lessons (3 fixed + 1 pilot) must exist.

**Work items:**
- Create a tracking document: `SPOKES Builder/component-tracker.md`
- For each completed lesson, record: which components were used, in what order, which template variant, which font pairing, which accent color emphasis
- This tracker is consulted before each new build to ensure no two adjacent lessons share the same component sequence
- Include a "next lesson recommendations" section that suggests underused components

**Definition of done:** Tracker covers all completed lessons and provides actionable guidance for the next build.

---

### Task 2.3: Configure Team Swarm for Parallel Builds

**Effort:** 2-3 hours
**Dependencies:** Task 2.1 (pilot lesson confirms the pipeline works).

**Work items:**
- Design a Claude Code team configuration for parallel lesson building
- Define agent roles: Lead (coordinates variant/font assignments, reviews output) + Builders (execute the build process)
- Create a CLAUDE.md-level instruction set for builder agents that includes: template variant assignment, font pairing (pre-approved), component tracker consultation
- Define the handoff protocol: what the lead provides to each builder, what the builder delivers back
- Test with a 2-lesson parallel build to validate the swarm approach
- Document in `SPOKES Builder/swarm-config.md`

**Definition of done:** Swarm configuration tested with 2 parallel builds that both pass verification. Protocol documented for production use.

---

### Task 2.4: Establish Quality Gate Process

**Effort:** 1-2 hours
**Dependencies:** Task 2.1 (need a real lesson to define the gate against).

**Work items:**
- Formalize the verification checklist into a structured QA pass/fail document
- Define two review stages:
  1. **Automated checks:** Brand color scan (grep for non-palette hex values), structural validation (sequential data-chapter, required elements present)
  2. **Manual review:** Visual inspection by user, font pairing confirmation, component variety check
- Create a simple bash script or checklist that runs the automated checks against any `index.html`
- Document in `SPOKES Builder/quality-gate.md`

**Definition of done:** Quality gate process documented. Automated check script created and tested against all existing lessons.

---

### Phase 2 Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Pilot lesson reveals significant gaps in the build process docs | Delays pipeline readiness by 2-3 days | Medium | Budget extra time in the pilot; treat it as a learning exercise |
| Swarm builds produce inconsistent quality | Rework needed on agent-built lessons | Medium | Tight CLAUDE.md instructions; lead agent reviews every output before delivery |
| Content teams deliver materials late or incomplete | Pipeline idles waiting for input | High | Stagger the content requests; always have 2-3 lessons in the intake queue |

### Phase 2 Definition of Done

- [ ] Pilot lesson #4 built and verified
- [ ] Component usage tracker operational
- [ ] Swarm configuration tested with 2 parallel builds
- [ ] Quality gate process documented with automated checks
- [ ] Build process docs updated with pilot learnings
- [ ] Baseline effort estimate established (hours per lesson)

---

## Phase 3: Production

**Duration estimate:** 4-6 weeks (depends on content team delivery cadence)
**Goal:** Build the remaining 15 lessons in batches, using the pipeline and swarm process established in Phase 2.

### Production Batch Plan

Lessons are built in batches of 3-5, paced by content team delivery. Each batch follows the same workflow.

**Batch structure:**

```
Batch 1: Lessons 5-7    (Week 1-2 of Phase 3)
Batch 2: Lessons 8-10   (Week 2-3 of Phase 3)
Batch 3: Lessons 11-13  (Week 3-4 of Phase 3)
Batch 4: Lessons 14-16  (Week 4-5 of Phase 3)
Batch 5: Lessons 17-18  (Week 5-6 of Phase 3)
```

### Task 3.1: Batch Build Workflow (repeated per batch)

**Effort per lesson:** 3-5 hours (based on Phase 2 baseline)
**Effort per batch of 3:** 9-15 hours total, but parallelizable to 4-6 hours elapsed

**Per-batch workflow:**

1. **Intake review** (30 min per lesson)
   - Verify content intake template is complete for each lesson in the batch
   - Flag any missing fields or unclear content back to the content team
   - Confirm all PDFs/handouts are delivered

2. **Variant and font assignment** (15 min per lesson)
   - Consult component tracker for what has been used recently
   - Assign template variant from the rotation plan
   - Select font pairing from the library; get user approval for all lessons in the batch at once

3. **Parallel build** (2-4 hours per lesson, 2-3 in parallel)
   - Each builder agent receives: intake template content, assigned variant, approved font pairing, component recommendations from tracker
   - Builder follows the 10-step process from CLAUDE.md
   - Builder runs the automated quality checks before submitting

4. **Quality gate** (30-60 min per lesson)
   - Lead runs automated brand color scan and structural checks
   - Lead reviews for component variety against tracker
   - User does visual review and sign-off

5. **Delivery and tracking** (15 min per lesson)
   - Update component tracker with new lesson's data
   - Move lesson folder to the curriculum root
   - Update any curriculum-wide index or catalog

**Parallelization:** Within a batch, all 3-5 lessons can be built simultaneously by different agents. The intake review and variant assignment must happen first (serial), but the builds themselves are fully parallel. Quality gate can pipeline -- review lesson 1 while lesson 2 is still building.

---

### Task 3.2: Video Integration Pass (deferred)

**Effort:** 1-2 hours per lesson once video links are available
**Dependencies:** Curriculum designer provides YouTube URLs for each lesson's video topics.

**Work items:**
- For each lesson, replace `.video-placeholder` divs with standard iframe embeds
- Use the youtube-nocookie.com embed format specified in the theming guidelines
- Verify videos load and display correctly
- This is a separate pass that can happen after all 18 lessons are structurally complete

**Note:** This task is explicitly deferred. All lessons ship with placeholder videos initially.

---

### Task 3.3: Final Curriculum Review

**Effort:** 4-6 hours
**Dependencies:** All 18 lessons built and individually verified.

**Work items:**
- Open all 18 lessons side by side (or in sequence)
- Verify visual variety: no two adjacent lessons look the same
- Confirm each lesson has a unique font pairing
- Verify template variant distribution is balanced
- Check component variety across the full set
- Run brand color audit across all 18 index.html files
- Compile a curriculum manifest: lesson name, variant, font pairing, slide count, component list

**Definition of done:** All 18 lessons verified as a cohesive but visually diverse curriculum. Manifest document created.

---

### Phase 3 Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Content teams deliver materials unevenly -- some batches have 5 lessons ready, others have 0 | Pipeline alternates between idle and overloaded | High | Work with content teams to stagger delivery; maintain a backlog of at least 1 batch ahead |
| Font pairing approval becomes a bottleneck (user must approve each one) | Builds wait on approval | Medium | Batch the approvals: present 3-5 font pairings at once for a whole batch |
| Component variety degrades as more lessons are built | Later lessons feel repetitive | Medium | Consult component tracker before every build; deliberately assign underused components |
| A late-stage lesson requires a structural change to the template | Ripples back to already-completed lessons | Low | Freeze the template after Phase 2; any changes require explicit impact assessment |
| Agent-built lessons have subtle quality issues that pass automated checks | Inconsistent student experience | Medium | User visual review on every lesson; spot-check 3 random slides per lesson at minimum |

### Phase 3 Definition of Done

- [ ] All 18 lessons built, individually verified, and delivered
- [ ] Component tracker complete for all 18 lessons
- [ ] Curriculum manifest compiled
- [ ] No brand color violations across any lesson
- [ ] Each lesson has a unique, approved font pairing
- [ ] Template variant distribution is balanced (4-6 lessons per variant)
- [ ] Video placeholder slides are consistent and ready for future replacement

---

## Full Timeline Summary

```
Week 1-2:  PHASE 1 -- Foundation
           - Fix Time Management + Interview Skills (parallel)
           - Define template variants
           - Create content intake template + font library

Week 3:    PHASE 2 -- Pipeline
           - Pilot lesson build
           - Component tracker + quality gate
           - Swarm configuration + test

Week 4-9:  PHASE 3 -- Production
           - Build 15 lessons in 5 batches of 3
           - Paced by content team delivery

Week 10:   FINAL REVIEW
           - Full curriculum audit
           - Video integration (when links available)
           - Manifest and handoff
```

**Total estimated effort:**
- Phase 1: 16-23 hours
- Phase 2: 8-13 hours
- Phase 3: 55-85 hours (15 lessons x 3.5-5.5 hours average including QA)
- Final review: 5-8 hours
- **Grand total: 84-129 hours of build effort**

---

## Dependency Map

```
Phase 1 (all can be parallel):
  [1.1 Fix Time Mgmt]     ----+
  [1.2 Fix Interview]     ----+---> Phase 2 start
  [1.3 Template Variants]  ---+
  [1.4 Content Intake]    ---------> Distribute to 6 teams immediately
  [1.5 Font Library]      ---------> Available for all future builds

Phase 2 (mostly serial):
  [2.1 Pilot Build] ---> [2.2 Component Tracker] ---> [2.3 Swarm Config]
                    \---> [2.4 Quality Gate]

Phase 3 (batched parallel):
  [Batch 1: 3 lessons in parallel] ---> [QA gate]
  [Batch 2: 3 lessons in parallel] ---> [QA gate]
  [Batch 3: 3 lessons in parallel] ---> [QA gate]
  [Batch 4: 3 lessons in parallel] ---> [QA gate]
  [Batch 5: 2 lessons in parallel] ---> [QA gate]
  [3.3 Final Curriculum Review]
```

---
---

## Content Intake Template

(Also delivered as a standalone file at `SPOKES Builder/content-intake-template.md`)

See that file for the full template ready for distribution to content teams.
