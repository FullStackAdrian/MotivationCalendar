#!/usr/bin/env bash
# Construye el APK Android con el mismo EXPO_PUBLIC_API_URL que usa la web.
# Falla cerrado si la URL no está definida: sin ella el APK hornearía localhost.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
DEST="$ROOT/backend/downloads/motivation-calendar.apk"

if [[ -z "${EXPO_PUBLIC_API_URL:-}" ]]; then
  echo "ERROR: EXPO_PUBLIC_API_URL no está definida." >&2
  echo "Exporta la URL pública del backend (la misma que usa GitHub Pages) y reintenta:" >&2
  echo '  EXPO_PUBLIC_API_URL=https://tu-backend.example.com ./scripts/build-android-apk.sh' >&2
  exit 1
fi

echo "API embebida en el APK: $EXPO_PUBLIC_API_URL"

cd "$FRONTEND"
npm install --no-audit --no-fund

# Genera android/ nativo con la env ya presente (Expo la hornea en el JS).
npx expo prebuild --platform android --clean

cd android
if [[ -x ./gradlew ]]; then
  ./gradlew :app:assembleRelease
else
  gradle :app:assembleRelease
fi

APK_SRC="$(find app/build/outputs/apk/release -maxdepth 1 -name '*.apk' | head -n 1)"
if [[ -z "${APK_SRC:-}" ]]; then
  echo "ERROR: no se encontró el APK en app/build/outputs/apk/release" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
cp "$APK_SRC" "$DEST"
echo "APK copiado a: $DEST"
ls -lh "$DEST"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$DEST"
fi
echo "Verifica que el APK apunta a: $EXPO_PUBLIC_API_URL"
