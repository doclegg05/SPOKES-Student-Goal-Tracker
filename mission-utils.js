export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function debounce(callback, waitMs) {
  let timeoutId = null;

  return function debouncedCallback(...args) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      callback.apply(this, args);
    }, waitMs);
  };
}
