export function createStatusController({
  element,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
  delay = 1200,
}) {
  let clearTimer;

  function setStatus(message) {
    clearTimeoutFn(clearTimer);
    clearTimer = undefined;
    element.textContent = message;
  }

  function setTemporaryStatus(message) {
    setStatus(message);
    clearTimer = setTimeoutFn(() => {
      if (element.textContent === message) element.textContent = "";
      clearTimer = undefined;
    }, delay);
  }

  return { setStatus, setTemporaryStatus };
}
