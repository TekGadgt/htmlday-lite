export function createStatusController({
  element,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
  delay = 1200,
}) {
  let clearTimer;
  let statusVersion = 0;

  function setStatus(message) {
    clearTimeoutFn(clearTimer);
    clearTimer = undefined;
    element.textContent = message;
    const version = ++statusVersion;
    clearTimer = setTimeoutFn(() => {
      if (version === statusVersion) {
        element.textContent = "";
        clearTimer = undefined;
      }
    }, delay);
  }

  function setTemporaryStatus(message) {
    setStatus(message);
  }

  return { setStatus, setTemporaryStatus };
}
