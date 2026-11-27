#!/usr/bin/env bash
set -euo pipefail
npm --prefix cloud-runtime install --omit=dev --no-audit --no-fund
node --check lib/Initialize/cloudPreview.js
node --check lib/Initialize/cloudAuth.js
node --check lib/Initialize/cloudStorage.js
node --check lib/Initialize/cloudSelfTest.js
node --check cloud-runtime/bot.js
node cloud-runtime/chatSettings.test.js
node --check cloud-runtime/features.js
node --check cloud-runtime/sticker.js
node cloud-runtime/features.test.js
node --check cloud-runtime/localFun.js
node cloud-runtime/localFun.test.js
node --check cloud-runtime/extras.js
node cloud-runtime/extras.test.js
node --check cloud-runtime/nextFeatures.js
node cloud-runtime/nextFeatures.test.js
node --check cloud-runtime/persistentChess.js
node --check cloud-runtime/advancedMedia.js
node cloud-runtime/advancedFeatures.test.js
node --check cloud-runtime/stickerCommands.js
node cloud-runtime/stickerCommands.test.js
node --check cloud-runtime/community.js
node --check cloud-runtime/converters.js
node --check cloud-runtime/runtimeStatus.js
node cloud-runtime/community.test.js
node --check cloud-runtime/megaGames.js
node --check cloud-runtime/megaCommunity.js
node --check cloud-runtime/studio.js
node cloud-runtime/mega.test.js
node --check cloud-runtime/games3.js
node --check cloud-runtime/social3.js
node --check cloud-runtime/media3.js
node cloud-runtime/v3.test.js
node --check cloud-runtime/originalCompat.js
node --check cloud-runtime/ttsWorker.js
node cloud-runtime/originalCompat.test.js
cd cloud-runtime
node --input-type=module -e 'import * as b from "@whiskeysockets/baileys"; if(typeof (b.makeWASocket || b.default)!=="function" || typeof b.initAuthCreds!=="function" || !b.BufferJSON || !b.proto) throw Error("Baileys exports unavailable"); console.log("Iris: Baileys dependency import passed")'

node --input-type=module -e 'import sharp from "sharp"; import {makeSticker} from "./sticker.js"; const png=await sharp({create:{width:32,height:32,channels:3,background:"#9f7aea"}}).png().toBuffer(); const result=await makeSticker({message:{imageMessage:{mimetype:"image/png",fileLength:png.length}}},{downloadContentFromMessage:async()=> (async function*(){yield png;})()}); if(!result.sticker || (await sharp(result.sticker).metadata()).width!==512) throw Error("Sticker test failed"); console.log("Iris: sticker conversion smoke test passed")'

node --input-type=module -e 'import sharp from "sharp"; import {makeAnimatedSticker} from "./sticker.js"; const gif=Buffer.from("R0lGODlhEAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAFAAAACwAAAAAEAAQAAAIHQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFgQEBACH5BAEUAAEALAAAAAAQABAAgQAA/wAAAAAAAAAAAAgdAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWBAQEAOw==","base64"); const result=await makeAnimatedSticker({fileLength:gif.length},{downloadContentFromMessage:async()=> (async function*(){yield gif;})()}); if(!result.sticker) throw Error("Animated sticker conversion failed"); const m=await sharp(result.sticker,{animated:true}).metadata(); if(m.pages!==2||m.width!==512||m.pageHeight!==512) throw Error("Animated sticker frame test failed"); console.log("Iris: animated sticker smoke test passed")'
