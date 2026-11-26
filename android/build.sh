#!/usr/bin/env bash
# Gera o APK Android do Controle de Chaves a partir da pasta ../chaves.
# Requisitos (Ubuntu/Debian):
#   sudo apt-get install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 openjdk-17-jdk zip python3-pil
set -euo pipefail
cd "$(dirname "$0")"

ANDROID_JAR=${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}
KEYSTORE=${KEYSTORE:-keystore/chaves.keystore}
KS_PASS=${KS_PASS:-chaves123}
OUT=${OUT:-dist/ControleDeChaves.apk}
B=build

rm -rf "$B" && mkdir -p "$B/assets/www" "$B/res" "$B/gen" "$B/classes" "$(dirname "$OUT")"

echo "1/7 Copiando o app web"
cp -r ../chaves/index.html ../chaves/css ../chaves/js ../chaves/icons "$B/assets/www/"

echo "2/7 Gerando ícones"
cp -r res/. "$B/res/"
python3 - "$B/res" <<'PY'
import sys, os
from PIL import Image
src = Image.open('../chaves/icons/icon-512.png').convert('RGBA')
for d, s in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    p = os.path.join(sys.argv[1], 'mipmap-' + d); os.makedirs(p, exist_ok=True)
    src.resize((s, s), Image.LANCZOS).save(os.path.join(p, 'ic_launcher.png'))
PY

echo "3/7 Compilando recursos"
aapt2 compile --dir "$B/res" -o "$B/res.zip"
aapt2 link -I "$ANDROID_JAR" --manifest AndroidManifest.xml -A "$B/assets" \
  --java "$B/gen" -o "$B/base.apk" "$B/res.zip"

echo "4/7 Compilando Java"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath "$ANDROID_JAR" \
  -d "$B/classes" $(find src "$B/gen" -name '*.java')

echo "5/7 Convertendo para DEX"
dalvik-exchange --dex --min-sdk-version=21 --output="$B/classes.dex" "$B/classes"
(cd "$B" && zip -q base.apk classes.dex)

echo "6/7 Alinhando"
zipalign -p -f 4 "$B/base.apk" "$B/aligned.apk"

echo "7/7 Assinando"
if [ ! -f "$KEYSTORE" ]; then
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KS_PASS" -keypass "$KS_PASS" -alias chaves \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Controle de Chaves" >/dev/null 2>&1
fi
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --ks-key-alias chaves --out "$OUT" "$B/aligned.apk"
apksigner verify --verbose "$OUT" | head -4
echo "APK gerado: $(pwd)/$OUT"
