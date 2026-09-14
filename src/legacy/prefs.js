// SPDX-License-Identifier: GPL-3.0-or-later

// Classic GJS preferences for GNOME 41-44.
//
// GNOME 42 and later call fillPreferencesWindow() and render libadwaita rows.
// GNOME 41 has no libadwaita, so buildPrefsWidget() provides a plain GTK4
// fallback. When both exist the shell prefers fillPreferencesWindow().

"use strict";

const { Gio, Gtk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

let Adw = null;
try {
    Adw = imports.gi.Adw;
} catch (e) {
    Adw = null;
}

const COLOR_SCHEMA = 'org.gnome.settings-daemon.plugins.color';
const NIGHT_LIGHT_ENABLED_KEY = 'night-light-enabled';
const NIGHT_LIGHT_TEMPERATURE_KEY = 'night-light-temperature';
const TEMPERATURE_MIN = 1700;
const TEMPERATURE_MAX = 4700;

// Required by the GNOME 41-44 preferences loader, which calls init() before
// fillPreferencesWindow()/buildPrefsWidget(). It is intentionally empty because
// the extension needs no one-time setup there.
function init() {
}

function _clampTemperature(value) {
    return Math.min(TEMPERATURE_MAX, Math.max(TEMPERATURE_MIN, Math.round(value)));
}

function _dimLabel(text) {
    var label = new Gtk.Label({ label: text });
    label.get_style_context().add_class('dim-label');
    return label;
}

function _createTemperatureBox(colorSettings) {
    var box = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
        hexpand: true,
        valign: Gtk.Align.CENTER,
    });

    var adjustment = new Gtk.Adjustment({
        lower: TEMPERATURE_MIN,
        upper: TEMPERATURE_MAX,
        step_increment: 100,
        page_increment: 500,
        value: _clampTemperature(colorSettings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY)),
    });

    var scale = new Gtk.Scale({
        orientation: Gtk.Orientation.HORIZONTAL,
        adjustment: adjustment,
        draw_value: false,
        hexpand: true,
    });
    scale.set_size_request(180, -1);

    var valueLabel = _dimLabel(Math.round(adjustment.get_value()) + ' K');
    valueLabel.set_width_chars(7);

    var updating = false;
    adjustment.connect('value-changed', function () {
        valueLabel.set_label(Math.round(adjustment.get_value()) + ' K');
        if (updating)
            return;

        var value = _clampTemperature(adjustment.get_value());
        if (colorSettings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY) !== value)
            colorSettings.set_uint(NIGHT_LIGHT_TEMPERATURE_KEY, value);
    });

    colorSettings.connect('changed::' + NIGHT_LIGHT_TEMPERATURE_KEY, function () {
        var value = _clampTemperature(colorSettings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY));
        if (Math.round(adjustment.get_value()) === value)
            return;

        updating = true;
        adjustment.set_value(value);
        updating = false;
    });

    box.append(_dimLabel('Warm'));
    box.append(scale);
    box.append(_dimLabel('Cool'));
    box.append(valueLabel);
    return box;
}

function _sectionLabel(text) {
    var label = new Gtk.Label({
        label: '<b>' + text + '</b>',
        use_markup: true,
        halign: Gtk.Align.START,
        margin_top: 6,
    });
    return label;
}

function _switchRow(title, settings, key) {
    var row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    var toggle = new Gtk.Switch({ valign: Gtk.Align.CENTER });
    settings.bind(key, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
    row.append(new Gtk.Label({ label: title, hexpand: true, halign: Gtk.Align.START }));
    row.append(toggle);
    return row;
}

function buildPrefsWidget() {
    var settings = ExtensionUtils.getSettings();
    var colorSettings = new Gio.Settings({ schema: COLOR_SCHEMA });

    var box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 18,
        margin_top: 18,
        margin_bottom: 18,
        margin_start: 18,
        margin_end: 18,
    });

    box.append(_sectionLabel('Night Light'));
    box.append(_switchRow('Enable Night Light', colorSettings, NIGHT_LIGHT_ENABLED_KEY));

    var temperatureRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    temperatureRow.append(new Gtk.Label({
        label: 'Colour temperature',
        hexpand: true,
        halign: Gtk.Align.START,
    }));
    temperatureRow.append(_createTemperatureBox(colorSettings));
    box.append(temperatureRow);

    box.append(_sectionLabel('Extension'));
    box.append(_switchRow('Show indicator in the top bar', settings, 'show-indicator'));
    box.append(_switchRow('Restore Night Light state on disable', settings, 'restore-state'));

    return box;
}

// Adw.SwitchRow only exists since libadwaita 1.2 (GNOME 43). GNOME 42 ships
// libadwaita 1.1, so legacy preferences build a plain switch action row instead.
function _switchActionRow(title, settings, key) {
    var row = new Adw.ActionRow({ title: title });
    var toggle = new Gtk.Switch({ valign: Gtk.Align.CENTER });
    row.add_suffix(toggle);
    row.activatable_widget = toggle;
    settings.bind(key, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
    return row;
}

function fillPreferencesWindow(window) {
    if (!Adw)
        return;

    var settings = ExtensionUtils.getSettings();
    var colorSettings = new Gio.Settings({ schema: COLOR_SCHEMA });

    var page = new Adw.PreferencesPage();
    window.add(page);

    var nightLightGroup = new Adw.PreferencesGroup({ title: 'Night Light' });
    page.add(nightLightGroup);

    nightLightGroup.add(_switchActionRow('Enable Night Light', colorSettings, NIGHT_LIGHT_ENABLED_KEY));

    var temperatureRow = new Adw.ActionRow({ title: 'Colour temperature' });
    temperatureRow.add_suffix(_createTemperatureBox(colorSettings));
    nightLightGroup.add(temperatureRow);

    var extensionGroup = new Adw.PreferencesGroup({ title: 'Extension' });
    page.add(extensionGroup);

    extensionGroup.add(_switchActionRow('Show indicator in the top bar', settings, 'show-indicator'));
    extensionGroup.add(_switchActionRow('Restore Night Light state on disable', settings, 'restore-state'));

    var aboutGroup = new Adw.PreferencesGroup({ title: 'About' });
    page.add(aboutGroup);
    aboutGroup.add(new Adw.ActionRow({
        title: 'Night Light Toggle',
        subtitle: 'Toggle GNOME Night Light and adjust its colour temperature from the top bar',
    }));
}
