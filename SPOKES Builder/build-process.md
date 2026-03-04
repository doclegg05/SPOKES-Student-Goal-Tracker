# SPOKES Lesson Build Process

This document describes the end-to-end workflow for building a SPOKES interactive HTML lesson from source materials.

---

## Build Pipeline Overview

```
INPUT                    ANALYZE                  DESIGN                   BUILD                    DELIVER
+-----------------+      +------------------+     +------------------+     +------------------+     +------------------+
| Source Materials | ---> | Content Mapping  | --> | Theme Selection  | --> | Slide Generation | --> | Project Setup    |
| - PowerPoint    |      | - WIPPEA stages  |     | - Template variant|    | - Copy template  |     | - Folder structure|
| - Lesson Plan   |      | - Slide count    |     | - Font pairing   |    | - Fill content   |     | - Verify & test  |
| - PDFs/Handouts |      | - Component picks|     | - User approval  |    | - Video placeholders|  | - Brand check    |
+-----------------+      +------------------+     +------------------+     +------------------+     +------------------+
```

---

## Step-by-Step Process

### Phase 1: Analyze Input Materials

1. **Read all source materials** (PowerPoint, lesson plan, content docs)
2. **Identify the lesson topic** — this becomes the h1 title and page title
3. **List all content points** — every concept, activity, and resource
4. **Note video topics** — identify where videos are referenced (placeholder slides will be built)
5. **Inventory handouts** — list all PDFs that need to be downloadable

### Phase 2: Map Content to WIPPEA

Organize all content into the WIPPEA chapter structure. The standard is 7 chapters, but additional chapters are allowed if content demands it:

```
Chapter 1: WARM-UP (W)        data-chapter="1"  data-chapter-num="W"
  - Title slide (always first)
  - Self-reflection or opening activity
  - Typical: 2 slides

Chapter 2: INTRODUCTION (I)   data-chapter="2"  data-chapter-num="I"
  - Section divider
  - Module objective / framing
  - Big statement (key takeaway)
  - Typical: 3 slides

Chapter 3: PRESENTATION 1 (P) data-chapter="3"  data-chapter-num="P1"
  - Section divider
  - Core content slides (2-4)
  - Optional: video placeholder slide(s)
  - Optional: big statement transition
  - Typical: 4-6 slides

Chapter 4: PRESENTATION 2 (P) data-chapter="4"  data-chapter-num="P2"
  - Section divider
  - Core content slides (3-6)
  - Tools, strategies, frameworks
  - Typical: 5-7 slides

Chapter 5: PRESENTATION 3 (P) data-chapter="5"  data-chapter-num="P3"
  - Section divider
  - Core content slides (4-8)
  - Challenges, dangers, real-world application
  - Video placeholders often go here
  - Typical: 6-12 slides

Chapter 6: EVALUATION (E)     data-chapter="6"  data-chapter-num="E"
  - Section divider
  - Exit ticket / assessment
  - Links to Pre/Post Test and Rubric
  - Typical: 2 slides

Chapter 7: APPLICATION (A)    data-chapter="7"  data-chapter-num="A"
  - Section divider
  - Round robin / group discussion
  - Closing slide (confetti)
  - Typical: 3 slides
```

Additional Presentation chapters (P4, P5, etc.) may be added with sequential data-chapter values.

**Total target: 25-35 slides**

### Phase 3: Design — Template Variant & Font Pairing

**Before building any slides:**

1. **Review existing lessons** — see which template variants and component patterns are already in use
2. **Select a template variant** that creates visual contrast with neighboring lessons
3. **Plan lesson color emphasis mix** — vary major/minor color roles for differentiation using only the canonical 11-color palette
4. **Validate color pairings** — enforce WCAG contrast and anti-clash guardrails from `brand-palette.md`
5. **Propose final color schema** to the user and get explicit approval before proceeding
6. **Propose a Google Font pairing** to the user (heading font + body font)
7. **Wait for user approval** on the font pairing before proceeding
8. **Plan component mix** — choose a deliberately different sequence of components than other lessons

### Phase 4: Select Components for Each Slide

For each content slide, choose the best component:

