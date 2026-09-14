# Private GNOME Shell API usage

Night Light Toggle uses two public APIs for all of its actual functionality:

* the `org.gnome.settings-daemon.plugins.color` GSettings schema, to read and
  toggle Night Light;
* the standard `PanelMenu.Button` / `St.Icon` / `Main.panel.addToStatusArea()`
  panel API, to add the indicator.

There is exactly one case where a private API is required: hiding GNOME's own
small top-bar Night Light icon while the extension's indicator is shown.

## Native Night Light indicator lookup

**Properties:** `Main.panel.statusArea.quickSettings._nightLight` (GNOME 43+) and
`Main.panel.statusArea.aggregateMenu._nightLight` (GNOME 41–42).

**Why it is required:** the extension needs a reference to the built-in Night
Light system indicator to hide its top-bar icon.

**Why a public API cannot do it:** GNOME Shell does not expose named system
indicators through a public API. `extensionManager` exposes extensions, not
individual system indicators.

**Affected versions:** GNOME 41–51.

**What happens if it changes:** `findNativeIndicator()` returns `null`, the
suppressor does nothing, and the native icon simply stays visible. No error is
thrown and no Shell object is modified.

## `indicator._sync`

**Property:** the `_sync()` method of the built-in Night Light system indicator.

**Why it is required:** `_sync()` runs whenever Night Light becomes active or
inactive and sets the top-bar icon's `visible` property. Setting the icon
invisible once is not enough because the next `_sync()` turns it back on.

**Why a public API cannot do it:** there is no public signal or method to make a
system indicator's top-bar icon permanently hidden.

**Affected versions:** GNOME 41–51.

**What happens if it changes:** the override is installed on the method by name.
If the method is renamed or removed, `typeof indicator._sync !== 'function'`
fails and the suppressor is skipped. If a future release adds a public way to
hide the icon, this code should be removed.

GNOME 41 and 42 bind `this._sync` to the colour proxy while constructing the
indicator, so replacing the method on the instance no longer intercepts proxy
updates. On those releases the legacy suppressor also connects a handler to
`indicator._proxy::g-properties-changed` that re-hides the icon after the
built-in handler has run. GNOME 43 and 44 call `this._sync()` dynamically and do
not need it.

**How it is cleaned up:**

* Modern (GNOME 45+): the override is installed with the official
  `InjectionManager.overrideMethod()` and removed with `InjectionManager.clear()`
  in `disable()`.
* Legacy (GNOME 41–44): `NativeIndicatorSuppressor` records whether `_sync` was
  an own property, saves the original method, and on `disable()` restores the
  own property or deletes it so the object is returned to its exact previous
  shape. It also disconnects the proxy handler.

## `indicator._indicator`

**Property:** the child `St.Icon` of the built-in Night Light system indicator.

**Why it is required:** it is the actual icon that has to be hidden. It is set
once immediately so the icon disappears without waiting for the next `_sync()`.

**Why a public API cannot do it:** the icon is not exposed anywhere public.

**Affected versions:** GNOME 41–51.

**What happens if it changes:** the immediate hide is skipped, and the next
`_sync()` override still hides whichever child icon is used. No error is thrown.

**How it is cleaned up:** the icon's `visible` property is re-evaluated by the
restored `_sync()` when the extension is disabled, so it returns to the correct
state automatically.

## Scope

The suppression is only active while the extension's own indicator is shown
(`show-indicator` is `true`). Disabling that setting or the extension calls the
restore path, so GNOME's own Night Light icon and quick settings toggle are
never permanently modified.
