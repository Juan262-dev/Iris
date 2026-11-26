#!/usr/bin/env bash
set -euo pipefail
node --check lib/Initialize/cloudPreview.js
node --check lib/Initialize/cloudAuth.js
node --check lib/Initialize/cloudStorage.js
node --check lib/Initialize/cloudSelfTest.js
node --check cloud-runtime/bot.js
npm --prefix cloud-runtime install --omit=dev --no-audit --no-fund
cd cloud-runtime
node --input-type=module -e 'import * as b from "@whiskeysockets/baileys"; if(typeof (b.makeWASocket || b.default)!=="function" || typeof b.initAuthCreds!=="function" || !b.BufferJSON || !b.proto) throw Error("Baileys exports unavailable"); console.log("Iris: Baileys dependency import passed")'
