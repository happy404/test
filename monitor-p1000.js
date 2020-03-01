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
  const rMin = Math.max(3 * min - 2 * max, 0);
  const rMax = Math.min(3 * max - 2 * min, 1);
  const points = data.map(({ time, rate }) => [
    660 - (currentTime - time) * 576 / timeout,
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
      <text x="84" y="432">${formatTime(currentTime - timeout)}</text>
      <text x="660" y="432" text-anchor="end">${formatTime(currentTime)}</text>
    </g>
  </g>
  <polyline points="${points.map(point => point.join()).join(" ")}" stroke="black" stroke-width="0.5" />
  <g fill="black">
${points.map(([x, y]) => `    <circle cx="${x}" cy="${y}" r="0.5" />`).join("\n")}
  </g>
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
  if (entry.rate > 1) {
    // make the result reasonable when Luogu explodes
    entry.rate = problem.totalAccepted / (problem.totalSubmit + 344420);
  }
  process.stdout.write(`new entry: ${JSON.stringify(entry)}\n`);
  data.push(entry);
  await autoRetry(() => patchGist(gistId, {
    files: {
      [resultFile]: { content: render(data, time) },
      [dataFile]: { content: JSON.stringify(data) + "\n" }
    }
  }).then(res => res.json()), 5);
})().catch(handleError);
