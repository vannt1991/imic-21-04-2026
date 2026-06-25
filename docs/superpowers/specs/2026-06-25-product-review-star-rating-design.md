# MiniShop product review star rating design

Date: 2026-06-25

## Goal

Refine the existing product review UI so rating input and rating display use stars instead of a numeric select or plain `x/5` text.

Required behavior:

- the review form uses a 5-star picker
- hovering a star previews the value before click
- clicking a star selects that rating for submit
- the form still shows the selected numeric meaning as text such as `4 sao`
- the product review summary shows stars plus the numeric average and review count
- each review item in the public list shows stars plus its numeric label
- the current verified-purchase review rules and API contract stay unchanged

Out of scope:

- half-star selection
- animated rating transitions beyond simple hover/selected state changes
- filtering or sorting reviews by rating
- review moderation changes

## Current state

The review feature already exists and works server-side:

- verified purchasers can create or edit one review per product
- review data is public immediately after submit
- the form currently uses a `<select>` for rating
- the summary heading shows plain text like `4.5/5 tu 3 danh gia`
- each review row shows plain text like `5/5`

The missing piece is a more direct rating UI and more consistent visual rating display.

## Chosen approach

Add one shared star-rating component with two modes:

- interactive mode for the review form
- read-only mode for the average summary and review list

Rationale:

- one component keeps star shape, spacing, colors, and labeling consistent
- interactive and read-only states share the same rendering logic
- the form can add hover-preview behavior without duplicating list/summary markup

Alternatives considered:

1. Keep separate components for form and display
   - slightly simpler props per file
   - rejected because it duplicates star markup and styling

2. Use CSS-only stars for display and a different control for input
   - smaller form refactor
   - rejected because summary/list/form would drift visually

3. Keep the numeric select and only add decorative stars elsewhere
   - least code
   - rejected because the main UX pain stays in the input itself

## Component design

### Shared component

Add a small shared component, e.g. `ProductStarRating`, that renders exactly five stars.

Inputs:

- `value`
- `label`
- `readOnly`
- `onChange` when interactive

Internal behavior:

- read-only mode paints stars from `value`
- interactive mode tracks temporary hover state
- displayed star fill uses hover value when present, otherwise selected value

Deliberate simplification:

- no half-star fill logic in this phase
- read-only average stars round from the real average to the nearest whole-star display
- the adjacent numeric text keeps the precise average such as `4.5/5`

### Review form

Replace the rating `<select>` with the shared interactive star picker.

Form behavior:

- default value stays `5` for new reviews
- existing reviews still prefill current rating and comment
- clicking a star updates the submitted `rating`
- hover preview lights stars up to the hovered position
- leaving the star row restores the selected value
- text next to or below the control shows the current effective label such as `3 sao`

### Summary and review list

Use the same component in read-only mode:

- summary shows stars, average text, and review count
- each review item shows stars and a short numeric text like `5 sao`

This keeps the display public, immediate, and visually consistent with the form.

## Interaction and accessibility

Interactive star cells should be actual buttons, not bare spans.

Expected behavior:

- mouse hover previews stars
- click selects a rating
- keyboard users can focus each star button
- `Enter` or `Space` selects the focused star through normal button behavior

Accessibility policy:

- keep a visible text label near the control so the selected value is not color-only
- expose an `aria-label` per star button such as `Chon 4 sao`
- mark the current selection with `aria-pressed`
- read-only stars should be ignored as controls and only support visual display

## Styling

Use existing CSS in `src/app/globals.css` and add a small review-star block:

- star row layout
- filled vs empty star colors
- hover/focus affordances for interactive stars
- compact variant for review list / summary if needed

Keep the design lightweight and aligned with the current product detail styling rather than introducing a new visual system.

## Data flow impact

No API or schema change.

Only client/UI behavior changes:

1. product detail server loader still returns the same review data
2. form initializes selected rating from existing state
3. user hover affects only temporary client-side preview
4. submit sends the same numeric `rating` and `comment` payload as today
5. refreshed page shows read-only star rendering in summary and list

## Testing

Add or update component-focused tests for:

- interactive picker renders five stars
- hover preview updates visual state label before click
- click changes selected rating used by submit
- existing review value preloads correctly
- summary and list render read-only stars for provided values

Keep existing route/helper tests unchanged unless rendering assertions need updates.

## Risks and guardrails

Main risk:

- star state can drift between hover preview and selected value if the component mixes both concerns poorly

Guardrail:

- keep one source of truth for selected value in the parent form state
- keep hover preview as temporary local UI state only

Secondary risk:

- read-only summary stars may appear to disagree with a decimal average

Guardrail:

- always show numeric average text beside the stars so rounded visual fill is explicit
