"use client";

import { useState } from "react";

export function AvatarUpload({
  current,
  name,
}: {
  current: string | null;
  name: string; // tên viết tắt để hiện khi chưa có ảnh
}) {
  const [preview, setPreview] = useState<string | null>(current);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
          {initial}
        </div>
      )}

      <label className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand">
        Chọn ảnh
        <input type="file" name="avatar" accept="image/*" onChange={onPick} className="hidden" />
      </label>
    </div>
  );
}
