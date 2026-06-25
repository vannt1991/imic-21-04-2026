"use client";

import { createElement, useState } from "react";

const STAR_VALUES = [1, 2, 3, 4, 5];

function getRoundedValue(value) {
  return Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
}

export function ProductStarRating({
  value = 0,
  label,
  readOnly = false,
  onChange,
  onPreviewChange,
}) {
  const [hoveredValue, setHoveredValue] = useState(null);
  const selectedValue = Number(value) || 0;
  const activeValue = readOnly
    ? getRoundedValue(selectedValue)
    : hoveredValue ?? selectedValue;

  function handlePreview(nextValue) {
    setHoveredValue(nextValue);
    onPreviewChange?.(nextValue);
  }

  if (readOnly) {
    return createElement(
      "div",
      {
        className: "product-star-rating product-star-rating--readonly",
        "aria-label": label,
        role: "img",
      },
      STAR_VALUES.map((starValue) =>
        createElement(
          "span",
          {
            key: starValue,
            "aria-hidden": "true",
            className:
              starValue <= activeValue
                ? "product-star-rating__star product-star-rating__star--filled"
                : "product-star-rating__star product-star-rating__star--empty",
          },
          "★",
        ),
      ),
    );
  }

  return createElement(
    "div",
    {
      className: "product-star-rating",
      onMouseLeave: () => handlePreview(null),
    },
    STAR_VALUES.map((starValue) =>
      createElement(
        "button",
        {
          key: starValue,
          type: "button",
          className:
            starValue <= activeValue
              ? "product-star-rating__button product-star-rating__button--filled"
              : "product-star-rating__button product-star-rating__button--empty",
          "aria-label": `Chon ${starValue} sao`,
          "aria-pressed": selectedValue === starValue,
          onMouseEnter: () => handlePreview(starValue),
          onFocus: () => handlePreview(starValue),
          onBlur: () => handlePreview(null),
          onClick: () => onChange?.(starValue),
        },
        createElement("span", { "aria-hidden": "true" }, "★"),
      ),
    ),
  );
}
