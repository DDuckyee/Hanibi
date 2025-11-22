import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesModule } from '../devices/devices.module';
import { CameraController } from './camera.controller';
import { CameraService } from './camera.service';
import { Snapshot } from './entities/snapshot.entity';

@Module({
  imports: [DevicesModule, TypeOrmModule.forFeature([Snapshot])],
  controllers: [CameraController],
  providers: [CameraService],
  exports: [CameraService],
})
export class CameraModule {}

