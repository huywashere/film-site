"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { recordTelemetry } from "@/lib/telemetry";
import { cardFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type StatusPageProps = {
  code: "404" | "500";
  onRetry?: () => void;
};

export function StatusPage({ code, onRetry }: StatusPageProps) {
  const isServerError = code === "500";

  useEffect(() => {
    document.body.dataset.statusPage = "true";
    recordTelemetry(`route.${code}`, { status: code }, "warning");
    return () => { delete document.body.dataset.statusPage; };
  }, [code, isServerError]);

  const title = isServerError
    ? "Rất tiếc! Hệ thống đang gặp sự cố tạm thời."
    : "Oops! Trang web bạn tìm kiếm không tồn tại.";
  const description1 = isServerError
    ? "Máy chủ đang quá tải hoặc đang bảo trì."
    : "Có thể bạn đã nhập sai địa chỉ";
  const description2 = isServerError
    ? "Vui lòng thử lại sau ít phút."
    : "hoặc trang web đã di chuyển.";

  return (
    <main
      className={cn(
        cardFont.className,
        "status-page fixed inset-0 z-[1000] flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#141414] px-4 py-8 text-white select-none",
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes eddFloat {
          0%,100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-5px) rotate(-1deg); }
          75% { transform: translateY(3px) rotate(1deg); }
        }
        @keyframes moonFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(5px); }
        }
        @keyframes satFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes cometFloat {
          0%,100% { opacity:0.8; transform:scale(1); }
          50% { opacity:1; transform:scale(1.06); }
        }
        @keyframes antennaPulse {
          0%,100% { opacity:0.85; }
          50% { opacity:1; filter:drop-shadow(0 0 3px #9bc3db); }
        }
        .edd-g   { animation: eddFloat 4.8s ease-in-out infinite; }
        .moon-g  { animation: moonFloat 5.5s ease-in-out infinite; }
        .sat-g   { animation: satFloat 6.2s ease-in-out infinite; }
        .comet-g { animation: cometFloat 3.6s ease-in-out infinite; }
        .ant-g   { animation: antennaPulse 2.8s ease-in-out infinite; }
      `}} />

      <section className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">

        {/* ══ MAIN SVG ILLUSTRATION ══════════════════════════════════════ */}
        <div className="relative w-full max-w-[920px] h-[200px] sm:h-[260px] md:h-[310px] flex items-center justify-center mb-3">
          <svg
            viewBox="0 0 960 290"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full"
          >
            <defs>
              {/* ── Digit face gradient (very subtly lighter than #141414 BG) ── */}
              <linearGradient id="dg" x1="0" y1="0" x2="0" y2="290" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="#212529" />
                <stop offset="100%" stopColor="#191c20" />
              </linearGradient>

              {/* ── Portal / inner space inside the "0" ── */}
              <radialGradient id="portal" cx="50%" cy="45%" r="55%">
                <stop offset="0%"   stopColor="#111418" />
                <stop offset="75%"  stopColor="#0c0e12" />
                <stop offset="100%" stopColor="#070809" />
              </radialGradient>

              {/* ── Mascot body gradient (authentic Stake Edd muted steel-blue) ── */}
              <linearGradient id="eddBody" x1="0" y1="55" x2="0" y2="205" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="#6e8ea4" />
                <stop offset="55%"  stopColor="#5a7a8f" />
                <stop offset="100%" stopColor="#486575" />
              </linearGradient>
              <linearGradient id="eddWing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="#62818f" />
                <stop offset="100%" stopColor="#445e6c" />
              </linearGradient>

              {/* ── Space objects ── */}
              <linearGradient id="spaceObj" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="#415870" />
                <stop offset="100%" stopColor="#2a3d4d" />
              </linearGradient>

              {/* ── Clip the mascot inside the 0 portal ── */}
              <clipPath id="portalClip">
                <ellipse cx="480" cy="138" rx="80" ry="103" />
              </clipPath>
            </defs>

            {/* ════════════════════════════════════════════════════════════
                DIGIT 1 — "4" (for 404)  or  "5" (for 500)
            ════════════════════════════════════════════════════════════ */}
            {code[0] === "4" ? (
              <g>
                {/* shadow offset */}
                <text x="153" y="248" fontSize="265" fontWeight="900"
                  fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
                  fill="#0b0d10" textAnchor="middle">4</text>
                {/* front */}
                <text x="144" y="239" fontSize="265" fontWeight="900"
                  fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
                  fill="url(#dg)" textAnchor="middle" stroke="#25292e" strokeWidth="0.7">4</text>
              </g>
            ) : (
              <g>
                <text x="153" y="248" fontSize="265" fontWeight="900"
                  fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
                  fill="#0b0d10" textAnchor="middle">5</text>
                <text x="144" y="239" fontSize="265" fontWeight="900"
                  fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
                  fill="url(#dg)" textAnchor="middle" stroke="#25292e" strokeWidth="0.7">5</text>
              </g>
            )}

            {/* ════════════════════════════════════════════════════════════
                DIGIT 2 — Central "0"  + Cosmic portal + Mascot Edd
            ════════════════════════════════════════════════════════════ */}
            <g>
              {/* 0 shadow */}
              <text x="489" y="248" fontSize="265" fontWeight="900"
                fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
                fill="#0b0d10" textAnchor="middle">0</text>
              {/* 0 front face */}
              <text x="480" y="239" fontSize="265" fontWeight="900"
                fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
                fill="url(#dg)" textAnchor="middle" stroke="#25292e" strokeWidth="0.7">0</text>

              {/* ── cosmic portal inside the 0 ── */}
              <ellipse cx="480" cy="138" rx="80" ry="103" fill="url(#portal)" />

              {/* ── Everything inside the portal is clipped ── */}
              <g clipPath="url(#portalClip)">

                {/* Ambient star specks */}
                <circle cx="425" cy="200" r="1.6" fill="#3e5769" />
                <circle cx="533" cy="78" r="1.3" fill="#334656" />
                <circle cx="448" cy="84" r="0.9" fill="#2e4050" />

                {/* ╔════════════════════════════════════════════════════╗
                    MASCOT EDD  — exact Stake.com ghost/cloud blob shape
                    Key features from reference screenshot:
                    • Amorphous ghost body — NOT rectangular
                    • 2 large wing-lobes on the left (upper & lower)
                    • Right side has jetpack protrusion
                    • Single enormous cyclops eye — upper half of body
                    • Small frown below eye
                    • Lightning bolt antenna (top-right)
                    • Muted steel-blue #5b7a8e color scheme
                    ╚════════════════════════════════════════════════════╝ */}

                <g className="edd-g" style={{ transformOrigin: "478px 130px" }}>

                  {/* ── Jetpack / oxygen tank (back-right, drawn first so body overlaps) ── */}
                  <rect x="514" y="108" width="14" height="34" rx="7"
                    fill="#253848" stroke="#111e28" strokeWidth="1.5"
                    transform="rotate(12 521 125)" />
                  {/* tank stripes */}
                  <line x1="515" y1="117" x2="525" y2="120" stroke="#1c2e3c" strokeWidth="1.3" />
                  <line x1="513" y1="125" x2="523" y2="128" stroke="#1c2e3c" strokeWidth="1.3" />

                  {/* ── LEFT UPPER WING LOBE — drawn first (behind body) ── */}
                  <ellipse cx="422" cy="110" rx="22" ry="18"
                    fill="url(#eddBody)" stroke="#162432" strokeWidth="2" />

                  {/* ── LEFT LOWER WING LOBE ── */}
                  <ellipse cx="415" cy="152" rx="28" ry="24"
                    fill="url(#eddBody)" stroke="#162432" strokeWidth="2" />

                  {/* ── MAIN BODY — organic ghost/cloud blob ── */}
                  <path
                    d="
                      M 478,58
                      C 494,58 513,66 522,82
                      C 531,96 527,112 525,122
                      C 531,124 542,128 545,138
                      C 548,149 542,161 533,165
                      C 525,168 515,163 513,168
                      C 511,177 507,186 498,191
                      C 488,197 478,199 466,199
                      C 454,199 442,196 434,190
                      C 426,184 424,174 423,168
                      C 420,164 412,166 406,162
                      C 400,158 396,147 400,137
                      C 403,128 414,122 421,121
                      C 419,111 419,96 428,82
                      C 438,67 462,58 478,58 Z
                    "
                    fill="url(#eddBody)"
                    stroke="#162432"
                    strokeWidth="2.5"
                  />

                  {/* ── TOP HEAD BUMPS (small crown spikes, Stake style) ── */}
                  <ellipse cx="458" cy="62" rx="9" ry="7"
                    fill="url(#eddBody)" stroke="#162432" strokeWidth="1.8"
                    transform="rotate(-15 458 62)" />
                  <ellipse cx="478" cy="56" rx="8" ry="7"
                    fill="url(#eddBody)" stroke="#162432" strokeWidth="1.8" />
                  <ellipse cx="496" cy="60" rx="8" ry="7"
                    fill="url(#eddBody)" stroke="#162432" strokeWidth="1.8"
                    transform="rotate(12 496 60)" />

                  {/* ── ANTENNA LIGHTNING BOLT (top-right of head) ── */}
                  <g className="ant-g">
                    {/* antenna stalk */}
                    <line x1="508" y1="72" x2="516" y2="55" stroke="#9bc3db" strokeWidth="2.2" strokeLinecap="round" />
                    {/* lightning bolt shape */}
                    <path d="M 510,65 L 518,58 L 513,55 L 521,47"
                      stroke="#9bc3db" strokeWidth="2.4"
                      strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <circle cx="521" cy="47" r="2.6" fill="#9bc3db" />
                  </g>

                  {/* ── CYCLOPS EYE — very large, Stake's signature ── */}
                  {/* Outer socket / eye-ring (dark sclera housing) */}
                  <circle cx="476" cy="95" r="19" fill="#12202c" stroke="#1e3346" strokeWidth="2.2" />
                  {/* White iris */}
                  <circle cx="476" cy="95" r="13.5" fill="#e2eff8" />
                  {/* Pupil — looking slightly down and to the left (lost in space) */}
                  <circle cx="474" cy="97" r="8.5" fill="#0d1c27" />
                  {/* Main highlight glint */}
                  <circle cx="478" cy="91" r="3.2" fill="#ffffff" />
                  {/* Secondary micro-glint */}
                  <circle cx="473" cy="99" r="1.5" fill="#ffffff" />

                  {/* ── FROWN MOUTH (slightly open, nervous in space) ── */}
                  <path d="M 464,120 Q 476,111 488,120"
                    stroke="#0f1d28"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    fill="none" />

                  {/* ── Subtle ground shadow under Edd ── */}
                  <ellipse cx="473" cy="194" rx="32" ry="9" fill="#000" opacity="0.4" />

                </g>
              </g>{/* end portalClip */}
            </g>{/* end d2-zero */}

            {/* ════════════════════════════════════════════════════════════
                DIGIT 3 — "4" (for 404)  or  "0" (for 500)
            ════════════════════════════════════════════════════════════ */}
            {code[2] === "4" ? (
              <g>
                <text x="838" y="248" fontSize="265" fontWeight="900"
                  fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
                  fill="#0b0d10" textAnchor="middle">4</text>
                <text x="829" y="239" fontSize="265" fontWeight="900"
                  fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
                  fill="url(#dg)" textAnchor="middle" stroke="#25292e" strokeWidth="0.7">4</text>
              </g>
            ) : (
              <g>
                <text x="838" y="248" fontSize="265" fontWeight="900"
                  fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
                  fill="#0b0d10" textAnchor="middle">0</text>
                <text x="829" y="239" fontSize="265" fontWeight="900"
                  fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
                  fill="url(#dg)" textAnchor="middle" stroke="#25292e" strokeWidth="0.7">0</text>
              </g>
            )}

            {/* ════════════════════════════════════════════════════════════
                SPACE OBJECTS (exact Stake.com placements)
            ════════════════════════════════════════════════════════════ */}

            {/* ── Comet/Meteor — upper area between digit-1 and digit-2 ── */}
            {/* In stake screenshot: rocky comet shape, upper left of 0, has tail streaks */}
            <g className="comet-g">
              {/* Main comet rock body */}
              <path
                d="M 346,44 C 337,46 328,52 323,60 C 318,68 318,77 322,84
                   C 326,90 334,94 342,93 C 350,92 357,87 360,80
                   C 364,72 362,63 357,57 C 352,51 346,44 346,44 Z"
                fill="url(#spaceObj)" stroke="#14232f" strokeWidth="1.6" />
              {/* Comet tail streaks */}
              <line x1="355" y1="48" x2="375" y2="33" stroke="#33495a" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="362" y1="54" x2="383" y2="40" stroke="#2a3d4d" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="358" y1="44" x2="379" y2="28" stroke="#243545" strokeWidth="1" strokeLinecap="round" />
              {/* Crater on comet */}
              <circle cx="336" cy="72" r="5" fill="#182633" />
              <circle cx="346" cy="58" r="3.5" fill="#182633" />
            </g>

            {/* ── Pear Moon — between digit-1 and digit-2, lower area ── */}
            {/* In stake screenshot: pear/drop shape with multiple craters, left of the 0 */}
            <g className="moon-g">
              <path
                d="M 308,118
                   C 295,128 284,148 282,174
                   C 280,197 283,216 300,218
                   C 318,218 334,206 338,190
                   C 342,172 337,152 326,137
                   C 322,130 318,124 308,118 Z"
                fill="url(#spaceObj)" stroke="#14232f" strokeWidth="1.8" />
              {/* Prominent lunar craters */}
              <ellipse cx="320" cy="195" rx="6" ry="5" fill="#182633" />
              <circle cx="300" cy="158" r="5.5" fill="#182633" />
              <circle cx="320" cy="138" r="4" fill="#182633" />
              <circle cx="298" cy="194" r="3" fill="#182633" />
              <circle cx="330" cy="168" r="3" fill="#182633" />
              <circle cx="310" cy="175" r="2" fill="#1e3040" />
            </g>

            {/* ── Saturn — lower-right of the centre 0 ── */}
            {/* In stake screenshot: clear planet + prominent ring system */}
            <g className="sat-g">
              {/* Back ring arc */}
              <ellipse cx="660" cy="196" rx="40" ry="10"
                fill="#1b2d3c" transform="rotate(-18 660 196)" />
              {/* Planet sphere */}
              <circle cx="660" cy="196" r="21"
                fill="url(#spaceObj)" stroke="#14232f" strokeWidth="1.8" />
              {/* Ring band on top of planet (front arc) */}
              <path
                d="M 622,210 C 635,225 685,210 698,186"
                stroke="#7ca2bc" strokeWidth="3.2" strokeLinecap="round" fill="none" />
              {/* Subtle ring highlight */}
              <path
                d="M 626,207 C 638,220 682,208 694,188"
                stroke="#557f99" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
            </g>

            {/* Ambient background stars */}
            <circle cx="612" cy="72" r="2.8" fill="#4c6878" />
            <circle cx="680" cy="92" r="1.7" fill="#3c5669" />
            <circle cx="355" cy="175" r="1.4" fill="#3a5162" />

          </svg>
        </div>

        {/* ══ STATUS TEXT ═════════════════════════════════════════════════ */}
        <div className="flex flex-col items-center max-w-lg px-2">
          <h1 className="text-lg sm:text-[21px] font-bold tracking-tight text-white mb-2">
            {title}
          </h1>
          <p className="mb-7 text-[13px] sm:text-[14px] leading-relaxed text-[#7895ad] font-normal max-w-md">
            {description1}
            <br />
            {description2}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isServerError && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#2f4558] px-6 text-[13.5px] font-bold text-white transition-all duration-150 hover:bg-[#3a5268] hover:scale-[1.02] active:scale-[0.98]"
              >
                <RotateCcw size={15} />
                <span>Thử lại ngay</span>
              </button>
            )}
            <Link
              href="/"
              className={cn(
                "inline-flex h-10 cursor-pointer items-center justify-center rounded-md text-[13.5px] font-bold text-white transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]",
                isServerError && onRetry
                  ? "bg-[#1e2d3a] hover:bg-[#253644] text-[#7895ad] hover:text-white px-5"
                  : "bg-[#2f4558] hover:bg-[#3a5268] px-7",
              )}
            >
              <span>Đi tới trang chủ</span>
            </Link>
          </div>
        </div>

      </section>
    </main>
  );
}
