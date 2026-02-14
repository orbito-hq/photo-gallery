import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, AdditiveBlending, Mesh, DoubleSide } from 'three';
import { Image, Text, useTexture } from '@react-three/drei';
import { useStore, FileData } from '../store';

interface FileObjectProps {
  file: FileData;
  lod: 'point' | 'icon' | 'preview';
}

const FOCUS_DISTANCE = 8;

// File type colors
const FILE_COLORS: Record<string, string> = {
  video: '#e74c3c',
  text: '#f1c40f',
  binary: '#9b59b6',
  image: '#4a9eff'
};

export function FileObject({ file, lod }: FileObjectProps) {
  const groupRef = useRef<any>(null);
  const meshRef = useRef<Mesh>(null);
  const {
    thumbnails, setThumbnail, markLoaded,
    setSelectedFile, setCameraTarget, setHoveredFile,
    selectedFileId, hoveredFileId, isFocused
  } = useStore();
  const { camera } = useThree();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hoverScale, setHoverScale] = useState(1);
  const thumbnailUrl = thumbnails.get(file.id);

  const isSelected = selectedFileId === file.id;
  const isHovered = hoveredFileId === file.id;
  const isImage = file.type === 'image';
  const fileColor = FILE_COLORS[file.type] || '#4a9eff';

  // Determine icon path
  const iconPath = (() => {
    if (file.type === 'video') return '/icons/video.svg';
    if (file.type === 'image') return '/icons/file.svg'; // Default/Backup
    if (file.extension.toLowerCase() === 'pdf') return '/icons/pdf.svg';
    if (file.type === 'text') return '/icons/text.svg';
    return '/icons/file.svg';
  })();

  const iconTexture = useTexture(iconPath);

  // Load thumbnail for images
  useEffect(() => {
    if (isImage && !thumbnailUrl && !imageUrl) {
      loadThumbnail();
    } else if (thumbnailUrl && !imageUrl) {
      setImageUrl(thumbnailUrl);
    }
  }, [isImage, thumbnailUrl, imageUrl]);

  const loadThumbnail = async () => {
    if (imageUrl) return;

    try {
      const response = await fetch(`/api/thumb/${file.id}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        setThumbnail(file.id, url);
        markLoaded(file.id);
      }
    } catch (error) {
      console.error('Error loading thumbnail:', error);
    }
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!file.position) return;

    const [x, y, z] = file.position;
    const filePos = new Vector3(x, y, z);
    const direction = new Vector3().subVectors(camera.position, filePos).normalize();
    const targetPos = filePos.clone().add(direction.multiplyScalar(FOCUS_DISTANCE));

    setSelectedFile(file.id);
    setCameraTarget({
      position: [targetPos.x, targetPos.y, targetPos.z],
      lookAt: [x, y, z],
      startPosition: [camera.position.x, camera.position.y, camera.position.z],
      startLookAt: [0, 0, 0],
      progress: 0
    });
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHoveredFile(file.id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHoveredFile(null);
    document.body.style.cursor = 'auto';
  };

  const handleDoubleClick = (e: any) => {
    e.stopPropagation();
    window.open(`/api/file/${file.id}`, '_blank');
  };

  useFrame((state) => {
    if (!file.position) return;

    const [x, y, z] = file.position;
    const time = state.clock.elapsedTime;

    // Perlin-like drift
    const driftX = Math.sin(time * 0.3 + x * 0.01) * 0.15;
    const driftY = Math.cos(time * 0.25 + y * 0.01) * 0.1;
    const driftZ = Math.sin(time * 0.35 + z * 0.01) * 0.15;

    if (groupRef.current) {
      groupRef.current.position.set(x + driftX, y + driftY, z + driftZ);

      // Face camera
      groupRef.current.lookAt(camera.position);
    }

    // Hover animation
    const targetScale = isHovered ? 1.2 : 1;
    setHoverScale(prev => prev + (targetScale - prev) * 0.1);
  });

  if (!file.position) return null;

  const opacity = isFocused && !isSelected ? 0.3 : 1;
  const visible = opacity > 0.1;

  // Base scale factors
  const baseScale = lod === 'preview' ? 100 : lod === 'icon' ? 8 : 4;

  return (
    <group ref={groupRef} visible={visible}>
      <group scale={[hoverScale * baseScale, hoverScale * baseScale, 1]}>

        {/* Glow effect */}
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[1.2, 1.2]} />
          <meshBasicMaterial
            color={fileColor}
            transparent
            opacity={0.2 * opacity * (isHovered ? 2 : 1)}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {isImage && imageUrl ? (
          <Image
            url={imageUrl}
            transparent
            opacity={opacity}
            side={DoubleSide}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        ) : (
          <mesh
            ref={meshRef}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={iconTexture}
              color="white"
              transparent
              opacity={0.9 * opacity}
              side={DoubleSide}
            />
          </mesh>
        )}

        {/* Filename Label */}
        {(isHovered || lod === 'preview') && (
          <Text
            position={[0, -0.7, 0.01]}
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="top"
            outlineWidth={0.02}
            outlineColor="black"
            fillOpacity={opacity}
            outlineOpacity={opacity}
          >
            {file.name}
          </Text>
        )}
      </group>
    </group>
  );
}

