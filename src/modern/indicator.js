// SPDX-License-Identifier: GPL-3.0-or-later

import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import {NIGHT_LIGHT_ENABLED_KEY} from './nightLight.js';

export const NightLightIndicator = GObject.registerClass(
class NightLightIndicator extends PanelMenu.Button {
    _init(extension, controller, colorSettings) {
        super._init(0.0, extension.metadata.name, true);

        this._extension = extension;
        this._controller = controller;
        this._colorSettings = colorSettings;

        this._icon = new St.Icon({
            icon_name: 'night-light-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        this._enabledSignal = colorSettings.connect(
            `changed::${NIGHT_LIGHT_ENABLED_KEY}`,
            () => this._updateIcon());

        this._updateIcon();
    }

    vfunc_event(event) {
        if (event.type() === Clutter.EventType.BUTTON_PRESS) {
            if (event.get_button() === Clutter.BUTTON_PRIMARY) {
                this._controller.toggle();
                return Clutter.EVENT_STOP;
            }
            if (event.get_button() === Clutter.BUTTON_SECONDARY) {
                this._extension.openPreferences();
                return Clutter.EVENT_STOP;
            }
        } else if (event.type() === Clutter.EventType.TOUCH_BEGIN) {
            this._controller.toggle();
            return Clutter.EVENT_STOP;
        }

        return super.vfunc_event(event);
    }

    _updateIcon() {
        this._icon.opacity = this._controller.enabled ? 255 : 140;
    }

    destroy() {
        if (this._enabledSignal) {
            this._colorSettings.disconnect(this._enabledSignal);
            this._enabledSignal = 0;
        }

        this._colorSettings = null;
        this._controller = null;
        this._extension = null;

        super.destroy();
    }
});
