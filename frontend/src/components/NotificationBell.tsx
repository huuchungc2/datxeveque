import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../lib/api";
import { formatDisplayDateTime } from "../lib/datetime";

type NotificationRow = {
  id: number;
  title: string;
  body: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export function NotificationBell({ showOnMobile = true }: { showOnMobile?: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    try {
      const { data } = await api.get<{ count: number }>("/notifications/unread-count");
      setUnread(Number(data?.count || 0));
    } catch {
      /* chưa đăng nhập hoặc API lỗi */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<NotificationRow[]>("/notifications", { params: { limit: 15 } });
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, 30000);
    return () => clearInterval(t);
  }, [loadCount]);

  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onItemClick = async (n: NotificationRow) => {
    if (!n.readAt) {
      try {
        await api.patch(`/notifications/${n.id}/read`);
        setUnread((c) => Math.max(0, c - 1));
        setItems((list) =>
          list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
        );
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setUnread(0);
    setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
  };

  const wrapClass = showOnMobile ? "" : "hidden md:block";

  return (
    <div ref={rootRef} className={`relative ${wrapClass}`}>
      <button
        type="button"
        className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100"
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
        aria-expanded={open}
      >
        <Bell size={22} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-4 top-16 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white shadow-lg md:absolute md:right-0 md:top-full md:mt-2">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold text-slate-800">Thông báo</span>
            {unread > 0 && (
              <button type="button" className="text-xs text-brand-700 hover:underline" onClick={markAllRead}>
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && <p className="p-4 text-center text-sm text-slate-500">Đang tải…</p>}
            {!loading && items.length === 0 && (
              <p className="p-4 text-center text-sm text-slate-500">Chưa có thông báo</p>
            )}
            {!loading &&
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`block w-full border-b border-slate-50 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50 ${
                    !n.readAt ? "bg-brand-50/40" : ""
                  }`}
                  onClick={() => onItemClick(n)}
                >
                  <div className="text-sm font-medium text-slate-900">{n.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.body}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {formatDisplayDateTime(n.createdAt)}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
