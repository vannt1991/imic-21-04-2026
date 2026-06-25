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
  const [previewRating, setPreviewRating] = useState(null);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [state, setState] = useState(defaultState);
  const activeRating = previewRating ?? rating;

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
            label={`${activeRating} sao`}
            onChange={setRating}
            onPreviewChange={setPreviewRating}
          />
          <strong>{activeRating} sao</strong>
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
