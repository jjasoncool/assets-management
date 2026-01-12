# 使用 Node.js LTS 官方映像
FROM node:lts-alpine

# 設定工作目錄
WORKDIR /app

# 環境變數
ARG APP_ENV=dev
ARG VITE_ALLOWED_HOSTS
ENV APP_ENV=$APP_ENV
ENV VITE_ALLOWED_HOSTS=$VITE_ALLOWED_HOSTS
ENV PORT=3000

# 複製 package.json 和 package-lock.json
COPY frontend/package*.json ./

# 安裝依賴
RUN npm install -g pnpm

# 複製配置文件
COPY frontend/svelte.config.js frontend/tsconfig.json frontend/vite.config.js ./

# 暴露端口 (開發和生產都使用 3000)
EXPOSE 3000

# 條件安裝和建置
# 生產環境：安裝依賴、生成文件、建置應用
# 開發環境：運行時處理
RUN if [ "$APP_ENV" = "prod" ]; then pnpm install && pnpm exec svelte-kit sync && pnpm run build; fi

# 條件啟動
# 開發環境：安裝依賴、生成 SvelteKit 文件、啟動開發伺服器
# 生產環境：啟動生產應用
CMD echo "APP_ENV: $APP_ENV, VITE_ALLOWED_HOSTS: $VITE_ALLOWED_HOSTS" && \
    if [ "$APP_ENV" = "dev" ]; then \
        pnpm install && pnpm exec svelte-kit sync && pnpm run dev; \
    else \
        node build/index.js; \
    fi
