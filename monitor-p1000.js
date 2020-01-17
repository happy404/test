const fetch = require("node-fetch");
const { getGist, patchGist } = require("./github-api");

const gistId = process.env.GIST_ID;
if (!gistId) throw new Error(`GIST_ID is not set`);

async function getProblem(pid) {
  const res = await fetch(`https://www.luogu.com.cn/problem/${pid}?_contentOnly=1`);
  const obj = await res.json();
  return obj.currentData.problem;
}

(async () => {
  const currentTime = Date.now();
  const problem = await getProblem("P1000");
  /** @type {{ time: number, rate: number }[]} */
  const data = JSON.parse((await getGist(gistId)).files["data.json"].content)
    .filter(({ time }) => currentTime > time + 604800000);
  data.push({
    time: currentTime,
    rate: problem.totalAccepted / problem.totalSubmit
  });
  await patchGist(gistId, {
    files: {
      "monitor-p1000.md": {
        content: "| 时间 | AC 率 |\n" + data.map(({ time, rate }) =>
          `| ${new Date(time).toUTCString()} | ${(rate * 100).toFixed(6)}% |\n`).join("")
      },
      "data.json": {
        content: JSON.stringify(data)
      }
    }
  });
})().catch(error => {
  process.stderr.write(`unexpected error: ${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
