const { Canvas } = require("canvas");
const d3 = require("d3");
const cloud = require("d3-cloud");
const { JSDOM } = require("jsdom");
const { DateTime, Settings } = require("luxon");
const jieba = require("nodejieba");
const { patchGist } = require("./github-api");
const { fetchLuogu, getToken, editPaste } = require("./luogu-api");
const { autoRetry, handleError } = require("./util");

const uid = process.env.LUOGU_UID;
if (!uid) throw new Error(`LUOGU_UID is not set`);
const clientId = process.env.LUOGU_CLIENT_ID;
if (!clientId) throw new Error(`LUOGU_CLIENT_ID is not set`);
const pasteId = process.env.PASTE_ID;
if (!pasteId) throw new Error(`PASTE_ID is not set`);
const gistId = process.env.GIST_ID;
if (!gistId) throw new Error(`GIST_ID is not set`);

Settings.defaultZoneName = "Asia/Shanghai";

function parseId(str) {
  return Number(str.substring(str.lastIndexOf("/") + 1));
}

function parseUser(node) {
  return {
    uid: parseId(node.href),
    name: node.textContent
  };
}

function parseActivity(node) {
  const header = node.getElementsByClassName("am-comment-meta")[0];
  const user = parseUser(header.firstElementChild.firstElementChild);
  const time = DateTime.fromFormat(header.childNodes[2].textContent.trim(), "yyyy-LL-dd HH:mm:ss");
  const content = node.getElementsByClassName("am-comment-bd")[0].firstElementChild;
  if (content.classList.contains("feed-comment")) {
    const id = Number(header.querySelector("[name=\"feed-report\"]").dataset.reportId);
    return { type: "benben", id, user, time, content };
  }
  const link = content.getElementsByTagName("a")[0];
  switch (content.firstChild.textContent.trim()) {
    case "发表了新帖子":
      return {
        type: "post", user, time,
        post: {
          id: parseId(link.href),
          title: link.textContent
        }
      };
    case "报名了比赛":
      return {
        type: "contest", user, time,
        contest: {
          id: parseId(link.href),
          name: link.textContent
        }
      };
    case "发布了博客文章":
      return {
        type: "blog_article", user, time,
        article: {
          id: parseId(link.href),
          title: link.textContent
        }
      };
    default:
      throw new Error("unknown activity type");
  }
}

async function getActivities(page = 1) {
  const { window } = new JSDOM(await fetchLuogu(`/feed/all?page=${page}`).then(res => res.text()));
  return Array.from(window.document.getElementsByClassName("am-comment-main"), parseActivity);
}

function getYesterday() {
  const end = DateTime.local().startOf("day");
  return [end.minus({ days: 1 }), end];
}

async function shouldVisit(page, endTime) {
  for (const activity of await autoRetry(() => getActivities(page), 5))
    if (activity.time < endTime) return true;
  return false;
}

async function findFirstPage(endTime) {
  let max = 1;
  while (!await shouldVisit(max, endTime))
    max <<= 1;
  let min = max >> 1;
  while (max - min > 1) {
    const middle = min + ((max - min) >> 1);
    if (await shouldVisit(middle, endTime)) max = middle;
    else min = middle;
  }
  return max;
}

function renderHotWords(width, height, wordCounts) {
  const words = Array.from(wordCounts.entries(), ([word, count]) => ({ text: word, value: count }));
  const scale = width * height * 0.4 / words.map(word => word.value).reduce((prev, cur) => prev + cur, 0);
  for (const word of words)
    word.value *= scale;
  return new Promise(resolve => cloud()
    .size([width, height])
    .canvas(() => new Canvas(1, 1))
    .words(words)
    .padding(2)
    .rotate(0)
    .on("end", words => {
      const body = new JSDOM().window.document.body;
      d3.select(body)
        .append("svg")
          .attr("xmlns", "http://www.w3.org/2000/svg")
          .attr("width", width)
          .attr("height", height)
          .attr("font-family", "serif")
          .attr("text-anchor", "middle")
          .append("g")
            .attr("transform", `translate(${width * 0.5}, ${height * 0.5})`)
            .selectAll("text")
              .data(words)
              .enter()
                .append("text")
                  .attr("x", d => d.x)
                  .attr("y", d => d.y)
                  .attr("font-size", d => d.size)
                  .text(d => d.text);
      resolve(body.innerHTML + "\n");
    }).start());
}

