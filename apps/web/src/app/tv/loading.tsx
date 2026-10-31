import React from "react";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export default function TvLoading() {
  return (
    <div
      className={cn(
        cardFont.className,
        "min-h-screen bg-[#0a0b10] text-white pt-[74px] sm:pt-[78px] md:pt-20 pb-24 sm:pb-28 lg:pb-16 lg:pl-20 relative selection:bg-[#23ade5]/30",
      )}
    >
      {/* Background ambient radial glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(35,173,229,0.07),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-[1720px] px-3 sm:px-6 lg:px-8 space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="border-b border-white/[0.08] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-full bg-white/[0.08]" />
            <div className="h-8 w-80 rounded-xl bg-white/[0.06]" />
            <div className="h-4 w-96 rounded-lg bg-white/[0.04]" />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-12 w-28 rounded-xl bg-white/[0.05]" />
            <div className="h-12 w-28 rounded-xl bg-white/[0.05]" />
          </div>
        </div>

        {/* Main Grid: Player + Directory */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Player Skeleton */}
          <div className="lg:col-span-8 space-y-4">
            <div className="aspect-video w-full rounded-2xl bg-white/[0.04] border border-white/10" />
            <div className="h-20 w-full rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
          </div>

          {/* Directory Skeleton */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0e1017] p-4 space-y-3">
              <div className="h-6 w-36 rounded-lg bg-white/[0.08]" />
              <div className="h-9 w-full rounded-xl bg-white/[0.05]" />
              <div className="flex gap-2">
                <div className="h-7 w-16 rounded-lg bg-white/[0.08]" />
                <div className="h-7 w-16 rounded-lg bg-white/[0.05]" />
                <div className="h-7 w-16 rounded-lg bg-white/[0.05]" />
              </div>
              <div className="space-y-2 pt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 w-full rounded-xl bg-white/[0.03]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
