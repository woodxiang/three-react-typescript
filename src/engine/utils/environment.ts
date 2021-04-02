const isBrowser = (): boolean => {
  try {
    return this === window;
  } catch {
    return false;
  }
};

const isNode = (): boolean => {
  try {
    return this === global;
  } catch {
    return false;
  }
};

export { isBrowser, isNode };
