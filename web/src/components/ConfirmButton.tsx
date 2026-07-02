"use client";

// Nút submit server action kèm hộp xác nhận (tránh lỡ tay với hành động không hoàn tác được).
export function ConfirmButton({
  action,
  message,
  children,
  className,
}: {
  action: () => void | Promise<void>;
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <button className={className}>{children}</button>
    </form>
  );
}
