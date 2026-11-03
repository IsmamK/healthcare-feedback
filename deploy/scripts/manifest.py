import datetime
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from importlib.util import module_from_spec, spec_from_file_location

spec = spec_from_file_location("release_validation", Path(__file__).with_name("validate-release.py"))
module = module_from_spec(spec)
spec.loader.exec_module(module)
release = Path(sys.argv[1])
data = module.read_release(release / "images.env")
data.update(timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(), health="verified", config=str(release))
print(json.dumps(data, indent=2))
