const { JSDOM } = require("jsdom");
const fetch = require("node-fetch");

async function fetchLuogu(url, init = {}) {
  if (!init.headers) init.headers = {};
  const uid = process.env.LUOGU_UID;
  const clientId = process.env.LUOGU_CLIENT_ID;
  if (uid && clientId) init.headers["Cookie"] = `_uid=${uid}; __client_id=${clientId}`;
  const res = await fetch("https://www.luogu.com.cn" + url, init);
  if (res.status < 200 || res.status >= 300) throw await res.text();
  return res;
}

async function getToken() {
  const { window } = new JSDOM(await fetchLuogu("/").then(res => res.arrayBuffer()));
  return window.document.querySelector("meta[name=csrf-token]").content;
}

function getProblem(pid) {
  return fetchLuogu(`/problem/${pid}?_contentOnly=1`);
}

function editPaste(token, id, data, public) {
  return fetchLuogu(`/paste/edit/${id}`, {
    headers: {
      "Content-Type": "application/json",
      "Referer": `https://www.luogu.com.cn/paste/${id}`,
      "X-CSRF-Token": token
    },
    body: JSON.stringify({ data, public }),
    method: "POST"
  });
}

module.exports = { fetchLuogu, getToken, getProblem, editPaste };
