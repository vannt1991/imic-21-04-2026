# MiniShop external product images design

Date: 2026-06-21

## Goal

Add support for external product images from HTTPS URLs across MiniShop.

Required behavior:

- render product images from external HTTPS URLs
- fall back to a placeholder when the URL is missing, invalid, or fails to load
- show preview inside the admin product form
- apply the behavior consistently across storefront and admin surfaces

Out of scope:

- file upload
- image proxying
- image editing or cropping
- DB/API contract changes for product images

## Current state

The app already stores an optional `image` string on `Product` and carries it through admin form parsing and API models.

What is missing:

- storefront cards do not render `product.image`
- product detail does not render `product.image`
- related products do not render images
- admin product list does not render images
- admin product form accepts an image URL but does not preview it
- Next config does not allow remote image loading for `next/image`

## Chosen approach

Use `next/image` for external HTTPS image URLs, backed by a shared reusable UI component and a local placeholder fallback.

Rationale:

- stays aligned with the Next.js stack already in use
- centralizes URL validation and fallback behavior in one place
- avoids duplicating image rendering logic across catalog, detail, and admin UI
- keeps the change small and focused without adding backend complexity

Alternatives considered:

1. Plain `<img>` with `onError`
   - simpler implementation
   - rejected because it bypasses the framework image pipeline and duplicates behavior over time

2. Proxy remote images through an internal API
   - stronger control over remote fetches
   - rejected because it is unnecessary complexity for a course/demo repo

## Architecture

### Shared image component

Add a reusable component at `src/components/product-image.js`.

Responsibilities:

- accept `src`, `alt`, and display options such as variant or size intent
- decide whether the URL is renderable
- render `next/image` for valid HTTPS URLs
- switch to a placeholder when the URL is absent, invalid, or load fails
- expose consistent markup so CSS can size the image differently by surface

This component becomes the single rendering entry point for product images.

### URL validation

Add a small helper, likely in `src/lib` or colocated with the image component, to define what counts as a renderable external image URL.

Policy:

- allow only `https:` URLs
- reject `http:` URLs
- reject empty strings and whitespace-only values
- reject malformed strings that do not parse as URLs

This is a UI rendering guard, not a storage rule. Existing DB/API behavior remains unchanged.

### Next.js config

Update `next.config.mjs` to allow remote images from any HTTPS host.

Intent:

- keep setup friction low for a learning repo
- match the requested policy of “mọi HTTPS URL”

The config should remain limited to HTTPS only, not arbitrary protocols.

## Surface-by-surface behavior

### Storefront product card

Replace the current visual placeholder block in `src/components/product-card.js` with the shared image component.

Behavior:

- valid HTTPS image URL → show image
- invalid/missing/broken image URL → show existing styled fallback block
- badge remains visible as an overlay or within the visual area, depending on current layout constraints

### Storefront product detail

Replace the current visual block in `src/app/products/[slug]/page.js` with the shared image component.

Behavior:

- large hero-style image area for the product
- category/badge text remains available in the visual section
- fallback preserves the current page layout if no usable image exists

### Related products

Upgrade the related products section in `src/app/products/[slug]/page.js` to render product imagery through the shared component instead of text-only cards.

Behavior:

- keep the section lightweight
- image/fallback behavior must match the main catalog experience

### Admin product list

Add product image thumbnails to `src/app/admin/products/page.js` using the shared image component.

Behavior:

- small thumbnail beside product metadata
- fallback shown when no usable image exists
- no additional admin actions or hover tools

### Admin product form preview

Add a preview block to `src/components/admin-product-form.js`.

Behavior:

- when editing an existing product with a valid HTTPS URL, show preview on initial render
- when creating a product, preview reflects the current image field value client-side
- invalid, empty, or failed image loads show a placeholder labeled as unavailable preview

Because form preview must react to in-progress typing, this part may require a small client component wrapper for the preview area even if the form remains server-rendered overall.

## Component boundaries

Keep responsibilities narrow:

- `product-image` → render image or fallback
- optional helper → determine whether `src` is a valid external HTTPS URL
- admin form preview wrapper, if needed → read current input value and feed it into `product-image`

Avoid embedding URL validation and fallback state separately inside every page or list item.

## Error handling

### Invalid values

If `image` is `null`, empty, whitespace-only, malformed, or non-HTTPS:

- do not throw
- do not render broken-image chrome
- render the local placeholder instead

### Load failures

If `next/image` attempts to load a valid-looking HTTPS URL but the request fails:

- switch the component to fallback state on the client
- preserve element dimensions to avoid layout shift spikes beyond normal image behavior

### Server/client rendering

The initial decision can be made from the URL string. Runtime image fetch failure must be handled client-side inside the image component.

## Styling

Reuse existing visual styles where possible.

Add only the minimum CSS needed for:

- image container sizing
- image fit behavior, likely `object-fit: cover`
- placeholder appearance
- admin thumbnail sizing
- admin form preview sizing

Keep the visual language consistent with the existing course UI rather than introducing a new gallery style.

## Testing strategy

Follow TDD.

### Unit tests

Add tests for the URL helper:

- accepts `https://example.com/image.jpg`
- rejects empty and whitespace-only strings
- rejects malformed strings
- rejects `http://example.com/image.jpg`

### Component tests

Add focused tests for the shared image component:

- valid HTTPS URL renders image mode
- missing URL renders placeholder mode
- invalid URL renders placeholder mode
- broken image switches to placeholder mode

### Integration-oriented tests

Add targeted tests where current test structure allows practical coverage:

- product card renders image area through shared component
- admin form preview renders existing image URL or fallback

No new E2E coverage is required for this change unless existing test structure makes it unusually cheap.

## Risks and tradeoffs

### Permissive host policy

Allowing all HTTPS hosts is convenient for a course repo, but looser than a production allowlist.

Accepted tradeoff because:

- user explicitly requested permissive HTTPS behavior
- repo is a demo/learning project
- strict host governance would add setup friction without teaching value here

### Client fallback state

Handling load failures requires client state in the shared image component.

Accepted tradeoff because:

- it keeps all fallback behavior in one place
- it avoids shipping broken image UI across multiple surfaces

## Implementation sequence

1. Add tests for URL helper and image component behavior
2. Add shared image component + helper
3. Update Next remote image config for HTTPS hosts
4. Integrate image component into product card
5. Integrate image component into product detail and related products
6. Integrate image component into admin product list
7. Add admin form preview behavior
8. Run focused tests, then broader verification

## Success criteria

The change is complete when:

- products with valid HTTPS image URLs display images on storefront and admin surfaces
- products without usable image URLs show a stable fallback placeholder
- admin form shows preview for the current image value
- broken remote image URLs degrade gracefully without broken-image UI
- behavior is implemented through shared reusable logic, not duplicated ad hoc per page
