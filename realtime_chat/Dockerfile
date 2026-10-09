FROM elixir:1.17-alpine

# Install build dependencies
RUN apk add --no-cache build-base git

WORKDIR /app

# Install hex + rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Copy mix files and fetch dependencies
COPY mix.exs ./
RUN HEX_HTTP_CONCURRENCY=1 HEX_HTTP_TIMEOUT=300 mix deps.get

# Copy source code and compile
COPY config config
COPY lib lib
RUN mix compile

EXPOSE 4000

ENV MIX_ENV=dev
ENV PORT=4000

CMD ["mix", "phx.server"]
