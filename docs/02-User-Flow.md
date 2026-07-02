# KÈO APP — User Flow V1 Draft

> Trạng thái: **DRAFT để review**. Bám theo ERD `01-ERD.md`.

---

## Flow 1 — Onboarding & Đăng nhập

```
Mở app
  ▼
Đã có phiên? ──Có──▶ Trang chủ
  │Không
  ▼
Chọn: [OTP SĐT] [Google] [Apple(iOS)]
  ▼
Xác thực thành công
  ▼
Lần đầu? ──Có──▶ Tạo hồ sơ tối thiểu (tên, thành phố, chọn ≥1 môn + trình độ)
  │Không
  ▼
Trang chủ (lưu phiên)
```
Quy tắc: bắt buộc chọn tối thiểu 1 môn + trình độ để filter/gợi ý hoạt động ngay.

---

## Flow 2 — Tìm & Xem trận (Player)

```
Trang chủ [Bản đồ | Danh sách]
  ▼
Áp filter (môn, bán kính 3/5/10km, ngày, giờ, trình độ, giá, còn chỗ)
  ▼
Chọn 1 trận
  ▼
Chi tiết trận:
  - Host + trust score + rating
  - Khoảng cách (tính từ vị trí user tới venue)
  - Chi phí/người (= total_cost / số người đã duyệt, cập nhật realtime)
  - Slot: đã X / cần Y  → còn thiếu Z
  - Danh sách người tham gia
  ▼
[Tham gia] [Chia sẻ] [Lưu]
```

---

## Flow 3 — Xin tham gia & Duyệt (nghiệp vụ lõi)

```
PLAYER                          HỆ THỐNG                         HOST
  │ Bấm Tham gia                                                   
  ├──────────────▶ Kiểm tra điều kiện (gender/age/skill/deadline)
  │                        │ Đạt → tạo participant status=pending
  │                        │ Trận đã full? → status=waitlisted (+ position)
  │                        ├──────── push "Có người xin tham gia" ──▶│
  │◀── "Đã gửi yêu cầu" ───┤                                        │ Xem danh sách đăng ký
  │                        │                                        │ [Đồng ý] / [Từ chối]
  │                        │◀──────────── Host quyết định ──────────┤
  │                        │ Đồng ý: transaction tăng slots_filled  
  │                        │   (WHERE slots_filled < slots_needed)  
  │                        │   - OK → approved                      
  │                        │   - Full rồi → chuyển waitlist         
  │                        │ Đủ người → status trận = full          
  │◀── push kết quả ───────┤                                        
```

Điều kiện chặn khi bấm Tham gia:
- Quá `register_deadline` → chặn.
- Không đạt gender/age/skill → **[CHỐT] cảnh báo nhưng vẫn cho join**, set `meets_requirements=false` để host thấy cờ khi duyệt.
- Đã có record trong trận → không tạo trùng.

---

## Flow 4 — Waitlist tự động

```
1 người approved bấm Hủy
  ▼
slots_filled--  → trận từ full về open
  ▼
Lấy waitlist có position nhỏ nhất → status=invited, set invited_at
  ▼
Gửi push "Bạn được mời vào trận, xác nhận trong N phút"
  ▼
User xác nhận? ──Có──▶ approved (transaction slots_filled++)
  │Không / hết N phút (cron quét invited_at + N)
  ▼
status=rejected → Mời người kế tiếp
```

---

## Flow 5 — Quản lý trận (Host)

```
Trận của tôi (Host) ▶ chọn trận
  ▼
[Danh sách đăng ký] duyệt/loại từng người
[Khóa đăng ký]  → status=locked
[Đóng tuyển]    → status=closed
[Chỉnh sửa]     → sửa thông tin (nếu chưa ongoing)
[Hủy trận]      → status=cancelled + push tất cả participant + trừ trust host (⚠️ QĐ mức phạt)
```

---

## Flow 6 — Trận của tôi (Player)

```
Tabs: [Đã đăng ký] [Đang diễn ra] [Đã hoàn thành] [Đã hủy]
- Đã đăng ký: pending / approved / waitlisted
- Đang diễn ra: tới giờ → hiện nút Check-in
- Đã hoàn thành: hiện nút Đánh giá (nếu đã check-in)
```

---

## Flow 7 — Check-in → Đánh giá

```
Tới giờ trận (ongoing)
  ▼
User check-in: [GPS] (so lat/lng với venue trong bán kính X m)  hoặc  [QR] (host mở QR tại sân)
  ▼
Ghi check_ins + tính on-time (checked_in_at vs starts_at)
  ▼
Trận completed → mở cửa sổ đánh giá (vd 48h)
  ▼
Chỉ người CÓ check-in mới thấy nút Đánh giá
  ▼
Host ⇄ Player chấm 1–5 sao + nhận xét
  ▼
Cập nhật rating_avg, matches_played → tính lại trust_score
```

---

## Flow 8 — Hủy & tác động Trust Score

| Hành động | Ảnh hưởng |
|---|---|
| Player hủy trước deadline | Không phạt (hoặc phạt nhẹ — QĐ) |
| Player hủy sau khi approved & sát giờ | Tăng cancel_rate |
| Player không check-in (no-show) | no_show_count++, phạt nặng trust |
| Host hủy trận | Phạt trust host, push toàn bộ participant |

---

## Flow 9 — Báo cáo

```
Chi tiết user / sau trận ▶ [Báo cáo]
  ▼
Chọn lý do (no_show/late/rude/skill_fraud/spam/other) + mô tả
  ▼
Tạo report status=pending ▶ vào hàng đợi Admin
```

---

## Flow 10 — Admin (tóm tắt)

```
Dashboard: tổng user / host active / player / số trận / trận hôm nay
Quản lý: user (ban), trận, danh mục môn, report (xử lý), banner, thông báo hệ thống
```

---

## Điểm cần chốt về UX/logic

1. Điều kiện không đạt (gender/age/skill): chặn cứng hay cho join kèm cảnh báo?
2. Waitlist: thời gian cửa sổ xác nhận N = bao nhiêu phút?
3. Cửa sổ đánh giá: bao lâu sau khi trận completed?
4. Bán kính check-in GPS hợp lệ: bao nhiêu mét?
5. Mức phạt trust cho từng loại hủy/no-show.
