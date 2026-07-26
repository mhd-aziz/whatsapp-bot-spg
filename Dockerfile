# Dockerfile for WhatsApp Bot SPG on Fly.io
FROM node:20-slim

# Install Chromium untuk Puppeteer/whatsapp-web.js
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer untuk pakai Chromium yang sudah terinstall
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files dulu
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Buat folder data
RUN mkdir -p data/photos

# Expose port (opsional, untuk health check)
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').createServer((req,res)=>res.end('OK')).listen(3000)" || exit 1

# Start bot
CMD ["node", "index.js"]
