const fetch = require("node-fetch");

async function fetchGitHub(url, init = {}) {
  if (!init.headers) init.headers = {};
  const token = process.env.GITHUB_PAT;
  if (token) init.headers["Authorization"] = "Bearer " + token;
  const res = await fetch("https://api.github.com" + url, init);
  if (res.status < 200 || res.status >= 300) throw await res.text();
  return res;
}

async function getGist(gistId) {
  return await fetchGitHub(`/gists/${gistId}`);
}

async function patchGist(gistId, body) {
  return await fetchGitHub(`/gists/${gistId}`, {
    body: JSON.stringify(body),
    method: "PATCH"
  });
}

module.exports = { fetchGitHub, getGist, patchGist };
