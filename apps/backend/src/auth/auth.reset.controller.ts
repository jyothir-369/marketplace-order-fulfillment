import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth/reset')
export class AuthResetController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('request')
  async requestReset(@Body() body: { email: string }) {
    await this.authService.requestReset(body.email);
    return { message: 'If an account exists, a reset link has been sent.' };
  }

  @Post('confirm')
  async confirmReset(@Body() body: { token: string; password: string }) {
    await this.authService.resetPassword(body.token, body.password);
    return { message: 'Password updated securely.' };
  }
}
