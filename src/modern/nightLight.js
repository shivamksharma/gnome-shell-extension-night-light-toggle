// SPDX-License-Identifier: GPL-3.0-or-later

// Access to GNOME's Night Light lives in the settings-daemon colour schema,
// which is a stable, public GSettings schema available since GNOME 3.28.
export const COLOR_SCHEMA = 'org.gnome.settings-daemon.plugins.color';
export const NIGHT_LIGHT_ENABLED_KEY = 'night-light-enabled';
export const NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY = 'night-light-schedule-automatic';
export const NIGHT_LIGHT_SCHEDULE_FROM_KEY = 'night-light-schedule-from';
export const NIGHT_LIGHT_SCHEDULE_TO_KEY = 'night-light-schedule-to';
export const NIGHT_LIGHT_TEMPERATURE_KEY = 'night-light-temperature';

// Range used by the Night Light panel in GNOME Settings.
export const TEMPERATURE_MIN = 1700;
export const TEMPERATURE_MAX = 4700;

export function clampTemperature(kelvin) {
    return Math.min(TEMPERATURE_MAX, Math.max(TEMPERATURE_MIN, Math.round(kelvin)));
}

/**
 * Controls GNOME's Night Light through GSettings.
 *
 * Turning Night Light on mirrors GNOME's own manual override: the automatic
 * schedule is switched off and a full day manual window is configured, so the
 * schedule does not immediately turn Night Light back off. Every key this class
 * writes is recorded so {@link NightLightController#restore} can put the
 * original configuration back later.
 *
 * The class deliberately has no GObject, Clutter or GTK dependencies so the
 * same logic can be used by both extension.js and prefs.js and unit tested.
 */
export class NightLightController {
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
        const value = clampTemperature(kelvin);
        if (value !== this.temperature)
            this._settings.set_uint(NIGHT_LIGHT_TEMPERATURE_KEY, value);
    }

    /**
     * Restore every value this controller changed to the value it had before
     * the first change. A key is only restored when it still holds the value
     * this controller wrote, so later changes made elsewhere are preserved.
     */
    restore() {
        for (const [key, original] of this._originals) {
            if (this._read(key) !== this._applied.get(key))
                continue;
            this._write(key, original);
        }
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
}
