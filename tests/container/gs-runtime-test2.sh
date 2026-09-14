#!/usr/bin/env bash
#
# Inner runtime test for run-extension-test.sh. It runs inside the container's
# private D-Bus session started with dbus-run-session.
#
# Environment (set by run-extension-test.sh):
#   EXT_UUID, SHELL_LOG, XDG_* dirs, GSETTINGS_BACKEND=memory
#
# Prints "shell ready", one "cycle N enabled=... disabled=..." line per cycle
# and a final "RESULT: PASS|FAIL". Exit status is 0 on PASS.
set -u

UUID="${EXT_UUID:?EXT_UUID is required}"
LOG="${SHELL_LOG:-/tmp/shell.log}"
mkdir -p "$(dirname "$LOG")"

# Some container images cannot create the X11 socket dir, and newer GNOME
# deprecates X11. Run headless without Xwayland when the option exists.
SHELL_ARGS="--headless"
if gnome-shell --help 2>&1 | grep -q -- "--no-x11"; then
    SHELL_ARGS="--headless --no-x11"
fi

gnome-shell $SHELL_ARGS >"$LOG" 2>&1 &
SP=$!

shell_up=0
for _ in $(seq 1 40); do
    if gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell \
        --method org.freedesktop.DBus.Peer.Ping >/dev/null 2>&1; then
        shell_up=1
        break
    fi
    sleep 1
done
echo "shell ready=$shell_up"
if [ "$shell_up" != 1 ]; then
    tail -20 "$LOG"
    kill "$SP" 2>/dev/null
    exit 1
fi

for _ in $(seq 1 20); do
    gnome-extensions list >/dev/null 2>&1 && break
    sleep 1
done

pass=1
for n in 1 2 3; do
    gnome-extensions enable "$UUID" >/dev/null 2>&1
    sleep 2
    estate=$(gnome-extensions info "$UUID" 2>&1 |
        sed -n 's/^[[:space:]]*State:[[:space:]]*//p')
    gnome-extensions disable "$UUID" >/dev/null 2>&1
    sleep 2
    dstate=$(gnome-extensions info "$UUID" 2>&1 |
        sed -n 's/^[[:space:]]*State:[[:space:]]*//p')
    echo "cycle $n enabled=$estate disabled=$dstate"
    # GNOME 46+ reports ACTIVE/INACTIVE for state 1/2.
    case "$estate" in
        ENABLED | ACTIVE) ;;
        *) pass=0 ;;
    esac
    case "$dstate" in
        DISABLED | INACTIVE) ;;
        *) pass=0 ;;
    esac
done

err=$(gnome-extensions info "$UUID" 2>&1 |
    sed -n 's/^[[:space:]]*Error:[[:space:]]*//p')
if [ -n "$err" ]; then
    echo "error field: $err"
    pass=0
fi

if grep -qE "JS ERROR|Gjs-CRITICAL" "$LOG"; then
    echo "log errors:"
    grep -nE "JS ERROR|Gjs-CRITICAL" "$LOG" | head -5
    pass=0
fi

kill "$SP" 2>/dev/null
wait "$SP" 2>/dev/null

if [ "$pass" = 1 ]; then
    echo "RESULT: PASS"
    exit 0
fi
echo "RESULT: FAIL"
exit 1
