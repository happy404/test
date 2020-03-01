function autoRetry(func, maxCount = 0) {
  return new Promise(function retry(resolve, reject) {
    func().then(resolve, error => --maxCount ? setTimeout(autoRetry, 500, func, maxCount) : reject(error));
  });
}

function handleError(error) {
  process.stderr.write(`unexpected error: ${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
}

module.exports = { autoRetry, handleError };
