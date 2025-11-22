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

export enum SensorEventType {
  ProcessingStarted = 'PROCESSING_STARTED',
  ProcessingCompleted = 'PROCESSING_COMPLETED',
  ProcessingFailed = 'PROCESSING_FAILED',
  SensorError = 'SENSOR_ERROR',
  TemperatureAlert = 'TEMPERATURE_ALERT',
  CleaningRequired = 'CLEANING_REQUIRED',
  FoodInputBefore = 'FOOD_INPUT_BEFORE',
  FoodInputAfter = 'FOOD_INPUT_AFTER',
  DoorOpened = 'DOOR_OPENED',
  DoorClosed = 'DOOR_CLOSED',
}

export class ProcessingSummaryDto {
  @ApiProperty({
    description: '처리 시작 시 무게 (g)',
    example: 1500,
    required: false,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  initialWeight?: number | null;

  @ApiProperty({
    description: '처리 완료 후 무게 (g)',
    example: 200,
    required: false,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  finalWeight?: number | null;

  @ApiProperty({
    description: '처리된 음식물 양 (g)',
    example: 1300,
    required: false,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  processedAmount?: number | null;

  @ApiProperty({
    description: '처리 소요 시간 (분)',
    example: 180,
    required: false,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  durationMinutes?: number | null;

  @ApiProperty({
    description: '소비 에너지 (Wh)',
    example: 450,
    required: false,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  energyConsumed?: number | null;
}

export class SensorEventDto {
  @ApiProperty({
    description: '디바이스 고유 ID',
    example: 'HANIBI-001',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: '이벤트 발생 시각 (ISO8601 형식, 선택사항 - 없으면 서버 수신 시간 사용)',
    example: '2025-11-11T10:00:00.000Z',
    required: false,
  })
  @IsISO8601()
  @IsOptional()
  timestamp?: string;

  @ApiProperty({
    description: '이벤트 타입',
    enum: SensorEventType,
    example: SensorEventType.ProcessingCompleted,
  })
  @IsEnum(SensorEventType)
  eventType: SensorEventType;

  @ApiProperty({
    description: '처리 세션 ID (선택, 일반적으로 불필요 - 백엔드가 자동 관리)',
    example: '123',
    required: false,
  })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiProperty({
    description: '이벤트 추가 데이터 (처리 완료 시 사용)',
    type: ProcessingSummaryDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => ProcessingSummaryDto)
  @IsOptional()
  eventData?: ProcessingSummaryDto;
}

