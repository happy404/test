const { DateTime } = require("luxon");
const fetch = require("node-fetch");
const { getGist, patchGist } = require("./github-api");

const gistId = process.env.GIST_ID;
if (!gistId) throw new Error(`GIST_ID is not set`);

const resultFile = "1-monitor-p1000.svg";
const dataFile = "2-data.json";

function formatTime(time) {
  return DateTime.fromMillis(time, { zone: "Asia/Shanghai" }).toFormat("yyyy-LL-dd HH:mm:ss");
}

function render(data, currentTime) {
  const rates = data.map(({ rate }) => rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const rMin = Math.max(3 * min - 2 * max, 0);
  const rMax = Math.min(3 * max - 2 * min, 1);
  const points = data.map(({ time, rate }) => [
    660 - (currentTime - time) * 0.000006666666666666667,
    428 - (rate - rMin) / (rMax - rMin) * 400
  ]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="712" height="448" font-size="14" fill="transparent">
  <g stroke="black" stroke-width="2">
    <path d="M 64,16 l 4,-4 4,4 m -4,-4 v 416 h 608 m -4,-4 l 4,4 l -4,4" />
    <line x1="68" y1="28" x2="72" y2="28" />
    <line x1="84" y1="428" x2="84" y2="424" />
    <line x1="660" y1="428" x2="660" y2="424" />
  </g>
  <g fill="black" dominant-baseline="central">
    <text x="680" y="428">时间</text>
    <text x="76" y="12">通过率</text>
    <g text-anchor="end">
      <text x="64" y="428">${rMin.toFixed(6)}</text>
      <text x="64" y="28">${rMax.toFixed(6)}</text>
    </g>
    <g dominant-baseline="hanging">
      <text x="84" y="432">${formatTime(currentTime - 86400000)}</text>
      <text x="660" y="432" text-anchor="end">${formatTime(currentTime)}</text>
    </g>
  </g>
  <polyline points="${points.map(point => point.join()).join(" ")}" stroke="black" stroke-width="1" />
  <g fill="black">
${points.map(([x, y]) => `    <circle cx="${x}" cy="${y}" r="1" />`).join("\n")}
  </g>
</svg>
`;
}

(async () => {
  const res = await fetch("https://www.luogu.com.cn/problem/P1000?_contentOnly=1");
  const currentTime = DateTime.fromHTTP(res.headers.get("Date")).toMillis();
  const problem = (await res.json()).currentData.problem;
  const data = JSON.parse((await getGist(gistId)).files[dataFile].content)
    .filter(({ time }) => currentTime <= time + 86400000);
  const entry = {
    time: currentTime,
    rate: problem.totalAccepted / problem.totalSubmit
  };
  process.stdout.write(`new entry: { time: ${entry.time}, rate: ${entry.rate} }\n`);
  data.push(entry);
  await patchGist(gistId, {
    files: {
      [resultFile]: { content: render(data, currentTime) },
      [dataFile]: { content: JSON.stringify(data) + "\n" }
    }
  });
})().catch(error => {
  process.stderr.write(`unexpected error: ${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
