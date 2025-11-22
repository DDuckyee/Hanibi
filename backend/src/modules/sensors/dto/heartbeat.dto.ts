import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

export class HeartbeatDto {
  @ApiProperty({
    description: '디바이스 고유 ID',
    example: 'HANIBI-001',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: '하트비트 전송 시각 (ISO8601 형식, 선택사항 - 없으면 서버 수신 시간 사용)',
    example: '2025-11-11T10:00:00.000Z',
    required: false,
  })
  @IsISO8601()
  @IsOptional()
  timestamp?: string;

  @ApiProperty({
    description: 'WiFi 신호 강도 (dBm)',
    example: -45,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  wifiSignal?: number;

  @ApiProperty({
    description: '펌웨어 버전',
    example: '1.0.3',
    required: false,
  })
  @IsString()
  @IsOptional()
  firmwareVersion?: string;
}

