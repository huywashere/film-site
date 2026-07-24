'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, User, Film, Star, Sparkles, ChevronRight } from 'lucide-react';

interface Actor {
  id: string;
  name: string;
  originalName?: string;
  region: 'hollywood' | 'korea' | 'china' | 'vietnam';
  regionLabel: string;
  avatar: string;
  popularWorks: string[];
  description: string;
}

const POPULAR_ACTORS: Actor[] = [
  {
    id: 'tom-cruise',
    name: 'Tom Cruise',
    originalName: 'Thomas Cruise Mapother IV',
    region: 'hollywood',
    regionLabel: 'Hollywood / Âu Mỹ',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Nhiệm Vụ Bất Khả Thi', 'Top Gun: Maverick', 'Cuộc Chiến Vô Hình'],
    description: 'Ngôi sao hành động huyền thoại thế giới với những pha mạo hiểm không cần đóng thế.',
  },
  {
    id: 'scarlett-johansson',
    name: 'Scarlett Johansson',
    originalName: 'Scarlett Ingrid Johansson',
    region: 'hollywood',
    regionLabel: 'Hollywood / Âu Mỹ',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Avengers: Hồi Kết', 'Góa Phụ Đen (Black Widow)', 'Lucy'],
    description: 'Nữ minh tinh đình đám của Vũ trụ Điện ảnh Marvel và điện ảnh Hollywood.',
  },
  {
    id: 'thanh-long',
    name: 'Thành Long',
    originalName: 'Jackie Chan (Phùng Trọng Thanh)',
    region: 'china',
    regionLabel: 'Trung Quốc / Hồng Kông',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Giờ Cao Điểm (Rush Hour)', 'Túy Quyền', 'Kẻ Ngoại Tộc'],
    description: 'Huyền thoại võ thuật hài hước Á Đông và điện ảnh thế giới.',
  },
  {
    id: 'lee-min-ho',
    name: 'Lee Min Ho',
    originalName: '이민호',
    region: 'korea',
    regionLabel: 'Hàn Quốc',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Vườn Sao Băng', 'Quân Vương Bất Diệt', 'Huyền Thoại Biển Xanh'],
    description: 'Nam thần phim truyền hình Hàn Quốc nổi tiếng hàng đầu Châu Á.',
  },
  {
    id: 'chau-tinh-tri',
    name: 'Châu Tinh Trì',
    originalName: 'Stephen Chow',
    region: 'china',
    regionLabel: 'Trung Quốc / Hồng Kông',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Tuyệt Đỉnh Công Phu', 'Đội Bóng Thiếu Lâm', 'Mỹ Nhân Ngư'],
    description: 'Vua hài Hồng Kông với phong cách hài nhảm vô nhị và điện ảnh kinh điển.',
  },
  {
    id: 'song-joong-ki',
    name: 'Song Joong Ki',
    originalName: '송중기',
    region: 'korea',
    regionLabel: 'Hàn Quốc',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Hậu Duệ Mặt Trời', 'Vincenzo', 'Cậu Út Nhà Tài Phiệt'],
    description: 'Diễn viên tài năng với vô số siêu phẩm truyền hình đạt rating kỷ lục.',
  },
  {
    id: 'trieu-le-dinh',
    name: 'Triệu Lệ Dĩnh',
    originalName: 'Zanilia Zhao',
    region: 'china',
    regionLabel: 'Trung Quốc / Hồng Kông',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Sở Kiều Truyện', 'Minh Lan Truyện', 'Dữ Phượng Hành'],
    description: 'Nữ hoàng rating phim cổ trang và chính kịch Trung Quốc.',
  },
  {
    id: 'keanu-reeves',
    name: 'Keanu Reeves',
    originalName: 'Keanu Charles Reeves',
    region: 'hollywood',
    regionLabel: 'Hollywood / Âu Mỹ',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['John Wick', 'Ma Trận (The Matrix)', 'Constantine'],
    description: 'Tài tử phim hành động quyến rũ được yêu thích bậc nhất thế giới.',
  },
  {
    id: 'robert-downey-jr',
    name: 'Robert Downey Jr.',
    originalName: 'Robert John Downey Jr.',
    region: 'hollywood',
    regionLabel: 'Hollywood / Âu Mỹ',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Iron Man (Người Sắt)', 'Avengers', 'Oppenheimer'],
    description: 'Biểu tượng huyền thoại Iron Man của Marvel và chủ nhân giải Oscar.',
  },
  {
    id: 'tran-thanh',
    name: 'Trấn Thành',
    originalName: 'Huỳnh Trấn Thành',
    region: 'vietnam',
    regionLabel: 'Việt Nam',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Mai', 'Nhà Bà Nữ', 'Bố Già'],
    description: 'Đạo diễn kiêm diễn viên điện ảnh với kỷ lục doanh thu phòng vé Việt Nam.',
  },
  {
    id: 'duong-mich',
    name: 'Dương Mịch',
    originalName: 'Yang Mi',
    region: 'china',
    regionLabel: 'Trung Quốc / Hồng Kông',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Tam Sinh Tam Thế Thập Lý Đào Hoa', 'Cung Tỏa Tâm Ngọc', 'Hồ Yêu Tiểu Hồng Nương'],
    description: 'Hoa đán đình đám của màn ảnh Hoa ngữ với phong cách quyến rũ.',
  },
  {
    id: 'dwayne-johnson',
    name: 'Dwayne Johnson (The Rock)',
    originalName: 'Dwayne Douglas Johnson',
    region: 'hollywood',
    regionLabel: 'Hollywood / Âu Mỹ',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    popularWorks: ['Fast & Furious', 'Jumanji', 'Black Adam'],
    description: 'Ngôi sao giải trí & hành động bom tấn có sức ảnh hưởng toàn cầu.',
  },
];

