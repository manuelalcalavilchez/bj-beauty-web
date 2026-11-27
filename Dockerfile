# --- Etapa 1: Build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# --- Runtime ---
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/templates ./templates
COPY --from=build /app/public ./public
RUN mkdir -p /app/data && chown -R node:node /app/data
RUN npm ci --legacy-peer-deps --omit=dev
ENV NODE_ENV=production
ENV PORT=80
ENV DB_PATH=/app/data/bjbeauty.db
VOLUME ["/app/data"]
USER node
EXPOSE 80
CMD ["node", "server.js"]
