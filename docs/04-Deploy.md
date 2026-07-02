# Hướng dẫn đưa Matchup lên mạng (deploy)

Làm tuần tự. Chỗ nào cần m thao tác đều ghi rõ. Tất cả dịch vụ đều dùng gói **miễn phí**.

---

## Bước 1 — Database trên cloud (Neon)
1. Vào https://neon.tech → **Sign up** (đăng nhập bằng Google cho nhanh).
2. **Create project** → đặt tên `matchup`, region chọn **Singapore** (gần VN nhất).
3. Sau khi tạo, nó hiện **Connection string** dạng:
   `postgresql://<user>:<password>@<host>.neon.tech/<db>?sslmode=require`
4. **Copy chuỗi đó gửi cho Claude** → Claude sẽ tạo bảng + đổ dữ liệu mẫu lên Neon.

## Bước 2 — Đưa code lên GitHub
1. Vào https://github.com → tạo repo mới tên `matchup` (để **Private**).
2. Làm theo lệnh GitHub hiện ra để push (Claude sẽ hỗ trợ đẩy code lên).

## Bước 3 — Deploy lên Vercel
1. Vào https://vercel.com → **Sign up** bằng GitHub.
2. **Add New → Project** → chọn repo `matchup`.
3. **Root Directory**: chọn `web`.
4. Phần **Environment Variables** — dán các biến sau (Claude sẽ đưa danh sách đầy đủ giá trị):
   - `DATABASE_URL` (chuỗi Neon ở Bước 1)
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
5. Bấm **Deploy** → đợi ~1-2 phút → được link dạng `matchup-xxx.vercel.app`.

## Bước 4 — Cho Google login chạy trên link thật
1. Vào Firebase Console → **Authentication → Settings → Authorized domains**.
2. **Add domain** → dán tên miền Vercel (VD `matchup-xxx.vercel.app`).

## Xong!
Mở link Vercel trên điện thoại → đăng nhập Google → dùng thật. Gửi link cho bạn bè test.

> Ghi chú: đổi ảnh đại diện thủ công tạm tắt trên bản online (dùng ảnh Google). Sẽ thêm cloud storage sau.
