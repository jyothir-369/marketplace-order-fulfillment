import { Entity, PrimaryGeneratedColumn, Column, Index, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from './product.entity';

/**
 * Product categories (Phase 2 — categories + catalog contract).
 *
 * Products reference categories by name (`products.category` varchar) so the
 * storefront's existing `ProductDto.category` contract stays free of joins for
 * the light cases; this table is the canonical registry that powers the
 * category tabs / facets with live product counts.
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 160 })
  slug: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @OneToMany(() => Product, (product) => product.categoryRelation)
  products: Product[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}