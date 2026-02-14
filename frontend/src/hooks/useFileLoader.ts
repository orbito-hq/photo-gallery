import { useEffect, useRef } from 'react';
import { useStore } from '../store';

const API_BASE = '/api';

export function useFileLoader() {
  const { cursor, setCursor, addFile } = useStore();
  const loadingRef = useRef(false);

  const loadFiles = async (startCursor: number = 0) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const response = await fetch(`${API_BASE}/files?cursor=${startCursor}`);
      const data = await response.json();

      data.files.forEach((file: any) => {
        addFile(file);
      });

      setCursor(data.nextCursor);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    loadFiles(0);
  }, []);

  useEffect(() => {
    if (cursor !== null && cursor > 0 && !loadingRef.current) {
      const timer = setTimeout(() => {
        loadFiles(cursor);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [cursor]);

  return { loadFiles };
}
