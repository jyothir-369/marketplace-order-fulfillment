
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    type: 'uuid',
    name: 'user_id',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'Home',
    name: 'label',
  })
  label: string;

  @Column({
    type: 'varchar',
    length: 500,
    name: 'street',
  })
  street: string;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'city',
  })
  city: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'state',
  })
  state: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'zip',
  })
  zip: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'India',
    nullable: true,
    name: 'country',
  })
  country: string | null;

  @Column({
    type: 'boolean',
    name: 'is_default',
    default: false,
    nullable: true,
  })
  isDefault: boolean | null;

  @Column({
    type: 'timestamp',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  createdAt: Date | null;

  @Column({
    type: 'timestamp',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  updatedAt: Date | null;
}
