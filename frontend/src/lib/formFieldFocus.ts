/** Focus + cuộn tới ô lỗi đầu tiên (form đặt xe / trang chủ). */
export function focusFormField(el: HTMLElement | null | undefined) {
  if (!el) return;
  requestAnimationFrame(() => {
    if ("focus" in el && typeof (el as HTMLInputElement).focus === "function") {
      (el as HTMLInputElement).focus({ preventScroll: true });
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function inputInvalidClass(invalid?: boolean) {
  return invalid ? "border-red-500 ring-1 ring-red-300 focus:ring-red-400" : "";
}
