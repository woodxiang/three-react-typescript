import {
  OpenDBRequest2Promise,
  Transaction2Promise,
  Request2Promise,
} from './indexdbwrap';

/**
 * Data item to store in db.
 */
interface DataItem<T> {
  indexKey: string;
  lastAccess: Date;
  data: T;
}

/**
 * Clas BlobCache to cache things in indexed db.
 */
export default class BlobCache<T> {
  db: IDBDatabase | undefined;

  dbName: string;

  storeName: string;

  dbVersion: number;

  /**
   * Constructor
   * @param dbName database name
   * @param storeName store name
   * @param dbVersion version, in integer
   */
  constructor(dbName: string, storeName: string, dbVersion: number) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.dbVersion = dbVersion;
  }

  /**
   * Open DB
   */
  async openAsync(): Promise<IDBDatabase> {
    if (this.db !== undefined) {
      throw new Error('db already opened.');
    }
    const openReqest = indexedDB.open(this.dbName, this.dbVersion);
    const openPromise = OpenDBRequest2Promise(openReqest, (newdb) => {
      console.log('db upgrade needed.');

      // create schema of the dabase.
      const store = newdb.createObjectStore(this.storeName, {
        keyPath: 'indexKey',
      });
      store.createIndex('lastAccess', 'lastAccess', { unique: false });
      console.log('db upgraded');
    });

    this.db = await openPromise;
    console.log('db opened.');
    return this.db;
  }

  /**
   * insert data into database.
   * @param key key of the data
   * @param data data
   */
  async insertAsync(key: string, data: T): Promise<boolean> {
    if (this.db === undefined) {
      await this.openAsync();
    }

    if (this.db === undefined) {
      throw Error('db not opened.');
    }

    // create transaction.
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
      data,
    };

    const store = req.objectStore(this.storeName);

    // check data exists.
    const queriedKey = await Request2Promise(store.getKey(key));
    if (queriedKey !== undefined) {
      return false;
    }

    // add new data
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

  /**
   * check exists key.
   * @param key the key of the data to query
   */
  async existAsync(key: string): Promise<boolean> {
    if (this.db === undefined) {
      await this.openAsync();
    }

    if (this.db === undefined) {
      throw new Error('db not open');
    }

    // create transaction
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

    // get key.
    const getReq = store.getKey(key);
    const result = await Request2Promise(getReq);
    await promise;
    return result !== undefined;
  }

  /**
   * pick data from database. by key.
   * @param key key of the data to pick
   */
  async pickAsync(key: string): Promise<T | undefined> {
    if (this.db === undefined) {
      await this.openAsync();
    }

    if (this.db === undefined) {
      throw new Error('db not open');
    }

    // create transaction
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

    // get data.
    const getReq = store.get(key);
    const result = await Request2Promise<DataItem<T>>(getReq);

    // update last access data
    if (result) {
      result.lastAccess = new Date();

      const putReq = store.put(result);
      await Request2Promise<IDBValidKey>(putReq);
    }

    await promise;
    return Promise.resolve(result?.data);
  }
}
