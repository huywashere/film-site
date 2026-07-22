import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu token xác thực Firebase (Authorization: Bearer <token>)');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        request.user = {
          uid: payload.user_id || payload.sub || payload.uid,
          email: payload.email,
          name: payload.name || payload.email?.split('@')[0],
          picture: payload.picture,
          email_verified: payload.email_verified,
        };
      }
      return true;
    } catch (err) {
      throw new UnauthorizedException('Token Firebase không hợp lệ hoặc đã hết hạn.');
    }
  }
}
