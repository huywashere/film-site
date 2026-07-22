'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { movieApi } from '@/lib/api';
import { FilmCard, FilmItem, FilmCardSkeleton } from '@/components/film/FilmCard';
import { Pagination } from '@/components/film/Pagination';

const COUNTRY_NAMES: Record<string, string> = {
  anh: 'Anh',
  'ba-lan': 'Ba Lan',
  brazil: 'Brazil',
  'bo-dao-nha': 'Bồ Đào Nha',
  canada: 'Canada',
  'chau-phi': 'Châu Phi',
  'ha-lan': 'Hà Lan',
  'han-quoc': 'Hàn Quốc',
  'hong-kong': 'Hồng Kông',
  indonesia: 'Indonesia',
  malaysia: 'Malaysia',
  mexico: 'Mexico',
  'na-uy': 'Na Uy',
  'nam-phi': 'Nam Phi',
  nga: 'Nga',
  'nhat-ban': 'Nhật Bản',
  philippines: 'Philippines',
  phap: 'Pháp',
  'quoc-gia-khac': 'Quốc Gia Khác',
  'thai-lan': 'Thái Lan',
  'tho-nhi-ky': 'Thổ Nhĩ Kỳ',
  'thuy-si': 'Thụy Sĩ',
  'thuy-dien': 'Thụy Điển',
  'trung-quoc': 'Trung Quốc',
  'tay-ban-nha': 'Tây Ban Nha',
  uae: 'UAE',
  ukraina: 'Ukraina',
  'viet-nam': 'Việt Nam',
  'au-my': 'Âu Mỹ',
  uc: 'Úc',
  y: 'Ý',
  'dan-mach': 'Đan Mạch',
  'dai-loan': 'Đài Loan',
  duc: 'Đức',
  'a-rap-xe-ut': 'Ả Rập Xê Út',
  'an-do': 'Ấn Độ',
};

export default function CountryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const page = Number(searchParams.get('page') || 1);
  const label = COUNTRY_NAMES[slug] || slug;

  const { data, isLoading } = useQuery({
    queryKey: ['country', slug, page],
    queryFn: () => movieApi.getByCountry(slug, page).then((r) => r.data),
  });

  const films: FilmItem[] = data?.data?.items || data?.items || [];

  const rawTotal =
    data?.data?.params?.pagination?.totalPages ||
    data?.params?.pagination?.totalPages ||
    data?.pagination?.totalPages ||
    data?.paginate?.total_page ||
    data?.data?.paginate?.total_page ||
    (data?.data?.params?.pagination?.totalItems
      ? Math.ceil(data.data.params.pagination.totalItems / (data.data.params.pagination.totalItemsPerPage || 24))
      : undefined);

  const totalPages = rawTotal && rawTotal > 1 ? rawTotal : (films.length > 0 ? 50 : 1);
  const totalItems = data?.data?.params?.pagination?.totalItems || data?.pagination?.totalItems;

  const handlePageChange = (newPage: number) => {
    router.push(`/country/${slug}?page=${newPage}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto px-4 md:px-8 max-w-7xl pt-24 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-white/10 gap-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-wide uppercase font-sans">
            Quốc Gia: {label}
          </h1>
          <p className="text-xs text-neutral-400 font-semibold mt-1">
            Danh sách phim sản xuất tại {label} chọn lọc hay nhất
          </p>
        </div>
        <div className="text-xs font-bold text-neutral-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 self-start md:self-auto">
          Trang <span className="text-white font-extrabold">{page}</span> / {totalPages}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <FilmCardSkeleton key={i} />
          ))}
        </div>
      ) : films.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {films.map((f) => (
            <FilmCard key={f.slug} film={f} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-neutral-500 font-semibold text-sm">
          Chưa có bộ phim nào thuộc quốc gia này.
        </div>
      )}

      {/* Pagination Controls */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
