import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo, useState } from 'react';
import { Vector3, InstancedMesh, Object3D, Color, AdditiveBlending, Frustum, Matrix4 } from 'three';
import { useStore, FileData } from '../store';
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
  const { files, isFocused, selectedFileId } = useStore();
  const cameraPosition = useRef(new Vector3());
  const frustum = useRef(new Frustum());
  const projScreenMatrix = useRef(new Matrix4());
  
  useFrame(() => {
    cameraPosition.current.copy(camera.position);
    
    // Update frustum for culling
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
      
      {/* Mid: Square planes */}
      {filesByLOD.icon.map(file => (
        <FileObject key={file.id} file={file} lod="icon" />
      ))}
      
      {/* Far: Glowing dots as instanced mesh */}
      <GlowingPointsInstanced files={filesByLOD.point} />
    </>
  );
}

function GlowingPointsInstanced({ files }: { files: FileData[] }) {
  const meshRef = useRef<InstancedMesh>(null);
  const glowMeshRef = useRef<InstancedMesh>(null);
  const tempObject = useMemo(() => new Object3D(), []);
  const { setHoveredFile, setCameraTarget, setSelectedFile } = useStore();
  const { camera, raycaster, pointer } = useThree();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useFrame((state) => {
    if (!meshRef.current || !glowMeshRef.current) return;
    
    const time = state.clock.elapsedTime;

    files.forEach((file, i) => {
      if (!file.position) return;
      
      const [x, y, z] = file.position;
      
      // Add subtle drift
      const driftX = Math.sin(time * 0.2 + x * 0.01) * 0.3;
      const driftY = Math.cos(time * 0.15 + y * 0.01) * 0.2;
      const driftZ = Math.sin(time * 0.25 + z * 0.01) * 0.3;
      
      tempObject.position.set(x + driftX, y + driftY, z + driftZ);
      
      // Scale based on file size
      const sizeScale = Math.max(0.5, Math.min(1.5, file.size / 500000));
      const hoverBoost = hoveredIndex === i ? 1.3 : 1;
      tempObject.scale.setScalar(sizeScale * hoverBoost);
      tempObject.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      
      // Glow is larger
      tempObject.scale.setScalar(sizeScale * 2 * hoverBoost);
      tempObject.updateMatrix();
      glowMeshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    glowMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  const handlePointerMove = (e: any) => {
    if (e.instanceId !== undefined && e.instanceId < files.length) {
      setHoveredIndex(e.instanceId);
      setHoveredFile(files[e.instanceId].id);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHoveredIndex(null);
    setHoveredFile(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId < files.length) {
      const file = files[e.instanceId];
      if (!file.position) return;
      
      const [x, y, z] = file.position;
      const filePos = new Vector3(x, y, z);
      const direction = new Vector3().subVectors(camera.position, filePos).normalize();
      const targetPos = filePos.clone().add(direction.multiplyScalar(8));
      
      setSelectedFile(file.id);
      setCameraTarget({
        position: [targetPos.x, targetPos.y, targetPos.z],
        lookAt: [x, y, z],
        startPosition: [camera.position.x, camera.position.y, camera.position.z],
        startLookAt: [0, 0, 0],
        progress: 0
      });
    }
  };

  if (files.length === 0) return null;

  return (
    <>
      {/* Core dots */}
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, Math.max(files.length, 1)]}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        frustumCulled
      >
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshBasicMaterial color="#6ab4ff" />
      </instancedMesh>
      
      {/* Glow halos */}
      <instancedMesh 
        ref={glowMeshRef} 
        args={[undefined, undefined, Math.max(files.length, 1)]}
        frustumCulled
      >
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial 
          color="#4a9eff" 
          transparent 
          opacity={0.12}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
}
