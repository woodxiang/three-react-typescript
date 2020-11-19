/**
 * This is promise wrapper for IDBRequest.
 * @param request the IDBRequest request.
 * @returns T to return from the request.
 */
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

/**
 * wrapper for IDBOpenDBRequest.
 * @param request IDBOpenDBRequest for open indexed db
 * @param onUpgrade callback to create db schema
 * @returns return IDBDababase opened.
 */
export function OpenDBRequest2Promise(
  request: IDBOpenDBRequest,
  onUpgrade: (newDb: IDBDatabase) => void
): Promise<IDBDatabase> {
  const promise = Request2Promise(request);

  const onUpgradeNeeded = () => {
    onUpgrade(request.result);
    request.removeEventListener('upgradeneeded', onUpgradeNeeded);
  };

  request.addEventListener('upgradeneeded', onUpgradeNeeded);

  return promise;
}

/**
 * wapper for transaction.
 * @param request IDBTransaction request of transaction.
 * @returns boolean to indicate complted or not.
 */
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
