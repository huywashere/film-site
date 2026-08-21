"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Megaphone, X } from "lucide-react";
import { PublicSiteConfiguration, siteConfigApi } from "@/lib/api";

export function OperationalNotice() {
  const [config, setConfig] = useState<PublicSiteConfiguration | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    siteConfigApi.getPublic().then(({ data }) => setConfig(data)).catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!config || dismissed || (!config.maintenanceMode && !config.announcementText)) return null;
  const maintenance = config.maintenanceMode;
  const text = maintenance
    ? config.maintenanceNotice || "Hệ thống đang được bảo trì, một số chức năng có thể tạm thời gián đoạn."
    : config.announcementText || "";
  const body = <span className="flex items-center gap-2"><span className={maintenance ? "text-amber-300" : "text-violet-300"}>{maintenance ? <AlertTriangle size={15} /> : <Megaphone size={15} />}</span><span className="line-clamp-2">{text}</span></span>;

  return <aside className="fixed left-1/2 top-3 z-[120] flex w-[min(92vw,680px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/15 bg-zinc-950/95 px-4 py-3 text-[12px] font-semibold text-white shadow-2xl backdrop-blur-xl" role={maintenance ? "alert" : "status"}>
    <div className="min-w-0 flex-1">{config.announcementLink ? (config.announcementLink.startsWith("/") ? <Link href={config.announcementLink} className="hover:underline">{body}</Link> : <a href={config.announcementLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{body}</a>) : body}</div>
    {!maintenance && <button type="button" onClick={() => setDismissed(true)} className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Đóng thông báo"><X size={15} /></button>}
  </aside>;
}
