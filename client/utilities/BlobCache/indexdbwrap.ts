export function Request2Promise<T>(request: IDBRequest<T>): Promise<T> {
  const promise = new Promise<T>((resolve, reject) => {
    let onError: () => void;
    let onSuccess: () => void;
    const removeEvents = () => {
      request.removeEventListener('error', onError);
      request.removeEventListener('success', onSuccess);
    };
    onError = () => {
      reject(request.error);
      removeEvents();
    };
    onSuccess = () => {
      resolve(request.result);
      removeEvents();
    };

    request.addEventListener('success', onSuccess);
    request.addEventListener('error', onError);
  });

  return promise;
}

export function OpenDBRequest2Promise(
  request: IDBOpenDBRequest,
  onUpgrade: (newDb: IDBDatabase) => void
): Promise<IDBDatabase> {
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    let onError: () => void;
    let onSuccess: () => void;
    const removeEvents = () => {
      request.removeEventListener('error', onError);
      request.removeEventListener('success', onSuccess);
    };
    onError = () => {
      reject(request.error);
      removeEvents();
    };
    onSuccess = () => {
      resolve(request.result);
      removeEvents();
    };
    const onUpgradeNeeded = () => {
      onUpgrade(request.result);
      removeEvents();
    };

    request.addEventListener('success', onSuccess);
    request.addEventListener('error', onError);
    request.addEventListener('upgradeneeded', onUpgradeNeeded);
  });

  return promise;
}

export function Transaction2Promise(request: IDBTransaction): Promise<boolean> {
  const promise = new Promise<boolean>((resolve, reject) => {
    let onError: () => void;
    let onComplete: () => void;
    let onAbortImpl: () => void;
    const removeEvents = () => {
      request.removeEventListener('error', onError);
      request.removeEventListener('complete', onComplete);
      request.removeEventListener('abort', onAbortImpl);
    };
    onError = () => {
      reject(request.error);
      removeEvents();
    };
    onComplete = () => {
      resolve(true);
      removeEvents();
    };
    onAbortImpl = () => {
      resolve(false);
      removeEvents();
    };

    request.addEventListener('complete', onComplete);
    request.addEventListener('error', onError);
    request.addEventListener('abort', onAbortImpl);
  });

  return promise;
}
