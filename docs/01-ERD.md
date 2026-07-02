# KÈO APP — ERD (Database Design) V1 Draft

> Trạng thái: **DRAFT để review**. Chưa chốt. Mọi quyết định gây tranh cãi được đánh dấu `⚠️ QĐ`.
> Quy ước: `PK` = khóa chính, `FK` = khóa ngoại, `UQ` = unique, `IDX` = nên đánh index.

---

## Quyết định đã chốt (locked)

- **DB/Stack: PostgreSQL + PostGIS** — geo query bán kính km chuẩn, transaction mạnh cho chống double-book. Cần backend riêng. Realtime slot qua Supabase Realtime hoặc websocket.
- **Waitlist: mời + chờ xác nhận N phút** — không auto-approve, không cần host duyệt lại.
- **Điều kiện không đạt: cảnh báo nhưng vẫn cho join** — host tự quyết duyệt. Cần cột đánh dấu request "không khớp điều kiện" để host thấy (thêm `meets_requirements bool` vào `match_participants`).

---

## 0. Nguyên tắc chung

- Mọi bảng có: `id` (PK, UUID hoặc bigint tùy DB), `created_at`, `updated_at`.
- Xóa mềm (`deleted_at`) cho các bảng cần audit: `users`, `matches`, `reviews`, `reports`.
- Thời gian lưu **UTC**, timezone xử lý ở client.
- Tiền lưu **integer (VND, đơn vị đồng)** — không dùng float để tránh sai số chia tiền.

---

## 1. Bảng lõi

### `users`
Người dùng (cả Player, Host, Admin — role phân biệt bằng cột, không tách bảng).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| phone | string, UQ | dùng cho OTP |
| email | string, UQ nullable | Google/Apple login |
| password_hash | string nullable | chỉ khi có đăng nhập mật khẩu |
| full_name | string | |
| nickname | string nullable | |
| avatar_url | string nullable | |
| birth_year | int nullable | ⚠️ QĐ: lưu năm sinh thay vì tuổi (tuổi tự tính) |
| gender | enum(male, female, other) | |
| city | string nullable | |
| district | string nullable | |
| home_lat | decimal(9,6) nullable | để tính khoảng cách mặc định |
| home_lng | decimal(9,6) nullable | |
| role | enum(user, admin) | ⚠️ QĐ: Player/Host **không** là role cố định — ai tạo trận thì là host của trận đó |
| status | enum(active, banned, deleted) | |
| language | enum(vi, en) default vi | |
| **-- Trust Score (cache, tính lại định kỳ) --** | | |
| trust_score | decimal(4,2) nullable | 0–100, xem mục 6 |
| rating_avg | decimal(3,2) default 0 | trung bình sao nhận được |
| rating_count | int default 0 | |
| matches_played | int default 0 | số trận đã check-in |
| cancel_rate | decimal(5,2) default 0 | % hủy sau khi được duyệt |
| on_time_rate | decimal(5,2) default 0 | % check-in đúng giờ |
| created_at / updated_at / deleted_at | | |

IDX: `phone`, `email`, `(home_lat, home_lng)`.

---

### `auth_identities`
Tách provider đăng nhập ra khỏi `users` (1 user có thể có nhiều cách login).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| user_id | FK → users | |
| provider | enum(phone_otp, google, apple) | |
| provider_uid | string | uid từ Google/Apple, hoặc phone |
| UQ | | `(provider, provider_uid)` |

---

### `sports`
Danh mục môn (Admin quản lý).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| code | string, UQ | vd: `football`, `badminton` |
| name | string | Bóng đá / Cầu lông |
| icon | string nullable | emoji/asset |
| is_active | bool default true | MVP bật: football, badminton |
| sort_order | int | |

⚠️ QĐ: cấu hình động cho từng môn (vị trí bóng đá, tay thuận cầu lông) — xem `sport_attributes` bên dưới thay vì hardcode.

### `sport_attributes` (optional, giúp mở rộng môn không cần đổi schema)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| sport_id | FK → sports | |
| key | string | vd `position`, `dominant_hand` |
| label | string | "Vị trí", "Tay thuận" |
| type | enum(single_select, multi_select, text) | |
| options_json | json | vd ["Thủ môn","Hậu vệ",...] |

> Nếu muốn nhanh cho MVP, có thể bỏ 2 bảng attribute này và hardcode ở client. Cần bọn mình quyết.

---

