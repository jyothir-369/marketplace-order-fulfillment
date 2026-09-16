import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { OptionalAuthGuard } from './optional-auth.guard';
import { RolesGuard } from './roles.guard';

/**
 * Global auth module (Phase 1 — auth + RBAC).
 *
 * `@Global()` makes the guards + decorators usable from any controller
 * (`@UseGuards(AuthGuard, RolesGuard)`) without re-importing the module. The
 * JwtModule is exported so the guards can inject JwtService anywhere.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OptionalAuthGuard, RolesGuard],
  exports: [AuthService, AuthGuard, OptionalAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}