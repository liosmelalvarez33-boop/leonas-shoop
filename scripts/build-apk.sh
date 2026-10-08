#!/bin/bash
# Compila y firma el APK de Leonas Shoop (sin CLI interactivo).
# Uso: bash scripts/build-apk.sh
set -euo pipefail

cd "$(dirname "$0")/.."
export JAVA_HOME="$HOME/tools/amazon-corretto-17.0.20.12.1-linux-x64"
export ANDROID_HOME="$HOME/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
export NODE_OPTIONS="--dns-result-order=ipv4first"

CORE="$HOME/.npm/_npx/dfa49dbfae4ff63e/node_modules/@bubblewrap/core"
KEYSTORE="$HOME/.keys/leonas-shoop.keystore"
PW="$(cat "$HOME/.config/leonas-shoop/keystore.pass")"

if [ ! -d apk/android ]; then
  echo "== Generando el proyecto Android desde twa-manifest.json =="
  node -e "
    const core = require('$CORE');
    (async () => {
      const log = new core.ConsoleLog('info');
      const twa = await core.TwaManifest.fromFile('apk/twa-manifest.json');
      await new core.TwaGenerator(log).createTwaProject(process.cwd() + '/apk/android', twa);
    })().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
  "
fi

# Ajustes para este entorno: mirror rápido de Gradle y red inestable.
WRAPPER=apk/android/gradle/wrapper/gradle-wrapper.properties
if grep -q "services.gradle.org" "$WRAPPER"; then
  sed -i 's|distributionUrl=https\\://services.gradle.org/distributions/|distributionUrl=https\\://mirrors.cloud.tencent.com/gradle/|; s|networkTimeout=10000|networkTimeout=60000|' "$WRAPPER"
fi
grep -q "org.gradle.internal.http.socketTimeout" apk/android/gradle.properties 2>/dev/null || cat >> apk/android/gradle.properties << 'EOF'

# Red inestable: esperas más largas para descargas que van gota a gota.
systemProp.org.gradle.internal.http.connectionTimeout=180000
systemProp.org.gradle.internal.http.socketTimeout=180000
EOF

echo "== Compilando (la primera vez baja Gradle y dependencias) =="
(cd apk/android && ./gradlew assembleRelease --no-daemon --console=plain)

UNSIGNED=apk/android/app/build/outputs/apk/release/app-release-unsigned.apk
APK=apk/android/leonas-shoop.apk
echo "== Firmando =="
apksigner sign --ks "$KEYSTORE" --ks-key-alias leonas-shoop \
  --ks-pass "pass:$PW" --key-pass "pass:$PW" --out "$APK" "$UNSIGNED"
apksigner verify "$APK" && echo "firma verificada ✓"

mkdir -p public/apps
cp "$APK" public/apps/leonas-shoop.apk
echo "APK listo: public/apps/leonas-shoop.apk ($(stat -c%s public/apps/leonas-shoop.apk) bytes)"
