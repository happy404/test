const fetch = require("node-fetch");

const gistId = process.env.GIST_ID;
if (!gistId) throw new Error(`GIST_ID is not set`);
const token = process.env.GITHUB_PAT;
if (!token) throw new Error(`GITHUB_PAT is not set`);

async function getProblem(pid) {
  const res = await fetch(`https://www.luogu.com.cn/problem/${pid}?_contentOnly=1`);
  const obj = await res.json();
  return obj.currentData.problem;
}

async function patchGist(token, gistId, body) {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(body),
    method: "PATCH"
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`failed to patch gist ${gistId}: ${await res.text()}`);
}

(async () => {
  const problem = await getProblem("P1000");
  const rate = problem.totalAccepted / problem.totalSubmit;
  await patchGist(token, gistId, {
    files: {
      "monitor-p1000.md": {
        content: `${new Date().toUTCString()} - ${(rate * 100).toFixed(6)}%\n`
      }
    }
  });
})().catch(error => {
  const tmp = error === null || error === undefined ? undefined : error.stack;
  process.stderr.write(`unexpected error: ${tmp === null || tmp === undefined ? error : tmp}\n`);
  process.exit(1);
});
