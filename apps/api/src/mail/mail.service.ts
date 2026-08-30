import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      // We will use standard SMTP config. Users can configure this in .env
      // Default to Ethereal Email for testing if no env vars are provided
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || "ethereal.user@ethereal.email",
        pass: process.env.SMTP_PASS || "etherealpass",
      },
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const url = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`;
    try {
      const info = await this.transporter.sendMail({
        from: `"NetPhim Auth" <${process.env.SMTP_FROM || "noreply@netphim.com"}>`,
        to,
        subject: "NetPhim - Xác thực địa chỉ email của bạn",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Chào mừng bạn đến với NetPhim!</h2>
            <p>Vui lòng click vào nút bên dưới để xác thực địa chỉ email của bạn. Đường link này sẽ hết hạn sau 24 giờ.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Xác Thực Email</a>
            </div>
            <p>Nếu bạn không tạo tài khoản, vui lòng bỏ qua email này.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Đội ngũ NetPhim</p>
          </div>
        `,
      });
      this.logger.log(`Verification email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
    }
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const url = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    try {
      const info = await this.transporter.sendMail({
        from: `"NetPhim Auth" <${process.env.SMTP_FROM || "noreply@netphim.com"}>`,
        to,
        subject: "NetPhim - Đặt lại mật khẩu",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Yêu Cầu Đặt Lại Mật Khẩu</h2>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản NetPhim của bạn. Vui lòng click vào nút bên dưới để tạo mật khẩu mới. Đường link này sẽ hết hạn sau 1 giờ.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Đặt Lại Mật Khẩu</a>
            </div>
            <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này hoặc liên hệ hỗ trợ nếu bạn nghi ngờ có sự cố.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Đội ngũ NetPhim</p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
    }
  }

  async sendNewDeviceAlertEmail(
    to: string,
    details: { browser: string; os: string; ipAddress: string; token: string },
  ) {
    // Lock link points directly to NestJS API lock-account endpoint
    const apiBase = process.env.API_URL || "http://localhost:3001/api/v1";
    const lockUrl = `${apiBase}/auth/lock-account?token=${details.token}`;

    try {
      const info = await this.transporter.sendMail({
        from: `"NetPhim Security" <${process.env.SMTP_FROM || "security@netphim.com"}>`,
        to,
        subject: "⚠️ Cảnh báo: Đăng nhập từ thiết bị lạ!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ffcc00; border-radius: 8px;">
            <h2 style="color: #d9534f; text-align: center;">Cảnh Báo Đăng Nhập Thiết Bị Mới</h2>
            <p>Chúng tôi phát hiện tài khoản của bạn vừa đăng nhập từ một thiết bị hoặc trình duyệt chưa từng sử dụng trước đây:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Hệ điều hành:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${details.os}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Trình duyệt:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${details.browser}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Địa chỉ IP:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${details.ipAddress}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Thời gian:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date().toLocaleString("vi-VN")}</td>
              </tr>
            </table>
            <p style="color: #555;">Nếu đây là hoạt động của bạn, bạn có thể bỏ qua email này.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${lockUrl}" style="background-color: #d9534f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Không phải tôi - KHÓA TÀI KHOẢN NGAY</a>
            </div>
            <p style="font-size: 12px; color: #888; text-align: center;">Nếu bạn khóa tài khoản, tất cả các thiết bị sẽ bị đăng xuất và bạn cần phải đặt lại mật khẩu để đăng nhập lại.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Đội ngũ bảo mật NetPhim</p>
          </div>
        `,
      });
      this.logger.log(
        `New device alert email sent to ${to}: ${info.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send new device alert email to ${to}`,
        error,
      );
    }
  }
}
