/**
 * Gửi thông báo staff qua nhóm Telegram (Bot API).
 * Mọi tin tạo qua chuông (createForUsers) đều mirror sang nhóm.
 * Cấu hình: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID — xem TELEGRAM_SETUP.md
 */

const token = () => process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
const chatId = () => process.env.TELEGRAM_CHAT_ID?.trim() || "";

export function telegramNotifyEnabled() {
  return Boolean(token() && chatId());
}

function siteBaseUrl() {
  return (process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || "").replace(/\/$/, "");
}

/** Link trong DB notification: /don-hang, /dispatch, /tai-xe → URL đầy đủ. */
export function appAbsoluteLink(path?: string | null) {
  const base = siteBaseUrl();
  if (!base || !path) return "";
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p.startsWith("/admin") || p.startsWith("/tai-xe") || p.startsWith("/khach")) return `${base}${p}`;
  if (
    p.startsWith("/don-hang") ||
    p.startsWith("/dispatch") ||
    p.startsWith("/dieu-phoi") ||
    p.startsWith("/chuyen")
  ) {
    return `${base}/admin${p}`;
  }
  return `${base}${p}`;
}

/** Gửi tin nhắn plain text (không chặn luồng chính nếu gọi qua safeNotify). */
export async function sendTelegramMessage(text: string) {
  const bot = token();
  const chat = chatId();
  if (!bot || !chat) return;

  const maxRetries = 2;
  const timeoutMs = 8000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chat,
          text: text.slice(0, 4096),
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Telegram API ${res.status}: ${errText}`);
      }

      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const backoffMs = (attempt + 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error("Failed to send Telegram message");
}

/** Mirror 1 thông báo chuông (cùng title/body/link). */
export async function mirrorInAppNotification(payload: {
  title: string;
  body: string;
  link?: string | null;
}) {
  if (!telegramNotifyEnabled()) {
    console.warn("[telegram] Bỏ qua mirror — thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong process env");
    return;
  }
  const lines = [`🔔 ${payload.title}`, payload.body];
  const url = appAbsoluteLink(payload.link);
  if (url) lines.push(`👉 ${url}`);
  await sendTelegramMessage(lines.join("\n"));
}

/** Gửi tin test (admin API hoặc script). */
export async function sendTelegramTest() {
  if (!telegramNotifyEnabled()) {
    throw new Error("Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong backend/.env");
  }
  await mirrorInAppNotification({
    title: "Đặt Xe Về Quê — test Telegram",
    body: `Thời gian: ${new Date().toLocaleString("vi-VN")}\nNếu thấy tin này, bot đã gắn đúng nhóm.`,
  });
}
