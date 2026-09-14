#!/usr/bin/env bash
# Build the GNOME 45+ (ESModule) package.
set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command zip
mkdir -p "$DIST_DIR"

info "building modern package (GNOME 45+)"
build_package modern
