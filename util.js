function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function autoRetry(func, maxCount = 0) {
  for (; ;)
    try {
      return await func();
    } catch (e) {
      if (!--maxCount) throw e;
      await delay(500);
    }
}
