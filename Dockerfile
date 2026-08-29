# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.12.0
FROM node:${NODE_VERSION}-slim as base

# Next.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base as build

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy application code
COPY . .

# Public API endpoint baked at build time (overridable via build-arg)
ARG NEXT_PUBLIC_GOLD_API_URL=https://gold-api.santirev.com
ARG NEXT_PUBLIC_GOLD_API_KEY=santi.dev
ENV NEXT_PUBLIC_GOLD_API_URL=$NEXT_PUBLIC_GOLD_API_URL
ENV NEXT_PUBLIC_GOLD_API_KEY=$NEXT_PUBLIC_GOLD_API_KEY

# Build application (drop Next build cache to slim the image)
RUN npm run build && rm -rf .next/cache

# Remove development dependencies
RUN npm prune --omit=dev


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000

# Comando para iniciar la aplicación
CMD [ "npm", "run", "start" ]
