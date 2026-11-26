#!/usr/bin/env bash
set -euo pipefail
node --check lib/Initialize/cloudPreview.js
node --check lib/Initialize/cloudAuth.js
node --check lib/Initialize/cloudStorage.js
node --check lib/Initialize/cloudSelfTest.js
node --check cloud-runtime/bot.js
node cloud-runtime/chatSettings.test.js
node --check cloud-runtime/features.js
node --check cloud-runtime/sticker.js
node cloud-runtime/features.test.js
node --check cloud-runtime/ai.js
node cloud-runtime/ai.test.js
npm --prefix cloud-runtime install --omit=dev --no-audit --no-fund
cd cloud-runtime
node --input-type=module -e 'import * as b from "@whiskeysockets/baileys"; if(typeof (b.makeWASocket || b.default)!=="function" || typeof b.initAuthCreds!=="function" || !b.BufferJSON || !b.proto) throw Error("Baileys exports unavailable"); console.log("Iris: Baileys dependency import passed")'

node --input-type=module -e 'import sharp from "sharp"; import {makeSticker} from "./sticker.js"; const png=await sharp({create:{width:32,height:32,channels:3,background:"#9f7aea"}}).png().toBuffer(); const result=await makeSticker({message:{imageMessage:{mimetype:"image/png",fileLength:png.length}}},{downloadContentFromMessage:async()=> (async function*(){yield png;})()}); if(!result.sticker || (await sharp(result.sticker).metadata()).width!==512) throw Error("Sticker test failed"); console.log("Iris: sticker conversion smoke test passed")'
