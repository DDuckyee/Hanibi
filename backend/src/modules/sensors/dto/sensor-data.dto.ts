import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SensorValuesDto } from './sensor-values.dto';

export enum ProcessingStatus {
  Idle = 'IDLE',
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
  Error = 'ERROR',
}

export class SensorDataDto {
  @ApiProperty({
    description: '디바이스 고유 ID',
    example: 'HANIBI-001',
  })
  @IsString({ message: 'deviceId는 문자열이어야 합니다.' })
  deviceId: string;

  @ApiProperty({
    description: '센서 데이터 측정 시각 (ISO8601 형식, 선택사항 - 없으면 서버 수신 시간 사용)',
    required: false,
    nullable: true,
  })
  @IsISO8601({}, { message: 'timestamp는 ISO8601 형식이어야 합니다.' })
  @IsOptional()
  timestamp?: string;

  @ApiProperty({
    description: '센서 측정 값들',
    type: SensorValuesDto,
  })
  @ValidateNested()
  @Type(() => SensorValuesDto)
  sensorData: SensorValuesDto;

  @ApiProperty({
    description: '현재 처리 상태',
    enum: ProcessingStatus,
    example: ProcessingStatus.Processing,
  })
  @IsEnum(ProcessingStatus, { message: 'processingStatus 값이 올바르지 않습니다.' })
  processingStatus: ProcessingStatus;

  @ApiProperty({
    description: '처리 세션 ID (선택, 일반적으로 불필요 - 백엔드가 자동 관리)',
    required: false,
    nullable: true,
  })
  @IsString({ message: 'sessionId는 문자열이어야 합니다.' })
  @IsOptional()
  sessionId?: string;
}

