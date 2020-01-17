const fetch = require("node-fetch");

const uid = process.env.LUOGU_UID;
const clientId = process.env.LUOGU_CLIENT_ID;
(async () => {
  const res = await fetch("https://www.luogu.com.cn/problem/P1000?_contentOnly=1", {
    headers: {
      "Cookie": `_uid=${uid}; __client_id=${clientId}`
    }
  });
  const obj = await res.json();
  const user = obj.currentUser;
  process.stdout.write(user ? `logged in as '${user.name}'\n` : "not logged in\n");
  const problem = obj.currentData.problem;
  process.stdout.write(`AC rate of P1000 is ${(problem.totalAccepted / problem.totalSubmit).toFixed(6)}\n`);
})().catch(error => {
  const tmp = error === null || error === undefined ? undefined : error.stack;
  process.stderr.write(`unexpected error: ${tmp === null || tmp === undefined ? error : tmp}\n`);
  process.exit(1);
});
