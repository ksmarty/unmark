import { get, set, del } from "idb-keyval";

const PREFIX = "unmark:blob:";

export async function putBlob(key: string, blob: Blob): Promise<void> {
  await set(PREFIX + key, blob);
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  return get<Blob>(PREFIX + key);
}

export async function deleteBlob(key: string): Promise<void> {
  await del(PREFIX + key);
}

export async function deleteJobBlobs(id: string): Promise<void> {
  await Promise.all([deleteBlob(`src:${id}`), deleteBlob(`thumb:${id}`), deleteBlob(`res:${id}`)]);
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}
