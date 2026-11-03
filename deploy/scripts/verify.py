"""Verify real HTTPS routes, assets, public survey data and staff access boundaries."""
import json
import re
import sys
import urllib.error
import urllib.request


def get(url, expected=200):
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            status, data = response.status, response.read()
            if not response.url.startswith("https://"):
                raise RuntimeError("Unexpected insecure redirect")
    except urllib.error.HTTPError as error:
        status, data = error.code, error.read()
    if status != expected:
        raise RuntimeError(f"Unexpected HTTP {status} at {url}; expected {expected}")
    return data


if __name__ == "__main__":
    frontend, api = sys.argv[1:3]
    html = get(f"https://{frontend}/").decode()
    assets = re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html)
    if not assets:
        raise RuntimeError("Frontend HTML has no built assets")
    for asset in assets:
        get(f"https://{frontend}{asset}")
    get(f"https://{frontend}/login")
    if json.loads(get(f"https://{api}/backend/health/ready/"))["status"] != "ready":
        raise RuntimeError("API not ready")
    for endpoint in ("questions", "doctors"):
        data = json.loads(get(f"https://{api}/backend/api/{endpoint}/"))
        items = data if isinstance(data, list) else data.get("results", [])
        if not items:
            raise RuntimeError(f"No {endpoint}; initialize or import production data first")
    get(f"https://{api}/backend/api/feedback/", expected=401)
    get(f"https://{api}/backend/api/dashboard/analytics/", expected=401)
    print("HTTPS, built assets, readiness, survey data and staff access checks passed")
