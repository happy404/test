const fetch = require("node-fetch");
const htmlToText = require('html-to-text');

const uid = process.env.LUOGU_UID;
if (!uid) throw new Error(`LUOGU_UID is not set`);
const clientId = process.env.LUOGU_CLIENT_ID;
if (!clientId) throw new Error(`LUOGU_CLIENT_ID is not set`);

async function punch(uid, clientId) {
  const res = await fetch("https://www.luogu.com.cn/index/ajax_punch", {
    headers: {
      "Cookie": `_uid=${uid}; __client_id=${clientId}`
    }
  });
  const data = await res.json();
  if (data.code < 200 || data.code >= 300) throw new Error(`failed to punch (${data.code}): ${data.message}`);
  return data.code === 200 ? data.more.html : data.message;
}

(async () => {
  process.stdout.write(htmlToText.fromString(await punch(uid, clientId)) + "\n");
})().catch(error => {
  const tmp = error === null || error === undefined ? undefined : error.stack;
  process.stderr.write(`unexpected error: ${tmp === null || tmp === undefined ? error : tmp}\n`);
  process.exit(1);
});
