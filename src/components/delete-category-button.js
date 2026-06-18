"use client";

export function DeleteCategoryButton({ action, categoryName }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Xóa category "${categoryName}" khỏi catalog?`,
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
