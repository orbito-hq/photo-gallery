import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import { Vector3, Frustum, Matrix4 } from 'three';
import { FileData } from '../store';
import { useSpatialHash } from '../hooks/useSpatialHash';
import { FileObject } from './FileObject';

const LOD_DISTANCES = {
  far: 150,
  mid: 60,
  near: 25
};

const VIEW_DISTANCE = 600;

export function FileCloud() {
  const { camera } = useThree();

  const cameraPosition = useRef(new Vector3());
  const frustum = useRef(new Frustum());
  const projScreenMatrix = useRef(new Matrix4());

  useFrame(() => {
    cameraPosition.current.copy(camera.position);

    projScreenMatrix.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.current.setFromProjectionMatrix(projScreenMatrix.current);
  });

  const visibleFiles = useSpatialHash(cameraPosition.current, VIEW_DISTANCE);

  const filesByLOD = useMemo(() => {
    const byLOD: { point: FileData[]; icon: FileData[]; preview: FileData[] } = {
      point: [],
      icon: [],
      preview: []
    };

    visibleFiles.forEach(file => {
      if (!file.position) return;

      const filePos = new Vector3(...file.position);
      const distance = cameraPosition.current.distanceTo(filePos);

      if (distance < LOD_DISTANCES.near) {
        byLOD.preview.push(file);
      } else if (distance < LOD_DISTANCES.mid) {
        byLOD.icon.push(file);
      } else {
        byLOD.point.push(file);
      }
    });

    return byLOD;
  }, [visibleFiles]);

  return (
    <>
      {/* Near: Full preview with texture */}
      {filesByLOD.preview.map(file => (
        <FileObject key={file.id} file={file} lod="preview" />
      ))}

      {/* Mid: Square planes or icons */}
      {filesByLOD.icon.map(file => (
        <FileObject key={file.id} file={file} lod="icon" />
      ))}

      {/* Far: Small thumbnails for images, file icons for others */}
      {filesByLOD.point.map(file => (
        <FileObject key={file.id} file={file} lod="point" />
      ))}
    </>
  );
}
