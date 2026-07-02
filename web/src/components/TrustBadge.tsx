// Badge điểm uy tín. User mới (trustScore null) hiển thị "Mới".
export function TrustBadge({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        ✨ Mới
      </span>
    );
  }

  const rounded = Math.round(score);
  const color =
    rounded >= 85
      ? "bg-green-100 text-green-700"
      : rounded >= 70
        ? "bg-lime-100 text-lime-700"
        : rounded >= 50
          ? "bg-amber-100 text-amber-700"
          : "bg-red-100 text-red-700";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      🛡️ {rounded}
    </span>
  );
}