```
Is this a key quote or transition?
  YES --> big-statement slide type

Does it reference a video?
  YES --> slide-video with placeholder (separate slide after intro)

Does it compare 2-6 related items?
  YES --> cards-grid

Is it a step-by-step process or ordered list?
  YES --> takeaways

Is it an acronym breakdown?
  YES --> smart-stack

Is it a 4-quadrant framework?
  YES --> matrix-grid

Does it show 4-6 dangers/myths with reveals?
  YES --> dangers-grid (flip cards)

Is it 3 major categories with details?
  YES --> areas-grid (3-column)

Is it a definition or concept with a visual?
  YES --> split-layout

Does it have a group activity?
  YES --> include activity-box inside the slide

Does it reference a downloadable PDF?
  YES --> include download-resource at bottom

Is there a simple list?
  YES --> content-list
```

### Phase 5: Build the Presentation

1. **Copy `template.html`** to the new project as `index.html`
2. **Add font imports** — add lesson-specific Google Font `<link>` tags in `<head>`
3. **Add theme override** — add `<style id="theme-override">` block AFTER main CSS with:
   - Font family overrides
   - Video placeholder CSS (from `AGENT_THEMING_GUIDELINES.md`)
4. **Replace placeholders:**
   - `{{LESSON_TITLE}}` in `<title>`, `<h1>`, and anywhere else
   - `{{SUBTITLE}}` on the title slide
   - Chapter names in `chapterNames` JavaScript object
5. **Build slides chapter by chapter:**
   - Start with the section divider for each chapter
   - Add content slides using the selected components
   - Add video placeholder slides after their introducing slides
6. **Link resources:**
   - Update the sidebar `<div class="resources-section">` with PDF links
   - Add `download-resource` containers on relevant slides
7. **Set the closing slide:**
   - Choose an inspirational quote related to the lesson topic
   - Set the closing statement

### Phase 6: Brand Compliance Check

**Before delivering, verify ALL colors are brand-compliant:**

- Search the entire file for any hex color (`#`) that is not one of the 11 approved brand colors: `#007baf`, `#37b550`, `#004071`, `#FFFFFF`, `#EDF3F7`, `#60636b`, `#d3b257`, `#00133f`, `#a7253f`, `#d1d3d4`, `#ad8806`
- Opacity variations of brand colors are OK (e.g., `rgba(0, 123, 175, 0.1)`)
- Consult `brand-palette.md` for the full prohibited colors list and contrast reference
- No colors outside the 11-color palette should exist

### Phase 7: Set Up Project Structure

```
New-Lesson-Project/
  index.html              <-- The presentation
  SPOKES-Logo.png         <-- Copy from existing project
  Handouts/               <-- All student-facing PDFs
    Self_Assessment.pdf
    Worksheet_1.pdf
    Pre_Post_Test.pdf
    Rubric.pdf
    ...
  Teacher-Resources/      <-- Teacher-facing materials
    Teachers Guide.pdf
    Talking Points.pdf
    ...
  .claude/
    launch.json           <-- Preview server config (see below)
  .gitignore              <-- Standard ignore file (see below)
```

**`.claude/launch.json`:**
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "lesson-name",
      "runtimeExecutable": "python",
      "runtimeArgs": ["-m", "http.server", "8085"],
      "port": 8085
    }
  ]
}
```

**`.gitignore`:**
```
~$*
*.tmp
*.bak
.claude/
Thumbs.db
.DS_Store
desktop.ini
```

### Phase 8: Final Verification

Run through this checklist before delivering:

- [ ] **Title slide** renders with logo, title, subtitle, copyright
- [ ] **All section dividers** show correct WIPPEA badge and watermark
- [ ] **Sidebar** auto-populates with all chapters and slides
- [ ] **Slide counter** shows correct total
- [ ] **Video placeholder slides** display styled placeholder box (no broken iframes)
- [ ] **All download buttons** link to correct PDFs
- [ ] **Resources sidebar** links work
- [ ] **Keyboard navigation** works (ArrowRight, ArrowLeft, Space)
- [ ] **Closing slide** triggers confetti and success sound
- [ ] **No console errors** in browser dev tools
- [ ] **Brand colors only** — no reds, oranges, maroons, or off-palette colors
- [ ] **Controlled color mixing applied** — lesson uses a differentiated major/minor palette emphasis vs adjacent lessons
- [ ] **No clashing color pairings** — avoids accent-on-accent clash combinations; contrast and harmony checks pass
- [ ] **Final color schema approved by user** — explicit sign-off recorded before release
- [ ] **Font pairing** matches the approved selection
- [ ] **Component mix** differs from other lessons in the curriculum
- [ ] **Responsive** layout works at 768px and 480px widths
