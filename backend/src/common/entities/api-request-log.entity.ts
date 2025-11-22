import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum RequestStatus {
  Success = 'SUCCESS',
  ClientError = 'CLIENT_ERROR', // 4xx
  ServerError = 'SERVER_ERROR', // 5xx
  ValidationError = 'VALIDATION_ERROR',
}

@Entity('api_request_logs')
@Index(['createdAt'])
@Index(['statusCode'])
@Index(['path'])
export class ApiRequestLog extends BaseEntity {
  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 500 })
  path: string;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'varchar', length: 50, default: RequestStatus.Success })
  status: RequestStatus;

  @Column({ type: 'text', nullable: true })
  requestBody?: string;

  @Column({ type: 'text', nullable: true })
  requestQuery?: string;

  @Column({ type: 'text', nullable: true })
  requestHeaders?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({ type: 'int' })
  responseTimeMs: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceId?: string;
}

