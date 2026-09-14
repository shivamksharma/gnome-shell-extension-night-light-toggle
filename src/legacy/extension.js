// SPDX-License-Identifier: GPL-3.0-or-later

// Classic GJS extension entry point for GNOME 41-44.

const { Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;

const NightLight = Me.imports.nightLight;
const Indicator = Me.imports.indicator;
const NativeIndicator = Me.imports.nativeIndicator;

const INDICATOR_ROLE = 'night-light-toggle';

class NightLightToggleExtension {
    enable() {
        this._settings = ExtensionUtils.getSettings();

        var colorSchema = Gio.SettingsSchemaSource.get_default().lookup(NightLight.COLOR_SCHEMA, true);
        if (!colorSchema)
            throw new Error('Night Light is unavailable: the ' + NightLight.COLOR_SCHEMA + ' schema is not installed');
        this._colorSettings = new Gio.Settings({ settings_schema: colorSchema });
        this._controller = new NightLight.NightLightController(this._colorSettings);
        this._suppressor = new NativeIndicator.NativeIndicatorSuppressor();

        this._indicator = new Indicator.NightLightIndicator(
            this, this._controller, this._colorSettings);
        Main.panel.addToStatusArea(INDICATOR_ROLE, this._indicator);

        this._showIndicatorSignal = this._settings.connect(
            'changed::show-indicator',
            this._syncIndicator.bind(this));
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

    openPreferences() {
        ExtensionUtils.openPrefs();
    }

    _syncIndicator() {
        var visible = this._settings.get_boolean('show-indicator');
        this._indicator.visible = visible;

        // Only hide GNOME's own top bar Night Light icon while ours is shown,
        // so the setting never leaves the user without any Night Light icon.
        if (visible)
            this._suppressor.enable();
        else
            this._suppressor.disable();
    }
}

function init() {
    return new NightLightToggleExtension();
}
