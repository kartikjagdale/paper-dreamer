---
name: Paper Dreamer
description: A local-first research paper analyzer with a reading-room interface
colors:
  steel-blue: "#3a7a99"
  white: "#ffffff"
  pale-fog: "#f2f5f7"
  deep-ink: "#1c2631"
  warm-amber: "#b07d1e"
  quiet-gray: "#526068"
typography:
  display:
    fontFamily: "Newsreader, Charter, Georgia, serif"
    fontSize: "clamp(1.75rem, 4vw, 2.75rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Newsreader, Charter, Georgia, serif"
    fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  body:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0"
  label:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.steel-blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.deep-ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card-default:
    backgroundColor: "{colors.white}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-default:
    backgroundColor: "{colors.white}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: Paper Dreamer

## 1. Overview

**Creative North Star: "The Reading Room"**

A well-lit library alcove in mid-morning. Tall windows, good paper, structured thought laid bare. The interface is the reading environment: it sets the conditions for focus and then recedes. Content fills the space the way text fills a well-typeset page.

This system rejects the current AI-tool aesthetic: tracked uppercase labels on every section, geometric sans-serif at every weight, muted grays that strain the eyes, gradient-clipped decorative text, identical rounded cards in grid formation. It also rejects terminal darkness, hacker monospace, and over-designed marketing surfaces with glassmorphism and parallax. The interface is neither flashy nor austere. It is comfortable.

**Key Characteristics:**
- Serif headlines with sans-serif body create intellectual weight without pretension
- Pure white background with restrained steel-blue accent (used sparingly, not everywhere)
- High body-text contrast for extended reading sessions
- Generous line height and capped line length (65-75ch) for comfort
- Hierarchy through scale and weight, not through color coding every section differently

## 2. Colors: The Reading Room Palette

A restrained palette. Steel-blue marks interactive elements and structural accents at under 10% of any screen. Everything else is ink, paper, and fog.

### Primary
- **Steel Blue** oklch(0.520 0.085 210): Interactive elements, links, the primary action button, and the single structural accent. Used with restraint. Its rarity gives it signal strength.

### Secondary
- **Warm Amber** oklch(0.580 0.150 65): Badges, status indicators, highlighted findings, and the occasional warm callout. Provides the single point of warmth against the cool-neutral reading surface. Used on accent fills; white text on top.

### Neutral
- **Deep Ink** oklch(0.200 0.010 210): Primary body text. Near-black with a barely perceptible cool cast from the brand hue. Exceeds 7:1 contrast against white.
- **Quiet Gray** oklch(0.450 0.010 210): Secondary text, captions, metadata, timestamps. Exceeds 4.5:1 against white.
- **Pale Fog** oklch(0.970 0.005 210): Card backgrounds, section surfaces, input fields at rest. Barely-there blue tint that separates layers without introducing visual noise.
- **White** oklch(1.000 0.000 0): Page background. Pure. No hidden warmth, no cream, no sand.

### Named Rules

**The Restraint Rule.** Steel Blue appears on no more than 10% of any screen. If a section has more blue than white, something is wrong. Its power comes from its scarcity.

**The No-Cream Rule.** Backgrounds are pure white or Pale Fog. Never warm-tinted. Never beige, sand, bone, linen, parchment, or any token name that evokes paper color. Warmth lives in the serif headings and the amber accent, not the surface.

## 3. Typography

**Display Font:** Newsreader (with Charter, Georgia, serif fallback)
**Body Font:** Source Sans 3 (with system-ui, sans-serif fallback)

**Character:** Newsreader brings editorial warmth and intellectual seriousness without the stuffiness of traditional serifs. Source Sans 3 is a humanist sans designed for reading at text sizes. Together they say: this tool takes your reading seriously, but it is not a textbook. The pairing works on contrast: serif display weight against sans body lightness.

### Hierarchy
- **Display** (500, clamp(1.75rem, 4vw, 2.75rem), line-height 1.2): Paper titles, the primary result heading. One per page.
- **Headline** (500, clamp(1.25rem, 2.5vw, 1.75rem), line-height 1.3): Section headings within results (Evidence-Backed Findings, Key Concepts, etc.).
- **Title** (600, 1rem, line-height 1.4): Card headers, subsection labels, nav items. Sans-serif. Weight carries the distinction.
- **Body** (400, 1rem, line-height 1.7): All running text. Capped at 70ch max-width for reading comfort. Line-height 1.7 gives generous breathing room.
- **Label** (600, 0.8125rem, letter-spacing 0.02em): Metadata, stat labels, chip text. Slightly tracked, slightly smaller. Never uppercase unless a 2-3 word tag.

### Named Rules

**The No-Flat-Type Rule.** Adjacent text elements must differ by at least 1.25x in size OR clearly differ in weight (regular vs semibold minimum). If two pieces of text look the same size and weight, the hierarchy has failed.

