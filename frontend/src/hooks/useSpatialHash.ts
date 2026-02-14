import { useMemo } from 'react';
import { Vector3 } from 'three';
import { useStore, FileData } from '../store';


export function useSpatialHash(cameraPosition: Vector3, viewDistance: number) {
  const { files } = useStore();

  return useMemo(() => {
    const visibleFiles: FileData[] = [];
    const filesArray = Array.from(files.values());

    for (const file of filesArray) {
      if (!file.position) continue;

      const [x, y, z] = file.position;
      const distance = cameraPosition.distanceTo(new Vector3(x, y, z));

      if (distance <= viewDistance) {
        visibleFiles.push(file);
      }
    }

    return visibleFiles.sort((a, b) => {
      if (!a.position || !b.position) return 0;
      const distA = cameraPosition.distanceTo(new Vector3(...a.position));
      const distB = cameraPosition.distanceTo(new Vector3(...b.position));
      return distA - distB;
    });
  }, [files, cameraPosition, viewDistance]);
}
