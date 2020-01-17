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
  const data = JSON.parse((await getGist(gistId)).files["2-data.json"].content)
    .filter(({ time }) => currentTime <= time + 86400000);
  data.unshift({
    time: currentTime,
    rate: problem.totalAccepted / problem.totalSubmit
  });
  await patchGist(gistId, {
    files: {
      "1-index.md": {
        content: "| 时间 | AC 率 |\n|-|-|\n" + data.map(({ time, rate }) =>
          `| ${new Date(time).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} | ${(rate * 100).toFixed(6)}% |\n`).join("")
      },
      "2-data.json": {
        content: JSON.stringify(data, undefined, 2) + "\n"
      }
    }
  });
})().catch(error => {
  process.stderr.write(`unexpected error: ${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
