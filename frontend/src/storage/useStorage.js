import { useState, useEffect } from 'react';

const SIZE_LIMIT_BYTES = 4 * 1024 * 1024; // 4 MB safety threshold

export default function useStorage(storageKey, initialValue) {
  const savedData = (() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [data, setData] = useState(savedData !== null ? savedData : initialValue);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(data);
      if (serialized.length > SIZE_LIMIT_BYTES) {
        console.warn(
          `[useStorage] "${storageKey}" exceeds ${SIZE_LIMIT_BYTES / 1024}KB — skipping write to avoid quota errors.`
        );
        return;
      }
      localStorage.setItem(storageKey, serialized);
    } catch (err) {
      console.error(`[useStorage] Failed to write "${storageKey}" to localStorage:`, err);
    }
  }, [data, storageKey]);

  return [data, setData];
}