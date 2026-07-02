# Hướng dẫn tạo Firebase để gửi OTP (cho người không rành kỹ thuật)

Mục tiêu: lấy các "chìa khóa" để app gửi mã OTP thật. Làm 1 lần, ~10 phút. **Miễn phí.**

---

## Bước 1 — Tạo project
1. Vào https://console.firebase.google.com (đăng nhập bằng Gmail).
2. Bấm **Add project** → đặt tên (VD: `matchup`) → **Continue**.
3. Phần Google Analytics: **tắt** (gạt off) cho gọn → **Create project** → đợi xong bấm **Continue**.

## Bước 2 — Bật đăng nhập bằng số điện thoại
1. Menu trái: **Build → Authentication** → **Get started**.
2. Tab **Sign-in method** → trong danh sách bấm **Phone** → gạt **Enable** → **Save**.

## Bước 3 — Thêm số test (để thử KHÔNG tốn tiền, KHÔNG cần SMS thật)
1. Vẫn ở **Authentication → Sign-in method → Phone**.
2. Kéo xuống mục **Phone numbers for testing** → **Add**.
3. Nhập số + mã cố định, ví dụ:
   - Số: `+84 901 234 567`
   - Mã: `123456`
4. Lưu. Sau này gõ đúng số này thì mã luôn là `123456` (không gửi SMS).

## Bước 4 — Lấy cấu hình web (nhóm chìa khóa 1)
1. Bấm ⚙️ (góc trên trái, cạnh "Project Overview") → **Project settings**.
2. Kéo xuống **Your apps** → bấm biểu tượng **web `</>`**.
3. Đặt nickname (VD `matchup-web`) → **Register app**.
4. Màn hình hiện đoạn `const firebaseConfig = { ... }`. **Copy giúp t 4 dòng này:**
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`

## Bước 5 — Lấy service account (nhóm chìa khóa 2 — BÍ MẬT)
1. Vẫn trong **Project settings** → tab **Service accounts**.
2. Bấm **Generate new private key** → **Generate key** → nó tải về **1 file .json**.
3. Mở file đó, bên trong có 3 dòng cần lấy:
   - `project_id`
   - `client_email`
   - `private_key` (dài, bắt đầu bằng `-----BEGIN PRIVATE KEY-----`)

> ⚠️ File .json này là bí mật — **không gửi lên GitHub, không đăng công khai**. Chỉ dán vào file `.env` trên máy.

---

## Gửi lại cho t
Dán 7 giá trị vào file `web/.env` (đã có sẵn chỗ trống), hoặc gửi t để t điền:

```
apiKey, authDomain, projectId, appId       (từ Bước 4)
project_id, client_email, private_key       (từ Bước 5)
```

Xong đó t gắn nốt phần code, restart là **gửi/nhận mã thật** chạy được ngay (thử bằng số test ở Bước 3 trước cho khỏi tốn tiền).
