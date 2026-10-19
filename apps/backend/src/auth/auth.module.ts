import { Module, Global } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { PasswordResetToken } from '../common/entities/password-reset-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthResetController } from './auth.reset.controller';
import { AuthGuard } from './auth.guard';
import { OptionalAuthGuard } from './optional-auth.guard';
import { RolesGuard } from './roles.guard';
import { EmailService } from '../common/email/email.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, PasswordResetToken]),
    JwtModule.register({}),
  ],
  controllers: [AuthController, AuthResetController],
  providers: [
    AuthService,
    AuthGuard,
    OptionalAuthGuard,
    RolesGuard,
    EmailService,
    { provide: 'EmailService', useExisting: EmailService },
    { provide: 'DATA_SOURCE', useFactory: (ds: any) => ds, inject: [getDataSourceToken()] },
  ],
  exports: [AuthService, AuthGuard, OptionalAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
