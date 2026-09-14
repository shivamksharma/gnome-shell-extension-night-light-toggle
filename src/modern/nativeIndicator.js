// SPDX-License-Identifier: GPL-3.0-or-later

// PRIVATE API: GNOME Shell does not expose a public way to hide the top bar
// icon of a built-in system indicator. The extension hides only the small
// Night Light icon in the top bar while its own indicator is shown, so users do
// not see two identical Night Light icons. The quick settings Night Light
// toggle itself is never touched.
//
// The override is installed with the official InjectionManager, which restores
// the original _sync method automatically. It targets `_sync` and `_indicator`
// on the Night Light system indicator. These names are stable from GNOME 43
// through GNOME 51. If they change the override simply stops matching: the
// native icon becomes visible again and no error is thrown.

import {InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

function findNativeIndicator() {
    // GNOME 45+ always builds the quick settings area; the Night Light system
    // indicator is the only place it can live on these releases.
    return Main.panel.statusArea.quickSettings?._nightLight ?? null;
}

export class NativeIndicatorSuppressor {
    constructor() {
        this._injectionManager = new InjectionManager();
        this._target = null;
    }

    enable() {
        if (this._target)
            return;

        const indicator = findNativeIndicator();
        if (!indicator || typeof indicator._sync !== 'function')
            return;

        this._target = indicator;
        this._injectionManager.overrideMethod(indicator, '_sync', originalMethod => {
            return function (...args) {
                originalMethod?.call(this, ...args);
                if (this._indicator)
                    this._indicator.visible = false;
            };
        });

        if (indicator._indicator)
            indicator._indicator.visible = false;
    }

    disable() {
        this._injectionManager.clear();
        this._target = null;
    }
}
