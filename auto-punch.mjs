import htmlToText from "html-to-text";
import fetch from "node-fetch";
import retry from "p-retry";
import { requireEnv } from "./util.mjs";

async function punch(uid, clientId) {
  const res = await fetch("https://www.luogu.com.cn/index/ajax_punch", {
    headers: {
      "Cookie": `_uid=${uid}; __client_id=${clientId}`
    }
  });
  return res.json();
}

(async () => {
  const uid = requireEnv("LUOGU_UID");
  const clientId = requireEnv("LUOGU_CLIENT_ID");
  const res = await retry(() => punch(uid, clientId));
  if (res.code === 200)
    console.log(htmlToText.fromString(res.more.html));
  else
    console.error(res.message);
})();
