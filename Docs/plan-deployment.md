# Plan: Deploy Recnik Online

## Current App Profile

- **Framework**: Next.js 16.1.4 (App Router, server components + 5 API routes)
- **Database**: PostgreSQL via Prisma 7.3.0 — 115 MB, ~71K words
- **Styling**: TailwindCSS 4
- **No auth**: Public read-only dictionary site
- **No file uploads**: Static content from database

---

## Option A: Free Cloud Hosting (Render + Neon)

**Best for**: Zero cost, zero maintenance, automatic SSL.

### Components

| Layer | Service | Free Tier Limits |
|-------|---------|-----------------|
| App hosting | **Render** (free web service) | 512 MB RAM, 0.1 CPU, spins down after ~15 min idle, 100 GB bandwidth/mo |
| Database | **Neon PostgreSQL** (free) | 0.5 GB storage (115 MB fits), 190 compute hours/mo, auto-suspend after 5 min idle |
| Domain | Custom domain via Render | Free SSL via Let's Encrypt |

### Why Not Render PostgreSQL?

Render's free PostgreSQL expires after 30 days and is then deleted. Their paid DB starts at $6/mo. Neon's free tier is persistent with no expiration — much better fit.

### Steps

1. **Set up Neon database**:
   - Sign up at neon.tech (GitHub login works)
   - Create a project (region: eu-central-1 for proximity to Serbia, or us-east-1)
   - Get the connection string: `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/recnik?sslmode=require`
   - Run migrations locally against Neon: `DATABASE_URL="<neon_url>" npx prisma migrate deploy`
   - Import data: `DATABASE_URL="<neon_url>" npx tsx scripts/import-matica-only.ts`

2. **Prepare the repo**:
   - Initialize git repo, push to GitHub
   - Create `.env.example` with placeholder values
   - Ensure `.gitignore` excludes `.env`, `data/raw/`, `data/processed/`
   - Add a `render.yaml` (blueprint) or configure manually in dashboard

3. **Create Render Web Service**:
   - In Render dashboard: New → Web Service → connect GitHub repo
   - **Runtime**: Node
   - **Build command**: `npm ci && npx prisma generate && npm run build`
   - **Start command**: `npm start`
   - **Instance type**: Free
   - **Environment variable**: `DATABASE_URL` = Neon connection string

4. **Custom domain** (optional):
   - Add domain in Render dashboard → get CNAME record
   - Point your domain's DNS to the Render CNAME
   - Render auto-provisions SSL via Let's Encrypt

### Optional: `render.yaml` Blueprint

Place in repo root for one-click deploy:
```yaml
services:
  - type: web
    name: recnik
    runtime: node
    plan: free
    buildCommand: npm ci && npx prisma generate && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        sync: false  # set manually in dashboard (secret)
      - key: NODE_ENV
        value: production
```

### Cost: $0/month

### Limitations

- **Render free tier spins down after ~15 min idle** → cold start takes 30-60 seconds (slower than Vercel because it restarts the whole Node process, not just a serverless function)
- **Neon auto-suspends after 5 min idle** → additional ~1-2s cold start on the database side
- Combined worst case: first visitor after long idle waits ~30-60s (Render spin-up) + ~1-2s (Neon wake)
- Render free tier: 512 MB RAM, 0.1 CPU — sufficient for a dictionary site with low traffic
- 100 GB bandwidth/mo

### Mitigating Cold Starts

- **Cron ping**: Use a free cron service (cron-job.org, UptimeRobot free tier) to hit the site every 14 minutes, keeping both Render and Neon awake
- This effectively eliminates cold starts at zero cost

### Alternative Free Databases

If Neon's cold starts are an issue:
- **Supabase** (free): 500 MB storage, pauses after 7 days of inactivity on free tier
- **Railway** (trial): $5 free credit, no auto-suspend, but credit runs out

---

## Option B: Self-Hosted Web Server

