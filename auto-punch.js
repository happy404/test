const fetch = require("node-fetch");
const htmlToText = require('html-to-text');

const uid = process.env.LUOGU_UID;
if (!uid) throw new Error(`LUOGU_UID is not set`);
const clientId = process.env.LUOGU_CLIENT_ID;
if (!clientId) throw new Error(`LUOGU_CLIENT_ID is not set`);
(async () => {
  const res = await fetch("https://www.luogu.com.cn/index/ajax_punch", {
    headers: {
      "Cookie": `_uid=${uid}; __client_id=${clientId}`
    }
  });
  const obj = await res.json();
  const status = obj.code;
  if (status < 200 || status >= 300) throw new Error(`failed to punch (${status}): ${obj.message}`);
  process.stdout.write((status === 200 ? htmlToText.fromString(obj.more.html) : obj.message) + "\n");
})().catch(error => {
  process.stderr.write(`unexpected error: ${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
