# SPOKES Component Library Reference

This document defines every slide type and content component available in the SPOKES presentation system. Use it as a copy-paste reference when building slides.

---

## Slide Types

### 1. `slide-title` — Opening Title Slide

**When to use:** Always the first slide. One per presentation.

```html
<section class="slide slide-title active" data-chapter="1">
  <img src="SPOKES-Logo.png" alt="SPOKES" class="logo">
  <h1>Lesson Title</h1>
  <div class="divider"></div>
  <p class="subtitle">Subtitle Text</p>
  <p class="copyright">Copyright &copy; 2026 WV Adult Basic Education</p>
</section>
```

**Notes:** Always include `active` class on this slide only. Logo drops in, title zooms, divider expands, subtitle fades up.

---

### 2. `slide-section` — Chapter Divider

**When to use:** First slide of every chapter (7 total, one per WIPPEA stage).

```html
<section class="slide slide-section" data-chapter="3" data-chapter-num="P1">
  <p class="chapter-label">Presentation</p>
  <h2>Chapter Title</h2>
  <div class="divider"></div>
</section>
```

**`data-chapter-num` values and their meanings:**
| Value | WIPPEA Stage | Chapter Label Text |
|-------|-------------|-------------------|
| `W`   | Warm-Up     | `Warm-Up`         |
| `I`   | Introduction | `Introduction`   |
| `P1`  | Presentation 1 | `Presentation`  |
| `P2`  | Presentation 2 | `Presentation`  |
| `P3`  | Presentation 3 | `Presentation`  |
| `E`   | Evaluation  | `Evaluation`      |
| `A`   | Application | `Application`     |

Each value gets a unique gradient background and a giant watermark letter.

---

### 3. `slide-video` — Video Slide (Placeholder)

**When to use:** After a content slide that introduces a video topic. Use the placeholder layout until video links are provided by the curriculum designer.

**Placeholder version (use this by default):**

```html
<section class="slide slide-video" data-chapter="3">
  <h2>Watch: Video Title</h2>
  <div class="video-container">
    <div class="video-placeholder">
      <div class="video-placeholder-icon">&#9654;</div>
      <p class="video-placeholder-title">Video Title</p>
      <p class="video-placeholder-note">Video will be added</p>
    </div>
  </div>
</section>
```

**With video link (only when URL is provided):**

```html
<section class="slide slide-video" data-chapter="3">
  <h2>Watch: Video Title</h2>
  <div class="video-container">
    <iframe
      src="https://www.youtube-nocookie.com/embed/VIDEO_ID_HERE"
      title="Video Title"
      frameborder="0"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
    </iframe>
  </div>
</section>
```

**Notes:** Always prefix the h2 with "Watch: ". The video/placeholder fills up to 1200px wide with 16:9 aspect ratio. The video placeholder CSS must be included in the `<style id="theme-override">` block (see `AGENT_THEMING_GUIDELINES.md`).

---

### 4. `big-statement` — Impact Statement

**When to use:** Key takeaways, transitions between topics, or inspirational quotes. Keep text short (1-2 sentences).

```html
<section class="slide big-statement" data-chapter="2">
  <h2>The main message with <span class="accent">highlighted words</span> and <span class="gold">gold emphasis</span></h2>
</section>
```

**With subtitle:**
```html
<section class="slide big-statement" data-chapter="3">
  <h2>Main statement...<br><span class="accent">Call to action?</span></h2>
  <p style="font-size: 1.5rem; margin-top: 2rem;">Supporting text with <span class="gold">color</span>.</p>
</section>
```

**Notes:** Text renders at 4.5rem, centered, max-width 900px. Use sparingly (2-4 per lesson).

---

### 5. Standard Content Slide

**When to use:** All regular slides. Gets a light gradient background automatically.

```html
<section class="slide" data-chapter="3">
  <h2>Slide Title</h2>
  <!-- Content components go here (see below) -->
</section>
```

