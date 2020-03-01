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

async function getProblem(pid) {
  return await fetchLuogu(`/problems/${pid}?_contentOnly=1`);
}

module.exports = { fetchLuogu, getProblem };
