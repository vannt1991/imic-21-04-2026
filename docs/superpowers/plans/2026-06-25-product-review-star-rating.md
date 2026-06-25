# MiniShop Product Review Star Rating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace numeric review rating UI with a 5-star picker that supports hover preview and reuse the same star display in the review summary and public review list.

**Architecture:** Keep the server/data layer untouched. Add one small shared `ProductStarRating` component for both interactive and read-only rendering, wire it into the existing client review form, then update the review section summary/list to use the same visual language. Cover read-only rendering with fast unit tests and cover hover/click behavior with one focused Playwright flow.

**Tech Stack:** `next@16`, App Router, `react@19`, `vitest`, `playwright`, `react-dom/server`

---

## File structure

- Create: `src/components/product-star-rating.js` — shared five-star renderer with interactive + read-only modes
- Create: `tests/lib/product-star-rating.test.js` — server-rendered markup checks for filled stars and labels
- Create: `tests/e2e/product-review-stars.spec.js` — browser test for hover preview + click persistence
- Modify: `src/components/product-review-form.js` — replace `<select>` with star picker and live label
- Modify: `src/components/product-review-section.js` — render star summary and star rows in public reviews
- Modify: `src/app/globals.css` — star button/display styling, hover/focus states, summary row layout

### Task 1: Lock behavior with tests

**Files:**
- Create: `tests/lib/product-star-rating.test.js`
- Create: `tests/e2e/product-review-stars.spec.js`

- [ ] **Step 1: Write the failing unit test for read-only star rendering**

Create `tests/lib/product-star-rating.test.js`:

```js
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductStarRating } from "../../src/components/product-star-rating.js";

describe("ProductStarRating", () => {
  it("renders filled and empty stars in read-only mode", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductStarRating, {
        value: 4,
        label: "4 sao",
        readOnly: true,
      }),
    );

    expect(html).toContain("aria-label=\"4 sao\"");
    expect(html.match(/product-star-rating__star--filled/g)).toHaveLength(4);
    expect(html.match(/product-star-rating__star--empty/g)).toHaveLength(1);
  });

  it("rounds the average display to the nearest whole star", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductStarRating, {
        value: 4.5,
        label: "4.5/5",
        readOnly: true,
      }),
    );

    expect(html.match(/product-star-rating__star--filled/g)).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run: `npm test -- tests/lib/product-star-rating.test.js`
Expected: FAIL because `src/components/product-star-rating.js` does not exist yet.

- [ ] **Step 3: Write the failing browser test for hover preview and persisted selection**

Create `tests/e2e/product-review-stars.spec.js`:

```js
import { expect, test } from "@playwright/test";

