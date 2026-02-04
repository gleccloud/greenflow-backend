# GreenFlow Frontend - Multi-stage Docker build
# 프로덕션 최적화된 빌드

# Stage 1: 빌드
FROM node:18-alpine AS builder

WORKDIR /app

# 빌드 인자
ARG VITE_API_BASE_URL=http://localhost:3000/api/v2
ARG NODE_ENV=production

# 환경 변수
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV NODE_ENV=${NODE_ENV}

# 의존성 설치
COPY package*.json ./
RUN npm ci

# 소스코드 복사
COPY . .

# 빌드
RUN npm run build

# Stage 2: 서버 (Nginx)
FROM nginx:alpine

# Nginx 설정
COPY --from=builder /app/dist /usr/share/nginx/html

# 기본 Nginx 설정 (SPA라우팅 지원)
RUN echo '\
server {\
  listen 5173;\
  location / {\
    root /usr/share/nginx/html;\
    index index.html index.htm;\
    try_files $uri $uri/ /index.html;\
  }\
  location ~* \\.(?:js|css|png|jpg|jpeg|gif|ico|woff|woff2|ttf|svg)$ {\
    expires 30d;\
    add_header Cache-Control "public, immutable";\
  }\
}' > /etc/nginx/conf.d/default.conf

# 헬스 체크
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

# 포트 노출
EXPOSE 5173

# Nginx 시작
CMD ["nginx", "-g", "daemon off;"]