**Optional subtitle pattern:**
```html
<p style="font-size: 1.4rem; color: var(--gray); margin-top: -1.5rem; margin-bottom: 2rem;">Subtitle text</p>
```

---

### 6. `slide-closing` — Final Celebration Slide

**When to use:** Always the last slide. One per presentation. Triggers confetti and success sound.

```html
<section class="slide slide-closing" data-chapter="7" id="closingSlide">
  <div class="confetti-container" id="confettiContainer"></div>
  <div class="closing-box">
    <h3 style="color: var(--gold); font-size: 1.5rem; margin-bottom: 1.5rem;">Congratulations, you have completed this lesson!</h3>
    <p>"Inspirational quote related to lesson topic."</p>
    <div class="divider"></div>
    <h2>Closing Statement</h2>
  </div>
</section>
```

**Notes:** Must have `id="closingSlide"` and `id="confettiContainer"`. JS auto-triggers confetti and a 3-note success chord (C-E-G).

---

## Content Components

### 1. `cards-grid` — 2-Column Info Cards

**When to use:** Comparing 2-6 related concepts, listing categories, or breaking down a topic into parts.

```html
<div class="cards-grid">
  <div class="card">
    <h4>Card Title</h4>
    <p>Description text</p>
  </div>
  <div class="card gold-border">
    <h4>Card Title</h4>
    <p>Description text</p>
  </div>
  <!-- Alternate: card, card gold-border, card gold-border, card -->
</div>
```

**Variants:**
- `.card` — green left border (default)
- `.card.gold-border` — gold left border

**Guidelines:** Use 2, 4, or 6 cards for balanced 2-column layout. Alternate green/gold borders for visual variety.

---

### 2. `takeaways` — Numbered Steps/Items

**When to use:** Step-by-step instructions, discussion questions, reflection prompts, ordered lists.

```html
<div class="takeaways">
  <div class="takeaway-item">
    <div class="takeaway-num">1</div>
    <p>First item with <strong>bold emphasis</strong></p>
  </div>
  <div class="takeaway-item">
    <div class="takeaway-num alt">2</div>
    <p>Second item with <span class="accent">colored text</span></p>
  </div>
  <div class="takeaway-item">
    <div class="takeaway-num">3</div>
    <p>Third item</p>
  </div>
</div>
```

**Variants:**
- `.takeaway-num` — blue circle (default)
- `.takeaway-num.alt` — gold circle

**Guidelines:** Use 3-6 items. Alternate blue/gold for visual rhythm. Numbers animate in with a spring bounce.

---

### 3. `smart-stack` — Letter + Content Rows

**When to use:** Acronyms (SMART, FOCUS, etc.), letter-keyed definitions, any content where each row starts with a single character.

```html
<div class="smart-stack">
  <div class="smart-row">
    <div class="smart-letter">S</div>
    <div class="smart-content">
      <h4>Specific</h4>
      <p>What exactly will I accomplish?</p>
    </div>
  </div>
  <div class="smart-row">
    <div class="smart-letter alt">M</div>
    <div class="smart-content">
      <h4>Measurable</h4>
      <p>How will I track my progress?</p>
    </div>
  </div>
  <!-- Continue for each letter -->
</div>
```

**Variants:**
- `.smart-letter` — blue square (default)
- `.smart-letter.alt` — gold square

**Guidelines:** Best with 3-7 rows. Alternate blue/gold. Each row animates in with staggered delay.

---

### 4. `matrix-grid` — 2x2 Decision Matrix

**When to use:** Exactly 4 items in a quadrant layout (e.g., Eisenhower Matrix, priority grids, comparison tables).

