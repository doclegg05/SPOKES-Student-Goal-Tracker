# SPOKES Brand Palette — Canonical Reference

**This is the single source of truth for all SPOKES brand colors.**
All templates, lessons, documentation, and agent instructions must match these values exactly.

Last updated: 2026-02-27

---

## Complete Palette (11 Colors)

### Core Palette

| Variable       | Hex       | RGB              | Usage                               |
| -------------- | --------- | ---------------- | ----------------------------------- |
| `--primary`    | `#007baf` | `rgb(0,123,175)` | Headings, primary buttons, links    |
| `--accent`     | `#37b550` | `rgb(55,181,80)` | Download buttons, positive emphasis |
| `--dark`       | `#004071` | `rgb(0,64,113)`  | Sidebar, dark backgrounds           |
| `--light`      | `#FFFFFF` | `rgb(255,255,255)` | Text on dark, backgrounds         |
| `--muted`      | `#EDF3F7` | `rgb(237,243,247)` | Card backgrounds, subtle fills    |
| `--gray`       | `#60636b` | `rgb(96,99,107)` | Body text, subtitles                |
| `--gold`       | `#d3b257` | `rgb(211,178,87)` | Gold accents, dividers, badges     |

### Extended Palette

| Variable       | Hex       | RGB              | Usage                                        |
| -------------- | --------- | ---------------- | -------------------------------------------- |
| `--royal`      | `#00133f` | `rgb(0,19,63)`   | Deep navy backgrounds, premium feel          |
| `--mauve`      | `#a7253f` | `rgb(167,37,63)` | Warm accent, caution/emphasis, card borders   |
| `--offwhite`   | `#d1d3d4` | `rgb(209,211,212)` | Subtle backgrounds, soft borders, dividers  |
| `--muted-gold` | `#ad8806` | `rgb(173,136,6)` | Darker gold for text on light, rich accents   |

---

## CSS Variable Block

Copy this exactly into every lesson's `:root`:

```css
:root {
  --primary: #007baf;
  --accent: #37b550;
  --dark: #004071;
  --light: #FFFFFF;
  --muted: #EDF3F7;
  --gray: #60636b;
  --gold: #d3b257;
  --royal: #00133f;
  --mauve: #a7253f;
  --offwhite: #d1d3d4;
  --muted-gold: #ad8806;
}
```

---

## Contrast Reference

Calculated against WCAG 2.2 AA thresholds (4.5:1 normal text, 3:1 large text).

### Passing Combinations

| Text Color | Background | Ratio | AA Normal | AA Large |
|---|---|---|---|---|
| `--gray` (#60636b) | `--light` (#FFFFFF) | 5.54:1 | PASS | PASS |
| `--dark` (#004071) | `--light` (#FFFFFF) | 10.65:1 | PASS | PASS |
| `--light` (#FFFFFF) | `--dark` (#004071) | 10.65:1 | PASS | PASS |
| `--light` (#FFFFFF) | `--royal` (#00133f) | 18.03:1 | PASS | PASS |
| `--light` (#FFFFFF) | `--primary` (#007baf) | 3.96:1 | -- | PASS |
| `--mauve` (#a7253f) | `--light` (#FFFFFF) | 5.34:1 | PASS | PASS |
| `--muted-gold` (#ad8806) | `--light` (#FFFFFF) | 3.33:1 | -- | PASS |
| `--primary` (#007baf) | `--light` (#FFFFFF) | 3.96:1 | -- | PASS |
| `--gray` (#60636b) | `--muted` (#EDF3F7) | 5.37:1 | PASS | PASS |

### Failing Combinations (Do Not Use)

| Text Color | Background | Ratio | Issue |
|---|---|---|---|
| `--gold` (#d3b257) | `--light` (#FFFFFF) | 2.04:1 | Fails both AA thresholds |
| `--accent` (#37b550) | `--light` (#FFFFFF) | 2.66:1 | Fails AA normal text |
| `--light` (#FFFFFF) | `--accent` (#37b550) | 2.66:1 | Fails AA normal text |
| `--gold` (#d3b257) | `--primary` (#007baf) | 2.31:1 | Fails both thresholds |

### Safe Text Highlight Usage

For inline text emphasis on white/light backgrounds:

| Class | Use This Color | Contrast on White | Notes |
|---|---|---|---|
| `.highlight` | `--primary` (#007baf) | 3.96:1 | Safe for large text (h2, h3) only |
| `.accent` | `--accent` (#37b550) | 2.66:1 | Safe for large text only; avoid at body size |
| `.gold` | `--muted-gold` (#ad8806) | 3.33:1 | Use muted-gold, NOT gold, for text on light |
| `.mauve` | `--mauve` (#a7253f) | 5.34:1 | Safe for all text sizes |

---

## Controlled Theming Mix Rules (Allowed)

Lessons may vary their look by mixing the 11 approved colors differently, but only under these rules.

### Allowed Variation

- All colors must come from the 11-color canonical palette only.
- Per lesson, agents may vary:
  - Major color emphasis (for example, `--primary`-led vs `--mauve`-led vs `--accent`-led styling).
  - Minor accent usage (for dividers, badges, callouts, highlights).
  - Dark/light surface choices (`--dark`/`--royal` and `--light`/`--muted`/`--offwhite`).

### Contrast Guardrails (Hard Requirements)

- Any text/background pair used in lesson UI must meet WCAG AA:
  - 4.5:1 for normal text
  - 3:1 for large text
- Any button/interactive label text must meet 4.5:1 unless it qualifies as large text.
- If a color pair is uncertain, use a known passing pair from the Contrast Reference table.

### Anti-Clash Guardrails (Hard Requirements)

- Do not use saturated accent-on-accent foreground/background pairings for readable text or primary controls.
- Treat these as accent-family colors: `--primary`, `--accent`, `--mauve`, `--gold`, `--muted-gold`.
- Accent-family colors should primarily sit on neutral/surface colors (`--light`, `--muted`, `--offwhite`, `--gray`, `--dark`, `--royal`) for readability and harmony.
- Red-vs-green style pairing is prohibited in opposing foreground/background roles:
  - `--mauve` on `--accent`
  - `--accent` on `--mauve`
- More generally: avoid any high-contrast hue-opponent accent pairing that creates visual vibration or confusion.

---

## Prohibited Colors

The following colors must NEVER appear in any SPOKES lesson:

- Bright reds: `#DC2626`, `#991b1b`, `#FF6B6B`
- Oranges: `#EA580C`, `#ff6b35`
- Purples: `#4C1D95`, `#6c23b5`, `#2E1065`
- Off-palette grays: `#E0E0E0`, `#E5E7EB`, `#5A6A7A`
- Off-palette blues: `#2D6DB5`, `#1E4A7D`, `#1A365D`, `#2B6CB0`
- Any hex value not listed in the Complete Palette section above

Opacity variations of approved colors ARE permitted (e.g., `rgba(0, 123, 175, 0.1)`).

---

## Changelog

| Date | Change |
|---|---|
| 2026-02-27 | Initial canonical palette created. 7 core + 4 extended = 11 total. |
| 2026-02-27 | Added controlled theming mix rules, contrast guardrails, and anti-clash guardrails for per-lesson differentiation. |
