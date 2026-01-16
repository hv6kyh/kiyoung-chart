# Build stage
FROM node:24-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .
# .env 파일은 .dockerignore 또는 .gitignore에 의해 제외되어야 하며, 
# 런타임에 직접 환경 변수로 주입하는 것이 권장됩니다.

# Build TypeScript
RUN npm run build

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy only production dependencies and build output
COPY package*.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/server.js"]
