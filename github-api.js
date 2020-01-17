const fetch = require("node-fetch");

function errorFrom(str) {
  try {
    const obj = JSON.parse(str);
    return obj && obj.message ? obj.message : obj;
  } catch (_) {
    return str;
  }
}

async function fetchGitHub(url, init = {}) {
  if (!init.headers) init.headers = {};
  const token = process.env.GITHUB_PAT;
  if (token) init.headers["Authorization"] = "Bearer " + token;
  const res = await fetch("https://api.github.com" + url, { init });
  if (res.status < 200 || res.status >= 300) throw errorFrom(await res.text());
  return res;
}

module.exports = {
  async getGist(gistId) {
    return await (await fetchGitHub(`/gists/${gistId}`)).json();
  },
  async patchGist(gistId, body) {
    return await (await await fetchGitHub(`/gists/${gistId}`, {
      body: JSON.stringify(body),
      method: "PATCH"
    })).json();
  }
};
