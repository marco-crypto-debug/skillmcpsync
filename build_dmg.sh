#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# build_dmg.sh - Automated Build & DMG Packaging Script for macOS
# Unified Cross-Server MCP, Skills & Memory Sync Tool + macOS Management App
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="${PROJECT_ROOT}/dist"
APP_NAME="AgentController"
APP_BUNDLE="${DIST_DIR}/${APP_NAME}.app"
DMG_PATH="${DIST_DIR}/${APP_NAME}.dmg"
STAGING_DIR="${PROJECT_ROOT}/build_dmg_staging"

echo "======================================================================"
echo " Building ${APP_NAME} macOS Application & Distribution DMG"
echo "======================================================================"

# Step 1: Verify prerequisites
command -v swiftc >/dev/null 2>&1 || { echo "Error: swiftc compiler not found."; exit 1; }
command -v hdiutil >/dev/null 2>&1 || { echo "Error: hdiutil tool not found."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm not found."; exit 1; }

mkdir -p "${DIST_DIR}"
rm -rf "${APP_BUNDLE}" "${STAGING_DIR}" "${DMG_PATH}"

# Step 2: Build Node CLI & Sync Daemon
echo "[1/5] Compiling TypeScript Backend Daemon & CLI..."
cd "${PROJECT_ROOT}"
npm run build

# Step 3: Compile Swift/SwiftUI Native macOS App
echo "[2/5] Compiling Native macOS SwiftUI App (${APP_NAME})..."
mkdir -p "${APP_BUNDLE}/Contents/MacOS"
mkdir -p "${APP_BUNDLE}/Contents/Resources"

# Detect architecture
ARCH="$(uname -m)"
TARGET_ARCH="arm64-apple-macos14.0"
if [ "${ARCH}" = "x86_64" ]; then
  TARGET_ARCH="x86_64-apple-macos14.0"
fi

swiftc -O \
  -target "${TARGET_ARCH}" \
  -framework SwiftUI \
  -framework AppKit \
  "${PROJECT_ROOT}/macos/AgentController/"*.swift \
  -o "${APP_BUNDLE}/Contents/MacOS/${APP_NAME}"

chmod +x "${APP_BUNDLE}/Contents/MacOS/${APP_NAME}"

# Step 4: Write Info.plist & Metadata
echo "[3/5] Setting Bundle Metadata & Info.plist..."
cat << 'EOF' > "${APP_BUNDLE}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>AgentController</string>
    <key>CFBundleIdentifier</key>
    <string>com.agentcontroller.macos</string>
    <key>CFBundleName</key>
    <string>AgentController</string>
    <key>CFBundleDisplayName</key>
    <string>Agent Controller</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>14.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsLocalNetworking</key>
        <true/>
    </dict>
</dict>
</plist>
EOF

# Copy embedded CLI runner into Resources
cat << 'EOF' > "${APP_BUNDLE}/Contents/Resources/skillmcpsync-helper"
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "${DIR}/../../dist/bin.js" "$@"
EOF
chmod +x "${APP_BUNDLE}/Contents/Resources/skillmcpsync-helper"

# Step 5: Stage DMG Layout
echo "[4/5] Staging DMG Volume Layout with /Applications Symlink..."
mkdir -p "${STAGING_DIR}"
cp -R "${APP_BUNDLE}" "${STAGING_DIR}/"
ln -s /Applications "${STAGING_DIR}/Applications"

# Step 6: Generate Production DMG with hdiutil
echo "[5/5] Generating compressed DMG image (${DMG_PATH})..."
hdiutil create \
  -volname "Agent Controller" \
  -srcfolder "${STAGING_DIR}" \
  -ov \
  -format UDZO \
  "${DMG_PATH}"

# Clean staging directory
rm -rf "${STAGING_DIR}"

echo "======================================================================"
echo "✔ DMG Build Complete: ${DMG_PATH}"
echo "======================================================================"
ls -lh "${DMG_PATH}"