export default function ActorsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  const filteredActors = useMemo(() => {
    return POPULAR_ACTORS.filter((actor) => {
      const matchRegion = selectedRegion === 'all' || actor.region === selectedRegion;
      const matchSearch =
        !searchQuery.trim() ||
        actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (actor.originalName && actor.originalName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        actor.popularWorks.some((w) => w.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchRegion && matchSearch;
    });
  }, [searchQuery, selectedRegion]);

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="container mx-auto px-4 md:px-8 max-w-7xl pt-24 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-white/10 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <User className="text-red-500" size={28} />
            <span>Diễn Viên Nổi Bật</span>
          </h1>
          <p className="text-xs text-neutral-400 font-semibold mt-1">
            Khám phá danh sách các diễn viên, ngôi sao điện ảnh yêu thích và toàn bộ bộ phim họ tham gia
          </p>
        </div>

        {/* Custom Search Form */}
        <form onSubmit={handleCustomSearch} className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm tên diễn viên bất kỳ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12161a] border border-white/15 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-white/30 transition-all shadow-md"
          />
        </form>
      </div>

      {/* Region Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin">
        {[
          { key: 'all', label: 'Tất Cả Ngôi Sao' },
          { key: 'hollywood', label: 'Hollywood / Âu Mỹ' },
          { key: 'korea', label: 'Hàn Quốc' },
          { key: 'china', label: 'Trung Quốc / Hồng Kông' },
          { key: 'vietnam', label: 'Việt Nam' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedRegion(tab.key)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedRegion === tab.key
                ? 'bg-white text-black border-white font-bold shadow-lg shadow-white/10 scale-105'
                : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Actors Grid */}
      {filteredActors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredActors.map((actor) => (
            <div
              key={actor.id}
              className="bg-[#12161a]/70 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-white/25 transition-all group shadow-xl hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/15 group-hover:border-white/40 transition-colors shrink-0 relative bg-neutral-900 shadow-md">
                    <img
                      src={actor.avatar}
                      alt={actor.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-sm text-white group-hover:text-amber-400 transition-colors truncate">
                      {actor.name}
                    </h3>
                    {actor.originalName && (
                      <p className="text-[11px] text-neutral-400 truncate font-medium">
                        {actor.originalName}
                      </p>
                    )}
                    <span className="inline-block mt-1 text-[9px] font-bold text-neutral-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                      {actor.regionLabel}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2 mb-3">
                  {actor.description}
                </p>

                {/* Popular Works */}
                <div className="mb-4">
                  <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Film size={12} className="text-red-400" /> Phim nổi bật:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {actor.popularWorks.map((work, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold text-neutral-300 bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-md"
                      >
                        {work}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* View Movies Button */}
              <Link
                href={`/search?q=${encodeURIComponent(actor.name)}`}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group-hover:bg-white group-hover:text-black"
              >
                <span>Xem danh sách phim</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-[#12161a]/40 border border-white/10 rounded-2xl p-8">
          <User size={36} className="mx-auto text-neutral-500 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Không tìm thấy diễn viên phù hợp</h3>
          <p className="text-xs text-neutral-400 mb-4">
            Thử tìm kiếm diễn viên &quot;{searchQuery}&quot; trên kho phim CineVerse
          </p>
          <Link
            href={`/search?q=${encodeURIComponent(searchQuery)}`}
            className="inline-flex items-center gap-2 bg-white text-black font-bold text-xs px-5 py-2.5 rounded-full hover:bg-neutral-200 transition-colors"
          >
            <span>Tìm phim theo từ khóa này</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
