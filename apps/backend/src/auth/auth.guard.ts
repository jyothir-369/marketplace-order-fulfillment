import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
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

  /** Muted when a prod deploy ships without JWT_SECRET — never fall back to a dev token silently. */
  private readonly logger = new Logger(AuthGuard.name);

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
    const secret = this.configService.get('JWT_SECRET');
    if (!secret) {
      if (this.configService.get('NODE_ENV') === 'production') {
        throw new InternalServerErrorException('JWT_SECRET is not configured');
      }
      this.logger.warn('JWT_SECRET missing — using insecure dev fallback. Do not use in production.');
    }
    try {
      payload = await this.jwtService.verifyAsync<AuthJwtPayload>(token, {
        secret: secret ?? 'dev-only-insecure-jwt-secret-change-me',
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