### `user_sports`
Môn + trình độ của từng user (many-to-many). **Vị trí / tay thuận để ở đây, không để ở `users`** vì 1 người chơi nhiều môn.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| user_id | FK → users | |
| sport_id | FK → sports | |
| skill_level | enum(beginner, intermediate, advanced, pro) | |
| attributes_json | json nullable | vd {"position":"Tiền đạo","dominant_hand":"Phải"} |
| is_favorite | bool default false | |
| UQ | | `(user_id, sport_id)` |

---

## 2. Sân & Trận

### `venues`
Sân (tách riêng để tái sử dụng + tìm theo tên sân + tương lai thống kê công suất sân).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| name | string | tên sân |
| address | string | |
| lat | decimal(9,6) | |
| lng | decimal(9,6) | |
| google_place_id | string nullable | link Google Map |
| city / district | string nullable | |
| created_by | FK → users nullable | host tạo tay |
| is_verified | bool default false | admin duyệt sân "chính chủ" |

IDX: `(lat, lng)`, `name`.

> ⚠️ QĐ: MVP cho host **gõ tự do** tên sân → tạo venue mới nếu chưa có. Chấp nhận trùng lặp, dọn sau. Nếu muốn gọn hơn có thể embed thẳng địa chỉ vào `matches` và bỏ bảng `venues` — cần quyết.

---

### `matches`
Trận đấu.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| host_id | FK → users | |
| sport_id | FK → sports | |
| venue_id | FK → venues | |
| title | string | tên trận |
| description | text nullable | |
| rules | text nullable | quy định |
| starts_at | datetime | |
| ends_at | datetime | |
| register_deadline | datetime nullable | hạn đăng ký |
| slots_needed | int | số người cần tuyển |
| slots_filled | int default 0 | ⚠️ cache số người đã duyệt (xem mục 5 về race condition) |
| gender_req | enum(any, male, female) | |
| age_min / age_max | int nullable | |
| skill_req | enum(any, beginner, intermediate, advanced, pro) | |
| **-- Chia tiền --** | | |
| total_cost | int default 0 | tổng tiền sân (VND) |
| cost_split_mode | enum(per_host_total, fixed_per_person) | ⚠️ QĐ: chia đều theo đầu người hay giá cố định/người |
| price_per_person | int nullable | nếu fixed |
| **-- Trạng thái --** | | |
| status | enum(open, full, locked, closed, ongoing, completed, cancelled) | xem mục 4 |
| cancel_reason | text nullable | |
| share_code | string, UQ | mã ngắn cho link/QR chia sẻ |
| cover_image_url | string nullable | |
| created_at / updated_at / deleted_at | | |

IDX: `status`, `starts_at`, `sport_id`, `(venue.lat, venue.lng)` (qua join / geo index), `share_code`.

---

### `match_images`
Nhiều ảnh cho 1 trận.

| id | PK |
| match_id | FK → matches |
| url | string |
| sort_order | int |

---

### `match_participants`
Đăng ký tham gia (bao gồm cả waitlist). **Bảng trung tâm của nghiệp vụ.**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| match_id | FK → matches | |
| user_id | FK → users | |
| status | enum(pending, approved, rejected, waitlisted, invited, cancelled_by_user, removed_by_host) | `invited` = được mời từ waitlist, chờ xác nhận |
| waitlist_position | int nullable | thứ tự chờ khi status=waitlisted |
| meets_requirements | bool default true | false = join dù không khớp gender/age/skill (host thấy cờ này) |
| invited_at | datetime nullable | lúc được mời từ waitlist (tính hạn N phút) |
| joined_at | datetime | lúc bấm tham gia |
| decided_at | datetime nullable | lúc host duyệt/từ chối |
| UQ | | `(match_id, user_id)` — 1 người 1 record/trận |

IDX: `(match_id, status)`, `user_id`.

---

## 3. Sau trận: Check-in, Đánh giá, Báo cáo

### `check_ins`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| match_id | FK → matches | |
| user_id | FK → users | |
| method | enum(gps, qr) | |
| lat / lng | decimal nullable | nếu GPS |
| checked_in_at | datetime | dùng để tính on-time |
| UQ | | `(match_id, user_id)` |

> Quy tắc: **chỉ user có check-in mới được đánh giá** (ràng buộc ở tầng logic).

### `reviews`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| match_id | FK → matches | |
| reviewer_id | FK → users | người đánh giá |
| reviewee_id | FK → users | người bị đánh giá |
| rating | int (1–5) | |
| comment | text nullable | |
| direction | enum(host_to_player, player_to_host) | |
| UQ | | `(match_id, reviewer_id, reviewee_id)` |

