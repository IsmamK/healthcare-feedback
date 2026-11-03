"""Plan partial builds against the actual deployed Git SHA, including missing images."""
import json
import os
import subprocess
from pathlib import Path


def plan(paths, previous, missing=(), force=False):
    first = not previous
    backend = first or force or "backend" in missing or any(path.startswith("backend/") for path in paths)
    frontend = first or force or "frontend" in missing or any(path.startswith("frontend/") for path in paths)
    infrastructure = any(
        (path.startswith(("deploy/", ".github/workflows/")) and not path.endswith(".md"))
        or path == ".gitattributes"
        for path in paths
    )
    return {"backend": backend, "frontend": frontend, "deploy": backend or frontend or infrastructure}


if __name__ == "__main__":
    previous_path = Path(os.environ["PREVIOUS_RELEASE"])
    previous = dict(line.split("=", 1) for line in previous_path.read_text().splitlines() if line)
    paths, missing = [], []
    if previous:
        try:
            subprocess.run(["git", "cat-file", "-e", previous["GIT_SHA"]], check=True, capture_output=True)
            paths = subprocess.check_output(
                ["git", "diff", "--name-only", previous["GIT_SHA"], os.environ["GITHUB_SHA"]], text=True
            ).splitlines()
        except (KeyError, subprocess.CalledProcessError):
            previous = {}
        for service in ("backend", "frontend"):
            ref = previous.get(f"{service.upper()}_IMAGE", "")
            if not ref or subprocess.run(["docker", "buildx", "imagetools", "inspect", ref], capture_output=True).returncode:
                missing.append(service)
    result = plan(paths, previous, missing, os.environ.get("FORCE_REBUILD") == "true")
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        for key, value in result.items():
            output.write(f"{key}={str(value).lower()}\n")
        for service in ("backend", "frontend"):
            output.write(f"previous_{service}={previous.get(f'{service.upper()}_IMAGE', '')}\n")
    print(json.dumps(result))