```html
<div class="matrix-grid">
  <div class="matrix-cell do-first">
    <span class="matrix-label">Label (e.g., Urgent + Important)</span>
    <span class="matrix-action">Action Word</span>
    <span class="matrix-desc">Brief description</span>
  </div>
  <div class="matrix-cell schedule">
    <span class="matrix-label">Label</span>
    <span class="matrix-action">Action Word</span>
    <span class="matrix-desc">Brief description</span>
  </div>
  <div class="matrix-cell delegate">
    <span class="matrix-label">Label</span>
    <span class="matrix-action">Action Word</span>
    <span class="matrix-desc">Brief description</span>
  </div>
  <div class="matrix-cell eliminate">
    <span class="matrix-label">Label</span>
    <span class="matrix-action">Action Word</span>
    <span class="matrix-desc">Brief description</span>
  </div>
</div>
```

**Cell classes (exactly 4, in order):**
| Class | Color | Purpose |
|-------|-------|---------|
| `.do-first` | Blue (--primary) | Top-left, highest priority |
| `.schedule` | Green (--accent) | Top-right, important but not urgent |
| `.delegate` | Gold (--gold) | Bottom-left, urgent but less important |
| `.eliminate` | Muted gray | Bottom-right, lowest priority |

**Guidelines:** Always exactly 4 cells. Keep labels short (3-4 words), action words to 1-2 words, descriptions to ~5 words.

---

### 5. `dangers-grid` — 3D Flip Cards

**When to use:** Overview of 4-6 related dangers, myths, challenges, or concepts. Each card reveals more detail on hover.

```html
<div class="dangers-grid">
  <div class="danger-card">
    <div class="danger-card-inner">
      <div class="danger-card-front">
        <div class="danger-icon">&#128241;</div>
        <h4>Card Title</h4>
      </div>
      <div class="danger-card-back">
        <h4>Card Title</h4>
        <p>Detailed description (keep to 1-2 sentences).</p>
      </div>
    </div>
  </div>
  <!-- Repeat for each card -->
</div>
```

**Guidelines:** Use 4-6 cards. Use HTML emoji entities for icons. Front shows icon + title, back shows title + description. Cards flip on hover via CSS 3D transform.

**Common emoji entities:** `&#128241;` (phone), `&#9203;` (timer), `&#128260;` (arrows), `&#128587;` (person), `&#128736;` (wrench), `&#128170;` (muscle), `&#128161;` (lightbulb), `&#9888;` (warning)

---

### 6. `areas-grid` — 3-Column Feature Cards

**When to use:** Exactly 3 major categories with bullet point lists (benefits, features, pillars).

```html
<div class="areas-grid">
  <div class="area-card">
    <div class="area-header">
      <div class="area-icon">&#9829;</div>
      <h4>Card Title</h4>
    </div>
    <ul>
      <li>Bullet point 1</li>
      <li>Bullet point 2</li>
      <li>Bullet point 3</li>
    </ul>
  </div>
  <div class="area-card gold-card">
    <div class="area-header">
      <div class="area-icon">&#9881;</div>
      <h4>Card Title</h4>
    </div>
    <ul>
      <li>Bullet point 1</li>
      <li>Bullet point 2</li>
      <li>Bullet point 3</li>
    </ul>
  </div>
  <div class="area-card">
    <div class="area-header">
      <div class="area-icon">&#9734;</div>
      <h4>Card Title</h4>
    </div>
    <ul>
      <li>Bullet point 1</li>
      <li>Bullet point 2</li>
      <li>Bullet point 3</li>
    </ul>
  </div>
</div>
```

**Variants:**
- `.area-card` — blue background, white text (default)
- `.area-card.gold-card` — gold background, dark text

**Guidelines:** Always exactly 3 cards. Pattern: blue, gold, blue. Use 2-4 bullet points per card.

---

### 7. `split-layout` — Text + Visual Circle

**When to use:** Explanatory text paired with a visual icon/emoji. Good for definitions, key concepts, or single-topic deep dives.

```html
<div class="split-layout">
  <div class="split-text">
    <p style="font-size: 1.6rem; margin-bottom: 1.5rem;">Main text with <span class="highlight">blue highlights</span>.</p>
    <p style="font-size: 1.6rem;">Supporting text with <span class="accent">green emphasis</span>.</p>
  </div>
  <div class="split-visual">
    <div class="visual-circle">&#9733;</div>
  </div>
</div>
```