### `reports`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| match_id | FK → matches nullable | |
| reporter_id | FK → users | |
| reported_user_id | FK → users | |
| reason | enum(no_show, late, rude, skill_fraud, spam, other) | |
| detail | text nullable | |
| status | enum(pending, reviewed, actioned, dismissed) | admin xử lý |

---

## 4. Trạng thái trận (state machine)

```
open ──(đủ người duyệt)──▶ full ──(host mở lại/có người hủy)──▶ open
  │                          │
  │ host locks               │ host closes tuyển
  ▼                          ▼
locked ───────────────────▶ closed
  │
  └────────(tới giờ starts_at)────────▶ ongoing ──(ends_at + review window)──▶ completed
  │
  └────────(host hủy bất kỳ lúc nào)──▶ cancelled
```

- `open`: đang tuyển, còn chỗ.
- `full`: đã đủ `slots_filled == slots_needed` (vẫn nhận waitlist).
- `locked`: host khóa đăng ký thủ công (không nhận thêm pending).
- `closed`: host đóng tuyển (chốt danh sách).
- `ongoing`: đang diễn ra.
- `completed`: xong, mở cửa sổ đánh giá.
- `cancelled`: hủy.

---

## 5. Waitlist + chống race condition (quan trọng cho dev)

Vấn đề: nhiều người bấm "Tham gia" cùng lúc khi còn 1 chỗ → double-book.

Quy tắc:
1. `slots_filled` **chỉ tăng khi host DUYỆT** (approved), không tăng lúc bấm join.
2. Khi host duyệt: dùng transaction + điều kiện `UPDATE matches SET slots_filled = slots_filled + 1 WHERE id = ? AND slots_filled < slots_needed`. Nếu affected rows = 0 → báo "đã đủ người".
3. **[CHỐT]** Khi 1 approved user hủy → `slots_filled--` → lấy `match_participants` có `status=waitlisted` nhỏ nhất `waitlist_position`, đổi thành `invited`, set `invited_at`, **gửi push mời**. User có **N phút** xác nhận:
   - Xác nhận → `approved`, transaction `slots_filled++`.
   - Không xác nhận / hết N phút (cron quét `invited_at + N`) → `rejected`, mời người kế tiếp.
   - Cấu hình N trong `system_settings`.

---

## 6. Trust Score — công thức (cần chốt)

Đề xuất khởi điểm (thang 0–100):

```
trust_score = 100
  - (cancel_rate * 0.4)        // mỗi % hủy trừ 0.4
  - (no_show_count * 3)        // mỗi lần không đến trừ 3
  + (on_time_rate * 0.1)       // thưởng đúng giờ
  + ((rating_avg - 3) * 5)     // rating > 3 sao thì cộng
```
- User mới: `trust_score = null` → hiển thị badge "Mới" thay vì điểm.
- Tính lại: cron hàng ngày + trigger sau mỗi trận completed.

> Con số hệ số là **giả định**, cần bọn mình bàn để không phạt oan người mới.

---

## 7. Bảng phụ trợ

- `saved_matches` (user_id, match_id, UQ) — nút "Lưu".
- `notifications` (user_id, type, title, body, data_json, is_read, created_at).
- `device_tokens` (user_id, token, platform enum(ios,android)) — push notification.
- `banners` (image_url, link, is_active, sort_order) — admin.
- `system_settings` (key, value_json) — cấu hình động (bán kính lọc mặc định, thời gian cửa sổ đánh giá...).

---

## 8. Câu hỏi cần CHỐT trước khi dev bắt đầu

1. ~~DB & stack~~ → **CHỐT: PostgreSQL + PostGIS**
2. ~~Waitlist auto-promote~~ → **CHỐT: mời + chờ xác nhận N phút**
3. ~~Điều kiện không đạt~~ → **CHỐT: cảnh báo nhưng vẫn cho join**
4. **Venue**: bảng riêng (tái sử dụng) hay embed vào match cho nhanh? *(còn mở)*
5. **Sport attributes**: cấu hình động (bảng) hay hardcode client cho MVP 2 môn? *(còn mở)*
6. **Cost split**: chỉ chia đều theo đầu người, hay cho phép cả giá cố định/người? *(còn mở)*
7. **Trust score**: chốt công thức + cách đối xử với user mới. *(còn mở)*
8. **N phút** cho waitlist confirm window = bao nhiêu? *(còn mở)*
