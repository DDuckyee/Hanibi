import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { CameraService } from './camera.service';
import { CaptureTriggerDto } from './dto/capture-trigger.dto';
import { RegisterCameraDto } from './dto/register-camera.dto';
import { SnapshotQueryDto } from './dto/snapshot-query.dto';

// Swagger에서 multipart/form-data 파일 업로드를 표시하기 위한 클래스
class CaptureSnapshotDto extends CaptureTriggerDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '이미지 파일 (JPG 형식 권장) - 필수!',
  })
  image: any;
}

@ApiTags('Camera')
@Controller({
  path: 'cameras',
  version: '1',
})
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  @Post()
  @ApiOperation({
    summary: '카메라 등록',
    description:
      '기기에 연결된 IP 카메라 정보를 등록합니다. 최초 1회만 호출하면 됩니다.',
  })
  @ApiBody({
    type: RegisterCameraDto,
    description: '카메라 등록 정보',
    examples: {
      basic: {
        summary: '기본 예시 (필수 필드만)',
        description: 'deviceId와 rtspUrl만 필수입니다',
        value: {
          deviceId: 'ETCOM-001',
          rtspUrl: 'rtsp://admin3:12345678@221.159.164.177:8891/stream1',
        },
      },
      full: {
        summary: '전체 필드 예시',
        description: '모든 필드를 포함한 예시',
        value: {
          deviceId: 'ETCOM-001',
          rtspUrl: 'rtsp://admin3:12345678@221.159.164.177:8891/stream1',
          cameraModel: 'IP Camera Model XYZ',
          username: 'admin',
          password: 'password123',
        },
      },
    },
  })
  async register(@Body() payload: RegisterCameraDto) {
    const data = await this.cameraService.registerCamera(payload);
    return {
      success: true,
      data,
    };
  }

  @Get(':deviceId')
  @ApiOperation({
    summary: '카메라 조회',
  })
  async get(@Param('deviceId') deviceId: string) {
    const data = await this.cameraService.getCamera(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Delete(':deviceId')
  @ApiOperation({
    summary: '카메라 해제',
  })
  async remove(@Param('deviceId') deviceId: string) {
    await this.cameraService.removeCamera(deviceId);
    return {
      success: true,
    };
  }

  @Post(':deviceId/stream')
  @ApiOperation({
    summary: 'RTSP 스트림 URL 조회',
    description: '디바이스의 RTSP 스트림 URL을 조회합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceId: {
          type: 'string',
          example: 'ETCOM-001',
          description: '디바이스 고유 ID (URL 파라미터와 동일)',
        },
      },
    },
    description: '디바이스 ID',
    examples: {
      basic: {
        summary: '기본 예시',
        value: {
          deviceId: 'ETCOM-001',
        },
      },
    },
  })
  async stream(
    @Param('deviceId') deviceId: string,
    @Body() body: { deviceId?: string },
  ) {
    // body의 deviceId는 무시하고 URL 파라미터 사용
    const data = await this.cameraService.getStreamUrl(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Post(':deviceId/capture')
  @UseInterceptors(FileInterceptor('image'))
  @UsePipes() // 전역 ValidationPipe 비활성화 (multipart/form-data는 수동 검증)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '스냅샷 캡처 및 전송',
    description:
      '하드웨어에서 캡처한 이미지를 받아서 저장합니다. ⚠️ 반드시 multipart/form-data 형식으로 요청하며, "image" 필드에 이미지 파일을 첨부해야 합니다.',
  })
  @ApiParam({
    name: 'deviceId',
    example: 'ETCOM-001',
    description: '디바이스 고유 ID',
  })
    @ApiBody({
      type: CaptureSnapshotDto,
      description: '스냅샷 캡처 정보 및 이미지 파일',
      examples: {
        foodInputBefore: {
          summary: '음식 투입 전 캡처 예시',
          description: 'FOOD_INPUT_BEFORE: 음식 투입 전 자동 캡처 (서버에서 자동으로 시간 측정)',
          value: {
            triggerType: 'FOOD_INPUT_BEFORE',
            image: '<binary file>',
          },
        },
        foodInputAfter: {
          summary: '음식 투입 후 캡처 예시',
          description: 'FOOD_INPUT_AFTER: 음식 투입 후 자동 캡처 (서버에서 자동으로 시간 측정)',
          value: {
            triggerType: 'FOOD_INPUT_AFTER',
            image: '<binary file>',
          },
        },
      },
    })
  async capture(
    @Param('deviceId') deviceId: string,
    @Req() request: any,
    @UploadedFile() image?: { buffer: Buffer; size: number; originalname: string },
  ) {
    // multipart/form-data에서 받은 body를 수동으로 파싱
    // FileInterceptor가 body를 파싱하므로 request.body에서 직접 접근 가능
    const body = request.body as any;
    
    // 필수 필드 검증
    if (!body || !body.triggerType) {
      throw new BadRequestException('triggerType은 필수입니다.');
    }

    // enum 검증
    const validTriggerTypes = ['FOOD_INPUT_BEFORE', 'FOOD_INPUT_AFTER'];
    if (!validTriggerTypes.includes(body.triggerType)) {
      throw new BadRequestException(`triggerType은 ${validTriggerTypes.join(', ')} 중 하나여야 합니다.`);
    }

    // 이미지 파일 필수 검증
    if (!image || !image.buffer || image.buffer.length === 0) {
      throw new BadRequestException('이미지 파일은 필수입니다.');
    }

    const payload: CaptureTriggerDto = {
      deviceId,
      triggerType: body.triggerType as CaptureTriggerDto['triggerType'],
    };

    const data = await this.cameraService.captureSnapshot({
      ...payload,
      imageFile: image,
    });
    return {
      success: true,
      data,
    };
  }

  // 더 구체적인 라우트를 먼저 배치 (라우팅 순서 중요!)
  @Get(':deviceId/snapshots/:snapshotId/image')
  @ApiOperation({
    summary: '스냅샷 이미지 조회',
    description:
      '저장된 스냅샷 이미지 파일을 반환합니다. 브라우저에서 직접 열어볼 수 있습니다.',
  })
  @ApiParam({
    name: 'deviceId',
    example: 'ETCOM-001',
    description: '디바이스 고유 ID',
  })
  @ApiParam({
    name: 'snapshotId',
    example: 'snapshot-1763817821554',
    description: '스냅샷 ID',
  })
  @Header('Content-Type', 'image/jpeg')
  @Header('Cache-Control', 'public, max-age=3600')
  async getSnapshotImage(
    @Param('deviceId') deviceId: string,
    @Param('snapshotId') snapshotId: string,
    @Res() res: Response,
  ) {
    const snapshot = await this.cameraService.getSnapshot(snapshotId);
    
    if (snapshot.deviceId !== deviceId) {
      throw new NotFoundException('스냅샷을 찾을 수 없습니다.');
    }

    const imagePath = await this.cameraService.getSnapshotImagePath(snapshotId);
    
    if (!fs.existsSync(imagePath)) {
      throw new NotFoundException('이미지 파일을 찾을 수 없습니다.');
    }

    // CORS 헤더 명시적 설정 (프론트엔드 접근을 위해)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.sendFile(path.resolve(imagePath));
  }

  @Get(':deviceId/snapshots')
  @ApiOperation({
    summary: '스냅샷 목록 조회',
    description: '디바이스의 스냅샷 목록을 조회합니다. limit, from, to 파라미터로 필터링 가능합니다.',
  })
  @ApiQuery({ name: 'limit', required: false, description: '조회할 개수 (기본: 20, 최대: 100)', type: Number })
  @ApiQuery({ name: 'from', required: false, description: '시작 날짜 (ISO 8601 형식, 예: 2025-11-22T00:00:00.000Z)', type: String })
  @ApiQuery({ name: 'to', required: false, description: '종료 날짜 (ISO 8601 형식, 예: 2025-11-22T23:59:59.999Z)', type: String })
  async snapshots(
    @Param('deviceId') deviceId: string,
    @Query() query: SnapshotQueryDto,
  ) {
    const data = await this.cameraService.listSnapshots(deviceId, query);
    return {
      success: true,
      data,
    };
  }

}

