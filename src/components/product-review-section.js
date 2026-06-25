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
              <span>tu {reviewSummary.reviewCount} danh gia</span>
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
