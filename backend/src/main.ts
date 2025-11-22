import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './common/logger/logger.service';
import { generalRateLimiter, sensorDataRateLimiter } from './common/middleware/sensor-rate-limit.middleware';
import { createSwaggerDocument } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const winstonLogger = app.get(WinstonLoggerService);
  app.useLogger(winstonLogger);

  const globalPrefix = 'api';
  const apiVersion = 'v1';

  app.setGlobalPrefix(globalPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  // Helmet 보안 헤더 설정 (Swagger UI 동작을 위해 CSP 완화)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io', 'http://43.200.77.84:3000', 'https://43.200.77.84:3000', '*'],
          upgradeInsecureRequests: null, // HTTP 사용을 위해 비활성화
        },
      },
    }),
  );
  app.use(compression());
  
  // 센서 데이터 전송 API 전용 Rate Limit (더 관대함, POST만)
  app.use(`/${globalPrefix}/${apiVersion}/sensors`, sensorDataRateLimiter);
  
  // 일반 API용 Rate Limit (더 엄격함)
  app.use(generalRateLimiter);

  app.use(morgan('combined'));
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
    credentials: true,
  });

  // ValidationPipe 설정 - multipart/form-data는 수동 처리하므로 건너뛰기
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
      // multipart/form-data 요청은 ValidationPipe를 건너뛰도록 설정
      // (해당 엔드포인트에서 수동으로 검증)
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const swaggerDocument = createSwaggerDocument(app);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    customSiteTitle: 'Hanibi API Docs',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  winstonLogger.log(`Application running on http://localhost:${port}/${globalPrefix}/${apiVersion}`, 'Bootstrap');
  winstonLogger.log(`Swagger docs available at http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
