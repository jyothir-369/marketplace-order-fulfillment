import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ForbiddenException, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { CustomerAddressService } from './customer-address.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Controller('customer/addresses')
export class CustomerAddressController {
  constructor(private readonly service: CustomerAddressService) {}

  @Get()
  @UseGuards(AuthGuard)
  async list(@CurrentUser() u: AuthenticatedUser) {
    const addresses = await this.service.list(u.id);
    return { userId: u.id, addresses };
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() body: CreateAddressDto, @CurrentUser() u: AuthenticatedUser) {
    const address = await this.service.create(u.id, body);
    return { userId: u.id, created: true, address };
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateAddressDto, @CurrentUser() u: AuthenticatedUser) {
    const address = await this.service.update(u.id, id, body);
    return { userId: u.id, updated: true, address };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    await this.service.delete(u.id, id);
    return { userId: u.id, deleted: true, id };
  }
}
