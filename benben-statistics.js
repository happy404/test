#!/usr/bin/env node

const { JSDOM } = require("jsdom");
const jieba = require("nodejieba");
const { fetchLuogu, getToken, editPaste } = require("./luogu-api");
const { autoRetry, handleError } = require("./util");

const uid = process.env.LUOGU_UID;
if (!uid) throw new Error(`LUOGU_UID is not set`);
const clientId = process.env.LUOGU_CLIENT_ID;
if (!clientId) throw new Error(`LUOGU_CLIENT_ID is not set`);
const pasteId = process.env.PASTE_ID;
if (!pasteId) throw new Error(`PASTE_ID is not set`);

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
  const time = Date.parse(header.childNodes[2].textContent.trim()) * 0.001;
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

function escape(str) {
  return str.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/g, "\\$0");
}

(async () => {
  const time = Math.trunc(Date.now() * 0.001);
  const endTime = time - time % 86400 - 28800;
  const startTime = endTime - 86400;
  const benbens = [];
  const seen = new Set;
  visitPages: for (let page = await findFirstPage(endTime); ; page++) {
    console.log(`page ${page}`);
    for (const activity of await autoRetry(() => getActivities(page), 5)) {
      if (activity.time < startTime) break visitPages;
      if (activity.type === "benben" && activity.time < endTime && !seen.has(activity.id)) {
        seen.add(activity.id);
        benbens.push(activity);
      }
    }
  }
  const users = new Map;
  for (const benben of benbens) {
    const { uid, name } = benben.user;
    if (!users.has(uid)) users.set(uid, { name, count: 0 });
    users.get(uid).count++;
    for (const at of benben.content.querySelectorAll("a[href^=\"/user/\"]"))
      at.remove();
  }
  const activeUsers = Array.from(users.entries()).sort(([, a], [, b]) => b.count - a.count).slice(0, 10);
  const hotWords = jieba.extract(benbens.map(benben => benben.content.textContent.replace(/@|\/[a-z]+/g, " ")).join("\n\n"), 10);
  console.log(activeUsers);
  console.log(hotWords);
  const token = await autoRetry(() => getToken(), 5);
  await autoRetry(() => editPaste(token, pasteId, `# 昨日犇犇统计

## 龙王

| 名字 | 犇犇条数 |
|-|-|
${activeUsers.map(([uid, { name, count }]) => `| [${escape(name)}](/user/${uid}) | ${count} |\n`).join("")}

## 热词

| 热词 | 词频 |
|-|-|
${hotWords.map(({ word, weight }) => `| ${escape(word)} | ${weight.toFixed(6)} |\n`).join("")}
`), 5);
})().catch(handleError);
