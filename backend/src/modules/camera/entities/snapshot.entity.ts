import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';

export enum CaptureTriggerType {
  FoodInputBefore = 'FOOD_INPUT_BEFORE',
  FoodInputAfter = 'FOOD_INPUT_AFTER',
}

@Entity('snapshots')
export class Snapshot extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  snapshotId: string;

  @ManyToOne(() => Device, { nullable: false })
  @JoinColumn({ name: 'device_id' })
  device: Device;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sessionId?: string;

  @Column({ type: 'varchar', length: 50 })
  snapshotType: CaptureTriggerType;

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

  @Column()
  capturedAt: Date;

  @Column({ type: 'int', nullable: true })
  latencyMs?: number;
}

