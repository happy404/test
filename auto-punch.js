const htmlToText = require("html-to-text");
const { fetchLuogu } = require("./luogu-api");
const { autoRetry, handleError } = require("./util");

const uid = process.env.LUOGU_UID;
if (!uid) throw new Error(`LUOGU_UID is not set`);
const clientId = process.env.LUOGU_CLIENT_ID;
if (!clientId) throw new Error(`LUOGU_CLIENT_ID is not set`);

(async () => {
  const obj = await autoRetry(() => fetchLuogu("/index/ajax_punch").then(res => res.json()), 5);
  const status = obj.code;
  if (status === 200) console.log(htmlToText.fromString(obj.more.html));
  else throw new Error(`failed to punch (${status}): ${obj.message}`);
})().catch(handleError);
