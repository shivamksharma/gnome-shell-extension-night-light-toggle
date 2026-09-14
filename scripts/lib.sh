#!/usr/bin/env bash
# Shared helpers for the Night Light Toggle build scripts.
# shellcheck shell=bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

SCHEMA_ID="org.gnome.shell.extensions.nightlighttoggle"
UUID="night-light-toggle@shivamksharma.github.io"

info() { printf '  %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
fail() { printf 'error: %s\n' "$*" >&2; exit 1; }

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

# build_package <legacy|modern>
build_package() {
    local variant="$1"
    local src_dir="$ROOT_DIR/src/$variant"
    local meta="$ROOT_DIR/metadata/$variant.json"
    local stage="$DIST_DIR/$variant"
    local zip_path="$DIST_DIR/night-light-toggle-$variant.zip"

    [ -d "$src_dir" ] || fail "missing source directory: $src_dir"
    [ -f "$meta" ] || fail "missing metadata: $meta"

    rm -rf "$stage" "$zip_path"
    mkdir -p "$stage/schemas"

    cp "$src_dir"/*.js "$stage/"
    cp "$meta" "$stage/metadata.json"
    cp "$ROOT_DIR/schemas/$SCHEMA_ID.gschema.xml" "$stage/schemas/"
    cp "$ROOT_DIR/LICENSE" "$stage/"

    ( cd "$stage" && zip -q -r -X "$zip_path" . )
    rm -rf "$stage"

    info "built $(basename -- "$zip_path")"
}
