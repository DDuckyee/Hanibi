import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { ApiRequestLog, RequestStatus } from '../entities/api-request-log.entity';

@Injectable()
export class GlobalLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GlobalLoggingInterceptor.name);

  constructor(
    @InjectRepository(ApiRequestLog)
    private readonly requestLogRepository: Repository<ApiRequestLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    const method = request.method;
    const path = request.path;
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];
    
    // deviceId 추출 (body, params, query에서)
    const deviceId = request.body?.deviceId || 
                     request.params?.deviceId || 
                     request.query?.deviceId || 
                     null;

    // 요청 데이터 저장 (민감한 정보 제외)
    const requestBody = this.sanitizeBody(request.body);
    const requestQuery = Object.keys(request.query).length > 0 
      ? JSON.stringify(request.query) 
      : null;
    
    // 민감한 헤더 제외 (Authorization 등)
    const requestHeaders = this.sanitizeHeaders(request.headers);

    return next.handle().pipe(
      tap(async () => {
        const responseTime = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();

        try {
          const logData: Partial<ApiRequestLog> = {
            method,
            path,
            statusCode: response.statusCode,
            status: this.getStatus(response.statusCode),
            requestBody: requestBody ?? undefined,
            requestQuery: requestQuery ?? undefined,
            requestHeaders: requestHeaders ?? undefined,
            ipAddress: ipAddress ?? undefined,
            userAgent: userAgent ?? undefined,
            responseTimeMs: responseTime,
            deviceId: deviceId ?? undefined,
          };
          const logEntry = this.requestLogRepository.create(logData);
          await this.requestLogRepository.save(logEntry);
        } catch (error) {
          this.logger.error('Failed to save API request log', error);
        }
      }),
      catchError(async (error) => {
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        try {
          const logData: Partial<ApiRequestLog> = {
            method,
            path,
            statusCode,
            status: this.getStatus(statusCode),
            requestBody: requestBody ?? undefined,
            requestQuery: requestQuery ?? undefined,
            requestHeaders: requestHeaders ?? undefined,
            errorMessage: error.message || error.toString(),
            ipAddress: ipAddress ?? undefined,
            userAgent: userAgent ?? undefined,
            responseTimeMs: responseTime,
            deviceId: deviceId ?? undefined,
          };
          const logEntry = this.requestLogRepository.create(logData);
          await this.requestLogRepository.save(logEntry);
        } catch (logError) {
          this.logger.error('Failed to save API error log', logError);
        }

        throw error;
      }),
    );
  }

  private sanitizeBody(body: any): string | null {
    if (!body || Object.keys(body).length === 0) {
      return null;
    }

    const sanitized = { ...body };
    
    // 민감한 정보 제거
    if (sanitized.password) sanitized.password = '***';
    if (sanitized.refreshToken) sanitized.refreshToken = '***';
    if (sanitized.accessToken) sanitized.accessToken = '***';

    return JSON.stringify(sanitized);
  }

  private sanitizeHeaders(headers: any): string | null {
    const sanitized = { ...headers };
    
    // 민감한 헤더 제거
    delete sanitized.authorization;
    delete sanitized.cookie;
    
    // 중요한 헤더만 저장
    const importantHeaders = {
      'content-type': sanitized['content-type'],
      'user-agent': sanitized['user-agent'],
      'accept': sanitized['accept'],
    };

    return JSON.stringify(importantHeaders);
  }

  private getStatus(statusCode: number): RequestStatus {
    if (statusCode >= 200 && statusCode < 300) {
      return RequestStatus.Success;
    }
    
    if (statusCode === 400 || statusCode === 422) {
      return RequestStatus.ValidationError;
    }
    
    if (statusCode >= 400 && statusCode < 500) {
      return RequestStatus.ClientError;
    }
    
    return RequestStatus.ServerError;
  }
}

