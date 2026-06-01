# Incident Tracker API

A RESTful API for tracking and managing incidents. Built with Node.js, Express, and PostgreSQL, containerized with Docker, and deployed to AWS EC2 with an automated CI/CD pipeline via GitHub Actions.

Every push to `main` runs tests automatically — if they pass, the app deploys to EC2. If they fail, the deploy is blocked.

## Tech Stack

- **Runtime:** Node.js 18
- **Framework:** Express
- **Database:** PostgreSQL 16
- **Containerization:** Docker + Docker Compose
- **Cloud:** AWS EC2 (t3.micro, Ubuntu)
- **CI/CD:** GitHub Actions
- **Reverse Proxy:** Nginx
- **SSL:** Certbot / Let's Encrypt
- **Domain:** Porkbun

## Architecture

```
push to main
     ↓
GitHub Actions
     ↓
run tests against temporary Postgres container
     ↓
tests pass → SSH into EC2 → git pull → docker-compose up
tests fail → deploy blocked
```

## Development Workflow

Changes are made locally and deployed to EC2 automatically via GitHub Actions.

### Local setup

```bash
git clone https://github.com/yennhio/cicd-app.git
cd cicd-app
npm install
```

### Making changes

```bash
# make your changes
vim src/routes/incidents.js

# commit and push
git add .
git commit -m "your message"
git push
```

After pushing, GitHub Actions takes over — runs tests, and if they pass deploys to EC2 automatically. You never SSH into EC2 to deploy manually.

## Deploying to AWS

### 1. Launch an EC2 instance

- AMI: **Ubuntu 22.04 LTS**
- Instance type: **t3.micro**
- Create or select a key pair — save the `.pem` file somewhere safe
- In the security group, open these inbound ports:

| Port | Protocol | Purpose |
| ---- | -------- | ------- |
| 22   | TCP      | SSH     |
| 80   | TCP      | HTTP    |
| 443  | TCP      | HTTPS   |
| 3000 | TCP      | App     |

### 2. SSH into the instance

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### 3. Install Docker and Docker Compose

```bash
# update packages
sudo apt update && sudo apt upgrade -y

# install Docker
sudo apt install -y docker.io

# install Docker Compose
sudo apt install -y docker-compose

# allow ubuntu user to run Docker without sudo
sudo usermod -aG docker ubuntu

# log out and back in for group change to take effect
exit
```

SSH back in, then verify:

```bash
docker --version
docker-compose --version
```

### 4. Install Git and clone the repo

This is a one time step. After this, GitHub Actions handles all future updates via `git pull` — you never need to SSH in to deploy again.

```bash
sudo apt install -y git
git clone https://github.com/yennhio/cicd-app.git
cd cicd-app
```

### 5. Set up environment variables

```bash
cp .env.example .env
vim .env
```

Fill in your values:

```
DB_HOST=db
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=incidents

POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_DB=incidents
```

### 6. Start the app

```bash
docker-compose up -d --build
```

The API will be available at `http://<EC2_PUBLIC_IP>:3000`.

### 7. Install and configure Nginx

Nginx acts as a reverse proxy — it receives traffic on port 80/443 and forwards it to your app on port 3000.

```bash
sudo apt install -y nginx
```

Create a config file for your site:

```bash
sudo vim /etc/nginx/sites-available/your-app
```

Add this:

```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    listen 80;
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/your-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Set up HTTPS with Certbot

Certbot provisions a free SSL certificate from Let's Encrypt and automatically updates your Nginx config to use it.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot handles everything — updates Nginx to listen on 443, adds the SSL certificate, and sets up automatic HTTP → HTTPS redirects. Certificates auto-renew every 90 days.

After this your app is accessible at `https://your-domain.com`.

### 9. Point your domain to EC2

In Porkbun (or any DNS provider), add an **A record** pointing your domain to your EC2 public IP:

```
Type: A
Host: @  (or subdomain like 'bean')
Value: <EC2_PUBLIC_IP>
TTL: 300
```

### 10. Set up GitHub Actions secrets

In your GitHub repo go to **Settings → Secrets and variables → Actions** and add:

| Secret     | Value                             |
| ---------- | --------------------------------- |
| `EC2_HOST` | Your EC2 public IP                |
| `EC2_USER` | `ubuntu`                          |
| `EC2_KEY`  | Full contents of your `.pem` file |

After this every push to `main` will automatically test and deploy.

## API Reference

### Health Check

```bash
curl https://your-domain.com/health
```

```json
{ "status": "ok" }
```

### Create an Incident

```bash
curl -X POST https://your-domain.com/incidents \
  -H "Content-Type: application/json" \
  -d '{"title": "Server down", "severity": "high"}'
```

```json
{
  "id": 1,
  "title": "Server down",
  "severity": "high",
  "status": "open",
  "created_at": "2026-05-31T19:00:00.000Z"
}
```

### List All Incidents

```bash
curl https://your-domain.com/incidents
```

### Update Incident Status

```bash
curl -X PATCH https://your-domain.com/incidents/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}'
```

## Database Schema

```sql
CREATE TABLE incidents (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  severity   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);
```

Schema is created automatically on startup via `src/db/init.js`. Data persists across deploys via a named Docker volume.

## Project Structure

```
cicd-app/
├── app.js                  # Express app
├── server.js               # Entry point
├── docker-compose.yml      # Container orchestration
├── Dockerfile              # App image
├── .env.example            # Environment variable template
├── tests/
│   └── incidents.test.js   # Jest + Supertest API tests
└── src/
    ├── db/
    │   ├── db.js           # PostgreSQL connection pool
    │   └── init.js         # DB retry logic + schema init
    └── routes/
        └── incidents.js    # Route handlers
```

## Running Tests Locally

```bash
npm install
npm test
```

Requires a local Postgres instance with a database called `incidents_test`. Tests create and tear down their own data — your real database is never touched.
