#!/usr/bin/env bash
# Build the GNOME 41-44 (classic GJS) package.
set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command zip
mkdir -p "$DIST_DIR"

info "building legacy package (GNOME 41-44)"
build_package legacy
