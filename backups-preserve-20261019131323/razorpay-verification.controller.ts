import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RazorpayVerificationService } from './razorpay-verification.service';

class RazorpayVerifyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  razorpay_order_id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  razorpay_payment_id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  razorpay_signature: string;
}

@Controller('payments/razorpay/verify')
export class RazorpayVerificationController {
  constructor(
    private readonly verificationService: RazorpayVerificationService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RazorpayVerifyDto,
    @Req() req: any,
  ) {
    if (!user?.id) {
      throw new BadRequestException('Authenticated buyer is required.');
    }

    return this.verificationService.verify(
      user.id,
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature,
      String(req.correlationId || ''),
    );
  }
}