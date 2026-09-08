import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../common/entities/product.entity';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartStore } from './cart-store';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), InventoryModule],
  controllers: [CartController],
  providers: [CartService, CartStore],
  exports: [CartService],
})
export class CartModule {}
