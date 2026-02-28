# Dashboard Governance

`Dashboard.html` is treated as a governed release artifact and should follow the same quality expectations as lessons where applicable.

## Scope

The dashboard is responsible for:

- launching lesson modules reliably
- presenting module status/navigation clearly
- maintaining brand and accessibility standards

## Acceptance Criteria

### Brand

- Uses canonical SPOKES palette only
- Avoids off-palette hard-coded hex values
- Maintains contrast-safe color pairings

### Accessibility

- Meets WCAG AA text contrast thresholds
- Keyboard-navigable module cards and controls
- Decorative icons hidden from assistive tech when appropriate

### Link Integrity

- All module links resolve to valid `index.html` targets
- Dead or renamed module paths are updated before release

### Responsiveness

- No horizontal overflow at required viewports
- Card grid remains readable and operable on mobile/tablet/desktop

### Change Control

- Dashboard link changes must be reflected in `lesson-registry.json`
- Any dashboard design change should include a brief QA note in PR/commit

## Recommended QA Commands

```bash
# find hard-coded module links
rg -n "href=\".*index\.html\"" Dashboard.html

# spot-check legacy path names
rg -n "Hilary's Project|Employee_Accountability\.v2\.5|Teacher Resource" .
```
