import { UserRole } from '../common/entities/user.entity';

/**
 * Authenticated user attached to `request.user` by the AuthGuard after a
 * valid bearer token is verified. Downstream controllers should read the
 * CURRENT user's identity from here — never from a client-supplied id.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string | null;
  createdAt?: Date;
  /** Present for VENDOR role; scopes that vendor's data to their tenant. */
  vendorId: string | null;
}

/** Shape of the signed JWT access-token payload. */
export interface AuthJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  displayName?: string | null;
  createdAt?: Date;
  vendorId: string | null;
}