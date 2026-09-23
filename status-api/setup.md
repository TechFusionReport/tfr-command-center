# Status API — Oracle Setup

## 1. Install

```bash
mkdir -p /opt/tfr-status
cp collect.py requirements.txt .env.example /opt/tfr-status/
cd /opt/tfr-status && cp .env.example .env
pip3 install -r requirements.txt --break-system-packages
```

## 2. Create output directory

```bash
sudo mkdir -p /var/www/status
sudo chown ubuntu:ubuntu /var/www/status
```

## 3. Test run

```bash
python3 /opt/tfr-status/collect.py
cat /var/www/status/status.json | python3 -m json.tool | head -40
curl -fsS http://localhost:8099/status.json | python3 -m json.tool | head -40
```

## 3.1 Prometheus

Set `PROMETHEUS_URL` to an address reachable from the collector, preferably the internal Docker-network URL `http://prometheus:9090`. Leave `PROMETHEUS_PUBLIC_JOBS` empty to publish aggregate counts only, or set a comma-separated allowlist of safe public job names. Raw labels, instances, scrape URLs, and alert text are never copied into the public observability contract.

## 4. Cron (every 60s)

```bash
crontab -e
# Add:
* * * * * /usr/bin/python3 /opt/tfr-status/collect.py >> /var/log/tfr-status.log 2>&1
```

## 5. Nginx config

```nginx
server {
    listen 8099;
    server_name localhost;
    location /status.json {
        alias /var/www/status/status.json;
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-cache, max-age=0";
    }
}
```

The root path is intentionally not configured; `https://status-api.techfusionreport.com/` may show the nginx welcome page. Validate `/status.json`, which is the supported endpoint.

## 6. Cloudflared tunnel

Add to `/etc/cloudflared/config.yml`:

```yaml
ingress:
  - hostname: status-api.techfusionreport.com
    service: http://localhost:8099
  # ... existing rules ...
  - service: http_status:404
```

Cloudflare DNS → Add CNAME `status-api` → `<tunnel-id>.cfargotunnel.com`, Proxied on.

## 7. Cloudflare Access (optional)

Zero Trust → Access → Applications → Add `status.techfusionreport.com`
- Policy: Allow justin.m.smith158@gmail.com
- Identity provider: One-time PIN

## 8. Cloudflare Pages

1. Pages → Connect to Git → `TechFusionReport/tfr-command-center`
2. Build: Framework = Vite, Command = `npm run build`, Output = `dist`
3. Env var: `VITE_API_URL` = `https://status-api.techfusionreport.com`
4. Custom domain: `status.techfusionreport.com`
