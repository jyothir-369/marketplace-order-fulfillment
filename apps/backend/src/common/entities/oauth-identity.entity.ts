import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('oauth_identities')
@Unique(['provider', 'providerSubject'])
export class OAuthIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50, name: 'provider' })
  provider: string; // 'google'

  @Index()
  @Column({ type: 'varchar', length: 255, name: 'provider_subject' })
  providerSubject: string; // Google 'sub'

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_email' })
  providerEmail: string | null;

  @Column({ type: 'boolean', default: false, name: 'email_verified' })
  emailVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
