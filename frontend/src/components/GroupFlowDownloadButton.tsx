import { Download } from "lucide-react";
import { trackEvent } from "../lib/analytics";

export function GroupFlowDownloadButton() {
  const handleDownload = () => {
    trackEvent("click_groupflow_download", { source: "floating_button" });
    const link = document.createElement("a");
    link.href = "/groupflow.zip";
    link.download = "GroupFlow.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg px-4 py-3 font-semibold transition md:bottom-6 md:right-6"
      title="Tải GroupFlow - Tool đăng bài Facebook"
      aria-label="Tải GroupFlow"
    >
      <Download size={20} />
      <span className="hidden sm:inline text-sm">GroupFlow</span>
    </button>
  );
}
