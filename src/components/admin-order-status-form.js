import { orderStatusOptions } from "@/lib/admin-order-status";

export function AdminOrderStatusForm({ action, defaultStatus }) {
  return (
    <form action={action} className="admin-order-status-form">
      <label className="admin-field">
        <span>Trạng thái</span>
        <select name="status" defaultValue={defaultStatus}>
          {orderStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="button button--primary">
        Cập nhật trạng thái
      </button>
    </form>
  );
}
