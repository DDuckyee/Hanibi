import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class RegisterCameraDto {
  @ApiProperty({
    example: 'ETCOM-001',
    description: '디바이스 고유 ID',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    example: 'rtsp://admin3:12345678@221.159.164.177:8891/stream1',
    description: 'RTSP 스트림 URL (rtsp:// 또는 rtsps://로 시작)',
  })
  @IsString()
  @Matches(/^rtsp(s)?:\/\//, {
    message: 'rtspUrl은 rtsp:// 또는 rtsps:// 로 시작해야 합니다.',
  })
  rtspUrl: string;

  @ApiPropertyOptional({
    example: 'IP Camera Model XYZ',
    description: '카메라 모델명 (선택사항)',
  })
  @IsString()
  @IsOptional()
  cameraModel?: string;

  @ApiPropertyOptional({
    example: 'admin',
    description: '카메라 인증 사용자명 (선택사항)',
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    example: 'password123',
    description: '카메라 인증 비밀번호 (선택사항)',
  })
  @IsString()
  @IsOptional()
  password?: string;
}

