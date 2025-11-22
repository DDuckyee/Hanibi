import { Body, Controller, Get, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequestLoggingInterceptor } from '../../common/interceptors/request-logging.interceptor';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { SensorDataDto } from './dto/sensor-data.dto';
import { SensorEventDto, SensorEventType } from './dto/sensor-event.dto';
import { SensorsService } from './sensors.service';

@ApiTags('Sensors')
@Controller({
  path: 'sensors',
  version: '1',
})
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post('data')
  @UseInterceptors(RequestLoggingInterceptor)
  @ApiOperation({
    summary: '센서 데이터 수신',
    description: '하드웨어가 주기적으로 센서 데이터를 전송할 때 호출합니다. timestamp와 sessionId는 선택사항입니다.',
  })
  @ApiBody({
    type: SensorDataDto,
    description: '센서 데이터 (최소 필수 필드만 포함한 예시)',
    examples: {
      minimal: {
        summary: '최소 필수 필드 (권장)',
        description: 'timestamp와 sessionId 없이도 동작합니다',
        value: {
          deviceId: 'HANIBI-001',
          sensorData: {
            temperature: 25.5,
            humidity: 65,
            weight: 1250.5,
            gas: 320,
          },
          processingStatus: 'PROCESSING',
        },
      },
      withTimestamp: {
        summary: 'timestamp 포함 (선택)',
        description: '오프라인 모드나 배치 전송 시 사용',
        value: {
          deviceId: 'HANIBI-001',
          timestamp: '2025-11-11T10:00:00.000Z',
          sensorData: {
            temperature: 25.5,
            humidity: 65,
            weight: 1250.5,
            gas: 320,
          },
          processingStatus: 'PROCESSING',
        },
      },
      withSensorError: {
        summary: '센서 오류 (-999)',
        description: '센서 오류 시 -999로 전송',
        value: {
          deviceId: 'HANIBI-001',
          sensorData: {
            temperature: 25.5,
            humidity: -999,
            weight: 1250.5,
            gas: 320,
          },
          processingStatus: 'PROCESSING',
        },
      },
    },
  })
  async ingestSensorData(@Body() payload: SensorDataDto) {
    const result = await this.sensorsService.processSensorData(payload);
    return {
      success: true,
      ...result,
    };
  }

  @Post('heartbeat')
  @ApiOperation({
    summary: '하트비트',
    description: '기기 연결 상태를 확인하기 위한 하트비트 요청입니다.',
  })
  async heartbeat(@Body() payload: HeartbeatDto) {
    const result = await this.sensorsService.processHeartbeat(payload);
    return {
      success: true,
      ...result,
    };
  }

  @Post('events')
  @ApiOperation({
    summary: '센서 이벤트',
    description: '처리 완료, 음식물 투입 등 주요 이벤트를 전달합니다.',
  })
  async handleEvent(@Body() payload: SensorEventDto) {
    const result = await this.sensorsService.handleEvent(payload);
    return {
      success: true,
      ...result,
    };
  }

  @Post('events/food-input-before')
  @ApiOperation({
    summary: '음식물 투입 전 이벤트',
  })
  async handleFoodInputBefore(@Body() payload: SensorEventDto) {
    const result = await this.sensorsService.handleEvent({
      ...payload,
      eventType: SensorEventType.FoodInputBefore,
    });
    return {
      success: true,
      ...result,
    };
  }

  @Post('events/food-input-after')
  @ApiOperation({
    summary: '음식물 투입 후 이벤트',
  })
  async handleFoodInputAfter(@Body() payload: SensorEventDto) {
    const result = await this.sensorsService.handleEvent({
      ...payload,
      eventType: SensorEventType.FoodInputAfter,
    });
    return {
      success: true,
      ...result,
    };
  }

  @Get(':deviceId/latest')
  @ApiOperation({
    summary: '최신 센서 데이터 조회',
  })
  async getLatest(@Param('deviceId') deviceId: string) {
    const data = await this.sensorsService.getLatestSensorData(deviceId);
    return {
      success: true,
      data,
    };
  }

  @Get('request-logs')
  @ApiOperation({
    summary: '센서 요청 로그 조회',
    description: '센서 API 요청 로그를 조회합니다. 디버깅 및 모니터링 용도.',
  })
  @ApiQuery({ name: 'deviceId', required: false, description: '특정 디바이스 ID로 필터링' })
  @ApiQuery({ name: 'status', required: false, description: '요청 상태로 필터링 (SUCCESS, VALIDATION_FAILED, ERROR)' })
  @ApiQuery({ name: 'limit', required: false, description: '조회할 로그 개수 (기본: 50)', type: Number })
  async getRequestLogs(
    @Query('deviceId') deviceId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.sensorsService.getRequestLogs(deviceId, status, limit);
    return {
      success: true,
      data: logs,
    };
  }
}

