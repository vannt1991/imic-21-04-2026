# MiniShop product reviews design

Date: 2026-06-25

## Goal

Add product rating and comment support to MiniShop with a strict verified-purchase rule.

Required behavior:

- only logged-in users who have purchased a product can rate and comment on it
- each user can have exactly one review per product
- a user can edit their own existing rating and comment
- reviews become publicly visible immediately after successful submit
- product detail shows review summary, review list, and the current viewer's review state
- checkout orders must be tied to the logged-in user so purchase eligibility is enforceable

Out of scope:

- guest review submission
- admin review moderation or approval
- review replies, likes, reports, or image attachments
- multiple reviews from one user on the same product
- order-claim flows for historical guest orders
- soft-delete or hide-review tooling

## Current state

The app already has:

- session-based login for `ADMIN` and `CUSTOMER`
- a seeded customer account
- product detail pages at `src/app/products/[slug]/page.js`
- checkout and order creation through `POST /api/orders`
- `Order.userId` in Prisma, but it is currently optional in practice because checkout still allows anonymous orders

What is missing:

- checkout does not require login
- order creation does not reliably attach `userId`
- there is no review table or review API
- product detail does not load or render review data
- there is no permission rule for "purchased users only"

## Chosen approach

Make checkout a logged-in flow, persist `Order.userId` for every new order, and add a single `ProductReview` table enforced by a unique `(userId, productId)` constraint.

Rationale:

- verified-purchase review permission becomes simple and trustworthy
- the database enforces the one-review-per-user-per-product invariant
- the feature stays aligned with the current Prisma + route-handler structure
- route-level review mutations are straightforward to test with the existing suite style

Alternatives considered:

1. Keep guest checkout and only allow reviews for purchases made while logged in
   - smaller checkout change
   - rejected because it creates confusing UX where many real buyers can never review

2. Keep guest checkout and add an order-claim flow later
   - more flexible
   - rejected because it adds identity verification complexity far beyond this repo's needs

3. Store review eligibility outside orders
   - avoids touching checkout
   - rejected because it duplicates data and weakens the verified-purchase rule

## Architecture

### Data model

Add a new Prisma model:

- `ProductReview`
  - `id`
  - `productId`
  - `userId`
  - `rating`
  - `comment`
  - `createdAt`
  - `updatedAt`

Relations:

- `Product` gets `reviews ProductReview[]`
- `User` gets `reviews ProductReview[]`
- `ProductReview.productId -> Product.id`
- `ProductReview.userId -> User.id`

Constraints:

- unique `(userId, productId)` to enforce one review per product per user
- index on `productId` for product detail loading

Validation policy stored in code, not DB:

- `rating` must be an integer from `1` to `5`
- `comment` must be trimmed and at least `10` characters long

### Checkout ownership

Change the checkout flow so both the page and the API require authentication:

- `/checkout` redirects anonymous visitors to `/login?next=/checkout`
- `POST /api/orders` rejects anonymous requests server-side
- order creation always writes `userId = currentUser.id`

This converts new orders into authoritative purchase records for review permission checks.

### Review mutation boundary

Add a dedicated route handler for review creation and update:

- `POST /api/products/[id]/reviews`

The route owns all trust-boundary validation:

- current session exists
- target product exists and is active
- user has purchased the product through at least one non-cancelled order
- payload is valid

Because one row per `(userId, productId)` is guaranteed, the route can treat submit as upsert-style behavior:

- first submit creates the review
- later submit by the same user updates the existing review

### Product detail read boundary

Extend the product detail data loader so the page receives:

- existing product info
- `reviewSummary`
  - `averageRating`
  - `reviewCount`
- `reviews`
  - public review list with reviewer display name, rating, comment, timestamps
- `viewerReviewState`
  - `isLoggedIn`
  - `hasPurchased`
  - `canReview`
  - `existingReview`

This keeps permission logic centralized in server code instead of reproducing it in the client.

## Surface behavior

### Checkout page

Anonymous users:

- redirect to login before seeing or using checkout

Logged-in users:

- keep the current checkout form structure
- optionally prefill `customerName` and `customerEmail` from the session user when available
- place orders normally, now tied to `userId`

### Product detail page

Add a review section below the main product content.

Display blocks:

- review summary with average rating and review count
- public list of reviews, newest-updated first
- viewer-specific review panel

Viewer-specific states:

1. anonymous
   - show a login CTA
   - no review form

2. logged in but has not purchased
   - show a message explaining purchase is required
   - no review form

3. logged in, has purchased, has not reviewed
   - show create-review form

4. logged in, has purchased, already reviewed
   - show edit-review form prefilled with existing rating and comment

### Public review rendering

Reviews become visible immediately after successful submit.

Display policy:

- show reviewer `name` when present
- fall back to a neutral label such as `Khach hang MiniShop`
- never show reviewer email
- show updated timestamp if useful for the existing UI language

