import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { Resend } from "resend";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

@Injectable()
export class MailService {
  private resend: Resend | null = null;
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.logger.log("MailService: Resend SDK initialized successfully");
    }

    // Initialize Nodemailer as transport fallback or standalone SMTP
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || (resendApiKey ? "smtp.resend.com" : "smtp.ethereal.email"),
        port: Number(process.env.SMTP_PORT) || (resendApiKey ? 465 : 587),
        secure: Number(process.env.SMTP_PORT) === 465 || Boolean(resendApiKey),
        auth: {
          user: process.env.SMTP_USER || (resendApiKey ? "resend" : "ethereal.user@ethereal.email"),
          pass: process.env.SMTP_PASS || (resendApiKey ? resendApiKey : "etherealpass"),
        },
      });
    } catch (err: any) {
      this.logger.warn(`MailService: SMTP transport setup note: ${err?.message || err}`);
    }
  }

  /**
   * Unified email dispatcher:
   * Prioritizes Resend HTTP API for high deliverability; seamlessly falls back to SMTP.
   */
  private async dispatchEmail(options: SendMailOptions): Promise<{ success: boolean; id?: string }> {
    const defaultFrom =
      process.env.RESEND_FROM ||
      process.env.SMTP_FROM ||
      "FlexPhim <onboarding@resend.dev>";
    const from = options.from || defaultFrom;

    // 1. Try Resend SDK
    if (this.resend) {
      try {
        const { data, error } = await this.resend.emails.send({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
        });

        if (error) {
          this.logger.warn(`Resend API returned error: ${error.message}. Falling back to SMTP...`);
        } else if (data?.id) {
          this.logger.log(`Email dispatched via Resend to ${options.to} [ID: ${data.id}]`);
          return { success: true, id: data.id };
        }
      } catch (err: any) {
        this.logger.warn(`Resend SDK dispatch exception: ${err?.message || err}. Falling back to SMTP...`);
      }
    }

    // 2. Fallback to Nodemailer SMTP
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
        this.logger.log(`Email dispatched via SMTP to ${options.to} [ID: ${info.messageId}]`);
        return { success: true, id: info.messageId };
      } catch (err: any) {
        this.logger.error(`Failed to send email to ${options.to} via SMTP: ${err?.message || err}`);
        throw err;
      }
    }

    throw new Error("No active email service provider configured (Resend/SMTP)");
  }

  async sendVerificationEmail(to: string, token: string) {
    const url = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`;
    const subject = "FlexPhim - Xác thực địa chỉ email của bạn";
    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0d11; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb;">
        <div style="max-width: 560px; margin: 30px auto; background-color: #12151b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          <div style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
              <span style="color: #6366f1;">Flex</span>Phim
            </h1>
            <p style="margin: 8px 0 0; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Xác Thực Tài Khoản</p>
          </div>
          <div style="padding: 32px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #ffffff;">Chào mừng bạn đến với FlexPhim!</h2>
            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #d1d5db;">
              Cảm ơn bạn đã đăng ký tài khoản. Vui lòng bấm vào nút bên dưới để hoàn tất xác thực địa chỉ email. Liên kết xác thực này sẽ hết hạn sau <strong>24 giờ</strong>.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${url}" style="display: inline-block; background-color: #6366f1; background-image: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35); text-align: center;">
                Xác Thực Email Ngay
              </a>
            </div>
            <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #9ca3af;">
              Nếu nút trên không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt:<br>
              <a href="${url}" style="color: #818cf8; word-break: break-all; font-size: 12px;">${url}</a>
            </p>
            <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">
              Nếu bạn không yêu cầu tạo tài khoản trên FlexPhim, vui lòng bỏ qua email này.
            </p>
          </div>
          <div style="padding: 20px 32px; background-color: #0d0f14; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 12px; color: #6b7280;">
            © ${new Date().getFullYear()} FlexPhim — Nền tảng xem phim trực tuyến đỉnh cao.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.dispatchEmail({ to, subject, html });
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
    }
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const url = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    const subject = "FlexPhim - Yêu cầu đặt lại mật khẩu";
    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0d11; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb;">
        <div style="max-width: 560px; margin: 30px auto; background-color: #12151b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          <div style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
              <span style="color: #ef4444;">Flex</span>Phim
            </h1>
            <p style="margin: 8px 0 0; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Bảo Mật Tài Khoản</p>
          </div>
          <div style="padding: 32px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #ffffff;">Yêu Cầu Đặt Lại Mật Khẩu</h2>
            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #d1d5db;">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản FlexPhim của bạn. Vui lòng bấm vào nút bên dưới để tạo mật khẩu mới. Liên kết này chỉ có hiệu lực trong vòng <strong>1 giờ</strong>.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${url}" style="display: inline-block; background-color: #ef4444; background-image: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.35); text-align: center;">
                Đặt Lại Mật Khẩu
              </a>
            </div>
            <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #9ca3af;">
              Nếu nút trên không hoạt động, bạn có thể sao chép liên kết:<br>
              <a href="${url}" style="color: #f87171; word-break: break-all; font-size: 12px;">${url}</a>
            </p>
            <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">
              Nếu bạn không thực hiện yêu cầu này, hãy đổi mật khẩu ngay hoặc bỏ qua email này.
            </p>
          </div>
          <div style="padding: 20px 32px; background-color: #0d0f14; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 12px; color: #6b7280;">
            © ${new Date().getFullYear()} FlexPhim — Trung tâm An toàn & Bảo mật.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.dispatchEmail({ to, subject, html });
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
    }
  }

  async sendNewDeviceAlertEmail(
    to: string,
    details: { browser: string; os: string; ipAddress: string; token: string },
  ) {
    const apiBase = process.env.API_URL || "http://localhost:3001/api/v1";
    const lockUrl = `${apiBase}/auth/lock-account?token=${details.token}`;
    const subject = "⚠️ Cảnh báo: Phát hiện đăng nhập từ thiết bị mới!";
    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0d11; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb;">
        <div style="max-width: 560px; margin: 30px auto; background-color: #12151b; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          <div style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #f59e0b;">
              ⚠️ Cảnh Báo Thiết Bị Lạ
            </h1>
            <p style="margin: 8px 0 0; font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Bảo Mật Tài Khoản FlexPhim</p>
          </div>
          <div style="padding: 32px;">
            <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #d1d5db;">
              Hệ thống phát hiện tài khoản của bạn vừa đăng nhập từ một thiết bị hoặc trình duyệt chưa từng sử dụng trước đây:
            </p>
            <div style="background-color: #181c24; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af; width: 40%;">Hệ điều hành:</td>
                  <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${details.os}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af;">Trình duyệt:</td>
                  <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${details.browser}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af;">Địa chỉ IP:</td>
                  <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${details.ipAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #9ca3af;">Thời gian:</td>
                  <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${new Date().toLocaleString("vi-VN")}</td>
                </tr>
              </table>
            </div>
            <p style="margin: 20px 0 0; font-size: 14px; color: #d1d5db;">
              Nếu đây chính là bạn, bạn có thể yên tâm bỏ qua email này.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${lockUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 13px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);">
                Không Phải Tôi — Khóa Tài Khoản Ngay
              </a>
            </div>
          </div>
          <div style="padding: 20px 32px; background-color: #0d0f14; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 12px; color: #6b7280;">
            © ${new Date().getFullYear()} FlexPhim — Đội ngũ an ninh hệ thống.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.dispatchEmail({ to, subject, html });
    } catch (error) {
      this.logger.error(`Failed to send new device alert email to ${to}`, error);
    }
  }
}

