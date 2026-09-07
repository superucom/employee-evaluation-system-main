---
name: Employee Performance Evaluation System
description: A calm, professional Sage dashboard for managing employee evaluation cycles, assignments, scores, and reports.
colors:
  quiet-sage: "#5D786C"
  quiet-sage-hover: "#477A61"
  sage-accent: "#91A99E"
  soft-office-canvas: "#F5F9F6"
  canvas-alt: "#F7FBF8"
  surface-strong: "#EAF2ED"
  surface-muted: "#EEF4F0"
  paper-white: "#FFFFFF"
  text-primary: "#24352D"
  text-secondary: "#5E7066"
  border-soft: "#CFDDD5"
  input-border: "#B8C9C0"
  success: "#477A61"
  warning: "#8B642A"
  info: "#557B78"
  error: "#B65353"
typography:
  display:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.02em"
  compact:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.35
  button:
    fontFamily: "Prompt, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: "0.6rem"
  control: "0.65rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  pill: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  2xl: "2rem"
  page: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.quiet-sage}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.quiet-sage-hover}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1.25rem"
  button-secondary:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1.25rem"
  input:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.6rem 0.85rem"
  card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  status-chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.65rem"
---

# Design System: Employee Performance Evaluation System

## Overview

**Creative North Star: "Quiet Control Room"**

The interface is a quiet control room for a working organization: calm enough for long administrative sessions, structured enough for high-volume score and assignment data, and confident enough to make status and permissions easy to trust. The visual language is based on the confirmed `Quiet Sage` accent and `Soft Office Canvas` neutrals, with Prompt typography carrying Thai and English labels consistently across the product.

The system uses a soft elevated surface model. White cards sit gently above the pale Sage canvas, while thin borders and restrained shadows separate adjacent work areas without making the dashboard feel heavy. Color is functional: Sage is the operational voice, muted neutrals carry secondary information, and success, warning, information, and error retain distinct meanings.

**Key Characteristics:**

- Calm, professional Sage palette with high-contrast dark text.
- Information-dense but orderly dashboard and table layouts.
- Softly elevated cards and controls with restrained interaction feedback.
- Thai-first product copy with English labels where they aid recognition.
- Responsive desktop sidebar and mobile off-canvas navigation.

## Colors

The palette is a muted Sage system grounded by a soft office canvas and dark green text. The accent should remain purposeful so tables, forms, and status states stay easy to scan.

### Primary

- **Quiet Sage**: The main action and navigation accent used for primary buttons, active controls, focus states, and the operational identity of the product.
- **Quiet Sage Hover**: The deeper interactive state used when a primary control is hovered or pressed.
- **Sage Accent**: A lighter Sage surface used by the sidebar, supporting highlights, and low-intensity active states.

### Neutral

- **Soft Office Canvas**: The page-level background that gives the dashboard its calm working surface.
- **Canvas Alt**: A slightly different pale surface for local hover and table-row separation.
- **Surface Strong**: A stronger pale Sage layer for dark-legacy utility normalization, helper panels, and contextual areas.
- **Surface Muted**: A quiet fill for table headers, chips, badges, and secondary controls.
- **Paper White**: The card and input surface, used to create soft elevation against the canvas.
- **Text Primary**: Dark green text for headings, body copy, and important values.
- **Text Secondary**: Muted green text for supporting labels, metadata, and descriptions.
- **Border Soft**: Low-contrast dividers around cards, tables, and controls.
- **Input Border**: A slightly stronger stroke that defines editable fields.

### Tertiary

- **Success**: Green status for submitted, active, and completed states.
- **Warning**: Muted bronze-gold status for pending attention and caution.
- **Info**: Cool Sage-teal information state for informational labels and supporting categories.
- **Error**: Muted red status for destructive actions, locked states, and validation errors.

### Named Rules

**The Quiet Accent Rule.** Use Quiet Sage to direct action and orientation; do not turn every decorative surface into an accent surface.

**The Meaningful Status Rule.** Status colors must remain distinct from the Sage brand accent so users can recognize success, warning, information, and error without relying on color alone.

## Typography

**Display Font:** Prompt (with system-ui, -apple-system, Segoe UI, and Roboto fallbacks)

**Body Font:** Prompt (with system fallbacks)

**Character:** Prompt gives Thai and English labels a single, practical voice. Weight and size changes provide hierarchy while keeping the dense administrative UI approachable and readable.

### Hierarchy

- **Display** (600, 1.6rem, 1.25): Login and prominent product-level titles.
- **Headline** (700, 1.5rem, 1.3): Page headings such as Dashboard, Employees, Reports, and Evaluator Assignments.
- **Title** (600, 1.125rem, 1.4): Card titles, section headings, and modal titles.
- **Body** (400, 0.9rem, 1.5): Main form copy, descriptions, table content, and supporting explanations.
- **Label** (600, 0.8rem, 1.35, 0.02em letter spacing): Table headers, badges, metadata, and compact field labels.

### Named Rules

**The One Family Rule.** Use Prompt consistently across Thai and English UI copy; create hierarchy with weight, size, and spacing rather than switching typefaces.

**The Dense-but-Readable Rule.** Compact labels are allowed in tables and badges, but important actions and page titles must retain comfortable line height and clear contrast.

## Layout

The desktop layout is a fixed 260px sidebar with a fluid main content area. The main content uses a centered container with approximately 2rem horizontal padding and works as a series of stacked control panels: page header, filters, summary cards, tables, and dialogs.

