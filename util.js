function autoRetry(func, maxCount = 0) {
  return new Promise(function retry(resolve, reject) {
    func().then(resolve, error => --maxCount ? setTimeout(autoRetry, 500, func, maxCount) : reject(error));
  });
}

function handleError(error) {
  console.error(error);
  process.exit(1);
}

module.exports = { autoRetry, handleError };
