#!/usr/bin/env bash
# Run the NightLightController unit tests and the preferences smoke test.
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

command -v gjs >/dev/null 2>&1 || {
    printf 'error: gjs is required to run the tests\n' >&2
    exit 1
}

cd "$ROOT_DIR"

echo "== legacy controller tests (classic GJS) =="
gjs tests/test-nightlight-legacy.js

echo "== modern controller tests (ESM) =="
gjs -m tests/test-nightlight-modern.js

echo "== legacy native indicator suppressor tests =="
gjs "$ROOT_DIR/tests/test-native-indicator-legacy.js"

if [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ] && command -v glib-compile-schemas >/dev/null 2>&1; then
    schema_dir="$(mktemp -d)"
    cp "$ROOT_DIR"/schemas/*.xml "$schema_dir/"
    glib-compile-schemas "$schema_dir"

    echo "== legacy preferences smoke test =="
    GSETTINGS_SCHEMA_DIR="$schema_dir" gjs "$ROOT_DIR/tests/test-prefs-legacy.js"

    rm -rf "$schema_dir"
else
    echo "== legacy preferences smoke test skipped (needs a display and glib-compile-schemas) =="
fi
