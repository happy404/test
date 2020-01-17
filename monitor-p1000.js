const { DateTime } = require("luxon");
const fetch = require("node-fetch");
const { getGist, patchGist } = require("./github-api");

const gistId = process.env.GIST_ID;
if (!gistId) throw new Error(`GIST_ID is not set`);

const targetFile = "1-index.md";
const dataFile = "2-data.json";

(async () => {
  const res = await fetch("https://www.luogu.com.cn/problem/P1000?_contentOnly=1");
  const currentTime = DateTime.fromHTTP(res.headers.get("Date")).toMillis();
  const problem = (await res.json()).currentData.problem;
  const data = JSON.parse((await getGist(gistId)).files[dataFile].content)
    .filter(({ time }) => currentTime <= time + 86400000);
  data.unshift({
    time: currentTime,
    rate: problem.totalAccepted / problem.totalSubmit
  });
  await patchGist(gistId, {
    files: {
      [targetFile]: {
        content: "| 时间 | 通过率 |\n|-|-|\n" + data.map(({ time, rate }) =>
          `| ${DateTime.fromMillis(time, { zone: "Asia/Shanghai" }).toFormat("yyyy-LL-dd HH:mm:ss")} | ${(rate * 100).toFixed(6)}% |\n`).join("")
      },
      [dataFile]: {
        content: JSON.stringify(data, undefined, 2) + "\n"
      }
    }
  });
})().catch(error => {
  process.stderr.write(`unexpected error: ${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
