import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export enum CaptureTriggerType {
  FoodInputBefore = 'FOOD_INPUT_BEFORE',
  FoodInputAfter = 'FOOD_INPUT_AFTER',
}

export class CaptureTriggerDto {
  @ApiPropertyOptional({
    example: 'ETCOM-001',
    description: '디바이스 고유 ID (URL 파라미터로도 받을 수 있으므로 선택사항)',
  })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({
    enum: CaptureTriggerType,
    example: CaptureTriggerType.FoodInputBefore,
    description: '캡처 트리거 타입 (FOOD_INPUT_BEFORE: 음식 투입 전, FOOD_INPUT_AFTER: 음식 투입 후)',
    enumName: 'CaptureTriggerType',
  })
  @IsEnum(CaptureTriggerType)
  triggerType: CaptureTriggerType;
}

