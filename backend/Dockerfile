# syntax=docker/dockerfile:1.4

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
# NODE_ENV는 환경 변수로 주입받도록 변경 (기본값은 development)
COPY package*.json ./
# 개발 모드에서는 devDependencies도 설치
RUN npm ci

EXPOSE 3000
# 개발 모드: watch 모드로 실행, 프로덕션: 빌드된 파일 실행
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then npm ci --omit=dev && cp -r /app/dist ./dist 2>/dev/null || true && node dist/main.js; else npm run start:dev; fi"]

