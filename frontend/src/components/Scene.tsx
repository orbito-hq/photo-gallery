import { Suspense, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Fog } from 'three';
import { FileCloud } from './FileCloud';
import { useFileLoader } from '../hooks/useFileLoader';
import { useWebSocket } from '../hooks/useWebSocket';
import { useStore } from '../store';
import { distributeFilesInSpace } from '../utils/spatialDistribution';

export function Scene() {
  const { scene, camera } = useThree();
  const { files } = useStore();
  useFileLoader();
  useWebSocket();

  useEffect(() => {
    scene.fog = new Fog(0x000000, 100, 2000);
  }, [scene]);

  useEffect(() => {
    const filesArray = Array.from(files.values()).filter(f => !f.position);
    if (filesArray.length === 0) return;
    
    const filesWithPositions = distributeFilesInSpace(filesArray);
    
    filesWithPositions.forEach(file => {
      useStore.getState().addFile(file);
    });
  }, [files]);

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
      
      <Stars radius={2000} depth={50} count={5000} factor={4} fade speed={0.5} />
      
      <Suspense fallback={null}>
        <FileCloud />
      </Suspense>
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={5000}
        autoRotate={false}
      />
    </>
  );
}
