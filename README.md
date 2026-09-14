# Night Light Toggle

A GNOME Shell extension that adds a one-click Night Light toggle and a colour
temperature slider to the top bar.

* Toggle Night Light from a panel icon, overriding the automatic schedule.
* Adjust the colour temperature (1700 K – 4700 K) without opening Settings.
* Optionally restore the Night Light configuration that was changed while
  toggling when the extension is disabled.

UUID: `nightlighttoggle@sam`

## Supported GNOME versions

| GNOME Shell | Implementation |
| ----------- | -------------- |
| 41–44 | Legacy, classic GJS (`src/legacy/`) |
| 45–51 | Modern, ESModules (`src/modern/`) |

The two implementations are built into two separate packages. See
[`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md) for the full support and test
matrix. No release other than GNOME 42 has been exercised locally; the matrix
states exactly what was and was not verified.

## How it works

Night Light is controlled through GNOME's public
`org.gnome.settings-daemon.plugins.color` GSettings schema. Nothing else is
required for the actual functionality.

When Night Light is switched on, the extension mirrors GNOME's own manual
override: it turns the automatic schedule off and sets the manual schedule to a
full day (00:00 – 24:00) before enabling Night Light. This makes a click on the
icon behave as an immediate, explicit on/off switch instead of being overridden
by the schedule.

While the panel icon is shown, the extension hides GNOME's own small top-bar
Night Light icon so only one Night Light icon is visible. GNOME's quick settings
toggle is left untouched.

### Restore state

The `Restore Night Light state on disable` preference (default on) records every
Night Light key the extension changes the first time it changes it. When the
extension is disabled the recorded values are put back, but only for keys that
still hold the value the extension wrote. A value that was changed again in the
meantime (for example from GNOME Settings) is never overwritten.

When the preference is off, the changes made by the extension are kept when the
extension is disabled.

The colour temperature is a deliberate user preference set from the preferences
window, not a temporary override, so it is never reverted by `restore-state`.

The snapshot lives in memory. Disabling the extension normally always restores
it; a Shell crash or a full session restart while Night Light is overridden
leaves the override in place and cannot be undone automatically.

## Preferences

Open the extension's preferences from GNOME Extensions, Extension Manager, or by
right-clicking the panel icon.

* **Enable Night Light** — the same switch as GNOME's Night Light.
* **Colour temperature** — 1700 K (warm) to 4700 K (cool), matching the range
  used by GNOME Settings.
* **Show indicator in the top bar** — shows or hides the extension's icon and,
  while hidden, leaves GNOME's own icon untouched.
* **Restore Night Light state on disable** — see above.

## Repository layout

```
.
├── extension source
│   ├── src/legacy/     # GNOME 41–44, classic GJS
│   └── src/modern/     # GNOME 45+, ESModules
├── metadata/           # metadata.json templates per implementation
├── schemas/            # GSettings schema (shared)
├── scripts/            # build and validation scripts
├── tests/              # GJS unit tests and metadata validator
├── docs/               # compatibility and private-API documentation
└── dist/               # generated EGO packages (not committed)
```

Each implementation contains:

* `extension.js` / `prefs.js` — the entry points, requiring no Shell internals
  beyond the panel button.
* `indicator.js` — the panel button.
* `nightLight.js` — the dependency-free Night Light controller and temperature
  helpers, shared by `extension.js` and `prefs.js`.
* `nativeIndicator.js` — the documented private-API suppressor for GNOME's own
  top-bar icon.

## Development

Requirements: `bash`, `zip`, `glib-compile-schemas`. `node` is used for syntax
checking when available and `python3` for metadata validation.

```bash
# Run the controller unit tests (both implementations)
./tests/run-tests.sh

# Validate the repository, build both packages and check their contents
./scripts/validate.sh

# Build a single package
./scripts/build-legacy.sh     # dist/night-light-toggle-legacy.zip
./scripts/build-modern.sh     # dist/night-light-toggle-modern.zip
./scripts/build-all.sh
```

Install a built package for local testing:

```bash
gnome-extensions install --force dist/night-light-toggle-modern.zip
# GNOME 41–44:
gnome-extensions install --force dist/night-light-toggle-legacy.zip
```

Then log out and back in (Wayland) or restart the Shell (X11) and enable the
extension. Logs are available from:

```bash
journalctl -f -o cat /usr/bin/gnome-shell   # extension
journalctl -f -o cat /usr/bin/gjs           # preferences
```

## Packaging for extensions.gnome.org

Upload the package that matches the Shell release range:

* GNOME 41–44 → `dist/night-light-toggle-legacy.zip`
* GNOME 45–51 → `dist/night-light-toggle-modern.zip`

Both use the same UUID, so EGO keeps them as versions of one extension. The
packages contain only `metadata.json`, `extension.js`, `prefs.js`, the support
modules, the schema XML and `LICENSE`. Compiled schemas are not shipped; GNOME
and EGO compile them on install.

## Contributing

Issues and pull requests are welcome at
<https://github.com/shivamksharma/gnome-shell-extension-night-light-toggle>.

Please run `./scripts/validate.sh` and `./tests/run-tests.sh` before opening a
pull request, and keep the two implementations in sync when behaviour changes.
This project follows the [GNOME Code of Conduct](https://conduct.gnome.org/).

## License

GNU General Public License v3.0 or later — see [LICENSE](LICENSE).

Not affiliated with or endorsed by the GNOME Project. Community maintained.
