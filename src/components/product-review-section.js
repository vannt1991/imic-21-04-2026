import Link from "next/link";
import { ProductReviewForm } from "@/components/product-review-form";

export function ProductReviewSection({
  productId,
  productSlug,
  reviewSummary,
  reviews,
  viewerReviewState,
}) {
  return (
    <section className="product-detail__reviews">
      <div className="site-shell">
        <div className="section-heading">
          <p className="section-heading__eyebrow">Danh gia san pham</p>
          <h2>
            {reviewSummary.reviewCount > 0
              ? `${reviewSummary.averageRating}/5 tu ${reviewSummary.reviewCount} danh gia`
              : "Chua co danh gia nao"}
          </h2>
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
                    <span>{review.rating}/5</span>
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
