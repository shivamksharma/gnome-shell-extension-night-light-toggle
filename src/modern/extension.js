// SPDX-License-Identifier: GPL-3.0-or-later

import Gio from 'gi://Gio';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {COLOR_SCHEMA, NightLightController} from './nightLight.js';
import {NightLightIndicator} from './indicator.js';
import {NativeIndicatorSuppressor} from './nativeIndicator.js';

const INDICATOR_ROLE = 'night-light-toggle';

export default class NightLightToggleExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        const colorSchema = Gio.SettingsSchemaSource.get_default().lookup(COLOR_SCHEMA, true);
        if (!colorSchema) {
            throw new Error(
                `Night Light is unavailable: the ${COLOR_SCHEMA} schema is not installed`);
        }
        this._colorSettings = new Gio.Settings({settings_schema: colorSchema});
        this._controller = new NightLightController(this._colorSettings);
        this._suppressor = new NativeIndicatorSuppressor();

        this._indicator = new NightLightIndicator(
            this, this._controller, this._colorSettings);
        Main.panel.addToStatusArea(INDICATOR_ROLE, this._indicator);

        this._showIndicatorSignal = this._settings.connect(
            'changed::show-indicator', () => this._syncIndicator());
        this._syncIndicator();
    }

    disable() {
        if (this._showIndicatorSignal) {
            this._settings.disconnect(this._showIndicatorSignal);
            this._showIndicatorSignal = 0;
        }

        // Restore the Night Light configuration changed while toggling, unless
        // the user asked to keep it.
        if (this._settings.get_boolean('restore-state'))
            this._controller.restore();

        this._indicator.destroy();
        this._indicator = null;

        this._suppressor.disable();
        this._suppressor = null;

        this._controller.destroy();
        this._controller = null;
        this._colorSettings = null;
        this._settings = null;
    }

    _syncIndicator() {
        const visible = this._settings.get_boolean('show-indicator');
        this._indicator.visible = visible;

        // Only hide GNOME's own top bar Night Light icon while ours is shown,
        // so the setting never leaves the user without any Night Light icon.
        if (visible)
            this._suppressor.enable();
        else
            this._suppressor.disable();
    }
}