**The Line-Length Rule.** No paragraph of body text exceeds 70ch. No exception. Prose in the result pane, the layman explanation, findings, all of it. Width is controlled per element, not by page margins alone.

## 4. Elevation

This system is flat by default. Depth is conveyed through background tinting (white on fog, fog on white) rather than shadows. Surfaces layer tonally.

One exception: the input panel (left column) uses a single subtle shadow to separate it from the content area when scrolling. This is ambient, not structural.

### Shadow Vocabulary
- **Ambient** (`0 1px 3px oklch(0.200 0.010 210 / 0.06), 0 1px 2px oklch(0.200 0.010 210 / 0.04)`): The input card at rest. Barely visible. Dissolves at a glance.
- **Elevated** (`0 4px 12px oklch(0.200 0.010 210 / 0.08)`): Dropdowns, tooltips, floating elements that must separate from the page.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. The only lifted elements are the input panel card and floating overlays. If something has a shadow, it must be floating above the page plane for a functional reason (not decoration).

## 5. Components

### Buttons
- **Shape:** Gently curved edges (8px radius)
- **Primary:** Steel Blue fill, white text, 12px 24px padding. Font: label weight (600) at body size.
- **Hover:** Background shifts to Deep Ink. Transition: 150ms ease-out.
- **Focus:** 2px ring in Steel Blue at 40% opacity, offset 2px.
- **Secondary:** White fill, Deep Ink text, 1px border in Quiet Gray. Hover: Pale Fog fill.
- **Destructive:** reserved for cancel/stop actions. White fill, Deep Ink text, 1px border tinted toward red oklch(0.550 0.180 25).

### Cards / Containers
- **Corner Style:** Gently curved (12px radius)
- **Background:** White (on page) or Pale Fog (for inset sections within white cards)
- **Shadow Strategy:** Ambient shadow on the input panel only. Result cards have no shadow; they are distinguished by white-on-fog or fog-on-white layering.
- **Border:** 1px in oklch(0.900 0.005 210) — barely visible, structural only.
- **Internal Padding:** 24px (lg spacing).

### Inputs / Fields
- **Style:** White fill, 1px border in oklch(0.850 0.005 210), 8px radius. Background shifts to Pale Fog on focus.
- **Focus:** Border shifts to Steel Blue, subtle 2px ring in Steel Blue at 20% opacity.
- **Placeholder:** Quiet Gray. Must hit 4.5:1 contrast against white fill.
- **Error:** Border shifts to oklch(0.550 0.180 25), background tints toward oklch(0.970 0.020 25).

### Navigation / Tabs
- **Style:** Source Sans 3 at label size. Quiet Gray text at rest. Deep Ink text when active.
- **Active indicator:** 2px bottom border in Steel Blue. No background change.
- **Hover:** Text shifts to Deep Ink. Transition: 100ms.

### Result Sections (Signature Component)
The analysis output is the primary surface users spend time on. Each section is a white card on the fog background, with:
- Headline-level serif heading (Newsreader 500)
- Body text at 1rem/1.7 line-height, capped at 70ch
- Bullet lists with colored markers (section-specific: amber for limitations, steel-blue for contributions)
- Evidence blockquotes: left-padded with Pale Fog background, no decorative border-left stripe. Padding and tint provide the inset feeling.

## 6. Do's and Don'ts

### Do:
- **Do** use Newsreader for all headings within the result pane. The serif creates reading-room warmth.
- **Do** cap all body text at 70ch width. Use `max-width: 70ch` on paragraph containers.
- **Do** maintain ≥7:1 contrast for body text (Deep Ink on White).
- **Do** use Steel Blue only for interactive elements and one structural accent per section. Count the blue on screen; less is more.
- **Do** use `text-wrap: balance` on headline-level text and `text-wrap: pretty` on body paragraphs.
- **Do** keep the page background pure white. Cards and sections use Pale Fog for tonal layering.

### Don't:
- **Don't** use the generic SaaS aesthetic: blue-600 + slate-gray + rounded-card template. That is explicitly rejected.
- **Don't** use terminal/hacker aesthetics: monospace body text, dark backgrounds, green-on-black.
- **Don't** use gradient text, glassmorphism, parallax, or animated distractions.
- **Don't** put tiny uppercase tracked eyebrows above every section heading. One labeled badge per card maximum.
- **Don't** use border-left greater than 1px as a colored accent stripe on blockquotes or cards.
- **Don't** use identical card grids (same size, same icon + heading + text pattern repeated). Vary the weight and density across result sections.
- **Don't** use cream, sand, beige, bone, or any warm-tinted background. The Reading Room is lit by daylight, not candlelight.
- **Don't** use Inter, Geist, DM Sans, Plus Jakarta Sans, or Cal Sans. These are the current AI-SaaS default fonts.
- **Don't** color-code every section differently. The palette is restrained; section identity comes from heading text and content, not from per-section accent colors.
