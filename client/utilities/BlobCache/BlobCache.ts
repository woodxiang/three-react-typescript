import {
  OpenDBRequest2Promise,
  Transaction2Promise,
  Request2Promise
} from './indexdbwrap';

interface DataItem<T> {
  indexKey: string;
  lastAccess: Date;
  data: T;
}

export default class BlobCache<T> {
  db: IDBDatabase | undefined;

  dbName: string;

  storeName: string;

  dbVersion: number;

  constructor(dbName: string, storeName: string, dbVersion: number) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.dbVersion = dbVersion;
  }

  async open(): Promise<IDBDatabase> {
    if (this.db !== undefined) {
      throw new Error('db already opened.');
    }
    const openReqest = indexedDB.open(this.dbName, this.dbVersion);
    const openPromise = OpenDBRequest2Promise(openReqest, (newdb) => {
      console.warn('db upgrade needed.');
      const store = newdb.createObjectStore(this.storeName, {
        keyPath: 'indexKey'
      });
      store.createIndex('lastAccess', 'lastAccess', { unique: false });
    });

    this.db = await openPromise;
    return this.db;
  }

  async insert(key: string, data: T): Promise<boolean> {
    if (this.db === undefined) {
      await this.open();
    }

    if (this.db === undefined) {
      throw Error('db not opened.');
    }

    const req = this.db.transaction([this.storeName], 'readwrite');
    const promise = Transaction2Promise(req);
    promise
      .then((finished) => {
        if (finished) {
          console.log('insert transaction finished.');
        } else {
          console.log('insert transaction aborted.');
        }
      })
      .catch((reason) => {
        console.error('insert transaction failed.', reason);
      });

    const newItem: DataItem<T> = {
      indexKey: key,
      lastAccess: new Date(),
      data
    };

    const store = req.objectStore(this.storeName);
    const addReq = store.add(newItem);

    const addRequestPromise = Request2Promise<IDBValidKey>(addReq);
    addRequestPromise
      .then(() => {
        console.log('new data added.');
      })
      .catch((reason) => {
        console.error('Add data failed.', (reason as DOMException).message);
      });

    await addRequestPromise;
    const ret = await promise;

    return ret;
  }

  async pick(key: string): Promise<T | undefined> {
    if (this.db === undefined) {
      await this.open();
    }

    if (this.db === undefined) {
      throw new Error('db not open');
    }

    const req = this.db.transaction([this.storeName], 'readwrite');
    const promise = Transaction2Promise(req);
    promise
      .then((finished) => {
        if (finished) {
          console.log('get data transaction finished.');
        }
      })
      .catch((reason) => {
        console.error('get data failed.', reason);
      });

    const store = req.objectStore(this.storeName);
    const getReq = store.get(key);
    const result = await Request2Promise<DataItem<T>>(getReq);

    if (result) {
      result.lastAccess = new Date();

      const putReq = store.put(result);
      await Request2Promise<IDBValidKey>(putReq);
    }

    await promise;
    return Promise.resolve(result?.data);
  }
}
