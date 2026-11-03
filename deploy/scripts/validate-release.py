import re
import sys
from pathlib import Path


def read_release(path):
    lines = Path(path).read_text().splitlines()
    fields = dict(line.split("=", 1) for line in lines if line)
    expected = {"BACKEND_IMAGE", "FRONTEND_IMAGE", "GIT_SHA", "CI_RUN_ID", "CI_RUN_ATTEMPT"}
    if set(fields) != expected or len(lines) != len(expected):
        raise ValueError("Unexpected release metadata fields")
    for key in ("BACKEND_IMAGE", "FRONTEND_IMAGE"):
        if not re.fullmatch(r"[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}", fields[key]):
            raise ValueError("Images must use immutable registry digests")
    if not re.fullmatch(r"[a-f0-9]{40}", fields["GIT_SHA"]):
        raise ValueError("Expected full Git SHA")
    for key in ("CI_RUN_ID", "CI_RUN_ATTEMPT"):
        if not re.fullmatch(r"[1-9][0-9]*", fields[key]):
            raise ValueError("Expected numeric CI identity")
    return fields


if __name__ == "__main__":
    read_release(sys.argv[1])
