const fetch = require("node-fetch");

const gistId = process.env.GIST_ID;
if (!gistId) throw new Error(`GIST_ID is not set`);
const githubPAT = process.env.GITHUB_PAT;
if (!githubPAT) throw new Error(`GITHUB_PAT is not set`);

async function getProblem(pid) {
  const res = await fetch(`https://www.luogu.com.cn/problem/${pid}?_contentOnly=1`);
  const obj = await res.json();
  return obj.currentData.problem;
}

async function patchGist(gistId, body) {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      "Authorization": "Bearer " + githubPAT
    },
    body: JSON.stringify(body),
    method: "PATCH"
  });
  if (res.status !== 200) throw new Error(`failed to patch gist ${gistId}: ${await res.text()}`);
}

(async () => {
  const problem = await getProblem("P1000");
  const rate = problem.totalAccepted / problem.totalSubmit;
  if (await patchGist(gistId, {
    files: {
      "monitor-p1000.md": {
        content: `${new Date().toUTCString()} - ${(rate * 100).toFixed(6)}%\n`
      }
    }
  }) !== 200);
})().catch(error => {
  const tmp = error === null || error === undefined ? undefined : error.stack;
  process.stderr.write(`unexpected error: ${tmp === null || tmp === undefined ? error : tmp}\n`);
  process.exit(1);
});
