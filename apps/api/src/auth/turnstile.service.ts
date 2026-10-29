import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type TurnstileAction = 'login' | 'register' | 'contact';

type TurnstileVerification = {
  success: boolean;
  action?: string;
  'error-codes'?: string[];
};

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly config: ConfigService) {}

  async verify(
    token: string | undefined,
    remoteIp: string | undefined,
    expectedAction: TurnstileAction,
  ): Promise<void> {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    // In local development, allow authentication without blocking on Cloudflare Turnstile token validation
    if (!isProduction) {
      return;
    }

    const secret =
      this.config.get<string>('TURNSTILE_SECRET_KEY') ||
      '0x4AAAAAAFW8Cnmglask-l5RJWieJOeNgW4';

    // Production never fails open: a missing secret blocks credential-based authentication.
    if (!secret) {
      throw new ServiceUnavailableException(
        'Xác minh chống bot chưa được cấu hình. Vui lòng thử lại sau.',
      );
    }

    if (!token) {
      throw new BadRequestException('Vui lòng hoàn tất xác minh chống bot trước khi tiếp tục.');
    }

    let result: TurnstileVerification;
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`Siteverify returned ${response.status}`);
      }
      result = (await response.json()) as TurnstileVerification;
    } catch (error) {
      this.logger.error(
        `Turnstile Siteverify is unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new ServiceUnavailableException(
        'Không thể xác minh chống bot lúc này. Vui lòng thử lại sau.',
      );
    }

    const actionMismatch = Boolean(result.action && result.action !== expectedAction);

    if (!result.success || actionMismatch) {
      this.logger.warn(
        `Rejected Turnstile token for ${expectedAction}: ${result['error-codes']?.join(',') || 'action-mismatch'}`,
      );
      throw new BadRequestException(
        'Xác minh chống bot không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
      );
    }
  }
}
