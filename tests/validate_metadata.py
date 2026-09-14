#!/usr/bin/env python3
"""Validate Night Light Toggle metadata.json files.

Usage:
    validate_metadata.py [--variant legacy|modern] <metadata.json> [more.json ...]
    validate_metadata.py            # validates metadata/legacy.json and metadata/modern.json

Exits with a non-zero status when a check fails.
"""

import argparse
import json
import os
import re
import sys

EXPECTED_UUID = "nightlighttoggle@sam"
EXPECTED_SCHEMA = "org.gnome.shell.extensions.nightlighttoggle"
EXPECTED_URL = "https://github.com/shivamksharma/gnome-shell-extension-night-light-toggle"

LEGACY = {"41", "42", "43", "44"}
MODERN = {"45", "46", "47", "48", "49", "50", "51"}


def fail(message):
    print(f"  FAIL {message}")
    return 1


def validate(path, expected_versions):
    errors = 0
    try:
        with open(path, encoding="utf-8") as fh:
            metadata = json.load(fh)
    except (OSError, ValueError) as exc:
        return fail(f"{path}: cannot read metadata: {exc}")

    if metadata.get("uuid") != EXPECTED_UUID:
        errors += fail(f"{path}: uuid must be {EXPECTED_UUID!r}")
    if metadata.get("settings-schema") != EXPECTED_SCHEMA:
        errors += fail(f"{path}: settings-schema must be {EXPECTED_SCHEMA!r}")
    if metadata.get("url") != EXPECTED_URL:
        errors += fail(f"{path}: url must be {EXPECTED_URL!r}")
    if "version" in metadata:
        errors += fail(f"{path}: 'version' is set by EGO and must not be present")
    if "gettext-domain" in metadata:
        errors += fail(f"{path}: 'gettext-domain' is present but no translations are shipped")

    for key in ("name", "description"):
        value = metadata.get(key)
        if not isinstance(value, str) or not value.strip():
            errors += fail(f"{path}: '{key}' must be a non-empty string")
        elif len(value) > 500:
            errors += fail(f"{path}: '{key}' is unreasonably long")

    versions = metadata.get("shell-version")
    if not isinstance(versions, list) or not versions:
        errors += fail(f"{path}: 'shell-version' must be a non-empty list")
    else:
        if any(not re.fullmatch(r"\d+", str(v)) for v in versions):
            errors += fail(f"{path}: 'shell-version' entries must be major numbers")
        elif versions != sorted(set(versions), key=int):
            errors += fail(f"{path}: 'shell-version' must be unique and ascending")
        elif set(versions) != expected_versions:
            errors += fail(
                f"{path}: shell-version {versions} != expected {sorted(expected_versions, key=int)}"
            )

    donations = metadata.get("donations")
    if donations is not None:
        allowed = {"buymeacoffee", "custom", "github", "kofi", "liberapay",
                   "opencollective", "patreon", "paypal"}
        if not isinstance(donations, dict) or set(donations) - allowed:
            errors += fail(f"{path}: 'donations' contains unsupported keys")

    if not errors:
        print(f"  ok   {path}")
    return errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--variant", choices=("legacy", "modern"))
    parser.add_argument("files", nargs="*")
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    files = args.files or [
        os.path.join(root, "metadata/legacy.json"),
        os.path.join(root, "metadata/modern.json"),
    ]

    errors = 0
    for path in files:
        if args.variant == "legacy":
            expected = LEGACY
        elif args.variant == "modern":
            expected = MODERN
        else:
            expected = LEGACY if "legacy" in os.path.basename(path) else MODERN
        errors += validate(path, expected)

    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
