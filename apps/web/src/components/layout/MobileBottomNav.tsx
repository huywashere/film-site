'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Film, Layers, Bookmark, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAuthModalStore } from '@/store/authModalStore';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();

  const navItems = [
    {
      label: 'Trang chủ',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: 'Phim bộ',
      href: '/films/series',
      icon: Film,
      isActive: pathname.startsWith('/films'),
    },
    {
      label: 'Bộ sưu tập',
      href: '/lists',
      icon: Layers,
      isActive: pathname === '/lists',
    },
    {
      label: 'Tủ phim',
      href: '/watchlist',
      icon: Bookmark,
      isActive: pathname === '/watchlist',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#14181c]/95 backdrop-blur-2xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-2xl">
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition-all relative group",
                item.isActive ? "text-emerald-400 font-extrabold" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              <Icon size={19} className={cn("transition-transform duration-200", item.isActive && "scale-110")} />
              <span className="mt-0.5 tracking-tight">{item.label}</span>
              {item.isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </Link>
          );
        })}

        {/* User Account / Login Tab */}
        {user ? (
          <Link
            href={`/profile/${encodeURIComponent(user.username)}`}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition-all relative",
              pathname.startsWith('/profile') ? "text-emerald-400 font-extrabold" : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            <img
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=2c3440&color=ffffff&size=24`}
              alt={user.username}
              className={cn(
                "w-5 h-5 rounded-full object-cover border border-white/20 transition-transform",
                pathname.startsWith('/profile') && "scale-110 border-emerald-400 ring-2 ring-emerald-400/30"
              )}
            />
            <span className="mt-0.5 tracking-tight">Cá nhân</span>
            {pathname.startsWith('/profile') && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400" />
            )}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold text-neutral-400 hover:text-white transition-all"
          >
            <User size={19} />
            <span className="mt-0.5 tracking-tight">Đăng nhập</span>
          </button>
        )}
      </div>
    </nav>
  );
}
