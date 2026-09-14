#!/usr/bin/env bash
# Create and prepare a GNOME Shell test container.
#
# Usage: setup-container.sh <image> <name>
#
# Example images: debian:12 (GNOME 43), ubuntu:23.04 (GNOME 44),
# ubuntu:24.04 (GNOME 46), debian:13 (GNOME 48), ubuntu:26.04 (GNOME 50).
set -euo pipefail

IMAGE="${1:?usage: setup-container.sh <image> <name>}"
NAME="${2:?usage: setup-container.sh <image> <name>}"

command -v docker >/dev/null 2>&1 || {
    echo "docker not found" >&2
    exit 1
}

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" "$IMAGE" sleep infinity >/dev/null
printf 'created and started %s from %s\n' "$NAME" "$IMAGE"
printf 'install GNOME Shell inside it, then re-run the extension test:\n'
printf '  docker exec -d %s bash -lc "apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends gnome-shell gjs glib2.0-bin dbus unzip"\n' "$NAME"
printf '  docker exec -d %s bash -lc "dnf install -y --setopt=install_weak_deps=False gnome-shell gjs glib2 dbus-tools unzip"\n' "$NAME"
