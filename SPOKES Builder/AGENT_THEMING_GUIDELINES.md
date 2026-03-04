# SPOKES Lesson Builder — Agent Theming Guidelines

**CRITICAL:** You must read these guidelines _before_ building any new SPOKES lesson.

Every SPOKES lesson must look like it belongs to the SPOKES curriculum family while having its own distinct visual identity. Identity comes from **layout variation, font pairings, and accent emphasis** — NOT from changing the brand colors.

---

## Principle 1: Strict Brand Color Palette

**There are exactly 11 approved SPOKES brand colors. No others are permitted.**

> **Canonical source:** `brand-palette.md` in this directory. If any file conflicts with `brand-palette.md`, the palette file wins.

**Core palette (used in every lesson):**

| Variable       | Hex       | Usage                               |
| -------------- | --------- | ----------------------------------- |
| `--primary`    | `#007baf` | Headings, primary buttons, links    |
| `--accent`     | `#37b550` | Download buttons, positive emphasis |
| `--dark`       | `#004071` | Sidebar, dark backgrounds           |
| `--light`      | `#FFFFFF` | Text on dark, backgrounds           |
| `--muted`      | `#EDF3F7` | Card backgrounds, subtle fills      |
| `--gray`       | `#60636b` | Body text, subtitles                |
| `--gold`       | `#d3b257` | Gold accents, dividers, badges      |

**Extended palette (available for variety and emphasis):**

| Variable       | Hex       | Usage                                        |
| -------------- | --------- | -------------------------------------------- |
| `--royal`      | `#00133f` | Deep navy backgrounds, premium feel          |
| `--mauve`      | `#a7253f` | Warm accent, caution/emphasis, card borders   |
| `--offwhite`   | `#d1d3d4` | Subtle backgrounds, soft borders, dividers    |
| `--muted-gold` | `#ad8806` | Darker gold for text on light, rich accents   |

**NEVER introduce any of the following:**
- Bright reds (`#DC2626`, `#991b1b`, etc.)
- Orange shades (`#EA580C`, `#ff6b35`, etc.)
- Any color not listed in the tables above

You may use **opacity variations** of any brand color (e.g., `rgba(0, 123, 175, 0.1)` for a light blue tint) but never introduce new hue values.

**All 11 colors should be defined in `:root`.** Each lesson should use the full palette to ensure visual richness.

---

## Principle 2: Lesson Identity Through Layout & Typography

Each lesson gets its own visual identity through three mechanisms:

### 2a. Template Variant Selection

There are **3-4 template variants** available. Each provides a different overall look while using the same brand colors. Select the variant that best fits the lesson topic.

Template variants differ in:
- Section divider designs (gradients, geometric patterns, split layouts)
- Card styling (border placement, shadow depth, corner radius)
- Header/title treatments (underlines, backgrounds, decorative elements)
- Spatial arrangement and whitespace patterns
- Background textures and subtle patterns on content slides

### 2b. Typography Variation

Each lesson gets a **unique Google Font pairing** — one heading font and one body font. This is the most immediate way students recognize which lesson they are viewing.

**How to apply fonts:**

1. Add Google Fonts `<link>` tags in the `<head>`, **after** the default Outfit/DM Serif Display imports.
2. Append a `<style id="theme-override">` block **AFTER** the main SPOKES `<style>` block.

**CRITICAL ordering:** The theme-override `<style>` block MUST come AFTER the main CSS block, not before it. Otherwise the main CSS will override your changes.

```html
<!-- 1. Default fonts (keep these) -->
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<!-- 2. Lesson-specific fonts -->
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

<!-- ... main SPOKES <style> block first ... -->

<!-- 3. Theme override AFTER main CSS -->
<style id="theme-override">
  body {
    font-family: "Inter", sans-serif;
  }

  .slide-title h1,
  .slide h2,
  .slide h3,
  .card h4,
  .smart-content h4,
  .matrix-action {
    font-family: "Playfair Display", serif;
  }
</style>
```

**Font selection rules:**
- Heading fonts must be legible at 4rem-5rem sizes.
- Body fonts must be highly readable at 1.5rem-2rem sizes.
- **Always propose font pairings to the user for approval before applying.**

### 2c. Accent Emphasis Variation

Within the 11 brand colors, you can shift which color is *emphasized* per lesson:
- One lesson might lean heavily on `--primary` (blue) for cards and backgrounds
- Another might feature `--gold` more prominently in borders and highlights
- Another might use `--accent` (green) as the dominant visual accent

This creates a different "feel" without breaking brand compliance.

---

## Principle 3: Rhythm and Component Variation

The component library provides many slide layouts. **Do not use the same sequence of layouts as other lessons.**

- If lesson A used `smart-stack` + `cards-grid` + `takeaways`, lesson B should favor `dangers-grid` + `areas-grid` + `split-layout`.
- Vary the mix of big-statement slides, content slides, and activity slides.
- Each lesson should have a recognizable rhythm that differs from its neighbors.

**Before building, review existing lessons** to see what components they use, and deliberately choose a different combination.

---

## Principle 4: Video Slides

**If a YouTube URL is provided**, embed it using the iframe pattern from `components.md`. **If no URL is provided**, build a styled placeholder layout.

When no URL exists, create the structural slide with a branded placeholder:

**Video Placeholder HTML:**

```html
<section class="slide slide-video" data-chapter="3">
  <h2>Watch: Video Title Here</h2>
  <div class="video-container">
    <div class="video-placeholder">
      <div class="video-placeholder-icon">&#9654;</div>
      <p class="video-placeholder-title">Video Title Here</p>
      <p class="video-placeholder-note">Video will be added</p>
    </div>
  </div>
</section>
```

**Video Placeholder CSS** (add to theme-override block):

```css
.video-placeholder {
  width: 100%;
  max-width: 1200px;
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, var(--muted) 0%, var(--offwhite) 100%);
  border: 2px dashed var(--gray);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 0 auto;
}

.video-placeholder-icon {
  font-size: 4rem;
  color: var(--primary);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(0, 123, 175, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-placeholder-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--dark);
}

.video-placeholder-note {
  font-size: 1rem;
  color: var(--gray);
  font-style: italic;
}
```

When video links are later provided, replace the `.video-placeholder` div with the standard iframe:

```html
<iframe
  src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
  title="Video Title"
  frameborder="0"
  loading="lazy"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen>
</iframe>
```

---

## Principle 5: Chapter Structure Flexibility

The WIPPEA framework provides 7 standard chapters (W, I, P1, P2, P3, E, A). However, lessons may use **more or fewer chapters** if the content demands it.

- The standard 7-chapter structure is the default starting point.
- If a lesson has more content areas, additional chapters are allowed.
- `data-chapter` values must be sequential starting from `"1"`.
- Every chapter must start with a `slide-section` divider.
- The sidebar builds itself from `data-chapter` attributes automatically.

---

## Checklist Before Building

- [ ] Confirmed which template variant to use for this lesson
- [ ] Proposed font pairing to user and received approval
- [ ] Verified all colors in CSS are from the 11-color brand palette only (see `brand-palette.md`)
- [ ] No prohibited colors anywhere (see `brand-palette.md` prohibited list)
- [ ] Theme-override `<style>` block is placed AFTER the main CSS block
- [ ] Video slides use embedded iframe (if URL provided) or placeholder (if no URL)
- [ ] Component selection differs from adjacent lessons in the curriculum
- [ ] Reviewed existing lessons to ensure visual distinction
