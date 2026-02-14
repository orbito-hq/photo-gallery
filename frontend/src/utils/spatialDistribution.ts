import { FileData } from '../store';

export function distributeFilesInSpace(files: FileData[]): FileData[] {
  const radius = 1000;
  const angleStep = (2 * Math.PI) / Math.max(files.length, 1);
  
  return files.map((file, index) => {
    const angle = index * angleStep;
    const spiralRadius = Math.sqrt(index) * 10;
    const height = (index % 100) * 2 - 100;
    
    const x = Math.cos(angle) * spiralRadius;
    const y = height;
    const z = Math.sin(angle) * spiralRadius;
    
    return {
      ...file,
      position: [x, y, z] as [number, number, number]
    };
  });
}
