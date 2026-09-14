// SPDX-License-Identifier: GPL-3.0-or-later
// Unit tests for the modern (GNOME 45+) NightLightController.
// Run with: gjs -m tests/test-nightlight-modern.js

import {
    NightLightController,
    NIGHT_LIGHT_ENABLED_KEY,
    NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY,
    NIGHT_LIGHT_SCHEDULE_FROM_KEY,
    NIGHT_LIGHT_SCHEDULE_TO_KEY,
    NIGHT_LIGHT_TEMPERATURE_KEY,
    TEMPERATURE_MIN,
    TEMPERATURE_MAX,
    clampTemperature,
} from '../src/modern/nightLight.js';

let failures = 0;

function assert(condition, message) {
    if (condition) {
        print(`  ok   ${message}`);
    } else {
        print(`  FAIL ${message}`);
        failures++;
    }
}

function assertEqual(actual, expected, message) {
    assert(actual === expected, `${message} (expected ${expected}, got ${actual})`);
}

class FakeSettings {
    constructor(values) {
        this.values = new Map(Object.entries(values));
    }

    get_value(key) {
        const value = this.values.get(key);
        return {unpack: () => value};
    }

    get_boolean(key) {
        return this.values.get(key);
    }

    set_boolean(key, value) {
        this.values.set(key, value);
    }

    get_double(key) {
        return this.values.get(key);
    }

    set_double(key, value) {
        this.values.set(key, value);
    }

    get_uint(key) {
        return this.values.get(key);
    }

    set_uint(key, value) {
        this.values.set(key, value);
    }
}

function makeSettings(overrides = {}) {
    return new FakeSettings({
        [NIGHT_LIGHT_ENABLED_KEY]: false,
        [NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY]: true,
        [NIGHT_LIGHT_SCHEDULE_FROM_KEY]: 22.0,
        [NIGHT_LIGHT_SCHEDULE_TO_KEY]: 7.0,
        [NIGHT_LIGHT_TEMPERATURE_KEY]: 3235,
        ...overrides,
    });
}

function testToggleAndRestore() {
    const settings = makeSettings();
    const controller = new NightLightController(settings);

    controller.toggle();
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), true, 'toggle enables Night Light');
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), false, 'toggle disables the schedule');
    assertEqual(settings.get_double(NIGHT_LIGHT_SCHEDULE_FROM_KEY), 0.0, 'toggle sets schedule start to 0');
    assertEqual(settings.get_double(NIGHT_LIGHT_SCHEDULE_TO_KEY), 24.0, 'toggle sets schedule end to 24');

    controller.restore();
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), false, 'restore reverts enabled');
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), true, 'restore reverts schedule');
    assertEqual(settings.get_double(NIGHT_LIGHT_SCHEDULE_FROM_KEY), 22.0, 'restore reverts schedule start');
    assertEqual(settings.get_double(NIGHT_LIGHT_SCHEDULE_TO_KEY), 7.0, 'restore reverts schedule end');
    controller.destroy();
}

function testToggleOffKeepsThenRestores() {
    const settings = makeSettings();
    const controller = new NightLightController(settings);

    controller.toggle();
    controller.toggle();
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), false, 'second toggle disables Night Light');
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), false, 'schedule stays overridden while on/off');

    controller.restore();
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), false, 'restore reverts enabled after on/off');
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), true, 'restore reverts schedule after on/off');
    controller.destroy();
}

function testRestorePreservesExternalChange() {
    const settings = makeSettings();
    const controller = new NightLightController(settings);

    controller.toggle();
    settings.set_double(NIGHT_LIGHT_SCHEDULE_FROM_KEY, 5.0);
    controller.restore();

    assertEqual(settings.get_double(NIGHT_LIGHT_SCHEDULE_FROM_KEY), 5.0, 'external change is preserved');
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), true, 'other keys are still restored');
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), false, 'enabled is still restored');
    controller.destroy();
}

function testNoOpsAreSafe() {
    const settings = makeSettings({[NIGHT_LIGHT_ENABLED_KEY]: true});
    const controller = new NightLightController(settings);

    controller.setEnabled(true);
    assertEqual(settings.get_boolean(NIGHT_LIGHT_ENABLED_KEY), true, 'setEnabled(true) while on is a no-op');
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), true, 'no-op does not touch the schedule');

    controller.restore();
    assertEqual(settings.get_boolean(NIGHT_LIGHT_SCHEDULE_AUTOMATIC_KEY), true, 'restore with nothing captured is safe');
    controller.destroy();
}

function testTemperatureClamping() {
    assertEqual(clampTemperature(1000), TEMPERATURE_MIN, 'clamps values below the minimum');
    assertEqual(clampTemperature(99999), TEMPERATURE_MAX, 'clamps values above the maximum');
    assertEqual(clampTemperature(3235), 3235, 'keeps in-range values');
    assertEqual(clampTemperature(3000.6), 3001, 'rounds to the nearest kelvin');

    const settings = makeSettings();
    const controller = new NightLightController(settings);
    controller.setTemperature(1000);
    assertEqual(settings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY), TEMPERATURE_MIN, 'setTemperature clamps the stored value');
    controller.restore();
    assertEqual(settings.get_uint(NIGHT_LIGHT_TEMPERATURE_KEY), TEMPERATURE_MIN, 'restore never reverts temperature');
    controller.destroy();
}

testToggleAndRestore();
testToggleOffKeepsThenRestores();
testRestorePreservesExternalChange();
testNoOpsAreSafe();
testTemperatureClamping();

if (failures > 0)
    throw new Error(`${failures} test(s) failed`);
print('All modern controller tests passed.');
