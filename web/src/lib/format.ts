// Tiện ích dùng chung: định dạng tiền, khoảng cách, tính chia tiền.

/** Định dạng tiền VND: 150000 -> "150.000đ" */
export function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

/**
 * Khoảng cách Haversine giữa 2 điểm (km).
 * Dùng tạm cho MVP; khi deploy sẽ chuyển sang PostGIS để query theo bán kính trong DB.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // bán kính Trái Đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Tiền mỗi người phải trả. approvedCount = số người đã được duyệt (gồm host nếu tính). */
export function costPerPerson(
  totalCost: number,
  approvedCount: number
): number {
  if (approvedCount <= 0) return totalCost;
  return Math.ceil(totalCost / approvedCount);
}

/** Nhãn tiếng Việt cho trạng thái trận. */
export const MATCH_STATUS_LABEL: Record<string, string> = {
  open: "Đang tuyển",
  full: "Đã đủ người",
  locked: "Đã khóa đăng ký",
  closed: "Đã đóng tuyển",
  ongoing: "Đang diễn ra",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** "T5, 03/07 • 19:00" */
export function formatDateTime(d: Date): string {
  const wd = WEEKDAYS[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${wd}, ${dd}/${mm} • ${hh}:${mi}`;
}

/** "19:00 - 21:00" */
export function formatTimeRange(start: Date, end: Date): string {
  const t = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${t(start)} - ${t(end)}`;
}

/** Nhãn tiếng Việt cho trình độ. */
export const SKILL_LABEL: Record<string, string> = {
  beginner: "Mới chơi",
  intermediate: "Trung bình",
  advanced: "Khá",
  pro: "Chuyên",
  any: "Mọi trình độ",
};
