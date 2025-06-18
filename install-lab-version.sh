#!/bin/bash
set -e

LAB=$1
PKG=package.json
BACKUP=package.json.backup
LOCKFILE="yarn.lock.lab$LAB"

if [[ "$LAB" != "3" && "$LAB" != "4" ]]; then
  echo "Usage: $0 [3|4]"
  exit 1
fi

echo "Backing up $PKG..."
cp "$PKG" "$BACKUP"

echo "Injecting resolutions for Lab $LAB..."
if [[ "$LAB" == "3" ]]; then
  jq '. + {
    resolutions: {
      "@jupyterlab/application": "^3.6.0",
      "@jupyterlab/mainmenu": "^3.6.0",
      "@jupyterlab/apputils": "^3.6.0",
      "@jupyterlab/coreutils": "^5.2.0",
      "@jupyterlab/services": "^6.5.0",
      "@jupyterlab/builder": "^3.3.0",
      "@lumino/widgets": "<2.0.0",
      "@lumino/coreutils": "<2.0.0",
      "@jupyterlab/cells": "^3.6.8",
      "@jupyterlab/statusbar": "^3.6.8",
      "@jupyterlab/filebrowser": "^3.6.8",
      "@jupyterlab/notebook": "^3.6.8",
      "@jupyterlab/ui-components": "^3.6.8",
      "@jupyterlab/codemirror": "^3.6.8",
      "@jupyterlab/codeeditor": "^3.6.8",
      "react": "17.0.2",
      "react-dom": "17.0.2",
      "@types/react": "17.0.48"
    }
  }' "$BACKUP" > "$PKG"
else
  jq '. + {
    resolutions: {
      "@jupyterlab/application": "^4.0.0",
      "@jupyterlab/mainmenu": "^4.0.0",
      "@jupyterlab/apputils": "^4.0.0",
      "@jupyterlab/coreutils": "^6.0.0",
      "@jupyterlab/services": "^7.0.0",
      "@jupyterlab/builder": "^4.0.0",
      "@jupyterlab/cells": "^4.0.0",
      "@jupyterlab/statusbar": "^4.0.0",
      "@jupyterlab/filebrowser": "^4.0.0",
      "@jupyterlab/notebook": "^4.0.0",
      "@jupyterlab/ui-components": "^4.0.0",
      "@jupyterlab/codemirror": "^4.0.0",
      "@jupyterlab/codeeditor": "^4.0.0",
      "@lumino/widgets": "^2.0.0",
      "@lumino/coreutils": "^2.0.0",
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "@types/react": "^18.3.3"
    }
  }' "$BACKUP" > "$PKG"
fi

if [ -f "$LOCKFILE" ]; then
  echo "Restoring $LOCKFILE..."
  cp "$LOCKFILE" yarn.lock
else
  echo "⚠️ No $LOCKFILE found. Will generate a fresh one."
fi

echo "Running yarn install for Lab $LAB..."
yarn install

echo "Checking for lockfile changes..."
if [ -f "$LOCKFILE" ]; then
  if ! diff -q yarn.lock "$LOCKFILE" >/dev/null; then
    echo "⚠️ Detected changes in yarn.lock compared to $LOCKFILE:"
    echo "────────────────────────────────────────────────────"
    diff -u "$LOCKFILE" yarn.lock || true
    echo "────────────────────────────────────────────────────"
    echo "🔁 To update saved lockfile, install the package, and run:"
    echo "    cp yarn.lock $LOCKFILE && git add $LOCKFILE"
  fi
else
  echo "ℹ️ No existing $LOCKFILE snapshot found."
fi

echo "Running pip install -e .[test,dev]"
pip install -e .[test,dev]

echo "Updating $LOCKFILE snapshot..."
cp yarn.lock "$LOCKFILE"

echo "Cleaning up build artifacts..."
rm -f package.json.backup

# If the original package.json is restored byte-for-byte,
# this unstages the file if unchanged from HEAD:
git restore --staged package.json 2>/dev/null || true
git restore package.json 2>/dev/null || true
rm -f "$BACKUP"