import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('webhook_events')
@Index(['eventId'], { unique: true })
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 255, unique: true }) eventId: string;
  @Column({ type: 'varchar', length: 32 }) eventType: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) payloadId: string | null;
  @CreateDateColumn({ name: 'processed_at' }) processedAt: Date;
  @Column({ type: 'varchar', length: 20, default: 'pending' }) status: string;
}
