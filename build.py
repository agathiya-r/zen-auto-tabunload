"""Package only extension runtime files; no external dependencies."""
from pathlib import Path
import json
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
root = Path(__file__).resolve().parent
extension = root / 'extension'
version = json.loads((extension / 'manifest.json').read_text())['version']
output = root / 'dist' / f'zen-idle-unloader-{version}.xpi'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as package:
    for path in sorted(extension.rglob('*')):
        if path.is_file() and not path.name.startswith('.'):
            entry = ZipInfo(path.relative_to(extension).as_posix(), (2026, 1, 1, 0, 0, 0))
            entry.compress_type = ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            package.writestr(entry, path.read_bytes())
print(output)
