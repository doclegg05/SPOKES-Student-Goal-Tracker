# SPOKES Master Action Plan

Compiled from: 4 skill evaluations (design-system, accessibility, visual-design, project-planner), Gemini team review, and user direction.

**Date:** 2026-02-27
**Status:** Awaiting approval to begin execution

---

## Issues Register (All Sources Combined)

### CRITICAL — Must fix before any lesson ships

| # | Issue | Source | Affected Files |
|---|---|---|---|
| C1 | **Theme override ordering** — In Time Management, the `<style id="theme-override">` is BEFORE the main CSS, making all overrides (colors, fonts) completely ineffective. Same issue in Interview Skills. | Gemini, Our audit | `lesson-time-management/index.html:13-40`, `Interview-Skills/index.html:15-33` |
| C2 | **Zero ARIA attributes** — No roles, states, or properties on any interactive element across all lessons. No `aria-expanded`, no `role="progressbar"`, no live regions for slide changes. | Accessibility audit | All lesson `index.html` files |
| C3 | **Navigation elements are `<span>` not `<button>`** — Prev/next nav, sidebar items not keyboard-focusable. Mouse-only controls in an education context. | Gemini, Accessibility audit | All lessons: nav-hint spans, sidebar chapter-headers |
| C4 | **No `prefers-reduced-motion`** — 17+ animations including 2 infinite pulsing effects and 100-element confetti. No fallback for users with vestibular disorders. | Accessibility audit | All lesson `index.html` files, `template.html` |
| C5 | **Color contrast failures** — Gold on white (2.04:1), green on white (2.66:1), white on green (2.66:1), sidebar semi-transparent text (~2.0:1). All fail WCAG AA. | Visual design audit | All lessons using `.gold`, `.accent` text classes |
| C6 | **Off-brand colors in Time Management** — `--accent: #EA580C` (orange), `--primary: #4C1D95` (violet), `--dark: #2E1065`. Not in approved 11-color palette. | Our audit, Phase 1 findings | `lesson-time-management/index.html` |
| C7 | **Off-brand colors in Interview Skills** — `--mauve: #a7253f`, `--royal: #00133f` used correctly, but also has `#dc2626` (red) in WIPPEA badge and completely different CSS architecture. | Our audit | `Interview-Skills/index.html` |

### HIGH — Fix in current sprint

| # | Issue | Source | Affected Files |
|---|---|---|---|
| H1 | **No `--font-heading` / `--font-body` tokens** — Theme override requires listing 10+ CSS selectors manually. Missing selectors cause inconsistent fonts (e.g., `area-card h4`, `closing-box h2`, `slide-section::after` are missed in the AGENT_THEMING_GUIDELINES.md example). | Design system audit | `template.html`, all lessons |
| H2 | **Template variants don't exist** — Docs reference "3-4 template variants" but only one template file exists. Agents told to "select a variant" have nothing to select from. | Design system audit | `SPOKES Builder/` |
| H3 | **Off-palette hex values in template** — `#FF6B6B` (red) in confetti JS, `#E0E0E0`, `#F4F8FB`, `#EEF2F6` in CSS. Template violates its own color rules. | Design system audit | `template.html` |
| H4 | **No skip link** — No mechanism to bypass sidebar navigation. Violates WCAG 2.4.1. | Accessibility audit | All lessons, `template.html` |
| H5 | **No focus management on slide change** — Focus stays on hidden elements when advancing slides. Keyboard users lose their place. | Accessibility audit | All lessons JS |
| H6 | **5 Cs flip cards inaccessible** — Hover-only interaction, no keyboard handler, no tabindex, screen readers read front and back simultaneously. | Accessibility audit | `lesson-employee-accountability/index.html` |
| H7 | **AudioContext created unguarded** — If AudioContext is unavailable/restricted, script init fails and breaks slide logic. | Gemini review | All lessons JS |
| H8 | **Duplicate video URL** — "Big Rocks of Time" (line 1457) and "Atomic Habits" (line 1845) both point to `AtoVhZOWQZU`. Likely accidental. | Gemini review | `lesson-time-management/index.html` |

### MEDIUM — Fix in next sprint

