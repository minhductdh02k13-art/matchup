import Link from "next/link";
import { createMatch } from "@/lib/actions/match-actions";
import { getCurrentUser } from "@/lib/session";
import { VenuePicker } from "@/components/VenuePicker";

export default async function NewMatchPage() {
  const me = await getCurrentUser();

  const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  const label = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/" className="text-sm text-slate-500 hover:text-brand">← Về danh sách</Link>
      <h1 className="text-2xl font-bold">Tạo kèo mới</h1>
      {!me && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Bạn cần đăng nhập để tạo kèo.</p>}

      <form action={createMatch} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label className={label}>Tên kèo</label>
          <input name="title" className={input} placeholder="VD: Đá phủi tối thứ 5 - thiếu 3 người" required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Môn</label>
            <select name="sport" className={input} defaultValue="football">
              <option value="football">⚽ Bóng đá</option>
              <option value="badminton">🏸 Cầu lông</option>
            </select>
          </div>
          <div>
            <label className={label}>Số người cần tuyển</label>
            <input name="slotsNeeded" type="number" min={1} defaultValue={4} className={input} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Ngày</label>
            <input name="date" type="date" className={input} required />
          </div>
          <div>
            <label className={label}>Giờ bắt đầu</label>
            <input name="startTime" type="time" defaultValue="19:00" className={input} required />
          </div>
          <div>
            <label className={label}>Giờ kết thúc</label>
            <input name="endTime" type="time" defaultValue="21:00" className={input} required />
          </div>
        </div>

        <VenuePicker />

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Tổng tiền sân (VND)</label>
            <input name="totalCost" type="number" min={0} step={1000} defaultValue={0} className={input} />
          </div>
          <div>
            <label className={label}>Giới tính</label>
            <select name="genderReq" className={input} defaultValue="any">
              <option value="any">Không giới hạn</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </div>
          <div>
            <label className={label}>Trình độ</label>
            <select name="skillReq" className={input} defaultValue="any">
              <option value="any">Mọi trình độ</option>
              <option value="beginner">Mới chơi</option>
              <option value="intermediate">Trung bình</option>
              <option value="advanced">Khá</option>
              <option value="pro">Chuyên</option>
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Mô tả</label>
          <textarea name="description" rows={3} className={input} placeholder="Giới thiệu ngắn về kèo..." />
        </div>

        <div>
          <label className={label}>Quy định</label>
          <textarea name="rules" rows={2} className={input} placeholder="VD: Đi giày cỏ nhân tạo, tự mang nước." />
        </div>

        <button
          type="submit"
          disabled={!me}
          className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Đăng kèo
        </button>
      </form>
    </div>
  );
}
