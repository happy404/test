function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function autoRetry(func, maxCount = 0) {
  for (; ;)
    try {
      return await func();
    } catch (e) {
      if (!--maxCount) throw e;
      await delay(500);
    }
}

function handleError(error) {
  console.error(error);
  process.exit(1);
}

module.exports = { autoRetry, handleError };
