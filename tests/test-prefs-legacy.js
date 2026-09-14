// SPDX-License-Identifier: GPL-3.0-or-later
// Smoke test for the GNOME 41-44 preferences module.
//
// It constructs the real GTK/libadwaita preferences UI. It needs a display and
// compiled schemas in GSETTINGS_SCHEMA_DIR; run it through tests/run-tests.sh.
// The libadwaita part is skipped automatically when Adw is unavailable.

"use strict";

const { Gio, GLib, Gtk } = imports.gi;

let Adw = null;
try {
    Adw = imports.gi.Adw;
} catch (e) {
    Adw = null;
}

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

// imports.misc.extensionUtils only exists inside the GNOME Shell preferences
// process, so provide a minimal stub on the search path.
const fakeDir = GLib.dir_make_tmp("nlt-prefs-XXXXXX");
const miscDir = GLib.build_filenamev([fakeDir, "misc"]);
GLib.mkdir_with_parents(miscDir, 0o755);
GLib.file_set_contents(
    GLib.build_filenamev([miscDir, "extensionUtils.js"]),
    "const Gio = imports.gi.Gio;\n" +
    "var getSettings = function () {\n" +
    "    return new Gio.Settings({ schema_id: 'org.gnome.shell.extensions.nightlighttoggle' });\n" +
    "};\n");

imports.searchPath.unshift(fakeDir);
imports.searchPath.unshift(rootDir + "/src/legacy");

const prefs = imports.prefs;

Gtk.init();

check(typeof prefs.init === "function", "prefs.init exists (required by the loader)");

const widget = prefs.buildPrefsWidget();
check(widget instanceof Gtk.Widget, "buildPrefsWidget returns a Gtk.Widget");
check(widget.get_first_child() !== null, "buildPrefsWidget has content");

if (Adw) {
    const window = new Adw.PreferencesWindow();
    prefs.fillPreferencesWindow(window);
    check(true, "fillPreferencesWindow runs without throwing");
} else {
    print("  skip fillPreferencesWindow (libadwaita unavailable)");
}

Gio.File.new_for_path(GLib.build_filenamev([miscDir, "extensionUtils.js"])).delete(null);
Gio.File.new_for_path(miscDir).delete(null);
Gio.File.new_for_path(fakeDir).delete(null);

if (failures > 0)
    throw new Error(failures + " prefs smoke test(s) failed");
print("Legacy preferences smoke test passed.");
