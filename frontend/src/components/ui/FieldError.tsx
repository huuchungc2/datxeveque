export function FieldError({
  id,
  message,
  className = "text-red-600",
}: {
  id: string;
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={`mt-1 text-xs font-semibold ${className}`}>
      {message}
    </p>
  );
}
