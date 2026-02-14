import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import { Vector3, InstancedMesh, Object3D } from 'three';
import { useStore } from '../store';
import { useSpatialHash } from '../hooks/useSpatialHash';
import { FileObject } from './FileObject';

const LOD_DISTANCES = {
  point: 200,
  icon: 100,
  preview: 50
};

export function FileCloud() {
  const { camera } = useThree();
  const { files } = useStore();
  const cameraPosition = useRef(new Vector3());
  
  useFrame(() => {
    cameraPosition.current.copy(camera.position);
  });

  const visibleFiles = useSpatialHash(cameraPosition.current, 500);

  const filesByLOD = useMemo(() => {
    const byLOD: { [key: string]: typeof visibleFiles } = {
      point: [],
      icon: [],
      preview: []
    };

    visibleFiles.forEach(file => {
      if (!file.position) return;
      
      const distance = cameraPosition.current.distanceTo(
        new Vector3(...file.position)
      );

      if (distance < LOD_DISTANCES.preview) {
        byLOD.preview.push(file);
      } else if (distance < LOD_DISTANCES.icon) {
        byLOD.icon.push(file);
      } else {
        byLOD.point.push(file);
      }
    });

    return byLOD;
  }, [visibleFiles]);

  return (
    <>
      {filesByLOD.preview.map(file => (
        <FileObject key={file.id} file={file} lod="preview" />
      ))}
      {filesByLOD.icon.map(file => (
        <FileObject key={file.id} file={file} lod="icon" />
      ))}
      <PointsInstances files={filesByLOD.point} />
    </>
  );
}

function PointsInstances({ files }: { files: Array<{ id: string; position?: [number, number, number] }> }) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObject = useMemo(() => new Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;

    files.forEach((file, i) => {
      if (!file.position) return;
      
      const [x, y, z] = file.position;
      tempObject.position.set(x, y, z);
      tempObject.scale.set(0.5, 0.5, 0.5);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (files.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, files.length]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshBasicMaterial color="#4a9eff" />
    </instancedMesh>
  );
}