| # | Issue | Source | Affected Files |
|---|---|---|---|
| M1 | **`target="_blank"` missing `rel="noopener noreferrer"`** — Security hardening gap on all external links. | Gemini review | All lessons |
| M2 | **Sub-1rem text sizes** — `smart-content p` (0.95rem), `danger-card-back p` (0.85rem), `matrix-label` (0.8rem) unreadable at 15+ feet on projector. | Visual design audit | `template.html`, all lessons |
| M3 | **No spacing tokens** — Padding/gap values are arbitrary literals. Template and Employee Accountability already diverge on component spacing. | Design system, Visual design | `template.html`, all lessons |
| M4 | **Video placeholder CSS duplicated** — 30 lines must be copy-pasted into every theme-override block. Should be in main CSS. | Design system audit | `AGENT_THEMING_GUIDELINES.md`, all lessons |
| M5 | **Template vs. Employee Accountability sizing divergence** — Takeaways: 1.35rem vs 1.75rem, smart-content h4: 1.15rem vs 1.25rem. Template is less legible. | Visual design audit | `template.html` vs `lesson-employee-accountability/index.html` |
| M6 | **No lesson registry** — No manifest tracking which variant, font pairing, and component mix each lesson uses. At 18 lessons, manual review is unsustainable. | Design system audit | Missing file |
| M7 | **Component library needs 3-4 additions** — process-flow, comparison-columns, stat-highlight, callout-box variants needed to avoid repetition at 18 lessons. | Design system audit | `components.md` |
| M8 | **Font override selector list incomplete** — Example in AGENT_THEMING_GUIDELINES.md misses `area-card h4`, `closing-box h2`, `slide-section::after`, `big-statement h2`, `danger-card h4`. | Design system audit | `AGENT_THEMING_GUIDELINES.md` |

### LOW — Backlog

| # | Issue | Source |
|---|---|---|
| L1 | No print stylesheet | Design system audit |
| L2 | No design system versioning/changelog | Design system audit |
| L3 | No high-contrast mode | Accessibility audit |
| L4 | Collapsed sidebar `<a>` elements remain in tab order | Accessibility audit |
| L5 | Space key hijacks standard button activation globally | Accessibility audit |

---

## Decisions (Locked and Open)

### Locked

| # | Decision | Final Value |
|---|---|---|
| D1 | Accessibility rollout model | Phased WCAG 2.2 AA: Phase 1 hard gate for release, Phase 2 fast follow |
| D2 | Color policy | Strict fixed 11-color brand palette only, with controlled per-lesson mixing of major/minor color emphasis. No non-canonical hex values. |
| D3 | Output architecture | Single self-contained `index.html` per lesson |
| D4 | Video handling rule | YouTube embed if URL provided; placeholder if URL missing |
| D6 | Interactive baseline | Minimum 3 qualifying interactions per lesson. Qualifying types: flip cards, clickable matrix, tabs/accordions, step reveal, quiz/checkpoint. If present, they must be functionally interactive. |
| D7 | Device QA matrix | Lock required viewports: mobile `360x800`, tablet `768x1024`, desktop `1920x1080`. Desktop/tablet must show sidebar + active slide on one screen; mobile must show full active slide with sidebar available by toggle. No horizontal panning at any required viewport. |
| D8 | Color schema approval | User must approve final color schema for each lesson before build finalization/release. |

### Open

| # | Question | Required Input |
|---|---|---|
| D5 | Duplicate YouTube URL in Time Management (`AtoVhZOWQZU` appears twice) | Confirm intentional or provide corrected link |

---

## Execution Plan

### Sprint 1: Stabilize the Template (Do First)

All fixes apply to `template.html` and propagate to lessons.

