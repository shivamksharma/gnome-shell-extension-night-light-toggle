// SPDX-License-Identifier: GPL-3.0-or-later
// Tests the GNOME 41-44 native indicator suppressor against a fake Night Light
// indicator, including the GNOME 41/42 proxy-update path and cleanup.

"use strict";

const { Gio, GLib } = imports.gi;

var failures = 0;
function check(condition, message) {
    if (condition)
        print("  ok   " + message);
    else {
        print("  FAIL " + message);
        failures++;
    }
}

const scriptPath = imports.system.programInvocationName;
const rootDir = GLib.path_get_dirname(GLib.path_get_dirname(scriptPath));

const fakeDir = GLib.dir_make_tmp("nlt-native-XXXXXX");
GLib.mkdir_with_parents(GLib.build_filenamev([fakeDir, "ui"]), 0o755);
GLib.file_set_contents(
    GLib.build_filenamev([fakeDir, "ui", "main.js"]),
    "var panel = { statusArea: {} };\n");

imports.searchPath.unshift(fakeDir);
imports.searchPath.unshift(rootDir + "/src/legacy");

const Main = imports.ui.main;
const Native = imports.nativeIndicator;

class FakeIndicator {
    constructor() {
        this._indicator = { visible: true };
        this._proxy = {
            handlers: [],
            connect(name, handler) {
                this.handlers.push(handler);
                return this.handlers.length;
            },
            disconnect(id) {
                this.handlers[id - 1] = null;
            },
            emit() {
                this.handlers.forEach(handler => {
                    if (handler)
                        handler();
                });
            },
        };
    }

    _sync() {
        this._indicator.visible = true;
    }
}

function install(indicator) {
    Main.panel.statusArea.quickSettings = { _nightLight: indicator };
}

// Patch, hide, survive proxy and direct sync calls, then restore.
{
    const indicator = new FakeIndicator();
    install(indicator);
    const prototypeSync = Object.getPrototypeOf(indicator)._sync;

    const suppressor = new Native.NativeIndicatorSuppressor();
    suppressor.enable();
    check(indicator._indicator.visible === false, "enable hides the native top bar icon");
    indicator._sync();
    check(indicator._indicator.visible === false, "patched _sync keeps the icon hidden");
    indicator._proxy.emit();
    check(indicator._indicator.visible === false, "proxy updates keep the icon hidden");

    suppressor.disable();
    check(!Object.prototype.hasOwnProperty.call(indicator, "_sync"),
        "disable removes the injected own property");
    check(indicator._sync === prototypeSync, "disable restores the prototype method");
    indicator._sync();
    check(indicator._indicator.visible === true, "native behaviour is restored");
}

// A native indicator recreated while enabled must not be corrupted on disable.
{
    const original = new FakeIndicator();
    const recreated = new FakeIndicator();
    install(original);

    const suppressor = new Native.NativeIndicatorSuppressor();
    suppressor.enable();
    install(recreated);
    suppressor.disable();

    check(!Object.prototype.hasOwnProperty.call(original, "_sync"),
        "disable cleans the object it patched");
    check(!Object.prototype.hasOwnProperty.call(recreated, "_sync"),
        "a recreated object is left untouched");
    check(recreated._indicator.visible === true, "a recreated object keeps its own state");
}

// A missing native indicator must be handled without throwing.
{
    Main.panel.statusArea.quickSettings = {};
    const suppressor = new Native.NativeIndicatorSuppressor();
    suppressor.enable();
    suppressor.disable();
    check(true, "missing native indicator is handled without error");
}

Gio.File.new_for_path(GLib.build_filenamev([fakeDir, "ui", "main.js"])).delete(null);
Gio.File.new_for_path(GLib.build_filenamev([fakeDir, "ui"])).delete(null);
Gio.File.new_for_path(fakeDir).delete(null);

if (failures > 0)
    throw new Error(failures + " native indicator test(s) failed");
print("Legacy native indicator suppressor tests passed.");