test("eligible customer can preview stars before click and then publish the review", async ({
  page,
}) => {
  await page.goto("/login?next=/products/air-runner-basic");
  await page.getByLabel("Email").fill("customer@minishop.local");
  await page.getByLabel("Mật khẩu").fill("customer123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL("/products/air-runner-basic");

  await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await page.getByRole("link", { name: "Mở giỏ hàng" }).click();
  await page.getByRole("link", { name: "Tiến hành checkout" }).click();
  await page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(page).toHaveURL(/\/order-success\?orderId=/);

  await page.goto("/products/air-runner-basic");

  const star3 = page.getByRole("button", { name: "Chon 3 sao" });
  const star4 = page.getByRole("button", { name: "Chon 4 sao" });

  await star3.hover();
  await expect(page.getByText("3 sao", { exact: true })).toBeVisible();

  await star4.click();
  await expect(page.getByText("4 sao", { exact: true })).toBeVisible();

  await page
    .getByLabel("Binh luan")
    .fill("Mang di hoc on, de phoi do va di rat em chan.");
  await page.getByRole("button", { name: "Gui danh gia" }).click();

  await expect(page.getByText("Da gui danh gia cua ban.")).toBeVisible();
  await expect(page.getByText("4/5", { exact: true })).toBeVisible();
  await expect(page.getByText("4 sao", { exact: true })).toBeVisible();
});
```

- [ ] **Step 4: Run the browser test to verify it fails**

Run: `npm run e2e -- tests/e2e/product-review-stars.spec.js`
Expected: FAIL because the review form still renders a `<select>` and there are no star buttons yet.

- [ ] **Step 5: Commit the failing tests**

```bash
git add tests/lib/product-star-rating.test.js tests/e2e/product-review-stars.spec.js
git commit -m "test: cover product review star rating ui"
```

### Task 2: Build the shared star component and swap the review form input

**Files:**
- Create: `src/components/product-star-rating.js`
- Modify: `src/components/product-review-form.js`

- [ ] **Step 1: Implement the shared star component**

Create `src/components/product-star-rating.js`:

```js
"use client";

import { useState } from "react";

const STAR_VALUES = [1, 2, 3, 4, 5];

function getRoundedValue(value) {
  return Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
}

export function ProductStarRating({
  value = 0,
  label,
  readOnly = false,
  onChange,
}) {
  const [hoveredValue, setHoveredValue] = useState(null);
  const selectedValue = Number(value) || 0;
  const activeValue = readOnly
    ? getRoundedValue(selectedValue)
    : hoveredValue ?? selectedValue;

  if (readOnly) {
    return (
      <div
        className="product-star-rating product-star-rating--readonly"
        aria-label={label}
      >
        {STAR_VALUES.map((starValue) => (
          <span
            key={starValue}
            aria-hidden="true"
            className={
              starValue <= activeValue
                ? "product-star-rating__star product-star-rating__star--filled"
                : "product-star-rating__star product-star-rating__star--empty"
            }
          >
            ★
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className="product-star-rating"
      onMouseLeave={() => setHoveredValue(null)}
    >
      {STAR_VALUES.map((starValue) => (
        <button
          key={starValue}
          type="button"
          className={
            starValue <= activeValue
              ? "product-star-rating__button product-star-rating__button--filled"
              : "product-star-rating__button product-star-rating__button--empty"
          }
          aria-label={`Chon ${starValue} sao`}
          aria-pressed={selectedValue === starValue}
          onMouseEnter={() => setHoveredValue(starValue)}
          onFocus={() => setHoveredValue(starValue)}
          onBlur={() => setHoveredValue(null)}
          onClick={() => onChange?.(starValue)}
        >
          <span aria-hidden="true">★</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace the numeric select in the review form**

Update `src/components/product-review-form.js`:

```js
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProductStarRating } from "@/components/product-star-rating";

const defaultState = {
  errorMessage: "",
  successMessage: "",
  isSubmitting: false,
};

export function ProductReviewForm({ productId, existingReview = null }) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [state, setState] = useState(defaultState);

  async function handleSubmit(event) {
    event.preventDefault();
    setState({
      errorMessage: "",
      successMessage: "",
      isSubmitting: true,
    });

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          rating: Number(rating),
          comment,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setState({
          errorMessage:
            payload?.error?.message ?? "Khong the gui danh gia luc nay.",
          successMessage: "",
          isSubmitting: false,
        });
        return;
      }

      setState({
        errorMessage: "",
        successMessage: existingReview
          ? "Da cap nhat danh gia cua ban."
          : "Da gui danh gia cua ban.",
        isSubmitting: false,
      });
      router.refresh();
    } catch {
      setState({
        errorMessage: "Khong the gui danh gia luc nay.",
        successMessage: "",
        isSubmitting: false,
      });
    }
  }

  return (
    <form className="product-review-form" onSubmit={handleSubmit}>
      <div className="product-review-form__field">
        <span>So sao</span>
        <div className="product-review-form__rating">
          <ProductStarRating
            value={rating}
            label={`${rating} sao`}
            onChange={setRating}
          />
          <strong>{rating} sao</strong>
        </div>
      </div>

      <label className="product-review-form__field product-review-form__field--full">
        <span>Binh luan</span>
        <textarea
          rows="5"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          minLength={10}
          required
        />
      </label>

      {state.errorMessage ? (
        <p className="product-review-form__message" role="alert">
          {state.errorMessage}
        </p>
      ) : null}

      {state.successMessage ? (
        <p className="product-review-form__message" role="status">
          {state.successMessage}
        </p>
      ) : null}

      <button
        type="submit"
        className="button button--primary"
        disabled={state.isSubmitting}
      >
        {state.isSubmitting
          ? "Dang gui..."
          : existingReview
            ? "Cap nhat danh gia"
            : "Gui danh gia"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Run the fast unit test**

Run: `npm test -- tests/lib/product-star-rating.test.js`
Expected: PASS.

- [ ] **Step 4: Commit the shared component and form refactor**

```bash
git add src/components/product-star-rating.js src/components/product-review-form.js tests/lib/product-star-rating.test.js
git commit -m "feat: add star rating input for product reviews"
```

### Task 3: Reuse star display in summary/list and add styling

**Files:**
- Modify: `src/components/product-review-section.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update the review section to render stars in the summary and list**

Update `src/components/product-review-section.js`:

```js
import Link from "next/link";
import { ProductReviewForm } from "@/components/product-review-form";
import { ProductStarRating } from "@/components/product-star-rating";

export function ProductReviewSection({
  productId,
  productSlug,
  reviewSummary,
  reviews,
  viewerReviewState,
}) {
  const hasReviews = reviewSummary.reviewCount > 0;

  return (
    <section className="product-detail__reviews">
      <div className="site-shell">
        <div className="section-heading">
          <p className="section-heading__eyebrow">Danh gia san pham</p>
          <h2>{hasReviews ? "Danh gia tu khach hang" : "Chua co danh gia nao"}</h2>
          {hasReviews ? (
            <div className="product-review-summary">
              <ProductStarRating
                value={reviewSummary.averageRating}
                label={`${reviewSummary.averageRating}/5`}
                readOnly={true}
              />
              <strong>{reviewSummary.averageRating}/5</strong>
              <span>{reviewSummary.reviewCount} danh gia</span>
            </div>
          ) : null}
        </div>

        <div className="product-review-layout">
          <div className="product-review-panel">
            {!viewerReviewState.isLoggedIn ? (
              <div className="product-review-empty">
                <p>Dang nhap de gui danh gia cho san pham nay.</p>
                <Link
                  href={`/login?next=${encodeURIComponent(`/products/${productSlug}`)}`}
                  className="button button--secondary"
                >
                  Dang nhap
                </Link>
              </div>
            ) : !viewerReviewState.hasPurchased ? (
              <div className="product-review-empty">
                <p>Ban can mua san pham nay truoc khi danh gia.</p>
              </div>
            ) : (
              <ProductReviewForm
                productId={productId}
                existingReview={viewerReviewState.existingReview}
              />
            )}
          </div>

          <div className="product-review-list">
            {reviews.length === 0 ? (
              <p className="product-review-empty">
                Chua co binh luan nao cho san pham nay.
              </p>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="product-review-item">
                  <div className="product-review-item__meta">
                    <strong>{review.reviewerName}</strong>
                    <div className="product-review-item__rating">
                      <ProductStarRating
                        value={review.rating}
                        label={`${review.rating} sao`}
                        readOnly={true}
                      />
                      <span>{review.rating} sao</span>
                    </div>
                  </div>
                  <p>{review.comment}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add the minimal styles for stars, focus, and summary layout**

Append/update the review block in `src/app/globals.css`:

```css
.product-review-form__field--full textarea {
  min-height: 9rem;
}

.product-review-form__rating,
.product-review-summary,
.product-review-item__rating {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.product-star-rating {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.product-star-rating__button {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-size: 1.4rem;
  line-height: 1;
  color: #cbd5e1;
}

.product-star-rating__button--filled,
.product-star-rating__star--filled {
  color: #f59e0b;
}

.product-star-rating__button--empty,
.product-star-rating__star--empty {
  color: #cbd5e1;
}

.product-star-rating__button:focus-visible {
  outline: 2px solid #111827;
  outline-offset: 4px;
  border-radius: 999px;
}

.product-star-rating__star {
  font-size: 1.15rem;
  line-height: 1;
}
```

- [ ] **Step 3: Run the targeted tests**

Run: `npm test -- tests/lib/product-star-rating.test.js tests/app/product-detail-page.test.js`
Expected: PASS.

Run: `npm run e2e -- tests/e2e/product-review-stars.spec.js`
Expected: PASS.

- [ ] **Step 4: Commit the display + CSS changes**

```bash
git add src/components/product-review-section.js src/app/globals.css tests/e2e/product-review-stars.spec.js
git commit -m "feat: show product review stars in summary and list"
```

### Task 4: Full verification

**Files:**
- No file changes

- [ ] **Step 1: Run the review-focused verification set**

Run: `npm test -- tests/lib/product-star-rating.test.js tests/app/product-detail-page.test.js tests/app/product-review-route.test.js tests/lib/product-reviews.test.js`
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Run one end-to-end confirmation**

Run: `npm run e2e -- tests/e2e/product-review-stars.spec.js`
Expected: PASS in Chromium.

- [ ] **Step 4: Commit the final verified state**

```bash
git status --short
git add src/components/product-star-rating.js src/components/product-review-form.js src/components/product-review-section.js src/app/globals.css tests/lib/product-star-rating.test.js tests/e2e/product-review-stars.spec.js
git commit -m "feat: refine product review star rating ui"
```
