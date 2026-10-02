import Config

# Same Postgres as the backend; the chat_messages table is created by its Alembic migrations.
db = URI.parse(System.get_env("DATABASE_URL", "postgres://ibrahim_kimaro:kimmy001@localhost:5432/home_proofolio_db"))
[db_user, db_pass] = String.split(db.userinfo, ":", parts: 2)

config :realtime_chat, :db,
  hostname: db.host,
  port: db.port || 5432,
  username: URI.decode(db_user),
  password: URI.decode(db_pass),
  database: String.trim_leading(db.path, "/"),
  # Concurrent commits share one disk flush, so more connections = more messages/s on slow disks.
  # Wait up to ~1s for a connection under bursts instead of failing the send (client push timeout is 10s).
  pool_size: 20,
  queue_target: 1_000,
  queue_interval: 5_000

# Must equal the backend's SECRET_KEY: it signs the chat tokens the backend hands out (GET /chat/token).
config :realtime_chat, :secret_key, System.get_env("SECRET_KEY", "dev-only-change-me")
