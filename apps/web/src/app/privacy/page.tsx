import { Metadata } from "next";
import { LegalPageLayout, TOCItem } from "@/components/legal/LegalPageLayout";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  UserCheck,
  Database,
  Cookie,
  BellRing,
  AlertCircle,
  FileCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Chính sách bảo mật thông tin & Quyền riêng tư | NetPhim",
  description:
    "Tìm hiểu cách NetPhim thu thập, xử lý và bảo vệ dữ liệu cá nhân của bạn. Cam kết bảo mật quyền riêng tư hàng đầu cho người dùng.",
};

const TOC: TOCItem[] = [
  { id: "overview", title: "1. Tổng quan & Cam kết bảo mật" },
  { id: "data-collection", title: "2. Thông tin chúng tôi thu thập" },
  { id: "data-usage", title: "3. Mục đích sử dụng dữ liệu" },
  { id: "security-measures", title: "4. Biện pháp bảo vệ & Mã hóa" },
  { id: "cookies-tracking", title: "5. Cookie & Công nghệ lưu trữ" },
  { id: "user-rights", title: "6. Quyền riêng tư của bạn" },
  { id: "third-party", title: "7. Dịch vụ & Liên kết bên thứ ba" },
  { id: "policy-updates", title: "8. Cập nhật chính sách & Liên hệ" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      badge="Bảo Mật & Quyền Riêng Tư"
      badgeIcon={<ShieldCheck size={14} className="text-violet-400" />}
      title="Chính Sách Bảo Mật Thông Tin"
      description="Chúng tôi tôn trọng và cam kết bảo vệ dữ liệu cá nhân của bạn. Bản chính sách này giải thích minh bạch cách thức NetPhim thu thập, xử lý và bảo đảm an toàn cho mọi thông tin khi bạn sử dụng dịch vụ."
      lastUpdated="19/08/2026"
      readTime="6 phút đọc"
      toc={TOC}
    >
      {/* TL;DR Summary Box */}
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-violet-300 font-bold text-sm mb-2">
          <FileCheck size={18} />
          <span>Tóm tắt nhanh (TL;DR)</span>
        </div>
        <ul className="space-y-1.5 text-xs sm:text-sm text-neutral-300 list-disc list-inside">
          <li><strong>Không bán dữ liệu:</strong> NetPhim tuyệt đối không bán hay cho thuê thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại.</li>
          <li><strong>Mã hóa tiêu chuẩn:</strong> Mật khẩu và thông tin đăng nhập được băm an toàn (Argon2id/Bcrypt) và đường truyền được bảo vệ bằng SSL/TLS 1.3.</li>
          <li><strong>Toàn quyền kiểm soát:</strong> Bạn có quyền yêu cầu trích xuất dữ liệu hoặc xóa vĩnh viễn tài khoản của mình bất kỳ lúc nào.</li>
        </ul>
      </div>

      {/* Section 1 */}
      <section id="overview" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">1.</span> Tổng quan & Cam kết bảo mật
        </h2>
        <p className="text-neutral-300">
          Chào mừng bạn đến với <strong>NetPhim</strong>. Sự tin tưởng của người dùng là nền tảng cốt lõi trong mọi hoạt động của chúng tôi. Khi bạn truy cập website hoặc ứng dụng NetPhim, chúng tôi cam kết thu thập lượng dữ liệu tối thiểu cần thiết để mang lại trải nghiệm xem phim trực tuyến mượt mà, đồng bộ và an toàn nhất.
        </p>
        <p className="text-neutral-300">
          Chính sách này áp dụng cho toàn bộ các dịch vụ, tính năng, và tiện ích do NetPhim cung cấp trên mọi nền tảng (Web, Mobile, Tablet).
        </p>
      </section>

      {/* Section 2 */}
      <section id="data-collection" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">2.</span> Thông tin chúng tôi thu thập
        </h2>
        <p className="text-neutral-300">
          Tùy theo mức độ tương tác của bạn trên NetPhim, chúng tôi có thể thu thập các nhóm thông tin sau:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-violet-300 font-bold text-sm">
              <UserCheck size={16} />
              <h4>Thông tin bạn cung cấp</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Địa chỉ Email, Tên hiển thị (Display Name), Tên tài khoản (Username), Ảnh đại diện và Mật khẩu (đã qua mã hóa băm một chiều) khi bạn tạo tài khoản hoặc liên hệ hỗ trợ.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-violet-300 font-bold text-sm">
              <Database size={16} />
              <h4>Lịch sử & Tùy chọn xem phim</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Thời gian dừng phim (Resume playback), danh sách phim yêu thích (Watchlist), lịch sử xem gần đây, danh sách tập đã xem và các cài đặt hiển thị (ngôn ngữ, âm lượng, chất lượng video).
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-violet-300 font-bold text-sm">
              <Lock size={16} />
              <h4>Dữ liệu kỹ thuật & Thiết bị</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Loại trình duyệt, hệ điều hành (Windows, macOS, iOS, Android), độ phân giải màn hình, địa chỉ IP (được ẩn danh hóa một phần) nhằm tối ưu băng thông máy chủ và phòng chống tấn công DDoS.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-violet-300 font-bold text-sm">
              <ShieldCheck size={16} />
              <h4>Xác minh chống bot (Turnstile)</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Sử dụng Cloudflare Turnstile để xác thực tương tác người thật mà không xâm phạm quyền riêng tư hay theo dõi hành vi qua các trang web khác.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section id="data-usage" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">3.</span> Mục đích sử dụng dữ liệu
        </h2>
        <p className="text-neutral-300">
          Mọi dữ liệu được thu thập chỉ phục vụ cho các mục đích thiết thực sau:
        </p>
        <ul className="space-y-2.5 text-neutral-300 text-sm list-disc list-inside">
          <li><strong>Duy trì phiên đăng nhập & Đồng bộ:</strong> Giúp bạn tiếp tục xem dở tập phim trên điện thoại khi chuyển từ máy tính mà không phải tua tìm kiếm.</li>
          <li><strong>Cá nhân hóa nội dung:</strong> Gợi ý các bộ phim phù hợp với thể loại, diễn viên và quốc gia bạn yêu thích.</li>
          <li><strong>Cải thiện hiệu năng phát video:</strong> Lựa chọn cụm máy chủ CDN gần bạn nhất để tối đa hóa tốc độ tải và giảm giật lag khi xem chuẩn 4K.</li>
          <li><strong>Bảo mật hệ thống:</strong> Phát hiện các hành vi gian lận, spam bình luận, tấn công brute-force hoặc khai thác lỗ hổng website.</li>
        </ul>
      </section>

      {/* Section 4 */}
      <section id="security-measures" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">4.</span> Biện pháp bảo vệ & Mã hóa
        </h2>
        <p className="text-neutral-300">
          Chúng tôi áp dụng các tiêu chuẩn bảo mật đa lớp nghiêm ngặt để ngăn chặn hành vi truy cập trái phép:
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-800 bg-[#161a26]">
            <Lock className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white text-sm">Mã hóa đường truyền SSL/TLS 1.3:</strong>
              <p className="text-xs text-neutral-400 mt-0.5">Toàn bộ dữ liệu trao đổi giữa trình duyệt của bạn và máy chủ NetPhim đều được mã hóa đạt chuẩn bảo mật quốc tế.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-800 bg-[#161a26]">
            <EyeOff className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white text-sm">Băm mật khẩu Salted Hashing:</strong>
              <p className="text-xs text-neutral-400 mt-0.5">Chúng tôi không lưu mật khẩu dạng thô. Ngay cả kỹ thuật viên của NetPhim cũng không thể nhìn thấy mật khẩu thực sự của bạn.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 */}
      <section id="cookies-tracking" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">5.</span> Cookie & Công nghệ lưu trữ
        </h2>
        <p className="text-neutral-300">
          NetPhim sử dụng Cookie và HTML5 LocalStorage cục bộ trên thiết bị của bạn nhằm:
        </p>
        <ul className="space-y-2 text-neutral-300 text-sm list-disc list-inside">
          <li>Lưu phiên đăng nhập an toàn (Session Token).</li>
          <li>Ghi nhớ âm lượng phát, chất lượng video mặc định và chế độ xem rạp (Theater mode).</li>
          <li>Lưu tạm tiến độ xem ngoại tuyến khi bạn mất kết nối mạng.</li>
        </ul>
        <p className="text-xs text-neutral-400 italic">
          * Bạn hoàn toàn có thể xóa Cookie hoặc tắt lưu trữ trong phần Cài đặt của trình duyệt bất cứ lúc nào.
        </p>
      </section>

      {/* Section 6 */}
      <section id="user-rights" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">6.</span> Quyền riêng tư của bạn
        </h2>
        <p className="text-neutral-300">
          Bạn giữ toàn quyền làm chủ với dữ liệu cá nhân của mình trên hệ thống NetPhim:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-4 rounded-xl border border-neutral-800 bg-[#161a26]">
            <span className="text-sm font-bold text-white block mb-1">Quyền Chỉnh Sửa</span>
            <span className="text-xs text-neutral-400">Thay đổi họ tên, username, mật khẩu trong trang Cài Đặt.</span>
          </div>
          <div className="p-4 rounded-xl border border-neutral-800 bg-[#161a26]">
            <span className="text-sm font-bold text-white block mb-1">Quyền Xuất Dữ Liệu</span>
            <span className="text-xs text-neutral-400">Yêu cầu trích xuất danh sách phim và lịch sử xem của tài khoản.</span>
          </div>
          <div className="p-4 rounded-xl border border-neutral-800 bg-[#161a26]">
            <span className="text-sm font-bold text-white block mb-1">Quyền Xóa Vĩnh Viễn</span>
            <span className="text-xs text-neutral-400">Yêu cầu xóa sạch mọi dữ liệu liên quan khỏi cơ sở dữ liệu.</span>
          </div>
        </div>
      </section>

      {/* Section 7 & 8 */}
      <section id="policy-updates" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">7.</span> Cập nhật chính sách & Liên hệ
        </h2>
        <p className="text-neutral-300">
          Chính sách bảo mật có thể được điều chỉnh định kỳ để phù hợp với sự phát triển của công nghệ và quy định pháp luật. Khi có thay đổi quan trọng, chúng tôi sẽ hiển thị thông báo rõ ràng trên website.
        </p>
        <p className="text-neutral-300">
          Mọi thắc mắc về quyền riêng tư, xin vui lòng gửi email tới bộ phận bảo mật dữ liệu:{" "}
          <a href="mailto:privacy@netphim.tv" className="text-violet-400 hover:text-violet-300 font-semibold underline">
            privacy@netphim.tv
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
}
