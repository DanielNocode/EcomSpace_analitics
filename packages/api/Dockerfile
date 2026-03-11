FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Copy prisma schema
COPY prisma ./prisma

# Install dependencies
RUN npm install --workspace=packages/shared --workspace=packages/api --include-workspace-root

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api
COPY tsconfig.base.json ./

# Expose port
EXPOSE 3000

# Start dev server
CMD ["npx", "tsx", "watch", "packages/api/src/server.ts"]
