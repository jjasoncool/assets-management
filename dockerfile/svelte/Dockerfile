# 使用 Node.js LTS 官方映像
FROM node:lts-slim

# 安裝 cron 和 logrotate（生產環境需要）
RUN apt-get update && apt-get install -y \
    cron \
    logrotate \
    && rm -rf /var/lib/apt/lists/*

# 設定 cron job（在構建階段就寫入系統級 cron 配置）
# 使用 /etc/cron.d/ 而非用戶級 crontab，更可靠
RUN echo "0 3 * * * root /app/logs/logrotate-cron >> /var/log/cron.log 2>&1" > /etc/cron.d/logrotate-job && \
    chmod 0644 /etc/cron.d/logrotate-job && \
    crontab /etc/cron.d/logrotate-job

# 設定工作目錄
WORKDIR /app

# 環境變數
ARG APP_ENV=dev
ARG VITE_ALLOWED_HOSTS
ENV APP_ENV=$APP_ENV
ENV VITE_ALLOWED_HOSTS=$VITE_ALLOWED_HOSTS
ENV PORT=3000

# 複製 package.json 和 package-lock.json
COPY frontend/package.json frontend/pnpm-lock.yaml* ./

# 安裝依賴
RUN npm install -g pnpm

# 複製配置文件
COPY frontend/svelte.config.js frontend/tsconfig.json frontend/vite.config.js ./

# 複製原始碼
COPY frontend/src ./src
COPY frontend/static ./static

# 暴露端口 (開發和生產都使用 3000)
EXPOSE 3000

# 複製 entrypoint 腳本（處理服務啟動邏輯）
# 放在 /usr/local/bin 避免被 volume mount 覆蓋
COPY dockerfile/svelte/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 條件安裝和建置
# 生產環境：安裝依賴、生成文件、建置應用
# 開發環境：運行時處理
RUN if [ "$APP_ENV" = "prod" ]; then \
    pnpm install && \
    pnpm exec svelte-kit sync && \
    pnpm run build && \
    # [關鍵] 建立獨立目錄，將編譯結果直接搬過去 (mv)，避開 Volume 覆蓋 \
    mkdir -p /app_prod && \
    mv build /app_prod/build && \
    cp package.json /app_prod/ && \
    cd /app_prod && pnpm install --prod; \
    fi

# 設定 entrypoint（負責啟動背景服務如 cron）
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# 主命令（簡化版 - cron 啟動邏輯已移至 entrypoint）
# 開發環境：安裝依賴、生成 SvelteKit 文件、啟動開發伺服器
# 生產環境：直接啟動已編譯的應用程序
CMD echo "APP_ENV: $APP_ENV, VITE_ALLOWED_HOSTS: $VITE_ALLOWED_HOSTS" && \
    if [ "$APP_ENV" = "dev" ]; then \
        pnpm install && pnpm exec svelte-kit sync && pnpm run dev; \
    else \
        cd /app_prod && node build/index.js; \
    fi
