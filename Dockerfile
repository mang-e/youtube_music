FROM node:22-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
       python3 \
       python3-pip \
       ca-certificates \
       curl \
    && python3 -m pip install --no-cache-dir --break-system-packages yt-dlp \
    # ✅ Deno 설치 (PO Token 인증 자동 해결)
    && curl -fsSL https://deno.land/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN npm install -g corepack@latest \
    && corepack pnpm install \
    && corepack pnpm run build

ENV NODE_ENV=production
# ✅ Deno 환경변수
ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

EXPOSE 3000
CMD ["node", "dist/index.js"]