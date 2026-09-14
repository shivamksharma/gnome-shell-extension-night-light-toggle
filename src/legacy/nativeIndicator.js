// SPDX-License-Identifier: GPL-3.0-or-later

// Classic GJS module (GNOME 41-44).

// PRIVATE API: GNOME 41-44 have no InjectionManager, and GNOME Shell exposes no
// public way to hide the top bar icon of a built-in system indicator. This
// helper replaces the Night Light indicator's `_sync` method and restores the
// original method on disable. It tracks whether `_sync` was an own property of
// the instance before the override so `disable()` can restore the object to its
// exact previous shape. If the private methods are renamed the override simply
// stops matching and no error is thrown.
//
// GNOME 41 and 42 bind `this._sync` to the colour proxy at construction time,
// so replacing the method alone does not intercept proxy updates. A second
// handler on the proxy re-hides the icon after the built-in handler has run.
// GNOME 43 and 44 call `this._sync()` dynamically and do not need it, but the
// extra handler is harmless there.

const Main = imports.ui.main;

function findNativeIndicator() {
    var statusArea = Main.panel.statusArea;

    if (statusArea.quickSettings && statusArea.quickSettings._nightLight)
        return statusArea.quickSettings._nightLight;
    if (statusArea.aggregateMenu && statusArea.aggregateMenu._nightLight)
        return statusArea.aggregateMenu._nightLight;

    return null;
}

var NativeIndicatorSuppressor = class NativeIndicatorSuppressor {
    constructor() {
        this._target = null;
        this._originalSync = null;
        this._hadOwnSync = false;
        this._patchedSync = null;
        this._proxySignal = 0;
    }

    enable() {
        if (this._target)
            return;

        var indicator = findNativeIndicator();
        if (!indicator || typeof indicator._sync !== 'function')
            return;

        var originalSync = indicator._sync;
        var patchedSync = function (...args) {
            originalSync.apply(this, args);
            if (this._indicator)
                this._indicator.visible = false;
        };

        this._target = indicator;
        this._originalSync = originalSync;
        this._hadOwnSync = Object.prototype.hasOwnProperty.call(indicator, '_sync');
        this._patchedSync = patchedSync;
        indicator._sync = patchedSync;

        if (indicator._indicator)
            indicator._indicator.visible = false;

        if (indicator._proxy) {
            this._proxySignal = indicator._proxy.connect('g-properties-changed', function () {
                if (indicator._indicator)
                    indicator._indicator.visible = false;
            });
        }
    }

    disable() {
        var indicator = this._target;
        if (!indicator)
            return;

        if (this._proxySignal && indicator._proxy) {
            indicator._proxy.disconnect(this._proxySignal);
            this._proxySignal = 0;
        }

        if (indicator._sync === this._patchedSync) {
            if (this._hadOwnSync)
                indicator._sync = this._originalSync;
            else
                delete indicator._sync;
        }

        this._target = null;
        this._originalSync = null;
        this._hadOwnSync = false;
        this._patchedSync = null;
    }
};
