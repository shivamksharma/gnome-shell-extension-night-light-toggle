#!/usr/bin/env bash
# Validate the repository, the GSettings schema, the JavaScript sources and the
# generated EGO packages. Exits non-zero when any check fails.
set -uo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

FAILURES=0
pass() { printf '  ok   %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAILURES=$((FAILURES + 1)); }
skip() { printf '  skip %s\n' "$*"; }

expect_file() {
    [ -f "$ROOT_DIR/$1" ] && pass "file $1" || bad "missing file $1"
}

echo "== repository structure =="
expect_file README.md
expect_file LICENSE
expect_file docs/COMPATIBILITY.md
expect_file metadata/legacy.json
expect_file metadata/modern.json
expect_file "schemas/${SCHEMA_ID}.gschema.xml"
for variant in legacy modern; do
    for file in extension.js prefs.js indicator.js nightLight.js nativeIndicator.js; do
        expect_file "src/$variant/$file"
    done
done

if [ -f "$ROOT_DIR/schemas/gschemas.compiled" ]; then
    bad "schemas/gschemas.compiled must not be committed"
else
    pass "no compiled schema committed"
fi

echo "== metadata =="
if command -v python3 >/dev/null 2>&1; then
    if python3 "$ROOT_DIR/tests/validate_metadata.py"; then
        pass "metadata templates"
    else
        bad "metadata templates"
    fi
else
    skip "python3 not found, metadata not validated"
fi

echo "== GSettings schema =="
if command -v glib-compile-schemas >/dev/null 2>&1; then
    if glib-compile-schemas --strict --dry-run "$ROOT_DIR/schemas" 2>/dev/null; then
        pass "schema compiles (glib-compile-schemas --strict --dry-run)"
    else
        bad "schema does not compile"
    fi
else
    skip "glib-compile-schemas not found"
fi

if grep -q "previous-enabled-state" "$ROOT_DIR/schemas/${SCHEMA_ID}.gschema.xml"; then
    bad "schema still declares the unused 'previous-enabled-state' key"
else
    pass "schema has no dead keys"
fi

echo "== JavaScript syntax =="
if command -v node >/dev/null 2>&1; then
    for file in "$ROOT_DIR"/src/legacy/*.js; do
        if node --check "$file" 2>/dev/null; then
            pass "syntax $(basename -- "$file") (classic)"
        else
            bad "syntax $(basename -- "$file") (classic)"
        fi
    done
    for file in "$ROOT_DIR"/src/modern/*.js; do
        temp_dir="$(mktemp -d)"
        cp "$file" "$temp_dir/module.mjs"
        if node --check "$temp_dir/module.mjs" 2>/dev/null; then
            pass "syntax $(basename -- "$file") (esm)"
        else
            bad "syntax $(basename -- "$file") (esm)"
        fi
        rm -rf "$temp_dir"
    done
else
    skip "node not found, JavaScript syntax not checked"
fi

echo "== API hygiene =="
if grep -RIlE "imports\.(gi|ui|misc)" "$ROOT_DIR/src/modern" >/dev/null 2>&1; then
    bad "modern code uses classic imports"
else
    pass "modern code uses ESM imports only"
fi

if grep -RIlE "^\s*(import|export)[[:space:]]" "$ROOT_DIR/src/legacy" >/dev/null 2>&1; then
    bad "legacy code uses ESM syntax"
else
    pass "legacy code uses classic GJS syntax only"
fi

if grep -RIlE "gi://(Gtk|Gdk|Adw)" \
    "$ROOT_DIR/src/modern/extension.js" \
    "$ROOT_DIR/src/modern/indicator.js" \
    "$ROOT_DIR/src/modern/nightLight.js" \
    "$ROOT_DIR/src/modern/nativeIndicator.js" >/dev/null 2>&1; then
    bad "shell process code imports GTK/Adw"
else
    pass "shell process code does not import GTK/Adw"
fi

if grep -RIlE "gi://(Clutter|Meta|Shell|St)" \
    "$ROOT_DIR/src/modern/prefs.js" \
    "$ROOT_DIR/src/modern/nightLight.js" >/dev/null 2>&1; then
    bad "preferences code imports GNOME Shell libraries"
else
    pass "preferences code does not import GNOME Shell libraries"
fi

if grep -RIlE "\beval\(|new Function\(|GLib\.spawn|Gio\.Subprocess|Soup\.|GLib\.timeout_add|setTimeout\(" "$ROOT_DIR/src" >/dev/null 2>&1; then
    bad "source contains dynamic code, subprocess or timer usage"
else
    pass "no dynamic code, subprocess or timer usage"
fi

if grep -RIlE "telemetry|analytics|https?://" "$ROOT_DIR/src" >/dev/null 2>&1; then
    bad "source contains network or telemetry references"
else
    pass "no network or telemetry references in source"
fi

echo "== build =="
if bash "$ROOT_DIR/scripts/build-all.sh"; then
    pass "build-all.sh"
else
    bad "build-all.sh"
fi

echo "== packages =="
EXPECTED_FILES="LICENSE
extension.js
indicator.js
metadata.json
nativeIndicator.js
nightLight.js
prefs.js
schemas/${SCHEMA_ID}.gschema.xml"

for variant in legacy modern; do
    zip_path="$DIST_DIR/night-light-toggle-$variant.zip"
    if [ ! -f "$zip_path" ]; then
        bad "missing package $(basename -- "$zip_path")"
        continue
    fi
    pass "package $(basename -- "$zip_path")"

    actual_files="$(unzip -Z1 "$zip_path" 2>/dev/null | grep -v '/$' | sort)"
    if [ "$actual_files" = "$(printf '%s\n' "$EXPECTED_FILES" | sort)" ]; then
        pass "$variant package contents exactly as expected"
    else
        bad "$variant package contents unexpected"
        printf '%s\n' "$actual_files" | sed 's/^/       /'
    fi

    if unzip -Z1 "$zip_path" 2>/dev/null | grep -q "gschemas.compiled"; then
        bad "$variant package ships a compiled schema"
    else
        pass "$variant package ships schema XML only"
    fi

    if unzip -t "$zip_path" >/dev/null 2>&1; then
        pass "$variant zip integrity"
    else
        bad "$variant zip is corrupt"
    fi

    temp_meta="$(mktemp)"
    unzip -p "$zip_path" metadata.json > "$temp_meta" 2>/dev/null
    if command -v python3 >/dev/null 2>&1; then
        if python3 "$ROOT_DIR/tests/validate_metadata.py" --variant "$variant" "$temp_meta"; then
            pass "$variant package metadata"
        else
            bad "$variant package metadata"
        fi
    fi
    rm -f "$temp_meta"
done

echo
if [ "$FAILURES" -eq 0 ]; then
    printf 'All validation checks passed.\n'
    exit 0
fi

printf '%d validation check(s) failed.\n' "$FAILURES" >&2
exit 1
