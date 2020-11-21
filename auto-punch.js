import htmlToText from "html-to-text";
import fetch from "node-fetch";
import { autoRetry } from "./util";

const uid = process.env.LUOGU_UID;
if (!uid) throw new Error(`LUOGU_UID is not set`);
const clientId = process.env.LUOGU_CLIENT_ID;
if (!clientId) throw new Error(`LUOGU_CLIENT_ID is not set`);

(async () => {
  const obj = await autoRetry(async () => {
    const res = fetch("https://www.luogu.com.cn/index/ajax_punch", {
      headers: {
        "Cookie": `_uid=${uid}; __client_id=${clientId}`
      }
    });
    return res.json();
  }, 5);
  const status = obj.code;
  if (status === 200) console.log(htmlToText.fromString(obj.more.html));
  else throw new Error(`Failed to punch (${status}): ${obj.message}`);
})();
