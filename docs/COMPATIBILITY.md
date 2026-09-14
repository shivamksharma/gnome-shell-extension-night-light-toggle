# Compatibility

Night Light Toggle ships two implementations of the same extension from a single
code base and a single UUID:

| Layer | Directory | Module system | GNOME Shell |
| ----- | --------- | ------------- | ----------- |
| Legacy | `src/legacy/` | classic GJS (`imports.*`) | 41–44 |
| Modern | `src/modern/` | ESModules (`import`) | 45+ |

GNOME Shell 45 replaced the classic `imports.*` module system with ESModules and
removed `imports.misc.extensionUtils`. There is no way to load the modern code on
GNOME 44 or older, and no way to load the legacy code on GNOME 45 or newer. Two
packages built from the same repository is therefore the only correct approach.
The shared night-light logic is deliberately kept free of GObject, Shell and GTK
dependencies so both variants implement the same behaviour.

## Support matrix

| GNOME | Implementation | Status | Tested |
| ----- | -------------- | ------ | ------ |
| 41 | Legacy | Supported | No |
| 42 | Legacy | Supported | Yes |
| 43 | Legacy | Supported | No |
| 44 | Legacy | Supported | No |
| 45 | Modern | Supported | No |
| 46 | Modern | Supported | No |
| 47 | Modern | Supported | No |
| 48 | Modern | Supported | No |
| 49 | Modern | Supported | No |
| 50 | Modern | Supported | No |
| 51 | Modern | Supported (development release at audit time) | No |

* **Supported** means the implementation is intentionally written for that
  release and the APIs it uses are present and stable there. It does not mean
  the extension has been run on that release.
* **Tested** means the code was actually executed. See [Testing](#testing).
* GNOME 51 was in release candidate at the time of this audit. It is the single
  development release allowed by the EGO guidelines. If the metadata is not
  expected to include a development release, remove `51` from
  `metadata/modern.json`.

## Testing

The audit was performed on **GNOME Shell 42.9 with GJS 1.72.4, GTK 4.6 and
libadwaita 1.1**, so only the legacy layer could be exercised locally.

What was actually executed:

* `tests/run-tests.sh` — the shared `NightLightController` state machine
  (toggle override, restore, external-change preservation, temperature clamping)
  passed for both the legacy and the modern implementation.
* `tests/test-native-indicator-legacy.js` — the legacy private-API suppressor
  was tested against a fake Night Light indicator: hiding, proxy updates,
  cleanup, object recreation and a missing indicator.
* `tests/test-prefs-legacy.js` — the real GNOME 41–44 preferences module was
  loaded under GTK 4.6 and libadwaita 1.1, and both `buildPrefsWidget()` and
  `fillPreferencesWindow()` were constructed without error.
* A **live integration test** on an isolated nested GNOME 42.9 Shell started in
  Xephyr with throwaway `XDG_DATA_HOME`, `XDG_CONFIG_HOME` and D-Bus session. A
  helper extension drove the real indicator event handler and it verified:
  enable, disable, rapid re-enable, toggle ON/OFF/ON, `restore-state = true`
  (original schedule and enabled state restored), `restore-state = false`
  (changes kept), toggling while Night Light was already on, and repeated
  `show-indicator` changes (native suppression install/restore). The extension
  produced no JS errors and the Shell stayed alive and responsive. The nested
  Mutter compositor used for this was unstable between runs, so this check is
  not shipped as an automated test.
* Manual check in the real GNOME 42.9 session: the package installs, loads on
  Shell restart, shows the panel indicator and toggles Night Light.
* `node --check` parsed every source file with its correct module syntax.
* `glib-compile-schemas --strict --dry-run` validated the GSettings schema, and
  a compiled copy was loaded with `GSETTINGS_SCHEMA_DIR` to check keys and
  defaults.

Bugs found and fixed by this testing:

* The legacy extension object had no `metadata` property, so the indicator
  constructor threw `TypeError: extension.metadata is undefined`.
* Legacy preferences used `Adw.SwitchRow`, which does not exist before
  libadwaita 1.2 (GNOME 42), so GNOME 42 preferences would have failed.

What was not executed and therefore is not claimed as tested:

* Running the extension on GNOME 41, 43–51.
* Running the modern ESM package inside GNOME Shell 45+.
* Rendering the preferences window (its widgets are constructed by the smoke
  test, but no window was displayed).
* Session logout/login and the native Night Light quick settings menu.

## API transition boundary

GNOME 44 → 45 is the only hard break:

* `imports.*` → ESModules.
* `imports.misc.extensionUtils.getSettings()` → `Extension.getSettings()`.
* `init()` / `enable()` / `disable()` → `export default class extends Extension`.
* `buildPrefsWidget()` / `fillPreferencesWindow()` with classic imports →
  `export default class extends ExtensionPreferences`.

GNOME 43 removed the aggregate menu; the legacy layer finds the native Night
Light indicator on `quickSettings` first and falls back to `aggregateMenu` for
41–42. GNOME 45–51 keep the quick settings layout used by the modern layer.

## Package selection on extensions.gnome.org

EGO supports multiple packages for one extension. Upload:

* `dist/night-light-toggle-legacy.zip` for GNOME 41–44.
* `dist/night-light-toggle-modern.zip` for GNOME 45–51.

Do not upload the repository zip or a package containing both source trees; the
metadata `shell-version` values would then be wrong for one of the releases.

## extensions.gnome.org identity

The extension is published on extensions.gnome.org as
[extension 9142](https://extensions.gnome.org/extension/9142/night-light-toggle/),
with active packages for GNOME 42–44 and 45–49.

EGO identifies an extension by its UUID, so this repository uses the same UUID as
the published listing: **`nightlighttoggle@sam`** (see `metadata/legacy.json` and
`metadata/modern.json`). Packages built here therefore update listing 9142
instead of creating a new extension.

The published packages declared the schema `gettext-domain`
`nightlighttoggle@sam`. This repository does not ship or require translations, so
`gettext-domain` is omitted; the GSettings schema ID and path are unchanged.

## Known limitations

* The restore snapshot lives in memory. A change made by the extension survives a
  crash or a full session restart and cannot be restored after the process is
  gone. Disabling the extension normally always restores it.
* The extension hides only GNOME's small top-bar Night Light icon while its own
  indicator is shown. It never removes the native quick settings toggle, so
  Night Light remains reachable through GNOME's own UI.
* The private Shell properties used for that suppression are documented in
  [`PRIVATE-API.md`](PRIVATE-API.md).
