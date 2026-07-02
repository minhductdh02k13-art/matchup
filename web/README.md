# Matchup — Web (MVP)

Ứng dụng tìm kèo thể thao. Bản web dựng trước, app di động làm sau (tái dùng API + React).

## Stack
- **Next.js 16** (App Router, TypeScript) — web + API chung
- **Tailwind CSS v4** — giao diện
- **Prisma 7 + PostgreSQL** — ORM + DB (driver adapter `pg`)
- Postgres local chạy bằng `prisma dev` (không cần cài Docker/Postgres tay)

## Chạy lần đầu
```bash
cd web
npm install

# 1) Bật Postgres local (giữ cửa sổ này chạy). Nó in ra DATABASE_URL.
npm run db
#   -> nếu cổng khác 51214, sửa lại trong web/.env

# 2) Ở cửa sổ khác: tạo bảng + seed dữ liệu mẫu
npm run db:push
npm run db:seed

# 3) Chạy web
npm run dev
#   -> http://localhost:3000
```

## Đã có (Mốc 1 + 2)
- Trang chủ: danh sách kèo, lọc (môn / bán kính GPS / còn chỗ / sắp xếp), khoảng cách Haversine.
- Chi tiết kèo: host + điểm uy tín, sĩ số, chia tiền/người, danh sách tham gia + chờ, Google Map.
- Tạo kèo.
- Xin tham gia → host duyệt/từ chối → hủy đăng ký. **Chống double-book bằng transaction** (đã test).
- Waitlist: đủ người thì đăng ký vào danh sách chờ.
- Điểm uy tín (Trust Score) hiển thị dạng badge; user mới hiện "Mới".

> **Đăng nhập tạm:** chưa có auth thật. Góc phải header có ô "đổi user" để đóng vai host/player khi test (Mốc 3 sẽ thay bằng OTP/Google).

## Chưa làm (Mốc tiếp theo)
- Mốc 3: đăng nhập thật (OTP/Google) + hồ sơ cá nhân + môn/trình độ.
- Mốc 4: waitlist tự động mời khi có người hủy + thông báo + check-in (GPS/QR) + đánh giá.
- Sau nữa: bản đồ thật (Leaflet/Google), PostGIS cho query bán kính, chia sẻ QR, admin.

## Ghi chú kỹ thuật
- `lat/lng` lưu số thường, khoảng cách tính Haversine ở `src/lib/format.ts`. Khi deploy sẽ chuyển sang PostGIS.
- Tiền lưu Int (VND).
- Thiết kế DB & luồng: xem `../docs/01-ERD.md` và `../docs/02-User-Flow.md`.