const resultFile = "benben-hot-words.svg";
const escapeRE = /([!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-])/g;
const filterRE = /[^a-z0-9\u2e80-\u2fdf\u3040-\u30ff\u31c0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g;
const removeRE = /^\s*(?:\d*|[a-z])\s*$/;
const validTags = new Set(["a", "ad", "ag", "an", "eng", "i", "j", "l", "n", "ng", "nr", "nrfg", "nrt", "ns", "nt", "nz", "v", "vd", "vg", "vi", "vn", "x"]);
const stopWords = new Set(["the", "of", "is", "and", "to", "in", "that", "we", "for", "an", "are", "by", "be", "as", "on", "with", "can", "if", "from", "which", "you", "it", "this", "then", "at", "have", "all", "not", "one", "has", "or", "that", "的", "了", "和", "是", "有", "就", "都", "而", "及", "与", "與", "着", "著", "或", "我", "你", "妳", "他", "她", "一个", "一個", "是否", "没有", "沒有", "我们", "我們", "你们", "你們", "妳們", "他们", "他們", "她们", "她們"]);

(async () => {
  const [startTime, endTime] = getYesterday();
  console.log(`time: [${startTime}, ${endTime}]`);
  const benbens = [];
  const seen = new Set;
  visitPages: for (let page = await findFirstPage(endTime); ; page++) {
    console.log(`page ${page}`);
    const activities = await autoRetry(() => getActivities(page), 5);
    console.log(`time of page: [${activities[activities.length - 1].time}, ${activities[0].time}]`);
    for (const activity of activities) {
      if (activity.time < startTime) break visitPages;
      if (activity.type === "benben" && activity.time < endTime && !seen.has(activity.id)) {
        seen.add(activity.id);
        benbens.push(activity);
      }
    }
  }
  const users = new Map;
  const wordCounts = new Map;
  for (const benben of benbens) {
    const { uid, name } = benben.user;
    if (!users.has(uid)) users.set(uid, { name, count: 0 });
    users.get(uid).count++;
    for (const link of benben.content.getElementsByTagName("a"))
      if (link.textContent.endsWith(link.href) || link.href.includes("/user/")) link.remove();
    for (const { word, tag } of jieba.tag(benben.content.textContent.toLowerCase().replace(filterRE, " ")))
      if (!removeRE.test(word) && !stopWords.has(word) && validTags.has(tag)) wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  console.log(users);
  console.log(wordCounts);
  const activeUsers = Array.from(users.entries()).sort(([, a], [, b]) => b.count - a.count).slice(0, 20);
  const hotWords = await renderHotWords(640, 480, wordCounts);
  const gistContent = {
    files: {
      [resultFile]: { content: hotWords }
    }
  };
  const gistCommit = (await autoRetry(() => patchGist(gistId, gistContent).then(res => res.json()), 5)).history[0].version;
  const token = await autoRetry(() => getToken(), 5);
  const pasteContent = `# 犇犇统计（${startTime.toFormat("yyyy-LL-dd")}）

共 ${benbens.length} 条犇犇。

## 龙王

| 名字 | 犇犇条数 |
|-|-|
${activeUsers.map(([uid, { name, count }]) => `| [${name.replace(escapeRE, "\\$1")}](/user/${uid}) | ${count} |\n`).join("")}
## 热词

![热词](https://gistcdn.githack.com/sjx233/${gistId}/raw/${gistCommit}/${resultFile})

---

统计数据中不包括已删除的犇犇。热词仅含名词、动词及形容词，每个词所占面积与出现次数成正比。
`;
  await autoRetry(() => editPaste(token, pasteId, pasteContent).then(res => res.json()), 5);
})().catch(handleError);