**Custom circle colors:**
```html
<div class="visual-circle" style="background: linear-gradient(135deg, var(--gold), var(--muted-gold)); font-size: 3.5rem;">&#9878;</div>
<div class="visual-circle" style="background: linear-gradient(135deg, var(--accent), var(--primary)); font-size: 3rem;">&#8645;</div>
<div class="visual-circle" style="background: linear-gradient(135deg, var(--mauve), var(--dark)); font-size: 3.5rem;">&#9888;</div>
```

**Guidelines:** Keep text to 2-3 paragraphs. Font size 1.4rem-1.6rem. Circle renders at 250px (150px on mobile).

---

### 8. `activity-box` — Group Activity Callout

**When to use:** Inside a slide (often inside `split-text`) to highlight a group activity, discussion prompt, or hands-on exercise.

```html
<div class="activity-box">
  <div class="activity-label">Group Activity</div>
  <p>Activity instructions go here. Be specific about what students should do.</p>
</div>
```

**Label variations:** "Group Activity", "Discussion", "Hands-On Activity", "Reflection", "Partner Work"

**Guidelines:** Gold-bordered box. Keep instructions to 1-2 sentences. Usually placed at the bottom of a `split-text` div.

---

### 9. `download-resource` — PDF Download Container

**When to use:** When a slide references a downloadable PDF (worksheet, planner, assessment).

```html
<div class="download-resource">
  <span class="download-prompt">Instructor Resource Available</span>
  <a href="Handouts/filename.pdf" target="_blank" class="download-btn">Button Label</a>
</div>
```

**Multiple downloads:**
```html
<div class="download-resource">
  <span class="download-prompt">Instructor Resource Available</span>
  <a href="Handouts/file1.pdf" target="_blank" class="download-btn">Resource 1</a>
  <a href="Handouts/file2.pdf" target="_blank" class="download-btn">Resource 2</a>
</div>
```

**Standalone download button (no container):**
```html
<a href="Handouts/filename.pdf" target="_blank" class="download-btn">Button Label</a>
```

**Guidelines:** Green buttons with down-arrow prefix. Place at bottom of slide content.

---

### 10. `content-list` — Arrow-Prefixed List

**When to use:** Simple bulleted lists with arrow or warning icons.

```html
<ul class="content-list">
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ul>
```

**Danger variant (warning icons instead of arrows):**
```html
<ul class="content-list danger">
  <li>Warning item 1</li>
  <li>Warning item 2</li>
</ul>
```

---

## Text Styling Classes

Use these inline classes within `<span>` tags to color-code important words:

| Class | Color | Usage |
|-------|-------|-------|
| `.highlight` | Blue (`--primary`) | Key terms, definitions |
| `.accent` | Green (`--accent`) | Positive outcomes, actions |
| `.gold` | Gold (`--gold`) | Special emphasis, transitions |
| `.mauve` | Mauve (`--mauve`) | Warm accent, caution emphasis |

**Example:**
```html
<p>The goal is to <span class="highlight">maximize productivity</span> and <span class="accent">achieve your goals</span>.</p>
```

---

## Component Selection Guide

| Content Type | Best Component |
|---|---|
| Comparing 2-6 related items | `cards-grid` |
| Step-by-step instructions | `takeaways` |
| Acronym breakdown (SMART, etc.) | `smart-stack` |
| 4-quadrant decision framework | `matrix-grid` |
| 4-6 dangers/myths/challenges with reveals | `dangers-grid` (flip cards) |
| 3 major categories with bullet lists | `areas-grid` |
| Definition + visual icon | `split-layout` |
| Group activity or discussion prompt | `activity-box` |
| Downloadable PDF resource | `download-resource` |
| Simple bulleted list | `content-list` |
| Key quote or transition | `big-statement` (slide type) |
| YouTube video | `slide-video` (slide type) |
