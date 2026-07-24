"use client";
import { useEffect } from "react";

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize smooth scroll on client side
    if (typeof window === "undefined") return;

    let lenisInstance: any = null;

    const initScroll = async () => {
      // Dynamically import client-only libraries to prevent Next.js SSR 500 errors
      const { default: Lenis } = await import("lenis");
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");

      gsap.registerPlugin(ScrollTrigger);

      // Initialize Lenis smooth scroll
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Clean ease
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
      });

      // Sync Lenis scroll events to GSAP ScrollTrigger
      lenisInstance.on("scroll", ScrollTrigger.update);

      // Use browser's native requestAnimationFrame loop for optimal V-Sync smooth scrolling
      let rafId: number;
      const rafLoop = (time: number) => {
        lenisInstance.raf(time);
        rafId = requestAnimationFrame(rafLoop);
      };
      rafId = requestAnimationFrame(rafLoop);

      // Save rafId for cleanup
      (window as any).__lenisRafId = rafId;
    };

    initScroll();

    // Clean up
    return () => {
      if (lenisInstance) {
        lenisInstance.destroy();
      }
      const savedRafId = (window as any).__lenisRafId;
      if (savedRafId) {
        cancelAnimationFrame(savedRafId);
      }
    };
  }, []);

  return <>{children}</>;
}