**Best for**: Full control, no vendor limits, no cold starts, can add inflection data without worrying about DB size.

### Minimal Setup (Single VPS or Home Server)

#### Hardware Requirements
- **CPU**: 1 core sufficient
- **RAM**: 1 GB minimum (512 MB for app + 512 MB for PostgreSQL)
- **Disk**: 2 GB minimum (OS + app + 115 MB database, room to grow)

#### Software Stack

```
[Internet] → [Nginx reverse proxy] → [Next.js app :3000] → [PostgreSQL :5432]
              (SSL termination)        (Node.js process)
```

#### Steps

1. **Prepare the app for standalone mode**:

   In `next.config.ts`:
   ```ts
   const nextConfig: NextConfig = {
     output: "standalone",
   };
   ```
   This creates a self-contained build in `.next/standalone/` (~50 MB) that doesn't need `node_modules`.

2. **Create a Dockerfile**:

   ```dockerfile
   FROM node:22-alpine AS builder
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci
   COPY . .
   RUN npx prisma generate
   RUN npm run build

   FROM node:22-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   COPY --from=builder /app/public ./public
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

3. **Create `docker-compose.yml`**:

   ```yaml
   services:
     db:
       image: postgres:17-alpine
       environment:
         POSTGRES_DB: recnik
         POSTGRES_USER: recnik
         POSTGRES_PASSWORD: ${DB_PASSWORD}
       volumes:
         - pgdata:/var/lib/postgresql/data
       ports:
         - "127.0.0.1:5432:5432"

     app:
       build: .
       environment:
         DATABASE_URL: postgresql://recnik:${DB_PASSWORD}@db:5432/recnik
       ports:
         - "127.0.0.1:3000:3000"
       depends_on:
         - db

   volumes:
     pgdata:
   ```

4. **Set up Nginx** (on host or as another container):

   ```nginx
   server {
       listen 80;
       server_name recnik.yourdomain.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl;
       server_name recnik.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/recnik.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/recnik.yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

5. **SSL**: Use Let's Encrypt with certbot for free certificates

6. **Deploy & import data**:
   ```bash
   docker compose up -d
   # Run migrations
   docker compose exec app npx prisma migrate deploy
   # Import data (copy script + data into container, or run locally pointing at the DB)
   ```

#### Cheap VPS Options (if no home server)

| Provider | Plan | Price | Specs |
|----------|------|-------|-------|
| Hetzner | CX22 | ~€4/mo | 2 vCPU, 4 GB RAM, 40 GB disk |
| Oracle Cloud | Free tier | $0 | 1 vCPU, 1 GB RAM, 50 GB disk (always free) |
| Contabo | VPS S | ~€6/mo | 4 vCPU, 8 GB RAM, 50 GB disk |

Oracle Cloud free tier is genuinely free forever (ARM instance) but setup is more involved.

#### Without Docker (simpler, fewer layers)

If you prefer not using Docker:
```bash
# On the server
sudo apt install postgresql nginx certbot
git clone <repo>
cd recnik
npm ci
npx prisma migrate deploy
npm run build
# Use pm2 or systemd to keep the app running
pm2 start npm --name recnik -- start
```

---

## Recommendation

**Start with Option A (Render + Neon)**. It's free, you already have a Render account, and it handles SSL automatically. The 115 MB database fits well within Neon's 500 MB free limit. Use a free cron ping service to avoid cold starts. If the site grows or you want to add inflection data (which would push past free DB limits), migrate to Option B.

## Pre-Deployment Checklist (applies to both options)

- [ ] Initialize git repo and push to GitHub
- [ ] Create `.env.example` with placeholder values
- [ ] Add `.gitignore` entries for `data/raw/`, `data/processed/`, `.env`
- [ ] Verify `npm run build` succeeds locally
- [ ] Test production mode locally: `npm run build && npm start`
- [ ] Decide on domain name