At widths below 1024px, the sidebar becomes an off-canvas drawer and the main content uses the full viewport. At widths below 640px, forms and two-column grids collapse to one column, dialogs become top-aligned scrollable panels, and interactive controls maintain a minimum touch target around 40px. Wide tables remain horizontally scrollable inside their own panel instead of creating page-level overflow.

The spacing rhythm is built from 0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, and 2rem steps. Use generous page-level separation around sections while keeping repeated table rows and metadata compact.

## Elevation & Depth

This is a soft elevated system. Depth comes primarily from white surfaces against the Soft Office Canvas, subtle Sage-tinted shadows, and thin borders. Shadows should explain a surface boundary or interactive lift, not create a dramatic floating-card aesthetic.

### Shadow Vocabulary

- **Card resting** (`0 2px 10px rgba(0, 0, 0, 0.02)`): Quiet separation for cards and grouped panels.
- **Primary action** (`0 6px 16px rgba(142, 165, 151, 0.3)`): Soft lift under prominent buttons.
- **Login card** (`0 20px 45px rgba(142, 165, 151, 0.18), 0 0 0 1px #E6E0D2`): The strongest elevation reserved for the entry surface.
- **Sidebar drawer** (`12px 0 30px rgba(36, 53, 45, 0.16)`): Separation when mobile navigation overlays content.

### Named Rules

**The Soft Lift Rule.** A control may lift slightly on hover, but the resting state should remain calm and grounded.

## Shapes

The form language is gently rounded rather than pill-heavy. Inputs use approximately 0.6rem corners, buttons use approximately 0.65–0.75rem corners, cards use 1rem corners, and login surfaces use 1.25rem corners. Status badges and compact chips use fully rounded pill silhouettes.

Borders are thin and low contrast, with Input Border slightly stronger than Border Soft. Tables use clean horizontal dividers and rectangular cells; the surrounding table container supplies the rounded silhouette.

## Components

### Buttons

- **Character:** Polite, tactile, and operationally clear.
- **Shape:** Gently rounded (0.65–0.75rem) with a minimum comfortable height on mobile.
- **Primary:** Quiet Sage background with Paper White text, medium-to-semibold weight, and a restrained Sage-tinted shadow.
- **Hover / Focus:** Quiet Sage Hover background, a small upward lift where appropriate, and a visible focus ring using the primary color at low opacity.
- **Secondary / Ghost:** Paper White or transparent surface with Text Primary, Border Soft/Input Border, and a muted hover fill.
- **Destructive:** Error text and a low-opacity error surface; reserve solid error fills for confirmation or high-risk actions.

### Chips

- **Style:** Compact, rounded-pill labels with Surface Muted or low-opacity semantic backgrounds.
- **State:** Text and border communicate the category or status; selected and active chips use Sage, while warning and error chips retain their semantic hues.

### Cards / Containers

- **Corner Style:** Calm 1rem corners for normal panels; 1.25rem for the login card.
- **Background:** Paper White on Soft Office Canvas.
- **Shadow Strategy:** Card resting elevation with a subtle border; stronger shadows are reserved for login and overlays.
- **Border:** Border Soft, with primary-tinted borders only when the card is an active or emphasized region.
- **Internal Padding:** Usually 1rem–1.5rem, with 2rem reserved for page-level or login surfaces.

### Inputs / Fields

- **Style:** Paper White background, Input Border stroke, 0.6rem radius, approximately 0.6rem vertical and 0.85rem horizontal padding, and 0.9rem body text.
- **Focus:** Primary border plus a soft three-pixel Sage ring.
- **Error / Disabled:** Error state must keep readable error text and border; disabled fields reduce opacity, use Surface Muted, and show a not-allowed cursor.

### Navigation

- **Style:** The 260px Sage sidebar is the persistent orientation rail on desktop and an off-canvas drawer on smaller screens.
- **Default:** Dark green text, compact grouped links, and clear section labels.
- **Active:** Light Sage surface, stronger text weight, and a visible selected-row shape without competing with the page content.
- **Mobile:** Use the minimum-size menu and close controls, preserve the same link order, and prevent the drawer from causing page-level horizontal scroll.

### Tables

- **Style:** White table surface inside a rounded bordered container, muted header row, compact readable cells, and horizontal dividers.
- **Interaction:** Row hover uses Canvas Alt; status and action controls remain visually distinct from ordinary cell text.
- **Responsive:** Keep wide data scrollable within its own panel and preserve the first useful identifiers when the viewport narrows.

### Status Badges

- **Style:** Small rounded pills with a low-opacity semantic background, readable text, and a thin semantic border.
- **Meaning:** Submitted/active uses Success, pending uses Warning, informational labels use Info, and locked/error states use Error.

## Do's and Don'ts

### Do:

- **Do** use Quiet Sage as a deliberate action and orientation signal.
- **Do** keep primary text dark and readable against Paper White, Soft Office Canvas, and Sage surfaces.
- **Do** use soft elevation to separate work areas, not to decorate every element.
- **Do** keep tables, filters, forms, and modal actions consistent across all administrative screens.
- **Do** preserve the Thai-first copy and the English terms that help users identify system concepts.
- **Do** keep mobile navigation and wide data panels independently scrollable.

### Don't:

- **Don't** reintroduce unrelated saturated blue, purple, pink, or cyan as decorative brand colors.
- **Don't** use low-contrast Sage text on pale Sage surfaces for important actions or values.
- **Don't** make every card float with a large shadow or excessive motion.
- **Don't** hide critical table identifiers or actions when adapting for small screens.
- **Don't** change evaluation terminology, score meaning, permissions, or workflow behavior as a visual-only task.
