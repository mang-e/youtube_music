FROM node:22-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
       python3 \
       python3-pip \
       ca-certificates \
       curl \
       unzip \
    && python3 -m pip install --no-cache-dir --break-system-packages yt-dlp \
    # Deno 설치
    && curl -fsSL https://deno.land/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# ✅ --legacy-peer-deps 추가!
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

EXPOSE 3000
CMD ["node", "dist/_core/index.js"]
