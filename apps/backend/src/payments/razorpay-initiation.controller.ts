import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RazorpayInitiationService } from './razorpay-initiation.service';

class RazorpayCheckoutItemDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

class RazorpayInitiateDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RazorpayCheckoutItemDto)
  items: RazorpayCheckoutItemDto[];

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  shippingAddress: string;
}

@Controller('payments/razorpay')
export class RazorpayInitiationController {
  constructor(private readonly initiationService: RazorpayInitiationService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard)
  async initiate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RazorpayInitiateDto,
    @Req() req: any,
  ) {
    return this.initiationService.initiate(
      body.items,
      body.shippingAddress,
      user.id,
      String(req.correlationId || ''),
    );
  }
}