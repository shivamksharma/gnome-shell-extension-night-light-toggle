# Testing

## Automated

```bash
./tests/run-tests.sh          # unit tests + preferences smoke test (needs gjs)
./scripts/validate.sh         # repository, schema, metadata, packaging checks
```

## Container lifecycle test

The `tests/container/` harness loads a built package into a real GNOME Shell
running headless inside a container and cycles enable/disable three times. It
checks that the Shell reaches enable and disable states cleanly, that the
extension reports no error, and that the Shell log has no `JS ERROR` /
`Gjs-CRITICAL`.

```bash
./tests/container/run-extension-test.sh <container> <zip> <uuid>

# examples
./tests/container/run-extension-test.sh gnome43 dist/night-light-toggle-legacy.zip night-light-toggle@shivamksharma.github.io
./tests/container/run-extension-test.sh gnome44 dist/night-light-toggle-legacy.zip night-light-toggle@shivamksharma.github.io
./tests/container/run-extension-test.sh gnome46 dist/night-light-toggle-modern.zip  night-light-toggle@shivamksharma.github.io
./tests/container/run-extension-test.sh gnome48 dist/night-light-toggle-modern.zip  night-light-toggle@shivamksharma.github.io
./tests/container/run-extension-test.sh gnome50 dist/night-light-toggle-modern.zip  night-light-toggle@shivamksharma.github.io
```

`setup-container.sh <image> <name>` creates a container if one is missing. The
container must have GNOME Shell, `gjs`, `glib-compile-schemas`, `dbus-run-session`,
`gnome-extensions` and `unzip` installed.

The container images used during the audit were Debian/Ubuntu with GNOME 43, 44,
46, 48 and 50. Debian-based images occasionally killed the headless Mutter during
a cycle; repeated runs and a no-op control extension confirmed that is an
environment flake, not an extension error.

The harness only covers lifecycle. The following still need a manual interactive
check in a real session:

* The moon icon appears in the top bar.
* Left click toggles Night Light; the icon dims when off and brightens when on.
* Right click opens the preferences window.
* The colour temperature slider changes the screen warmth (1700–4700 K).
* The native GNOME Night Light top-bar icon is hidden while the extension's icon
  is shown, and returns when `Show indicator` is turned off.
* Toggling Night Light from GNOME's own quick settings updates the extension icon.
* `Restore Night Light state on disable` puts the schedule and enabled state back
  when the extension is disabled, and `restore-state = false` keeps them.
