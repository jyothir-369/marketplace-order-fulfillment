import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

/**
 * Thin wrapper around AuthGuard that permits anonymous access when NO bearer
 * token is present, but propagates errors when an invalid/expired token is
 * presented — preventing invalid tokens from being silently downgraded to
 * guest requests.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authGuard: AuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    // No authorization header at all = legitimate anonymous / guest request.
    if (!authHeader || typeof authHeader !== 'string') {
      request.user = undefined;
      return true;
    }

    const [scheme, token] = authHeader.split(' ');

    // Header present but not a valid Bearer format = invalid, propagate error.
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    // A Bearer token is present — require it to be valid.
    await this.authGuard.canActivate(context);
    return true;
  }
}
