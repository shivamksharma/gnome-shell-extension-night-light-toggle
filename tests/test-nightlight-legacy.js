// SPDX-License-Identifier: GPL-3.0-or-later
// Unit tests for the legacy (GNOME 41-44) NightLightController.
// Run from the repository root with: gjs tests/test-nightlight-legacy.js

"use strict";

imports.searchPath.unshift("src/legacy");
const NightLight = imports.nightLight;

const NIGHT_LIGHT_ENABLED_KEY = NightLight.NIGHT_LIGHT_ENABLED_KEY;
const NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY = NightLight.NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY;
const NIGHT_LIGHT_SCHEDULE_FROM_KEY = NightLight.NIGHT_LIGHT_SCHEDULE_FROM_KEY;
const NIGHT_LIGHT_SCHEDULE_TO_KEY = NightLight.NIGHT_LIGHT_SCHEDULE_TO_KEY;
const NIGHT_LIGHT_TEMPERATURE_KEY = NightLight.NIGHT_LIGHT_TEMPERATURE_KEY;
const TEMPERATURE_MIN = NightLight.TEMPERATURE_MIN;
const TEMPERATURE_MAX = NightLight.TEMPERATURE_MAX;
const clampTemperature = NightLight.clampTemperature;

var failures = 0;

function assert(condition, message) {
    if (condition)
        print("  ok   " + message);
    else {
        print("  FAIL " + message);
        failures++;
    }
}

function assertEqual(actual, expected, message) {
    assert(actual === expected, message + " (expected " + expected + ", got " + actual + ")");
}

function FakeSettings(values) {
    this.values = new Map();
    for (var key in values)
        this.values.set(key, values[key]);
}

FakeSettings.prototype.get_value = function (key) {
    var value = this.values.get(key);
    return { unpack: function () { return value; } };
};
FakeSettings.prototype.get_boolean = function (key) { return this.values.get(key); };
FakeSettings.prototype.set_boolean = function (key, value) { this.values.set(key, value); };
FakeSettings.prototype.get_double = function (key) { return this.values.get(key); };
FakeSettings.prototype.set_double = function (key, value) { this.values.set(key, value); };
FakeSettings.prototype.get_uint = function (key) { return this.values.get(key); };
FakeSettings.prototype.set_uint = function (key, value) { this.values.set(key, value); };

function makeSettings(overrides) {
    overrides = overrides || {};
    var values = {
        [NIGHT_LIGHT_ENABLED_KEY]: false,
        [NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY]: true,
        [NIGHT_LIGHT_SCHEDULE_FROM_KEY]: 22.0,
        [NIGHT_LIGHT_SCHEDULE_TO_KEY]: 7.0,
        [NIGHT_LIGHT_TEMPERATURE_KEY]: 3235,
    };
    // Object spread-less merge so the file stays classic-GJS friendly.
    Object.keys(overrides).forEach(function (key) {
        values[key] = overrides[key];
    });
    return new FakeSettings(values);
}

function testToggleAndRestore() {
    var settings = makeSettings();
    var controller = new NightLight.NightLightController(settings);

    controller.toggle();
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), true, "toggle enables Night Light");
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), false, "toggle disables the schedule");
    assertEqual(settings.get_double(NIGHT_LIGHT_SCHEDULE_FROM_KEY), 0.0, "toggle sets schedule start to 0");
    assertEqual(settings.get_double(NIGHT_LIGHT_SCHEDULE_TO_KEY), 24.0, "toggle sets schedule end to 24");

    controller.restore();
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), false, "restore reverts enabled");
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), true, "restore reverts schedule");
    assertEqual(settings.get_double(NIGHT_LIGHT_SCHEDULE_FROM_KEY), 22.0, "restore reverts schedule start");
    assertEqual(settings.get_double(NIGHT_LIGHT_SCHEDULE_TO_KEY), 7.0, "restore reverts schedule end");
    controller.destroy();
}

function testToggleOffKeepsThenRestores() {
    var settings = makeSettings();
    var controller = new NightLight.NightLightController(settings);

    controller.toggle();
    controller.toggle();
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), false, "second toggle disables Night Light");
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), false, "schedule stays overridden while on/off");

    controller.restore();
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), false, "restore reverts enabled after on/off");
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), true, "restore reverts schedule after on/off");
    controller.destroy();
}

function testRestorePreservesExternalChange() {
    var settings = makeSettings();
    var controller = new NightLight.NightLightController(settings);

    controller.toggle();
    settings.set_double(NIGHT_LIGHT_SCHEDULE_FROM_KEY, 5.0);
    controller.restore();

    assertEqual(settings.get_double(NIGHT_LIGHT_SCHEDULE_FROM_KEY), 5.0, "external change is preserved");
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), true, "other keys are still restored");
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), false, "enabled is still restored");
    controller.destroy();
}

function testNoOpsAreSafe() {
    var overrides = {};
    overrides[NIGHT_LIGHT_ENABLED_KEY] = true;
    var settings = makeSettings(overrides);
    var controller = new NightLight.NightLightController(settings);

    controller.setEnabled(true);
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), true, "setEnabled(true) while on is a no-op");
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), true, "no-op does not touch the schedule");

    controller.restore();
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), true, "restore with nothing captured is safe");
    controller.destroy();
}

function testTemperatureClamping() {
    assertEqual(clampTemperature(1000), TEMPERATURE_MIN, "clamps values below the minimum");
    assertEqual(clampTemperature(99999), TEMPERATURE_MAX, "clamps values above the maximum");
    assertEqual(clampTemperature(3235), 3235, "keeps in-range values");
    assertEqual(clampTemperature(3000.6), 3001, "rounds to the nearest kelvin");

    var settings = makeSettings();
    var controller = new NightLight.NightLightController(settings);
    controller.setTemperature(1000);
    assertEqual(settings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY), TEMPERATURE_MIN, "setTemperature clamps the stored value");
    controller.restore();
    assertEqual(settings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY), TEMPERATURE_MIN, "restore never reverts temperature");
    controller.destroy();
}

testToggleAndRestore();
testToggleOffKeepsThenRestores();
testRestorePreservesExternalChange();
testNoOpsAreSafe();
testTemperatureClamping();

if (failures > 0)
    throw new Error(failures + " test(s) failed");
print("All legacy controller tests passed.");
