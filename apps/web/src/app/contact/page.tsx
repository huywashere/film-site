import { Metadata } from "next";
import { ContactClient } from "./ContactClient";

export const metadata: Metadata = {
  title: "Liên Hệ Ban Quản Trị & Hỗ Trợ Khách Hàng | NetPhim",
  description:
    "Kết nối với ban quản trị NetPhim qua email, Telegram hoặc biểu mẫu trực tuyến để nhận hỗ trợ kỹ thuật, hợp tác và giải đáp thắc mắc.",
};

export default function ContactPage() {
  return <ContactClient />;
}
