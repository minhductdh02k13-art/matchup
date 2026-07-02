"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "@/lib/actions/review-actions";
import type { ReviewDirection } from "@/generated/prisma/enums";

export function RatingForm({
  matchId,
  revieweeId,
  revieweeName,
  direction,
  existingRating,
  existingComment,
}: {
  matchId: string;
  revieweeId: string;
  revieweeName: string;
  direction: ReviewDirection;
  existingRating?: number;
  existingComment?: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existingRating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existingComment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(!!existingRating);
  const [, startTransition] = useTransition();

  function submit() {
    if (rating < 1) {
      setError("Chọn số sao đã nhé");
      return;
    }
    setError("");
    setBusy(true);
    startTransition(async () => {
      try {
        await submitReview(matchId, revieweeId, direction, rating, comment);
        setDone(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gửi đánh giá thất bại");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="mb-1 text-sm font-medium">
        {revieweeName} {done && <span className="text-xs text-green-600">· đã đánh giá</span>}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl leading-none"
            aria-label={`${s} sao`}
          >
            <span className={(hover || rating) >= s ? "text-amber-400" : "text-slate-300"}>★</span>
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Nhận xét (không bắt buộc)"
        rows={2}
        className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="mt-1 rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {busy ? "Đang gửi…" : done ? "Cập nhật đánh giá" : "Gửi đánh giá"}
      </button>
    </div>
  );
}
