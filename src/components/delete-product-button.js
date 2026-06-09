"use client";

export function DeleteProductButton({ action, productName }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Xóa sản phẩm "${productName}" khỏi catalog?`,
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="button button--danger">
        Xóa
      </button>
    </form>
  );
}
