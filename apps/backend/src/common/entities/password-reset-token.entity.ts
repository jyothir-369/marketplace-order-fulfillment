import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';
/** Secure, single-use, expiring reset token (hashed storage). Never expose raw token. */
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Index({ unique: true }) @Column({ type: 'varchar', length: 64, name: 'token_hash' }) tokenHash: string;
  @Index() @Column({ type: 'timestamp', name: 'expires_at' }) expiresAt: Date;
  @Column({ type: 'timestamp', nullable: true, name: 'used_at' }) usedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
