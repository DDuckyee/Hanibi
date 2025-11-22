import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

const normalizeSensorValue = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && value === -999) {
    return null;
  }

  return value;
};

export class SensorValuesDto {
  @ApiProperty({
    description: '온도 (°C, -40~125 범위, 센서 오류시 -999)',
    example: 25.5,
    minimum: -40,
    maximum: 125,
    required: false,
    nullable: true,
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'temperature는 숫자여야 합니다.' },
  )
  @Min(-40, { message: 'temperature는 -40 이상이어야 합니다.' })
  @Max(125, { message: 'temperature는 125 이하이어야 합니다.' })
  @IsOptional()
  @Transform(({ value }) => normalizeSensorValue(value))
  temperature: number | null;

  @ApiProperty({
    description: '습도 (%, 0~100 범위, 센서 오류시 -999)',
    example: 65,
    minimum: 0,
    maximum: 100,
    required: false,
    nullable: true,
  })
  @IsNumber({}, { message: 'humidity는 정수여야 합니다.' })
  @Min(0, { message: 'humidity는 0 이상이어야 합니다.' })
  @Max(100, { message: 'humidity는 100 이하이어야 합니다.' })
  @IsOptional()
  @Transform(({ value }) => {
    const normalized = normalizeSensorValue(value);
    return normalized === null ? null : Math.round(normalized);
  })
  humidity: number | null;

  @ApiProperty({
    description: '무게 (g, 센서 오류시 -999)',
    example: 1250.5,
    minimum: 0,
    required: false,
    nullable: true,
  })
  @IsNumber({}, { message: 'weight는 숫자여야 합니다.' })
  @Min(0, { message: 'weight는 0 이상이어야 합니다.' })
  @IsOptional()
  @Transform(({ value }) => normalizeSensorValue(value))
  weight?: number | null;

  @ApiProperty({
    description: '가스 센서 값 (0~1000 범위, 센서 오류시 -999)',
    example: 320,
    minimum: 0,
    maximum: 1000,
    required: false,
    nullable: true,
  })
  @IsNumber({}, { message: 'gas는 숫자여야 합니다.' })
  @Min(0, { message: 'gas는 0 이상이어야 합니다.' })
  @Max(1000, { message: 'gas는 1000 이하이어야 합니다.' })
  @IsOptional()
  @Transform(({ value }) => normalizeSensorValue(value))
  gas?: number | null;
}

