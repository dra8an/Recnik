# PostgreSQL Guide

A comprehensive guide to PostgreSQL for beginners.

---

## Table of Contents

1. [What is PostgreSQL?](#what-is-postgresql)
2. [Installation](#installation)
3. [Service Management](#service-management)
4. [UI Tools](#ui-tools)
5. [Command Line (psql)](#command-line-psql)
6. [Databases](#databases)
7. [Tables](#tables)
8. [SQL Queries](#sql-queries)
9. [Joins](#joins)
10. [Indexes](#indexes)
11. [Functions & Stored Procedures](#functions--stored-procedures)
12. [Backup & Restore](#backup--restore)
13. [Quick Reference](#quick-reference)

---

## What is PostgreSQL?

PostgreSQL (often called "Postgres") is a powerful, open-source relational database. It stores data in tables with rows and columns, similar to a spreadsheet but much more powerful.

**Key concepts:**
- **Database** - A container for all your data (like a folder)
- **Table** - A collection of related data (like a spreadsheet)
- **Row** - A single record (like a spreadsheet row)
- **Column** - A field/attribute (like a spreadsheet column)
- **Primary Key** - Unique identifier for each row
- **Foreign Key** - Links one table to another
- **Query** - A request for data using SQL

**Example structure:**
```
Database: recnik
├── Table: words
│   ├── id (primary key)
│   ├── cyrillic
│   ├── latin
│   └── part_of_speech
├── Table: definitions
│   ├── id (primary key)
│   ├── word_id (foreign key → words.id)
│   └── definition_text
└── Table: examples
    ├── id (primary key)
    ├── definition_id (foreign key → definitions.id)
    └── example_text
```

---

## Installation

### macOS (Homebrew)

```bash
# Install PostgreSQL 17
brew install postgresql@17

# Start the service
brew services start postgresql@17

# Verify installation
/usr/local/opt/postgresql@17/bin/psql --version
```

### Add to PATH (Optional but Recommended)

```bash
# Add to ~/.zshrc
echo 'export PATH="/usr/local/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc

# Reload shell
source ~/.zshrc

# Now you can use psql directly
psql --version
```

### Windows

1. Download installer from https://www.postgresql.org/download/windows/
2. Run installer, follow prompts
3. Remember the password you set for `postgres` user
4. PostgreSQL installs to `C:\Program Files\PostgreSQL\17\`

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

## Service Management

### macOS (Homebrew)

```bash
# Start PostgreSQL (runs in background, survives restart)
brew services start postgresql@17

# Stop PostgreSQL
brew services stop postgresql@17

# Restart PostgreSQL
brew services restart postgresql@17

# Check if running
brew services list | grep postgresql

# Start manually (stops when terminal closes)
/usr/local/opt/postgresql@17/bin/postgres -D /usr/local/var/postgresql@17
```

### Linux (systemd)

```bash
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

### Windows

```bash
# Using Services GUI
# Open "Services" app, find "postgresql-x64-17", right-click to Start/Stop

# Or command line (as Administrator)
net start postgresql-x64-17
net stop postgresql-x64-17
```

---

## UI Tools

### 1. Prisma Studio (Simplest - Already Installed)

Built into Prisma, no extra installation needed.

```bash
cd /path/to/your/project
npx prisma studio
```

Opens at http://localhost:5555

**Pros:** Simple, already installed, good for quick edits
**Cons:** Only works with Prisma projects, limited features

---

### 2. TablePlus (Recommended for macOS)

Beautiful, native macOS app with free tier.

**Install:**
```bash
brew install --cask tableplus
```

**Connect:**
1. Open TablePlus
2. Click "Create a new connection"
3. Select "PostgreSQL"
4. Fill in:
   - Name: `recnik` (any name you want)
   - Host: `localhost`
   - Port: `5432`
   - User: Your macOS username (run `whoami` to check)
   - Password: (leave empty for local)
   - Database: `recnik`
5. Click "Test" to verify, then "Connect"

**Features:**
- Multiple tabs
- Query editor with syntax highlighting
- Table structure viewer
- Data editor (click to edit)
- Export to CSV/JSON/SQL
- Dark mode

**Keyboard shortcuts:**
- `Cmd+N` - New query tab
- `Cmd+R` - Run query
- `Cmd+S` - Save changes
- `Cmd+T` - New connection tab

---

### 3. Postico (macOS Only)

Simple, clean PostgreSQL client.

**Install:**
```bash
brew install --cask postico
```

**Connect:** Same as TablePlus

**Pros:** Very simple, great for beginners
**Cons:** macOS only, fewer features than TablePlus

---

### 4. pgAdmin 4 (Cross-Platform, Full Featured)

Official PostgreSQL admin tool. Most powerful but more complex.

**Install:**
```bash
# macOS
brew install --cask pgadmin4

# Windows/Linux
# Download from https://www.pgadmin.org/download/
```

**First-time setup:**
1. Open pgAdmin 4
2. Set a master password (for pgAdmin, not PostgreSQL)
3. Right-click "Servers" → "Create" → "Server"
4. General tab: Name = `Local`
5. Connection tab:
   - Host: `localhost`
   - Port: `5432`
   - Username: Your macOS username
   - Password: (empty for local)
6. Click "Save"

**Features:**
- Full database management
- Query tool with explain/analyze
- Server monitoring
- Backup/restore GUI
- User management

---

### 5. DBeaver (Cross-Platform, Free)

Universal database tool supporting many databases.

**Install:**
```bash
brew install --cask dbeaver-community
```

**Pros:** Free, supports many databases, powerful
**Cons:** Java-based, can be slow

---

### UI Tool Comparison

| Tool | Platform | Price | Best For |
|------|----------|-------|----------|
| Prisma Studio | All | Free | Quick edits in Prisma projects |
| TablePlus | macOS/Win/Linux | Free tier | Daily development (recommended) |
| Postico | macOS | Free tier | Beginners |
| pgAdmin 4 | All | Free | Full admin tasks |
| DBeaver | All | Free | Multiple database types |

---

## Command Line (psql)

`psql` is the PostgreSQL command-line interface.

### Connect to Database

```bash
# Connect to a database
psql recnik

# Connect with specific user
psql -U username recnik

# Connect to remote server
psql -h hostname -p 5432 -U username -d database

# Using connection string
psql "postgresql://username:password@localhost:5432/recnik"
```

### psql Commands

Once connected, use these commands (note the backslash):

```sql
-- List all databases
\l

-- Connect to a database
\c recnik

-- List all tables
\dt

-- Describe a table (show columns)
\d words

-- List all schemas
\dn

-- Show current connection info
\conninfo

-- Turn on/off expanded display
\x

-- Run SQL from file
\i /path/to/file.sql

-- Save output to file
\o /path/to/output.txt

-- Show command history
\s

-- Get help
\?

-- Exit psql
\q
```

### Run SQL Directly

```bash
# Run a single query
psql recnik -c "SELECT COUNT(*) FROM \"Word\";"

# Run from file
psql recnik -f /path/to/script.sql

# Output to CSV
psql recnik -c "SELECT * FROM \"Word\";" --csv > words.csv
```

---

## Databases

### Create Database

```sql
-- In psql or any client
CREATE DATABASE myapp;

-- With specific encoding
CREATE DATABASE myapp
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8';
```

```bash
# From command line
createdb myapp
```

### List Databases

```sql
-- In psql
\l

-- Or with SQL
SELECT datname FROM pg_database;
```

### Drop Database

```sql
DROP DATABASE myapp;
```

```bash
# From command line
dropdb myapp
```

### Connect to Database

```sql
-- In psql
\c myapp
```

---

## Tables

### Create Table

```sql
-- Basic table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table with foreign key
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Common Data Types

| Type | Description | Example |
|------|-------------|---------|
| `INTEGER` | Whole number | `42` |
| `SERIAL` | Auto-incrementing integer | `1, 2, 3...` |
| `BIGINT` | Large whole number | `9223372036854775807` |
| `NUMERIC(p,s)` | Exact decimal | `NUMERIC(10,2)` → `12345678.99` |
| `REAL` | Floating point | `3.14159` |
| `VARCHAR(n)` | Variable-length string (max n) | `VARCHAR(255)` |
| `TEXT` | Unlimited string | Long content |
| `BOOLEAN` | True/false | `TRUE`, `FALSE` |
| `DATE` | Date only | `2025-01-21` |
| `TIME` | Time only | `14:30:00` |
| `TIMESTAMP` | Date and time | `2025-01-21 14:30:00` |
| `UUID` | Unique identifier | `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` |
| `JSON` | JSON data | `{"key": "value"}` |
| `JSONB` | Binary JSON (faster) | `{"key": "value"}` |
| `ARRAY` | Array of values | `{1,2,3}` or `{'a','b','c'}` |

### Column Constraints

```sql
CREATE TABLE example (
  id SERIAL PRIMARY KEY,              -- Auto-increment, unique, not null
  email VARCHAR(255) UNIQUE NOT NULL, -- Must be unique, cannot be null
  age INTEGER CHECK (age >= 0),       -- Must be non-negative
  status VARCHAR(20) DEFAULT 'active', -- Default value
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE -- Foreign key
);
```

### Alter Table

```sql
-- Add column
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Drop column
ALTER TABLE users DROP COLUMN phone;

-- Rename column
ALTER TABLE users RENAME COLUMN name TO full_name;

-- Change column type
ALTER TABLE users ALTER COLUMN name TYPE TEXT;

-- Add constraint
ALTER TABLE users ADD CONSTRAINT email_unique UNIQUE (email);

-- Drop constraint
ALTER TABLE users DROP CONSTRAINT email_unique;

-- Rename table
ALTER TABLE users RENAME TO customers;
```

### Drop Table

```sql
-- Drop table
DROP TABLE users;

-- Drop if exists (no error if missing)
DROP TABLE IF EXISTS users;

-- Drop with dependent objects
DROP TABLE users CASCADE;
```

### List Tables

```sql
-- In psql
\dt

-- With SQL
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

---

## SQL Queries

### SELECT (Read Data)

```sql
-- Select all columns
SELECT * FROM users;

-- Select specific columns
SELECT name, email FROM users;

-- With alias
SELECT name AS user_name, email AS user_email FROM users;

-- With condition
SELECT * FROM users WHERE age > 18;

-- Multiple conditions
SELECT * FROM users WHERE age > 18 AND status = 'active';
SELECT * FROM users WHERE age > 18 OR status = 'vip';

-- Pattern matching
SELECT * FROM users WHERE name LIKE 'John%';     -- Starts with John
SELECT * FROM users WHERE name LIKE '%son';      -- Ends with son
SELECT * FROM users WHERE name LIKE '%oh%';      -- Contains oh
SELECT * FROM users WHERE name ILIKE '%john%';   -- Case-insensitive

-- NULL checks
SELECT * FROM users WHERE phone IS NULL;
SELECT * FROM users WHERE phone IS NOT NULL;

-- IN clause
SELECT * FROM users WHERE status IN ('active', 'pending');

-- BETWEEN
SELECT * FROM users WHERE age BETWEEN 18 AND 65;

-- Sorting
SELECT * FROM users ORDER BY name ASC;           -- Ascending (A-Z)
SELECT * FROM users ORDER BY created_at DESC;    -- Descending (newest first)
SELECT * FROM users ORDER BY status, name;       -- Multiple columns

-- Limit results
SELECT * FROM users LIMIT 10;                    -- First 10 rows
SELECT * FROM users LIMIT 10 OFFSET 20;          -- Skip 20, get next 10

-- Distinct values
SELECT DISTINCT status FROM users;

-- Count
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM users WHERE status = 'active';

-- Aggregate functions
SELECT
  COUNT(*) as total,
  AVG(age) as average_age,
  MIN(age) as youngest,
  MAX(age) as oldest,
  SUM(balance) as total_balance
FROM users;

-- Group by
SELECT status, COUNT(*) as count
FROM users
GROUP BY status;

-- Group by with filter (HAVING)
SELECT status, COUNT(*) as count
FROM users
GROUP BY status
HAVING COUNT(*) > 10;
```

### INSERT (Create Data)

```sql
-- Insert single row
INSERT INTO users (name, email, age)
VALUES ('John Doe', 'john@example.com', 30);

-- Insert and return the created row
INSERT INTO users (name, email, age)
VALUES ('Jane Doe', 'jane@example.com', 25)
RETURNING *;

-- Insert multiple rows
INSERT INTO users (name, email, age) VALUES
  ('User 1', 'user1@example.com', 20),
  ('User 2', 'user2@example.com', 25),
  ('User 3', 'user3@example.com', 30);

-- Insert from another table
INSERT INTO users_backup (name, email, age)
SELECT name, email, age FROM users WHERE status = 'active';
```

### UPDATE (Modify Data)

```sql
-- Update single column
UPDATE users SET status = 'inactive' WHERE id = 1;

-- Update multiple columns
UPDATE users
SET status = 'inactive', updated_at = NOW()
WHERE id = 1;

-- Update with calculation
UPDATE products SET price = price * 1.1;  -- 10% increase

-- Update and return modified rows
UPDATE users SET status = 'active' WHERE id = 1 RETURNING *;

-- Update based on another table
UPDATE orders
SET status = 'shipped'
WHERE user_id IN (SELECT id FROM users WHERE vip = true);
```

### DELETE (Remove Data)

```sql
-- Delete specific rows
DELETE FROM users WHERE id = 1;

-- Delete with condition
DELETE FROM users WHERE status = 'inactive' AND created_at < '2024-01-01';

-- Delete and return deleted rows
DELETE FROM users WHERE id = 1 RETURNING *;

-- Delete all rows (keep table structure)
DELETE FROM users;

-- Faster delete all (cannot use WHERE, no triggers)
TRUNCATE TABLE users;
```

---

## Joins

Joins combine data from multiple tables.

### Sample Tables

```sql
-- users table
| id | name  |
|----|-------|
| 1  | Alice |
| 2  | Bob   |
| 3  | Carol |

-- orders table
| id | user_id | amount |
|----|---------|--------|
| 1  | 1       | 100    |
| 2  | 1       | 200    |
| 3  | 2       | 150    |
```

### INNER JOIN

Returns only matching rows from both tables.

```sql
SELECT users.name, orders.amount
FROM users
INNER JOIN orders ON users.id = orders.user_id;

-- Result:
| name  | amount |
|-------|--------|
| Alice | 100    |
| Alice | 200    |
| Bob   | 150    |
-- Carol not included (no orders)
```

### LEFT JOIN

Returns all rows from left table, matching rows from right (NULL if no match).

```sql
SELECT users.name, orders.amount
FROM users
LEFT JOIN orders ON users.id = orders.user_id;

-- Result:
| name  | amount |
|-------|--------|
| Alice | 100    |
| Alice | 200    |
| Bob   | 150    |
| Carol | NULL   |
-- Carol included with NULL amount
```

### RIGHT JOIN

Returns all rows from right table, matching rows from left.

```sql
SELECT users.name, orders.amount
FROM users
RIGHT JOIN orders ON users.id = orders.user_id;
```

### FULL OUTER JOIN

Returns all rows from both tables.

```sql
SELECT users.name, orders.amount
FROM users
FULL OUTER JOIN orders ON users.id = orders.user_id;
```

### Multiple Joins

```sql
SELECT
  users.name,
  orders.amount,
  products.title
FROM users
JOIN orders ON users.id = orders.user_id
JOIN order_items ON orders.id = order_items.order_id
JOIN products ON order_items.product_id = products.id;
```

### Join with Alias

```sql
SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id;
```

---

## Indexes

Indexes speed up queries but slow down writes. Add them to columns you frequently search or filter by.

### Create Index

```sql
-- Basic index
CREATE INDEX idx_users_email ON users(email);

-- Unique index
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Multi-column index
CREATE INDEX idx_users_name_status ON users(name, status);

-- Partial index (only indexes rows matching condition)
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';
```

### Drop Index

```sql
DROP INDEX idx_users_email;
```

### List Indexes

```sql
-- For a specific table
\di users

-- All indexes
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
```

### When to Use Indexes

**Good candidates:**
- Primary keys (automatic)
- Foreign keys
- Columns in WHERE clauses
- Columns in JOIN conditions
- Columns in ORDER BY

**Avoid indexing:**
- Small tables
- Columns that change frequently
- Columns with low selectivity (e.g., boolean)

---

## Functions & Stored Procedures

### Create Function

```sql
-- Simple function
CREATE OR REPLACE FUNCTION get_user_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM users);
END;
$$ LANGUAGE plpgsql;

-- Use it
SELECT get_user_count();
```

### Function with Parameters

```sql
CREATE OR REPLACE FUNCTION get_users_by_status(user_status VARCHAR)
RETURNS TABLE(id INTEGER, name VARCHAR, email VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.email
  FROM users u
  WHERE u.status = user_status;
END;
$$ LANGUAGE plpgsql;

-- Use it
SELECT * FROM get_users_by_status('active');
```

### Function with Multiple Parameters

```sql
CREATE OR REPLACE FUNCTION create_user(
  user_name VARCHAR,
  user_email VARCHAR,
  user_age INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
  new_id INTEGER;
BEGIN
  INSERT INTO users (name, email, age)
  VALUES (user_name, user_email, user_age)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Use it
SELECT create_user('John', 'john@example.com', 30);
```

### Stored Procedure (PostgreSQL 11+)

Procedures don't return values, used for operations.

```sql
CREATE OR REPLACE PROCEDURE deactivate_old_users(days_old INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users
  SET status = 'inactive'
  WHERE last_login < NOW() - (days_old || ' days')::INTERVAL;

  COMMIT;
END;
$$;

-- Call it
CALL deactivate_old_users(90);
```

### Drop Function/Procedure

```sql
DROP FUNCTION get_user_count();
DROP PROCEDURE deactivate_old_users(INTEGER);
```

---

## Backup & Restore

### Backup Database

```bash
# Full backup (SQL format)
pg_dump recnik > backup.sql

# Compressed backup
pg_dump recnik | gzip > backup.sql.gz

# Custom format (smaller, faster restore)
pg_dump -Fc recnik > backup.dump

# Specific table only
pg_dump -t users recnik > users_backup.sql

# Data only (no schema)
pg_dump --data-only recnik > data_only.sql

# Schema only (no data)
pg_dump --schema-only recnik > schema_only.sql
```

### Restore Database

```bash
# From SQL file
psql recnik < backup.sql

# From compressed file
gunzip -c backup.sql.gz | psql recnik

# From custom format
pg_restore -d recnik backup.dump

# Create database and restore
createdb recnik_restored
pg_restore -d recnik_restored backup.dump
```

---

## Quick Reference

### psql Commands

| Command | Description |
|---------|-------------|
| `\l` | List databases |
| `\c dbname` | Connect to database |
| `\dt` | List tables |
| `\d tablename` | Describe table |
| `\di` | List indexes |
| `\df` | List functions |
| `\du` | List users/roles |
| `\x` | Toggle expanded display |
| `\timing` | Toggle query timing |
| `\q` | Quit |

### Common SQL

```sql
-- Create
CREATE DATABASE name;
CREATE TABLE name (columns);
INSERT INTO table VALUES (...);

-- Read
SELECT * FROM table WHERE condition;
SELECT COUNT(*) FROM table;

-- Update
UPDATE table SET column = value WHERE condition;
ALTER TABLE table ADD COLUMN name TYPE;

-- Delete
DELETE FROM table WHERE condition;
DROP TABLE table;
DROP DATABASE name;

-- Joins
SELECT * FROM a JOIN b ON a.id = b.a_id;
SELECT * FROM a LEFT JOIN b ON a.id = b.a_id;
```

### Connection Strings

```
# Local (no password)
postgresql://localhost:5432/dbname

# Local with user
postgresql://username@localhost:5432/dbname

# With password
postgresql://username:password@localhost:5432/dbname

# Remote
postgresql://username:password@hostname:5432/dbname

# With options
postgresql://username:password@hostname:5432/dbname?sslmode=require
```
