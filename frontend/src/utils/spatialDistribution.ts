import { FileData } from '../store';

// Seeded random for consistent positions
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Simple 3D noise approximation
function noise3D(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

export function distributeFilesInSpace(files: FileData[]): FileData[] {
  if (files.length === 0) return [];

  const sizes = files.map(f => f.size);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  
  const innerRadius = 7;
  const outerRadius = 70;

  return files.map((file, index) => {
    const random = seededRandom(hashString(file.id));
    
    // Map file size: large files near center, small files farther
    const sizeRatio = maxSize === minSize 
      ? 0.5 
      : (file.size - minSize) / (maxSize - minSize);
    
    // Large files get smaller radius (near center)
    const baseRadius = outerRadius - sizeRatio * (outerRadius - innerRadius);
    
    // Add organic randomness
    const radiusVariance = baseRadius * 0.3 * (random() - 0.5);
    const radius = Math.max(innerRadius, baseRadius + radiusVariance);
    
    // Spherical distribution
    const theta = random() * 2 * Math.PI;
    const phi = Math.acos(2 * random() - 1);
    
    // Convert to cartesian
    let x = radius * Math.sin(phi) * Math.cos(theta);
    let y = radius * Math.sin(phi) * Math.sin(theta);
    let z = radius * Math.cos(phi);
    
    // Add perlin-like noise for organic feel
    const noiseScale = 0.02;
    const noiseStrength = radius * 0.1;
    x += (noise3D(x * noiseScale, y * noiseScale, z * noiseScale) - 0.5) * noiseStrength;
    y += (noise3D(y * noiseScale, z * noiseScale, x * noiseScale) - 0.5) * noiseStrength;
    z += (noise3D(z * noiseScale, x * noiseScale, y * noiseScale) - 0.5) * noiseStrength;

    return {
      ...file,
      position: [x, y, z] as [number, number, number]
    };
  });
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
