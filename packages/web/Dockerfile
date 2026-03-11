FROM node:20-alpine

WORKDIR /app

# Placeholder web container for Phase 1
# In Phase 2, this will serve the React app

COPY packages/web/package.json ./

RUN echo '{"name":"web-placeholder","scripts":{"start":"echo Web server placeholder"}}' > package.json

EXPOSE 5173

# Simple health endpoint placeholder
CMD ["sh", "-c", "echo 'Web placeholder running' && sleep infinity"]
