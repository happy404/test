const { DateTime } = require("luxon");
const fetch = require("node-fetch");
const { getGist, patchGist } = require("./github-api");

const gistId = process.env.GIST_ID;
if (!gistId) throw new Error(`GIST_ID is not set`);

(async () => {
  const res = await fetch("https://www.luogu.com.cn/problem/P1000?_contentOnly=1");
  const currentTime = DateTime.fromHTTP(res.headers.get("Date")).toMillis();
  const problem = (await res.json()).currentData.problem;
  const data = JSON.parse((await getGist(gistId)).files["2-data.json"].content)
    .filter(({ time }) => currentTime <= time + 86400000);
  data.unshift({
    time: currentTime,
    rate: problem.totalAccepted / problem.totalSubmit
  });
  await patchGist(gistId, {
    files: {
      "1-index.md": {
        content: "| 时间 | 通过率 |\n|-|-|\n" + data.map(({ time, rate }) =>
          `| ${DateTime.fromMillis(time).toFormat("yyyy-LL-dd hh:mm:ss")} | ${(rate * 100).toFixed(6)}% |\n`).join("")
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
