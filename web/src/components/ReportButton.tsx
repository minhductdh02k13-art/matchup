"use client";

import { useState, useTransition } from "react";
import { submitReport } from "@/lib/actions/report-actions";
import type { ReportReason } from "@/generated/prisma/enums";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "no_show", label: "Không đến" },
  { value: "late", label: "Đến muộn" },
  { value: "rude", label: "Thiếu lịch sự" },
  { value: "skill_fraud", label: "Gian lận trình độ" },
  { value: "spam", label: "Spam / kèo giả / địa điểm sai" },
  { value: "other", label: "Khác" },
];

export function ReportButton({
  matchId,
  reportedUserId,
  label,
}: {
  matchId: string;
  reportedUserId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [detail, setDetail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (done) return <span className="text-xs text-green-600">✓ Đã gửi báo cáo, cảm ơn bạn</span>;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-slate-400 hover:text-red-600"
      >
        ⚑ Báo cáo {label}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-slate-200 p-2">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={2}
            placeholder="Mô tả thêm (không bắt buộc)"
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={() =>
              start(async () => {
                try {
                  await submitReport(matchId, reportedUserId, reason, detail);
                  setDone(true);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Gửi thất bại");
                }
              })
            }
            disabled={pending}
            className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Đang gửi…" : "Gửi báo cáo"}
          </button>
        </div>
      )}
    </div>
  );
}