| Task | Issues Addressed | Effort |
|---|---|---|
| Add `--font-heading` and `--font-body` tokens to `:root`. Refactor all heading selectors to use `var(--font-heading)` and body selectors to use `var(--font-body)`. | H1, M8 | Medium |
| Add `prefers-reduced-motion` media query block. | C4 | Low |
| Move video placeholder CSS into main CSS block. | M4 | Low |
| Replace all off-palette hex values (`#FF6B6B`, `#E0E0E0`, `#F4F8FB`, `#EEF2F6`) with brand colors. | H3 | Low |
| Add `rel="noopener noreferrer"` to all `target="_blank"` links. | M1 | Low |
| Bump sub-1rem text sizes to minimum 1.1rem. | M2 | Low |
| Update template sizes to match Employee Accountability's proven larger sizes. | M5 | Low |
| Wrap AudioContext creation in try/catch. | H7 | Low |
| Replace `<span>` nav elements with `<button>` elements with proper `aria-label`. | C3 | Low |
| Add skip link before sidebar. | H4 | Low |
| Add ARIA attributes: sidebar toggle `aria-expanded`, progress bar `role="progressbar"`, slide container `aria-live="polite"`, chapter headers `role="button"` + `tabindex="0"`. | C2 | Medium |
| Add focus management: move focus to active slide heading on navigation. | H5 | Medium |
| Fix Space key to only advance when no interactive element is focused. | L5 | Low |
| Add `aria-hidden="true"` to collapsed sidebar. | L4 | Low |
| Fix contrast: darken `.gold` text class to use `--muted-gold` (#ad8806), restrict `.accent` text to large text only (per `brand-palette.md` contrast table), fix sidebar text opacity. | C5 | Medium |

**Definition of Done:** Template passes — no console errors, all brand-palette colors only, keyboard navigation works end-to-end, screen reader announces slide changes, `prefers-reduced-motion` disables all animations, contrast passes WCAG AA for all text.

### Sprint 2: Fix Time Management + Interview Skills

| Task | Issues Addressed | Effort |
|---|---|---|
| **Time Management:** Move theme-override block AFTER main CSS. Replace off-brand colors (#EA580C orange, #4C1D95 violet, #2E1065) with approved 11-color palette. Add missing 4 extended palette variables. Replace video iframes with placeholders. Flag duplicate video URL for user review. | C1, C6, H8 | Medium |
| **Interview Skills:** Rebuild CSS to use standard template as base. Strip custom `--royal`/`--mauve` variables (now in the standard palette). Remove `#dc2626` from WIPPEA badge. Bring section divider designs into the template variant system. Replace videos with placeholders. | C1, C7 | High |
| Apply all Sprint 1 template fixes (ARIA, keyboard, contrast, motion) to both lessons. | C2-C5 | Medium |
| Fix 5 Cs flip cards accessibility (Employee Accountability). | H6 | Medium |

### Sprint 3: Template Variants + Font Library

| Task | Issues Addressed | Effort |
|---|---|---|
| Design and implement 3-4 template variants as documented CSS class systems (`variant-classic`, `variant-modern`, `variant-bold`, `variant-elegant`). Each variant defines different: section divider designs, card border treatments, heading decorations, background patterns. | H2 | High |
| Curate a library of 18+ Google Font pairings (heading + body) with projection legibility ratings. Present to user for approval. | Project plan | Medium |
| Create `lesson-registry.json` manifest tracking variant, font pair, and component usage per lesson. | M6 | Low |
| Add 3-4 new components to `components.md`: `process-flow`, `comparison-columns`, `stat-highlight`, `callout-box` variants. | M7 | High |

### Sprint 4-8: Production (15 Remaining Lessons)

Build in batches of 3, with 2-3 lessons in parallel per batch. Each batch follows:
1. Content intake review (from 6 teams using `content-intake-template.md`)
2. Variant + font assignment (using registry to avoid collisions)
3. Parallel build via agent swarm
4. Quality gate (automated brand check + manual visual review)
5. Delivery + stakeholder sign-off

**Estimated total: 55-85 hours across 5 batches**

### Deferred (Revisit Later)

| Item | When |
|---|---|
| Video link integration (replace placeholders with actual iframes) | When video links are provided |
| Local MP4 `<video>` tag support | If needed for non-YouTube content |
| Print stylesheet | After all 18 lessons are built |
| High-contrast accessibility mode | After core accessibility is complete |
| Design system versioning/changelog | After template is stable |

---

## Conflicts Resolved

| Conflict | Resolution |
|---|---|
| Gemini suggests per-lesson custom color palettes | **Partially adopted with constraints.** Lessons may mix color emphasis differently per module, but only using the canonical 11-color palette and contrast/anti-clash guardrails. No external custom hex colors are allowed. |
| Gemini suggests external CSS/JS files (`globals.css`) | **Overridden.** User decided on single self-contained `index.html` per lesson. Portability for classroom deployment is the priority. |
| Gemini suggests `<object>` or `<iframe>` PDF embedding | **Partially adopted.** We already use download links for PDFs. Inline PDF viewing is a possible future enhancement but not in scope now. |
| Template says "DO NOT MODIFY" but has off-palette colors | **Template will be updated.** The immutable CSS block needs a one-time correction to remove contradictions, then re-frozen. |
| AGENT_THEMING_GUIDELINES says to freely choose `--primary`/`--accent` colors | **Already fixed.** Guidelines were rewritten to enforce the 11-color palette. |
