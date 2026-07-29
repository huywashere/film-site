"use client";
import Link from "next/link";
import { Play } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative w-full bg-[#07090e] border-t border-white/5 text-neutral-400 font-sans py-16 px-4 z-20">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center space-y-6">
        {/* Brand Logo & Name */}
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform duration-300">
            <Play size={18} fill="currentColor" className="text-white ml-0.5" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors">
            cineverse
          </span>
        </Link>

        {/* Disclaimer & Copyright */}
        <div className="space-y-2 max-w-lg">
          <p className="text-xs text-neutral-500 font-medium leading-relaxed">
            CineVerse does not host any files, it only links to 3rd party
            services.
          </p>
          <p className="text-xs text-neutral-500 font-medium">
            © {new Date().getFullYear()} CineVerse. Made with{" "}
            <span className="text-red-500">❤️</span> by the CineVerse team 🤘
          </p>
        </div>

        {/* Minimal Navigation Links Row */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-semibold text-neutral-400">
          <Link href="/about" className="hover:text-white transition-colors">
            About
          </Link>
          <Link href="/contact" className="hover:text-white transition-colors">
            Contact
          </Link>
          <Link href="/blog" className="hover:text-white transition-colors">
            Blog
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link href="/legal" className="hover:text-white transition-colors">
            Legal
          </Link>
        </div>
      </div>
    </footer>
  );
}
