// SPDX-License-Identifier: GPL-3.0-or-later

// Classic GJS module (GNOME 41-44). Only `var` and `function` declarations are
// visible through `imports`, so the exported API uses `var` on purpose.

// Access to GNOME's Night Light lives in the settings-daemon colour schema,
// which is a stable, public GSettings schema available since GNOME 3.28.
var COLOR_SCHEMA = 'org.gnome.settings-daemon.plugins.color';
var NIGHT_LIGHT_ENABLED_KEY = 'night-light-enabled';
var NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY = 'night-light-schedule-automatic';
var NIGHT_LIGHT_SCHEDULE_FROM_KEY = 'night-light-schedule-from';
var NIGHT_LIGHT_SCHEDULE_TO_KEY = 'night-light-schedule-to';
var NIGHT_LIGHT_TEMPERATURE_KEY = 'night-light-temperature';

// Range used by the Night Light panel in GNOME Settings.
var TEMPERATURE_MIN = 1700;
var TEMPERATURE_MAX = 4700;

function clampTemperature(kelvin) {
    return Math.min(TEMPERATURE_MAX, Math.max(TEMPERATURE_MIN, Math.round(kelvin)));
}

/**
 * Controls GNOME's Night Light through GSettings.
 *
 * Turning Night Light on mirrors GNOME's own manual override: the automatic
 * schedule is switched off and a full day manual window is configured, so the
 * schedule does not immediately turn Night Light back off. Every key this class
 * writes is recorded so restore() can put the original configuration back.
 *
 * The class has no GObject, Clutter or GTK dependencies so it can be unit
 * tested and reused by prefs.js.
 */
var NightLightController = class NightLightController {
    constructor(colorSettings) {
        this._settings = colorSettings;
        this._originals = new Map();
        this._applied = new Map();
    }

    get enabled() {
        return this._settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY);
    }

    get temperature() {
        return this._settings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY);
    }

    toggle() {
        this.setEnabled(!this.enabled);
    }

    setEnabled(enabled) {
        if (enabled === this.enabled)
            return;

        if (enabled) {
            this._write(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY, false);
            this._write(NIGHT_LIGHT_SCHEDULE_FROM_KEY, 0.0);
            this._write(NIGHT_LIGHT_SCHEDULE_TO_KEY, 24.0);
        }

        this._write(NIGHT_LIGHT_ENABLED_KEY, enabled);
    }

    setTemperature(kelvin) {
        var value = clampTemperature(kelvin);
        if (value !== this.temperature)
            this._settings.set_uint(NIGHT_LIGHT_TEMPERATURE_KEY, value);
    }

    /**
     * Restore every value this controller changed to the value it had before
     * the first change. A key is only restored when it still holds the value
     * this controller wrote, so later changes made elsewhere are preserved.
     */
    restore() {
        var self = this;
        this._originals.forEach(function (original, key) {
            if (self._read(key) !== self._applied.get(key))
                return;
            self._write(key, original);
        });
        this._originals.clear();
        this._applied.clear();
    }

    destroy() {
        this._originals.clear();
        this._applied.clear();
        this._settings = null;
    }

    _write(key, value) {
        if (!this._originals.has(key))
            this._originals.set(key, this._read(key));

        if (typeof value === 'boolean')
            this._settings.set_boolean(key, value);
        else
            this._settings.set_double(key, value);

        this._applied.set(key, value);
    }

    _read(key) {
        return this._settings.get_value(key).unpack();
    }
};