## Data flow

### Order creation flow

1. user visits `/checkout`
2. server checks current session
3. anonymous users are redirected to `/login?next=/checkout`
4. logged-in users submit checkout
5. `POST /api/orders` checks session again
6. order transaction creates `Order` with `userId`
7. successful order now contributes purchase eligibility for reviewed products

### Review submit flow

1. logged-in purchaser opens product detail
2. page loader determines they are eligible to review
3. user submits `rating` and `comment`
4. `POST /api/products/[id]/reviews` validates session, product state, purchase eligibility, and payload
5. route creates or updates the single review row for `(userId, productId)`
6. product detail path is revalidated
7. refreshed page shows updated summary, review list, and edit state

### Purchase eligibility rule

A user is considered eligible to review a product when:

- the user is logged in
- the product is active
- there exists at least one order for that `userId`
- the order status is not `CANCELLED`
- that order has at least one `OrderItem` pointing at the product

This rule should live in a shared server helper so route tests and product-detail reads use the same logic.

## API contract

### `POST /api/products/[id]/reviews`

Request body:

- `rating`
- `comment`

Server behavior:

- ignore any client-supplied `userId`
- derive the reviewer from session only
- trim `comment`
- update existing row when present, otherwise create one

Suggested response payload:

- normalized review row
- normalized `reviewSummary`

Status behavior:

- `401` when anonymous
- `404` when product does not exist
- `403` when logged in but not eligible to review
- `400` when payload is invalid
- `201` when a new review is created
- `200` when an existing review is updated

## Error handling

### Anonymous review attempts

- page shows login CTA
- API returns `401`

### Logged-in non-purchasers

- page shows explanation text
- API returns `403`

### Inactive or missing products

- detail page already handles missing products through existing not-found logic
- review API rejects inactive or missing products to avoid creating review rows for hidden catalog items

### Duplicate submissions

The unique `(userId, productId)` constraint prevents duplicate rows.

Implementation should still avoid surfacing raw database errors as UX:

- prefer explicit read-then-update/create or database upsert semantics
- return normalized validation or permission errors where possible

### Order status edge case

`CANCELLED` orders do not grant review permission.

All other current statuses can grant permission unless the project later formalizes a stricter order lifecycle.

This keeps the first version simple while blocking the most obviously invalid purchase state.

## Component boundaries

Keep responsibilities narrow:

- review validation helper
  - parse and normalize `rating` and `comment`
- purchase eligibility helper
  - answer whether a user may review a product
- product review query helper
  - fetch summary, list, and viewer state
- review route handler
  - trust-boundary enforcement and mutation
- product detail UI components
  - present summary, list, and form states

Avoid pushing permission decisions into client-only code.

## Styling and UX

Use the current MiniShop visual language.

Prefer small focused additions:

- simple star or numeric rating control
- textarea for comment
- compact summary row near the review section heading
- clear empty-state copy for each viewer state

Do not add a full review dashboard or complex filters in this phase.

## Testing strategy

Follow TDD.

### Prisma/domain helper tests

Add tests for:

- purchase eligibility returns true when a user has a non-cancelled order item for the product
- purchase eligibility returns false for anonymous, unrelated orders, and cancelled-only orders
- review payload validation trims comment, enforces the 10-character minimum, and rejects bad rating values
- summary aggregation returns correct average/count values

### Route tests

Add coverage for `POST /api/products/[id]/reviews`:

- rejects anonymous requests
- rejects logged-in users who never bought the product
- rejects invalid payloads
- rejects inactive products
- creates a review for an eligible purchaser
- updates the existing review on second submit instead of inserting a second row

### Product page tests

Add rendering coverage for the four viewer states:

- anonymous sees login CTA
- logged-in non-purchaser sees purchase-required message
- eligible purchaser without review sees create form
- eligible purchaser with existing review sees edit form with prefilled values

Also cover:

- review summary rendering
- public review list rendering without leaking email

### Checkout/auth regression tests

Add or update tests so they prove:

- `/checkout` redirects anonymous users to login
- authenticated checkout still works
- `POST /api/orders` requires auth
- successful orders persist `userId`

## Migration and seed implications

This feature requires:

- a Prisma migration for `ProductReview`
- seed data updates only if useful for local manual testing

Seed updates are optional for correctness, but it may help to include at least one completed order tied to `customer@minishop.local` so review flows are easy to demo locally.

## Manual verification

After implementation, manual checks should confirm:

- anonymous users cannot reach checkout and are redirected to login
- logged-in customers can place an order
- the order is tied to their user record
- a purchaser can open product detail and submit a review
- the review appears publicly immediately
- the same user sees their existing review in editable form
- resubmitting changes the same review instead of creating another one
- a different logged-in user without purchase history cannot review
