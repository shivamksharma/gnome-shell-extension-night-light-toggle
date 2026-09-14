#!/usr/bin/env bash
# Build both the legacy and modern packages into dist/.
set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command zip
mkdir -p "$DIST_DIR"

build_package legacy
build_package modern
