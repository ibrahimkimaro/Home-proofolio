# Database Backup & Restore Guide

This repository includes a full PostgreSQL database dump in `database_backup.sql`.

---

## Restoring on Another PC

### Method 1: Using Docker (Recommended)
If running via Docker Compose (`docker compose up -d`):

1. **Start the database service:**
   ```bash
   docker compose up -d db
   ```

2. **Wait a few seconds for Postgres to become healthy, then restore the backup:**
   ```bash
   docker exec -i home_proofolio-db-1 psql -U ibrahim_kimaro -d home_proofolio_db < database_backup.sql
   ```

3. **Start the rest of the stack:**
   ```bash
   docker compose up -d
   ```

---

### Method 2: Using Local PostgreSQL (Host)
If you have PostgreSQL installed directly on your machine:

1. **Create the database (if not already created):**
   ```bash
   psql -U postgres -c "CREATE USER ibrahim_kimaro WITH PASSWORD 'kimmy001' SUPERUSER;"
   psql -U postgres -c "CREATE DATABASE home_proofolio_db OWNER ibrahim_kimaro;"
   ```

2. **Restore the dump:**
   ```bash
   PGPASSWORD=kimmy001 psql -h 127.0.0.1 -p 5432 -U ibrahim_kimaro -d home_proofolio_db < database_backup.sql
   ```

---

## Verifying the Restore
Check that the tables and users are present:
```bash
docker exec -it home_proofolio-db-1 psql -U ibrahim_kimaro -d home_proofolio_db -c "SELECT email, username, fullname FROM users;"
```
