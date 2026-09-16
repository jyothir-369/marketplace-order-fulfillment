import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

/**
 * Thin wrapper around AuthGuard that silently sets `request.user = undefined`
 * when no valid bearer token is present — instead of rejecting the request.
 *
 * Use on routes that support both guest and authenticated access (e.g. checkout).
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authGuard: AuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    try {
      await this.authGuard.canActivate(context);
    } catch {
      request.user = undefined;
    }
    return true;
  }
}
