import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthJwtPayload, AuthenticatedUser } from './auth.types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Hand-rolled bearer-token guard (Phase 1 — auth + RBAC).
 *
 * Verifies `Authorization: Bearer <jwt>` against the configured secret and
 * attaches the verified identity to `request.user`. No per-controller wiring
 * beyond `@UseGuards(AuthGuard)`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Missing bearer token');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    let payload: AuthJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<AuthJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET') ?? 'dev-only-insecure-jwt-secret-change-me',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      vendorId: payload.vendorId ?? null,
    };

    return true;
  }
}