# 使用 Node.js LTS 官方映像
FROM node:lts-alpine

# 設定工作目錄
WORKDIR /app

# 環境變數
ARG APP_ENV=dev
ENV APP_ENV=$APP_ENV
ENV PORT=3000

# 複製 package.json 和 package-lock.json
COPY frontend/package*.json ./

# 複製配置文件
COPY frontend/svelte.config.js frontend/tsconfig.json frontend/vite.config.js ./

# 安裝依賴
RUN npm install -g pnpm && pnpm install

# 生成 SvelteKit 文件
RUN pnpm exec svelte-kit sync

# 條件複製源碼（生產用）
RUN if [ "$APP_ENV" = "prod" ]; then pnpm run build; fi

# 暴露端口
EXPOSE 3000

# 條件啟動
CMD echo "APP_ENV: $APP_ENV" && if [ "$APP_ENV" = "dev" ]; then pnpm run dev; else node build/index.js; fi
