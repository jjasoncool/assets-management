# 使用最輕量的 Alpine Linux
FROM alpine:latest

ARG PB_VERSION=0.35.0

# 安裝必要的工具 (unzip, ca-certificates 用於 HTTPS 下載)
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

# 下載並解壓縮
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# 開放 Port
EXPOSE 8090

# 啟動指令 (資料庫存在 /pb/pb_data)
CMD /pb/pocketbase serve --http=0.0.0.0:8090
