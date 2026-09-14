#!/usr/bin/env bash
# Build and install the package matching the running GNOME Shell version.
set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command gnome-shell
require_command gnome-extensions

version="$(gnome-shell --version | grep -oE '[0-9]+' | head -n1)"
if [ -z "$version" ]; then
    fail "could not determine the GNOME Shell version"
fi

if [ "$version" -ge 45 ]; then
    variant="modern"
else
    variant="legacy"
fi

bash "$ROOT_DIR/scripts/build-$variant.sh"
gnome-extensions install --force "$DIST_DIR/night-light-toggle-$variant.zip"

info "installed the $variant package for GNOME Shell $version"
info "log out and back in (Wayland), or restart the Shell (X11), then enable the extension"
