"""Render only this project's vhost; validate all substituted values."""
import re
import sys
from pathlib import Path


def render(path, mode):
    values = {}
    for line in Path(path).read_text().splitlines():
        if line.strip() and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("\"'")
    front, api = (values[key] for key in ("FRONTEND_DOMAIN", "API_DOMAIN"))
    www = values.get("WWW_DOMAIN", "")
    domains = list(dict.fromkeys(filter(None, (front, api, www))))
    for domain in domains:
        if not re.fullmatch(r"[a-z0-9][a-z0-9.-]+[a-z0-9]", domain) or "replace-me" in domain:
            raise ValueError("Invalid domain")
    for key in ("BACKEND_PORT", "FRONTEND_PORT"):
        if not values[key].isdigit() or not 1024 < int(values[key]) < 65536:
            raise ValueError("Invalid port")
    backend, frontend = values["BACKEND_PORT"], values["FRONTEND_PORT"]
    headers = """
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_connect_timeout 5s;
    proxy_read_timeout 65s;
    proxy_redirect off;
"""
    routes = f"""
    client_max_body_size 2m;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    location ~ /\\. {{ deny all; }}
    location = /backend/auth/token/login/ {{
        limit_req zone=healthcare_feedback_login burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:{backend}/auth/token/login/;
        {headers}
    }}
    location /backend/ {{
        proxy_pass http://127.0.0.1:{backend}/;
        {headers}
    }}
"""
    routes += f"""
    location / {{
        proxy_pass http://127.0.0.1:{frontend};
        {headers}
    }}
"""
    result = "# Managed exclusively for healthcare-feedback. Do not edit other vhosts.\n"
    result += "limit_req_zone $binary_remote_addr zone=healthcare_feedback_login:1m rate=10r/m;\n"
    result += f"""
server {{
    listen 80;
    listen [::]:80;
    server_name {' '.join(domains)};
    location ^~ /.well-known/acme-challenge/ {{ root /opt/healthcare-feedback/data/acme; }}
"""
    if mode == "http":
        return result + routes + "}\n"
    if mode != "tls":
        raise ValueError("Expected http or tls")
    result += "    location / { return 301 https://$host$request_uri; }\n}\n"
    certificate = f"""
    ssl_certificate /etc/letsencrypt/live/healthcare-feedback/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/healthcare-feedback/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:healthcare_feedback_tls:1m;
    ssl_session_timeout 1d;
    server_tokens off;
"""
    result += f"""
server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name {' '.join(dict.fromkeys((front, api)))};
{certificate}
{routes}
}}
"""
    if www:
        result += f"""
server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name {www};
{certificate}
    return 301 https://{front}$request_uri;
}}
"""
    return result


if __name__ == "__main__":
    print(render(sys.argv[1], sys.argv[2]), end="")
