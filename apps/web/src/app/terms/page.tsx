import { Metadata } from "next";
import { LegalPageLayout, TOCItem } from "@/components/legal/LegalPageLayout";
import {
  FileText,
  Scale,
  Copyright,
  AlertTriangle,
  Ban,
  HelpCircle,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng & Tuyên bố bản quyền DMCA | NetPhim",
  description:
    "Quy định sử dụng dịch vụ, chính sách bản quyền sở hữu trí tuệ DMCA và quy tắc ứng xử dành cho người dùng tại NetPhim.",
};

const TOC: TOCItem[] = [
  { id: "acceptance", title: "1. Chấp thuận điều khoản" },
  { id: "disclaimer", title: "2. Tuyên bố miễn trừ trách nhiệm nội dung" },
  { id: "dmca-copyright", title: "3. Chính sách bản quyền & DMCA Takedown" },
  { id: "user-conduct", title: "4. Quy tắc ứng xử của thành viên" },
  { id: "intellectual-property", title: "5. Bản quyền giao diện & Thương hiệu" },
  { id: "service-changes", title: "6. Thay đổi dịch vụ & Chấm dứt tài khoản" },
  { id: "limitation-liability", title: "7. Giới hạn trách nhiệm pháp lý" },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      badge="Điều Khoản Thỏa Thuận"
      badgeIcon={<Scale size={14} className="text-violet-400" />}
      title="Điều Khoản Sử Dụng Dịch Vụ"
      description="Vui lòng đọc kỹ các điều khoản dưới đây trước khi trải nghiệm dịch vụ trên NetPhim. Việc tiếp tục truy cập và xem phim đồng nghĩa với việc bạn hoàn toàn đồng ý tuân thủ thỏa thuận này."
      lastUpdated="19/08/2026"
      readTime="7 phút đọc"
      toc={TOC}
    >
      {/* Important Legal Notice Box */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-2">
          <AlertTriangle size={18} />
          <span>Lưu ý pháp lý quan trọng</span>
        </div>
        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
          NetPhim là nền tảng chỉ mục và phân phối siêu liên kết (media indexer/aggregator). Chúng tôi không trực tiếp lưu trữ, tải lên hay can thiệp vào máy chủ lưu trữ tệp video gốc của các bên cung cấp nội dung thứ ba. Chúng tôi luôn tuân thủ đạo luật bản quyền kỹ thuật số thiên niên kỷ (DMCA).
        </p>
      </div>

      {/* Section 1 */}
      <section id="acceptance" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">1.</span> Chấp thuận điều khoản
        </h2>
        <p className="text-neutral-300">
          Bằng việc truy cập, tạo tài khoản hoặc xem bất kỳ tập phim nào trên <strong>NetPhim</strong>, bạn xác nhận rằng bạn đủ tuổi chịu trách nhiệm dân sự theo luật định của quốc gia sở tại và đồng ý vô điều kiện với tất cả các điều khoản, chính sách được nêu tại văn bản này.
        </p>
        <p className="text-neutral-300">
          Nếu bạn không đồng ý với bất kỳ phần nào trong điều khoản này, vui lòng ngừng sử dụng dịch vụ của NetPhim ngay lập tức.
        </p>
      </section>

      {/* Section 2 */}
      <section id="disclaimer" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">2.</span> Tuyên bố miễn trừ trách nhiệm nội dung
        </h2>
        <p className="text-neutral-300">
          Các nội dung truyền thông đa phương tiện hiển thị trên NetPhim (bao gồm video, poster, trailer, phụ đề) được tự động lập chỉ mục và liên kết từ các dịch vụ lưu trữ phân tán công khai trên mạng Internet.
        </p>
        <ul className="space-y-2 text-neutral-300 text-sm list-disc list-inside">
          <li>NetPhim không chịu trách nhiệm về tính chính xác, bản quyền, hoặc tính hợp pháp của các tệp đa phương tiện trên máy chủ của bên thứ ba.</li>
          <li>Tất cả hình ảnh, tên phim, nhãn hiệu thương mại và bản quyền âm thanh thuộc về các nhà sản xuất, hãng phim và chủ sở hữu hợp pháp tương ứng.</li>
        </ul>
      </section>

      {/* Section 3 */}
      <section id="dmca-copyright" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">3.</span> Chính sách bản quyền & Quy trình DMCA Takedown
        </h2>
        <p className="text-neutral-300">
          NetPhim tôn trọng quyền sở hữu trí tuệ của các nghệ sĩ, nhà sản xuất và sẵn sàng hợp tác gỡ bỏ bất kỳ đường dẫn nào vi phạm quyền tác giả theo quy chuẩn DMCA.
        </p>

        <div className="rounded-xl border border-neutral-800 bg-[#161a26] p-5 space-y-3">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <Copyright className="w-4 h-4 text-violet-400" />
            Quy trình gửi thông báo vi phạm bản quyền:
          </h4>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Nếu bạn là chủ sở hữu bản quyền hợp pháp hoặc đại diện được ủy quyền, vui lòng gửi email yêu cầu gỡ bỏ bao gồm:
          </p>
          <ol className="text-xs sm:text-sm text-neutral-400 space-y-1.5 list-decimal list-inside pl-1">
            <li>Bằng chứng xác nhận bạn là chủ sở hữu hoặc người đại diện hợp pháp của tác phẩm.</li>
            <li>Đường dẫn URL cụ thể trên NetPhim có chứa liên kết nội dung bị khiếu nại.</li>
            <li>Thông tin liên hệ chính thức của bạn (Họ tên, Đơn vị, Email, Số điện thoại).</li>
            <li>Tuyên bố cam kết thông tin khiếu nại là trung thực dưới hình phạt khai man.</li>
          </ol>
          <div className="pt-2">
            <span className="text-xs text-neutral-300">
              Gửi trực tiếp đến hòm thư bản quyền:{" "}
              <a href="mailto:dmca@netphim.tv" className="text-violet-400 font-bold hover:underline">
                dmca@netphim.tv
              </a>{" "}
              (Thời gian xử lý & gỡ bỏ trong vòng 24 đến 48 giờ làm việc).
            </span>
          </div>
        </div>
      </section>

      {/* Section 4 */}
      <section id="user-conduct" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">4.</span> Quy tắc ứng xử của thành viên
        </h2>
        <p className="text-neutral-300">
          Để xây dựng một cộng đồng người yêu điện ảnh văn minh, khi bình luận, đánh giá hoặc sử dụng phòng xem chung (Watch Party), bạn cam kết <strong>KHÔNG</strong> thực hiện các hành vi sau:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
            <Ban size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-neutral-300">Không spam link quảng cáo, cờ bạc, nội dung độc hại hoặc lừa đảo.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
            <Ban size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-neutral-300">Không xúc phạm danh dự, phân biệt vùng miền, tôn giáo hay quấy rối thành viên khác.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
            <Ban size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-neutral-300">Không tiết lộ trước nội dung cốt truyện (spoiler) mà không gắn nhãn cảnh báo.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
            <Ban size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-neutral-300">Không sử dụng bot, crawler tự động gây quá tải hoặc làm gián đoạn hạ tầng máy chủ.</span>
          </div>
        </div>
      </section>

      {/* Section 5, 6, 7 */}
      <section id="intellectual-property" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">5.</span> Bản quyền giao diện & Thương hiệu
        </h2>
        <p className="text-neutral-300">
          Giao diện người dùng, mã nguồn hệ thống, logo biểu tượng <strong>NetPhim</strong>, phong cách thiết kế và các thuật toán gợi ý đều thuộc quyền sở hữu trí tuệ của đội ngũ phát triển NetPhim. Mọi hành vi sao chép nguyên trạng vì mục đích thương mại mà không có sự chấp thuận bằng văn bản đều bị nghiêm cấm.
        </p>
      </section>

      <section id="service-changes" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">6.</span> Thay đổi dịch vụ & Chấm dứt tài khoản
        </h2>
        <p className="text-neutral-300">
          NetPhim có quyền đình chỉ, giới hạn tính năng hoặc xóa vĩnh viễn tài khoản người dùng vi phạm các quy tắc cộng đồng mà không cần báo trước. Chúng tôi cũng có quyền nâng cấp, bảo trì hoặc điều chỉnh danh mục phim nhằm tối ưu trải nghiệm chung.
        </p>
      </section>

      <section id="limitation-liability" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5 pb-2 border-b border-neutral-800">
          <span className="text-violet-400">7.</span> Giới hạn trách nhiệm pháp lý
        </h2>
        <p className="text-neutral-300">
          Dịch vụ được cung cấp trên nguyên tắc &quot;nguyên trạng&quot; (as is). NetPhim không đảm bảo dịch vụ sẽ hoàn toàn không có lỗi gián đoạn do sự cố đường truyền mạng quốc tế hoặc bảo trì cụm máy chủ upstream. Trong mọi trường hợp, NetPhim không chịu trách nhiệm cho các thiệt hại gián tiếp phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ.
        </p>
      </section>
    </LegalPageLayout>
  );
}
