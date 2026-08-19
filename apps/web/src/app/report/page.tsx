import { Metadata } from "next";
import { ReportClient } from "./ReportClient";

export const metadata: Metadata = {
  title: "Báo Cáo Sự Cố & Hướng Dẫn Khắc Phục Lỗi | NetPhim",
  description:
    "Gặp sự cố khi xem phim? Xem qua hướng dẫn khắc phục nhanh hoặc gửi biểu mẫu báo lỗi tới đội ngũ kỹ thuật NetPhim.",
};

export default function ReportPage() {
  return <ReportClient />;
}
