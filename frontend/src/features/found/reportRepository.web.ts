import type { FoundReport } from './model';

// Keep this interface independent of screens so a future HTTP adapter can replace it.
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('boilerfound', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('foundReports', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const reportRepository = {
  async save(report: FoundReport): Promise<void> {
    const database = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('foundReports', 'readwrite');
        transaction.objectStore('foundReports').add(report);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally { database.close(); }
  },
  async get(id: string): Promise<FoundReport | null> {
    const database = await openDatabase();
    try {
      return await new Promise<FoundReport | null>((resolve, reject) => {
        const request = database.transaction('foundReports').objectStore('foundReports').get(id);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    } finally { database.close(); }
  },
};
