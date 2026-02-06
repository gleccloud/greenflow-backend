# GreenFlow Frontend - Multi-stage Docker build
# LocalStack 개발 환경 및 프로덕션 최적화

# Stage 1: 빌드
FROM node:20-alpine AS builder

WORKDIR /app

# 빌드 인자
ARG VITE_API_BASE_URL=http://localhost:3000/api/v2
ARG NODE_ENV=production

# 환경 변수
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV NODE_ENV=${NODE_ENV}

# 의존성 설치 (모든 의존성 포함 - devDependencies 포함)
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-fund --no-audit

# 소스코드 복사
COPY . .

# 빌드
RUN npm run build

# Stage 2: 개발 환경 (Vite dev server)
FROM node:20-alpine AS development

WORKDIR /app

# 의존성 설치
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

# 소스코드 복사
COPY . .

# 환경 변수
ENV NODE_ENV=development
ENV VITE_API_BASE_URL=http://localhost:3000/api/v2

# 포트 노출
EXPOSE 5173

# 헬스 체크
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

# Vite dev server 실행 (hot reload)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 3: 프로덕션 서버 (Nginx)
FROM nginx:alpine

# Nginx 설정
COPY --from=builder /app/dist /usr/share/nginx/html

# 기본 Nginx 설정 (SPA라우팅 지원)
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX_CONFIG'
server {
    listen 5173;
    server_name _;

    root /usr/share/nginx/html;
    index index.html index.htm;

    # SPA 라우팅: 존재하지 않는 파일은 index.html로 리다이렉트
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 정적 자산에 캐시 헤더 추가
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # HTML 파일은 캐시하지 않음
    location ~* \.html?$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # 에러 페이지
    error_page 404 /index.html;
}
NGINX_CONFIG

# 헬스 체크
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

# 포트 노출
EXPOSE 5173

# Nginx 시작
CMD ["nginx", "-g", "daemon off;"]
