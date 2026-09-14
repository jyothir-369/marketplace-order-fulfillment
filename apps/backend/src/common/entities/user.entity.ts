import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** Marketplace roles (Phase 1 — auth + RBAC). */
export enum UserRole {
  BUYER = 'buyer',
  VENDOR = 'vendor',
  ADMIN = 'admin',
  OPERATIONS = 'operations',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, name: 'email' })
  email: string;

  /** Bcrypt hash — never expose the raw value over the API. */
  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.BUYER })
  role: UserRole;

  /**
   * Vendor id — populated for VENDOR role so a vendor's operations can be
   * scoped to their own tenant server-side (no client-supplied ids).
   */
  @Column({ type: 'uuid', nullable: true, name: 'vendor_id' })
  vendorId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'display_name' })
  displayName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}