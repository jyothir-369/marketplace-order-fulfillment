import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../common/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Role requirement for a route or controller, e.g. `@Roles(UserRole.ADMIN)`.
 * Combine with `@UseGuards(AuthGuard, RolesGuard)`.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);