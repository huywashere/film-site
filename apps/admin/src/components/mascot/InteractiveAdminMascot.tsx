"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const DIRECTIONS = [
  "up-left",
  "up",
  "up-right",
  "left",
  "center",
  "right",
  "down-left",
  "down",
  "down-right",
] as const;

const REACTIONS = [
  "blink",
  "heart",
  "sparkle",
  "surprised",
  "wink",
  "bashful",
  "sleepy",
  "dizzy",
  "delighted",
] as const;

export type MascotDirection = (typeof DIRECTIONS)[number];
export type MascotReaction = (typeof REACTIONS)[number];

const CLOCKWISE: MascotDirection[] = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
];

const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;
const DEAD_ZONE = 45;

const PAYOFFS: MascotReaction[] = ["heart", "sparkle", "delighted"];
const BOOP_PAYOFF = 120;
const BOOP_END = 560;
const SQUASH_MS = 420;
const DIZZY_AFTER = 4;
const DIZZY_WINDOW = 1600;
const DIZZY_END = 1100;

const SQUASH: Keyframe[] = [
  { transform: "scale(1, 1)", easing: "ease-in" },
  { transform: "scale(1.10, 0.86)", offset: 0.18, easing: "ease-out" },
  { transform: "scale(0.95, 1.08)", offset: 0.45, easing: "ease-in-out" },
  { transform: "scale(1.03, 0.97)", offset: 0.72, easing: "ease-in-out" },
  { transform: "scale(1, 1)" },
];

function cell(index: number): CSSProperties {
  return {
    backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`,
  };
}

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

const layer: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundSize: "300% 300%",
  backgroundRepeat: "no-repeat",
};

export interface InteractiveAdminMascotProps {
  size?: number | string;
  className?: string;
  directions?: string;
  reactions?: string;
  label?: string;
  interactive?: boolean;
  onClick?: (event: React.MouseEvent) => void;
}

export function InteractiveAdminMascot({
  size = 72,
  className = "",
  directions = "/mascots/fox-riso/directions.png",
  reactions = "/mascots/fox-riso/reactions.png",
  label = "Mascot Admin FlexPhim",
  interactive = true,
  onClick,
}: InteractiveAdminMascotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const squashRef = useRef<HTMLSpanElement>(null);
  const timersRef = useRef<number[]>([]);
  const boopsRef = useRef({ count: 0, at: 0 });

  const [direction, setDirection] = useState<MascotDirection>("center");
  const [reaction, setReaction] = useState<MascotReaction | null>(null);

  useEffect(() => {
    if (!interactive) return;

    let sector = -1;
    let pointer: { x: number; y: number } | null = null;

    const aim = () => {
      const el = containerRef.current;
      if (!el || !pointer) return;

      const box = el.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);

      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        sector = -1;
        setDirection("center");
        return;
      }

      const angle = Math.atan2(dy, dx);
      if (
        sector !== -1 &&
        Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS
      ) {
        return;
      }

      sector =
        (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDirection(CLOCKWISE[sector]);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      aim();
    };

    let scrollTicking = false;
    const onScroll = () => {
      if (!scrollTicking) {
        scrollTicking = true;
        window.requestAnimationFrame(() => {
          aim();
          scrollTicking = false;
        });
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [interactive]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(window.clearTimeout);
    };
  }, []);

  const boop = (event?: React.MouseEvent) => {
    onClick?.(event as React.MouseEvent);

    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];

    const later = (ms: number, next: MascotReaction | null) => {
      timersRef.current.push(
        window.setTimeout(() => setReaction(next), ms) as unknown as number,
      );
    };

    const now = Date.now();
    const boops = boopsRef.current;
    boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
    boops.at = now;

    if (boops.count >= DIZZY_AFTER) {
      boops.count = 0;
      setReaction("dizzy");
      later(DIZZY_END, null);
    } else {
      setReaction("blink");
      later(BOOP_PAYOFF, PAYOFFS[(boops.count - 1) % PAYOFFS.length]);
      later(BOOP_END, null);
    }

    squashRef.current?.animate(SQUASH, {
      duration: SQUASH_MS,
      easing: "linear",
    });
  };

  const styleDimension = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      ref={containerRef}
      onClick={boop}
      role="img"
      aria-label={label}
      title="Nhấp vào mascot để tương tác!"
      className={`relative block shrink-0 select-none overflow-hidden p-0 bg-[#faf9f7] cursor-pointer shadow-lg border border-violet-500/30 hover:border-violet-400 transition-all ${
        className.includes("rounded") ? "" : "rounded-full"
      } ${className}`}
      style={{
        width: styleDimension,
        height: styleDimension,
      }}
    >
      <span
        ref={squashRef}
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          height: "100%",
          transformOrigin: "50% 78%",
        }}
      >
        <span
          style={{
            ...layer,
            backgroundImage: `url(${directions})`,
            ...cell(DIRECTIONS.indexOf(direction)),
            opacity: reaction ? 0 : 1,
            transition: "opacity 120ms ease-out",
          }}
        />
        <span
          style={{
            ...layer,
            backgroundImage: `url(${reactions})`,
            ...cell(REACTIONS.indexOf(reaction ?? "blink")),
            opacity: reaction ? 1 : 0,
            transition: "opacity 120ms ease-out",
          }}
        />
      </span>
    </div>
  );
}

export default InteractiveAdminMascot;
