import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { DevicesService } from '../devices/devices.service';
import { Device, DeviceConnectionStatus } from '../devices/entities/device.entity';
import { CaptureTriggerDto, CaptureTriggerType } from './dto/capture-trigger.dto';
import { RegisterCameraDto } from './dto/register-camera.dto';
import { SnapshotQueryDto } from './dto/snapshot-query.dto';
import { Snapshot, CaptureTriggerType as SnapshotTriggerType } from './entities/snapshot.entity';

export interface CameraInfo {
  deviceId: string;
  rtspUrl: string;
  cameraModel?: string;
  username?: string;
  password?: string;
  connectionStatus: 'ONLINE' | 'OFFLINE' | 'ERROR';
  lastConnectedAt?: string;
}

export interface SnapshotInfo {
  snapshotId: string;
  deviceId: string;
  snapshotType: CaptureTriggerType;
  imageUrl: string;
  capturedAt: string;
  latencyMs?: number;
}

@Injectable()
export class CameraService {
  private readonly logger = new Logger(CameraService.name);
  private readonly snapshotsBasePath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly devicesService: DevicesService,
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
  ) {
    // 스냅샷 저장 경로 설정 (환경 변수 또는 기본값)
    this.snapshotsBasePath =
      this.configService.get<string>('SNAPSHOTS_DIR') ||
      path.join(process.cwd(), 'snapshots');
  }

  async registerCamera(payload: RegisterCameraDto): Promise<CameraInfo> {
    // Device를 찾기 (생성하지 않음)
    const device = await this.devicesService.findByDeviceId(payload.deviceId);

    // 이미 카메라 정보가 등록되어 있는지 확인
    if (device && device.rtspUrl) {
      throw new BadRequestException(`이미 등록된 deviceId입니다: ${payload.deviceId}`);
    }

    // Device가 없으면 생성
    if (!device) {
      await this.devicesService.findOrCreateByDeviceId(payload.deviceId);
    }

    // 카메라 정보 업데이트
    const updatedDevice = await this.devicesService.updateCameraInfo(
      payload.deviceId,
      payload.rtspUrl,
      payload.cameraModel,
      payload.username,
      payload.password,
    );

    this.logger.log(`카메라 등록: deviceId=${payload.deviceId}`);

    return {
      deviceId: updatedDevice.deviceId,
      rtspUrl: updatedDevice.rtspUrl || '',
      cameraModel: updatedDevice.cameraModel || undefined,
      username: updatedDevice.cameraUsername || undefined,
      password: updatedDevice.cameraPassword || undefined,
      connectionStatus: updatedDevice.connectionStatus,
      lastConnectedAt: updatedDevice.lastHeartbeat?.toISOString(),
    };
  }

  async getCamera(deviceId: string): Promise<CameraInfo> {
    const device = await this.devicesService.findByDeviceId(deviceId);
    if (!device || !device.rtspUrl) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라 정보를 찾을 수 없습니다.`);
    }

    return {
      deviceId: device.deviceId,
      rtspUrl: device.rtspUrl || '',
      cameraModel: device.cameraModel || undefined,
      username: device.cameraUsername || undefined,
      password: device.cameraPassword || undefined,
      connectionStatus: device.connectionStatus,
      lastConnectedAt: device.lastHeartbeat?.toISOString(),
    };
  }

  async removeCamera(deviceId: string): Promise<void> {
    const device = await this.devicesService.findByDeviceId(deviceId);
    if (!device || !device.rtspUrl) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라 정보를 찾을 수 없습니다.`);
    }

    // 카메라 정보 제거
    await this.devicesService.removeCameraInfo(deviceId);
    this.logger.warn(`카메라 해제: deviceId=${deviceId}`);
  }

  async getStreamUrl(deviceId: string): Promise<{ rtspUrl: string }> {
    const camera = await this.getCamera(deviceId);
    return { rtspUrl: camera.rtspUrl };
  }

  async captureSnapshot(
    payload: CaptureTriggerDto & { imageFile?: { buffer: Buffer; size: number; originalname: string } },
  ): Promise<SnapshotInfo> {
    const deviceId = payload.deviceId || '';
    if (!deviceId) {
      throw new NotFoundException('deviceId는 필수입니다.');
    }

    const device = await this.devicesService.findOrCreateByDeviceId(deviceId);
    if (!device.rtspUrl) {
      throw new NotFoundException(`deviceId=${deviceId} 카메라가 등록되지 않았습니다.`);
    }

    const timestamp = Date.now();
    const snapshotId = `snapshot-${timestamp}`;
    const capturedAt = new Date();

    // 이미지 파일 저장
    let imageUrl: string;
    if (payload.imageFile) {
      const deviceDir = path.join(this.snapshotsBasePath, deviceId);
      const filename = `${timestamp}.jpg`;
      const filePath = path.join(deviceDir, filename);

      if (!fs.existsSync(deviceDir)) {
        fs.mkdirSync(deviceDir, { recursive: true });
        this.logger.log(`스냅샷 디렉토리 생성: ${deviceDir}`);
      }

      fs.writeFileSync(filePath, payload.imageFile.buffer);
      imageUrl = `/snapshots/${deviceId}/${filename}`;

      this.logger.log(
        `이미지 파일 저장 완료: ${filePath} (${payload.imageFile.size} bytes)`,
      );
    } else {
      imageUrl = `/snapshots/${deviceId}/${timestamp}.jpg`;
      this.logger.warn(`이미지 파일이 제공되지 않음: deviceId=${deviceId}`);
    }

    // DB에 스냅샷 저장
    const snapshot = this.snapshotRepository.create({
      snapshotId,
      device,
      snapshotType: payload.triggerType as SnapshotTriggerType,
      imageUrl,
      capturedAt,
      latencyMs: payload.imageFile ? Math.floor(Math.random() * 1000) : undefined,
    });

    await this.snapshotRepository.save(snapshot);

    this.logger.log(
      `스냅샷 캡처: deviceId=${deviceId}, trigger=${payload.triggerType}, rtsp=${device.rtspUrl}, imageSaved=${!!payload.imageFile}`,
    );

    return {
      snapshotId,
      deviceId,
      snapshotType: payload.triggerType,
      imageUrl,
      capturedAt: capturedAt.toISOString(),
      latencyMs: snapshot.latencyMs,
    };
  }

  async listSnapshots(deviceId: string, query: SnapshotQueryDto): Promise<SnapshotInfo[]> {
    const device = await this.devicesService.findByDeviceId(deviceId);
    if (!device) {
      throw new NotFoundException(`deviceId=${deviceId} 디바이스를 찾을 수 없습니다.`);
    }

    const { from, to, limit = 20 } = query;
    const queryBuilder = this.snapshotRepository
      .createQueryBuilder('snapshot')
      .leftJoinAndSelect('snapshot.device', 'device')
      .where('snapshot.device = :deviceId', { deviceId: device.id })
      .orderBy('snapshot.capturedAt', 'DESC')
      .limit(limit);

    if (from) {
      queryBuilder.andWhere('snapshot.capturedAt >= :from', { from: new Date(from) });
    }
    if (to) {
      queryBuilder.andWhere('snapshot.capturedAt <= :to', { to: new Date(to) });
    }

    const snapshots = await queryBuilder.getMany();

    return snapshots.map((s) => ({
      snapshotId: s.snapshotId,
      deviceId: s.device?.deviceId || deviceId,
      snapshotType: s.snapshotType as CaptureTriggerType,
      imageUrl: s.imageUrl,
      capturedAt: s.capturedAt.toISOString(),
      latencyMs: s.latencyMs,
    }));
  }

  async getSnapshot(snapshotId: string): Promise<SnapshotInfo> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { snapshotId },
      relations: ['device'],
    });

    if (!snapshot) {
      throw new NotFoundException(`스냅샷을 찾을 수 없습니다: snapshotId=${snapshotId}`);
    }

    return {
      snapshotId: snapshot.snapshotId,
      deviceId: snapshot.device.deviceId,
      snapshotType: snapshot.snapshotType as CaptureTriggerType,
      imageUrl: snapshot.imageUrl,
      capturedAt: snapshot.capturedAt.toISOString(),
      latencyMs: snapshot.latencyMs,
    };
  }

  async getSnapshotImagePath(snapshotId: string): Promise<string> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { snapshotId },
      relations: ['device'],
    });

    if (!snapshot) {
      throw new NotFoundException(`스냅샷을 찾을 수 없습니다: snapshotId=${snapshotId}`);
    }

    const filename = path.basename(snapshot.imageUrl);
    return path.join(this.snapshotsBasePath, snapshot.device.deviceId, filename);
  }


}
