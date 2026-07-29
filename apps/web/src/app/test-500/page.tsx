"use client";

export default function Test500Page() {
  // Thử nghiệm cố tình phát sinh lỗi hệ thống để kiểm thử trang error.tsx chuẩn Stake.com
  throw new Error("Đây là thử nghiệm kích hoạt trang lỗi 500 Stake.com!");
}
