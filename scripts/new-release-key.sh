#!/usr/bin/env bash
# Create SummerQuest's release signing key (once, ever) and show how to wire it in.
#
#   bash scripts/new-release-key.sh
#
# You type the passwords yourself (keytool asks); this script never sees or stores them.
# The key goes to ~/.summerquest-keys/, outside the repo. BACK IT UP, with its password
# (e.g. in your password manager): every future update of the app is built with this key.
set -euo pipefail

DIR="$HOME/.summerquest-keys"
STORE="$DIR/summerquest-release.jks"
ALIAS="summerquest"

KEYTOOL="$(command -v keytool || true)"
if [ -z "$KEYTOOL" ] || ! "$KEYTOOL" -help >/dev/null 2>&1; then
  KEYTOOL="/opt/homebrew/opt/openjdk@21/bin/keytool"
fi
[ -x "$KEYTOOL" ] || { echo "keytool not found: install a JDK (brew install openjdk@21)"; exit 1; }

if [ -e "$STORE" ]; then
  echo "A release key already exists at $STORE. Not overwriting it."
  exit 1
fi

mkdir -p "$DIR"
chmod 700 "$DIR"
echo "Creating $STORE (alias '$ALIAS'). keytool will ask for a password and a few name fields."
echo "The name fields can be your studio name; they aren't shown to customers."
"$KEYTOOL" -genkeypair -v -keystore "$STORE" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000
chmod 600 "$STORE"

cat <<MSG

Done. Now add these four lines to ~/.gradle/gradle.properties (create the file if needed),
typing your password where it says so. That file is on your Mac only, never in the repo:

  SQ_RELEASE_STORE_FILE=$STORE
  SQ_RELEASE_STORE_PASSWORD=<the password you just chose>
  SQ_RELEASE_KEY_ALIAS=$ALIAS
  SQ_RELEASE_KEY_PASSWORD=<the same password, unless you set a separate key password>

Then build the signed release:  npm run android:release
Output: android/app/build/outputs/apk/release/app-release.apk

Back up $STORE and its password now.
MSG
