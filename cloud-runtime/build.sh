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
node --check cloud-runtime/stopGame.js
node --check cloud-runtime/stopPrivate.js
node cloud-runtime/stopGame.test.js
node --check cloud-runtime/originalCompat.js
node --check cloud-runtime/ttsWorker.js
node cloud-runtime/originalCompat.test.js
node --check cloud-runtime/profileCard.js
node cloud-runtime/profileCard.test.js
node --check cloud-runtime/fun.js
node --check cloud-runtime/funMedia.js
node cloud-runtime/fun.test.js
node --check cloud-runtime/games4.js
node --check cloud-runtime/tournament4.js
node --check cloud-runtime/community4.js
node --check cloud-runtime/media4.js
node cloud-runtime/v4.test.js
node --check cloud-runtime/games5.js
node --check cloud-runtime/community5.js
node --check cloud-runtime/media5.js
node --check cloud-runtime/transaction5.js
node cloud-runtime/v5.test.js
node --check cloud-runtime/manager.js
node --check cloud-runtime/managerWorker.js
node --check cloud-runtime/managerSupervisor.js
node --check cloud-runtime/manager-web/app.js
node cloud-runtime/manager.test.js
node cloud-runtime/relink.test.js
node --check cloud-runtime/managerV2.js
node cloud-runtime/managerV2.test.js
node --check lib/Initialize/localStorage.js
node --check cloud-runtime/privateLocal.js
node cloud-runtime/privateLocal.test.js
node --check cloud-runtime/infinity.js
node cloud-runtime/infinity6-regression.test.js
node --check cloud-runtime/infinity.js
node cloud-runtime/infinity.test.js
node --check cloud-runtime/world.js
node --check cloud-runtime/world-web.js
node cloud-runtime/world.test.js
node --check cloud-runtime/worldPersistent.js
node cloud-runtime/worldPersistent.test.js
node --check cloud-runtime/worldMap.js
node cloud-runtime/worldMap.test.js
node --check cloud-runtime/worldAdventure.js
node cloud-runtime/worldAdventure.test.js
node --check cloud-runtime/worldLiving.js
node --check cloud-runtime/world3d.js
node cloud-runtime/worldLiving.test.js
node --check cloud-runtime/gameHub.js
node cloud-runtime/gameHub.test.js
node --check cloud-runtime/gameVisual.js
node cloud-runtime/gameVisual.test.js
node --check cloud-runtime/games7.js
node --check cloud-runtime/gameQuotes7.js
node cloud-runtime/games7.test.js
node --check cloud-runtime/inbound7.js
node cloud-runtime/inbound7.test.js
cd cloud-runtime
node --input-type=module -e 'import * as b from "@whiskeysockets/baileys"; if(typeof (b.makeWASocket || b.default)!=="function" || typeof b.initAuthCreds!=="function" || !b.BufferJSON || !b.proto) throw Error("Baileys exports unavailable"); console.log("Iris: Baileys dependency import passed")'

node --input-type=module -e 'import sharp from "sharp"; import {makeSticker} from "./sticker.js"; const png=await sharp({create:{width:32,height:32,channels:3,background:"#9f7aea"}}).png().toBuffer(); const result=await makeSticker({message:{imageMessage:{mimetype:"image/png",fileLength:png.length}}},{downloadContentFromMessage:async()=> (async function*(){yield png;})()}); if(!result.sticker || (await sharp(result.sticker).metadata()).width!==512) throw Error("Sticker test failed"); console.log("Iris: sticker conversion smoke test passed")'

node --input-type=module -e 'import sharp from "sharp"; import {makeAnimatedSticker} from "./sticker.js"; const gif=Buffer.from("R0lGODlhEAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAFAAAACwAAAAAEAAQAAAIHQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFgQEBACH5BAEUAAEALAAAAAAQABAAgQAA/wAAAAAAAAAAAAgdAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWBAQEAOw==","base64"); const result=await makeAnimatedSticker({fileLength:gif.length},{downloadContentFromMessage:async()=> (async function*(){yield gif;})()}); if(!result.sticker) throw Error("Animated sticker conversion failed"); const m=await sharp(result.sticker,{animated:true}).metadata(); if(m.pages!==2||m.width!==512||m.pageHeight!==512) throw Error("Animated sticker frame test failed"); console.log("Iris: animated sticker smoke test passed")'
