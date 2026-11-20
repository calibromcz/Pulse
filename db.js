const DB_NAME = 'pulse_health_db';
const DB_VERSION = 1;
const STORE_DOCS = 'documents';

class PulseDB {
  constructor() {
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_DOCS)) {
          const store = db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
          store.createIndex('bodyZone', 'bodyZone', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getAllDocuments() {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getDocument(id) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      // Prova con l'id così come passato
      let req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
          return;
        }
        // Se non trovato e id è numerico in stringa, prova Number(id)
        if (typeof id === 'string' && /^\d+$/.test(id)) {
          const numReq = store.get(Number(id));
          numReq.onsuccess = () => {
            if (numReq.result) {
              resolve(numReq.result);
              return;
            }
            // Fallback con scansione getAll per corrispondenza flessibile
            this._findDocFallback(store, id).then(resolve).catch(reject);
          };
          numReq.onerror = () => this._findDocFallback(store, id).then(resolve).catch(reject);
        } else if (typeof id === 'number') {
          // Se passato come number, prova String(id)
          const strReq = store.get(String(id));
          strReq.onsuccess = () => {
            if (strReq.result) {
              resolve(strReq.result);
              return;
            }
            this._findDocFallback(store, id).then(resolve).catch(reject);
          };
          strReq.onerror = () => this._findDocFallback(store, id).then(resolve).catch(reject);
        } else {
          this._findDocFallback(store, id).then(resolve).catch(reject);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async _findDocFallback(store, id) {
    return new Promise((resolve) => {
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const list = allReq.result || [];
        const match = list.find(d => String(d.id) === String(id));
        resolve(match || null);
      };
      allReq.onerror = () => resolve(null);
    });
  }

  async saveDocument(doc) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_DOCS, 'readwrite');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.put(doc);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteDocument(id) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_DOCS, 'readwrite');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async clearAll() {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_DOCS, 'readwrite');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }
}

window.pulseDB = new PulseDB();
window.auraDB = window.pulseDB; // backward compatibility
