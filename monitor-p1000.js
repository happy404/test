const { DateTime } = require("luxon");
const { getGist, patchGist } = require("./github-api");
const { getProblem } = require("./luogu-api");
const { autoRetry, handleError } = require("./util");

const uid = process.env.LUOGU_UID;
if (!uid) throw new Error(`LUOGU_UID is not set`);
const clientId = process.env.LUOGU_CLIENT_ID;
if (!clientId) throw new Error(`LUOGU_CLIENT_ID is not set`);
const gistId = process.env.GIST_ID;
if (!gistId) throw new Error(`GIST_ID is not set`);

const resultFile = "1-monitor-p1000.svg";
const dataFile = "2-data.json";
const timeout = 604800000;

function formatTime(time) {
  return DateTime.fromMillis(time, { zone: "Asia/Shanghai" }).toFormat("yyyy-LL-dd HH:mm:ss");
}

function render(data, currentTime) {
  const rates = data.map(({ rate }) => rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const points = data.map(({ time, rate }) => [
    660 - (currentTime - time) * 576 / timeout,
    428 - (rate - min) / (max - min) * 400
  ]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="712" height="464" font-size="14" fill="transparent">
  <g stroke="black" stroke-width="2">
    <path d="M 64,16 l 4,-4 4,4 m -4,-4 v 432 h 608 m -4,-4 l 4,4 l -4,4" />
    <line x1="68" y1="28" x2="72" y2="28" />
    <line x1="68" y1="428" x2="72" y2="428" />
    <line x1="84" y1="444" x2="84" y2="440" />
    <line x1="660" y1="444" x2="660" y2="440" />
  </g>
  <g fill="black" dominant-baseline="central">
    <text x="680" y="444">时间</text>
    <text x="76" y="12">通过率</text>
    <g text-anchor="end">
      <text x="64" y="428">${min.toFixed(6)}</text>
      <text x="64" y="28">${max.toFixed(6)}</text>
    </g>
    <g dominant-baseline="hanging">
      <text x="84" y="448">${formatTime(currentTime - timeout)}</text>
      <text x="660" y="448" text-anchor="end">${formatTime(currentTime)}</text>
    </g>
  </g>
  <polyline points="${points.map(point => point.join()).join(" ")}" stroke="black" stroke-width="1" />
</svg>
`;
}

(async () => {
  const { time, problem } = await autoRetry(async () => {
    const res = await getProblem("P1000");
    return {
      time: DateTime.fromHTTP(res.headers.get("Date")).toMillis(),
      problem: (await res.json()).currentData.problem
    };
  }, 5);
  const gist = await autoRetry(() => getGist(gistId).then(res => res.json()), 5);
  const data = JSON.parse(gist.files[dataFile].content)
    .filter(entry => time <= entry.time + timeout);
  const entry = {
    time,
    rate: problem.totalAccepted / problem.totalSubmit
  };
  console.log(JSON.stringify(entry));
  data.push(entry);
  const gist = {
    files: {
      [resultFile]: { content: render(data, time) },
      [dataFile]: { content: JSON.stringify(data) + "\n" }
    }
  };
  await autoRetry(() => patchGist(gistId, gist).then(res => res.json()), 5);
})().catch(handleError);
