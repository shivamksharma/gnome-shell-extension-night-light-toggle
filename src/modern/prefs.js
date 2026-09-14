// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    COLOR_SCHEMA,
    NIGHT_LIGHT_ENABLED_KEY,
    NIGHT_LIGHT_TEMPERATURE_KEY,
    TEMPERATURE_MIN,
    TEMPERATURE_MAX,
    clampTemperature,
} from './nightLight.js';

export default class NightLightTogglePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const colorSettings = new Gio.Settings({schema_id: COLOR_SCHEMA});

        const page = new Adw.PreferencesPage();
        window.add(page);

        const nightLightGroup = new Adw.PreferencesGroup({title: 'Night Light'});
        page.add(nightLightGroup);

        const enableRow = new Adw.SwitchRow({title: 'Enable Night Light'});
        nightLightGroup.add(enableRow);
        colorSettings.bind(NIGHT_LIGHT_ENABLED_KEY, enableRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        nightLightGroup.add(this._createTemperatureRow(colorSettings));

        const extensionGroup = new Adw.PreferencesGroup({title: 'Extension'});
        page.add(extensionGroup);

        const indicatorRow = new Adw.SwitchRow({
            title: 'Show indicator in the top bar',
            subtitle: 'Hides GNOME’s own Night Light icon while shown',
        });
        extensionGroup.add(indicatorRow);
        settings.bind('show-indicator', indicatorRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        const restoreRow = new Adw.SwitchRow({
            title: 'Restore Night Light state on disable',
            subtitle: 'Put back the schedule and enabled state changed while toggling',
        });
        extensionGroup.add(restoreRow);
        settings.bind('restore-state', restoreRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        const aboutGroup = new Adw.PreferencesGroup({title: 'About'});
        page.add(aboutGroup);

        aboutGroup.add(new Adw.ActionRow({
            title: this.metadata.name,
            subtitle: 'Toggle GNOME Night Light and adjust its colour temperature from the top bar',
        }));
    }

    _createTemperatureRow(colorSettings) {
        const row = new Adw.ActionRow({title: 'Colour temperature'});

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            valign: Gtk.Align.CENTER,
        });

        const warmLabel = new Gtk.Label({label: 'Warm', css_classes: ['dim-label']});

        const adjustment = new Gtk.Adjustment({
            lower: TEMPERATURE_MIN,
            upper: TEMPERATURE_MAX,
            step_increment: 100,
            page_increment: 500,
            value: clampTemperature(colorSettings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY)),
        });

        const scale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment,
            draw_value: false,
            hexpand: true,
        });
        scale.set_size_request(180, -1);

        const coolLabel = new Gtk.Label({label: 'Cool', css_classes: ['dim-label']});
        const valueLabel = new Gtk.Label({css_classes: ['dim-label'], width_chars: 7});

        const syncValueLabel = () => {
            valueLabel.label = `${Math.round(adjustment.get_value())} K`;
        };
        syncValueLabel();

        let updating = false;
        adjustment.connect('value-changed', () => {
            syncValueLabel();
            if (updating)
                return;

            const value = clampTemperature(adjustment.get_value());
            if (colorSettings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY) !== value)
                colorSettings.set_uint(NIGHT_LIGHT_TEMPERATURE_KEY, value);
        });

        colorSettings.connect(`changed::${NIGHT_LIGHT_TEMPERATURE_KEY}`, () => {
            const value = clampTemperature(colorSettings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY));
            if (Math.round(adjustment.get_value()) === value)
                return;

            updating = true;
            adjustment.set_value(value);
            updating = false;
        });

        box.append(warmLabel);
        box.append(scale);
        box.append(coolLabel);
        box.append(valueLabel);

        row.add_suffix(box);
        return row;
    }
}
