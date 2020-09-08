export function Request2Promise<T>(request: IDBRequest<T>): Promise<T> {
  const promise = new Promise<T>((resolve, reject) => {
    const removeEvents = () => {
      request.removeEventListener("error", onError);
      request.removeEventListener("success", onSuccess);
    };
    const onError = () => {
      reject(request.error);
      removeEvents();
    };
    const onSuccess = () => {
      resolve(request.result);
      removeEvents();
    };

    request.addEventListener("success", onSuccess);
    request.addEventListener("error", onError);
  });

  return promise;
}

export function OpenDBRequest2Promise(
  request: IDBOpenDBRequest,
  onUpgrade: (newDb: IDBDatabase) => void
): Promise<IDBDatabase> {
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const removeEvents = () => {
      request.removeEventListener("error", onError);
      request.removeEventListener("success", onSuccess);
    };
    const onError = () => {
      reject(request.error);
      removeEvents();
    };
    const onSuccess = () => {
      resolve(request.result);
      removeEvents();
    };
    const onUpgradeNeeded = () => {
      onUpgrade(request.result);
      removeEvents();
    };

    request.addEventListener("success", onSuccess);
    request.addEventListener("error", onError);
    request.addEventListener("upgradeneeded", onUpgradeNeeded);
  });

  return promise;
}

export function Transaction2Promise(
  request: IDBTransaction
): Promise<boolean> {
  const promise = new Promise<boolean>((resolve, reject) => {
    const removeEvents = () => {
      request.removeEventListener("error", onError);
      request.removeEventListener("complete", onComplete);
      request.removeEventListener("abort", onAbortImpl);
    };
    const onError = () => {
      reject(request.error);
      removeEvents();
    };
    const onComplete = () => {
      resolve(true);
      removeEvents();
    };
    const onAbortImpl = () => {
      resolve(false);
      removeEvents();
    };

    request.addEventListener("complete", onComplete);
    request.addEventListener("error", onError);
    request.addEventListener("abort", onAbortImpl);
  });

  return promise;
}
