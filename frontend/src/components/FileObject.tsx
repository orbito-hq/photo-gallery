import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3, TextureLoader, Texture, AdditiveBlending } from 'three';
import { Text, Billboard } from '@react-three/drei';
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

// File type icons (simple text representations)
const FILE_ICONS: Record<string, string> = {
  video: '▶',
  text: '≡',
  binary: '⬡',
  image: '◻'
};

export function FileObject({ file, lod }: FileObjectProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<any>(null);
  const { 
    thumbnails, setThumbnail, markLoaded, 
    setSelectedFile, setCameraTarget, setHoveredFile,
    selectedFileId, hoveredFileId, isFocused 
  } = useStore();
  const { camera } = useThree();
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const [texture, setTexture] = useState<Texture | null>(null);
  const [hoverScale, setHoverScale] = useState(1);
  const thumbnailUrl = thumbnails.get(file.id);
  
  const isSelected = selectedFileId === file.id;
  const isHovered = hoveredFileId === file.id;
  const isImage = file.type === 'image';
  const fileColor = FILE_COLORS[file.type] || '#4a9eff';

  // Load thumbnail for images at any LOD level
  useEffect(() => {
    if (isImage && !thumbnailUrl && !textureUrl) {
      loadThumbnail();
    }
  }, [isImage, thumbnailUrl, textureUrl]);

  useEffect(() => {
    if (!textureUrl) return;
    
    const loader = new TextureLoader();
    let loadedTexture: Texture | null = null;
    
    loader.load(
      textureUrl,
      (tex) => {
        loadedTexture = tex;
        setTexture(tex);
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
      }
    );
    
    return () => {
      if (loadedTexture) {
        loadedTexture.dispose();
      }
    };
  }, [textureUrl]);

  const loadThumbnail = async () => {
    if (textureUrl) return;
    
    try {
      const response = await fetch(`/api/thumb/${file.id}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setTextureUrl(url);
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

  const handlePointerOut = () => {
    setHoveredFile(null);
    document.body.style.cursor = 'auto';
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
    }
    
    // Hover animation
    const targetScale = isHovered ? 1.2 : 1;
    setHoverScale(prev => prev + (targetScale - prev) * 0.1);
  });

  if (!file.position) return null;

  const [x, y, z] = file.position;
  const baseScale = Math.max(0.8, Math.min(2, file.size / 200000));
  
  // Fade non-selected files when focused
  const opacity = isFocused && !isSelected ? 0.3 : 1;

  // FAR LOD - small square thumbnail for images, file icon for others
  if (lod === 'point') {
    if (isImage && texture) {
      // Small square image thumbnail
      return (
        <group 
          ref={groupRef}
          position={[x, y, z]} 
          onClick={handleClick} 
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <mesh scale={1.2 * hoverScale}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshBasicMaterial
              map={texture}
              transparent
              opacity={opacity}
            />
          </mesh>
          {/* Glow border */}
          <mesh scale={1.4 * hoverScale} position={[0, 0, -0.05]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshBasicMaterial 
              color={fileColor}
              transparent 
              opacity={0.2 * opacity}
              blending={AdditiveBlending}
            />
          </mesh>
          {isHovered && (
            <Billboard position={[0, 1.5, 0]}>
              <Text
                fontSize={0.6}
                color="#fff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.04}
                outlineColor="#000"
              >
                {file.name}
              </Text>
            </Billboard>
          )}
        </group>
      );
    } else if (isImage && !texture) {
      // Loading placeholder for image
      return (
        <group 
          ref={groupRef}
          position={[x, y, z]} 
          onClick={handleClick} 
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <mesh scale={1 * hoverScale}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshBasicMaterial
              color="#333"
              transparent
              opacity={0.5 * opacity}
            />
          </mesh>
          <Billboard>
            <Text
              fontSize={0.8}
              color={fileColor}
              anchorX="center"
              anchorY="middle"
            >
              ◻
            </Text>
          </Billboard>
          {isHovered && (
            <Billboard position={[0, 1.5, 0]}>
              <Text
                fontSize={0.6}
                color="#fff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.04}
                outlineColor="#000"
              >
                {file.name}
              </Text>
            </Billboard>
          )}
        </group>
      );
    } else {
      // File icon for non-images
      return (
        <group 
          ref={groupRef}
          position={[x, y, z]} 
          onClick={handleClick} 
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          {/* File icon background */}
          <mesh scale={1 * hoverScale}>
            <planeGeometry args={[1.2, 1.5]} />
            <meshBasicMaterial 
              color="#1a1a2e"
              transparent 
              opacity={0.9 * opacity}
            />
          </mesh>
          {/* Folded corner */}
          <mesh position={[0.35, 0.5, 0.01]} scale={0.3 * hoverScale}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial 
              color="#2a2a4e"
              transparent 
              opacity={0.9 * opacity}
            />
          </mesh>
          {/* File type icon */}
          <Billboard>
            <Text
              fontSize={0.6}
              color={fileColor}
              anchorX="center"
              anchorY="middle"
            >
              {FILE_ICONS[file.type] || '◻'}
            </Text>
          </Billboard>
          {/* Extension label */}
          <Billboard position={[0, -0.5, 0.01]}>
            <Text
              fontSize={0.25}
              color={fileColor}
              anchorX="center"
              anchorY="middle"
            >
              {file.extension.toUpperCase()}
            </Text>
          </Billboard>
          {/* Glow */}
          <mesh scale={1.2 * hoverScale} position={[0, 0, -0.05]}>
            <planeGeometry args={[1.2, 1.5]} />
            <meshBasicMaterial 
              color={fileColor}
              transparent 
              opacity={0.15 * opacity}
              blending={AdditiveBlending}
            />
          </mesh>
          {isHovered && (
            <Billboard position={[0, 1.5, 0]}>
              <Text
                fontSize={0.6}
                color="#fff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.04}
                outlineColor="#000"
              >
                {file.name}
              </Text>
            </Billboard>
          )}
        </group>
      );
    }
  }

  // MID LOD - larger view
  if (lod === 'icon') {
    if (isImage && texture) {
      return (
        <group 
          ref={groupRef} 
          position={[x, y, z]} 
          onClick={handleClick} 
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <mesh scale={baseScale * 1.5 * hoverScale}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial
              map={texture}
              transparent
              opacity={opacity}
            />
          </mesh>
          <mesh scale={baseScale * 1.7 * hoverScale} position={[0, 0, -0.05]}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial 
              color={fileColor}
              transparent 
              opacity={0.2 * opacity}
              blending={AdditiveBlending}
            />
          </mesh>
          <Billboard position={[0, baseScale * 1.5 + 0.8, 0]}>
            <Text
              fontSize={0.5}
              color="#fff"
              anchorX="center"
              anchorY="middle"
              maxWidth={4}
              outlineWidth={0.02}
              outlineColor="#000"
            >
              {file.name}
            </Text>
          </Billboard>
        </group>
      );
    } else {
      // File icon for non-images
      return (
        <group 
          ref={groupRef} 
          position={[x, y, z]} 
          onClick={handleClick} 
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          {/* File icon background */}
          <mesh scale={baseScale * 1.2 * hoverScale}>
            <planeGeometry args={[1.8, 2.2]} />
            <meshBasicMaterial 
              color="#1a1a2e"
              transparent 
              opacity={0.95 * opacity}
            />
          </mesh>
          {/* Folded corner */}
          <mesh position={[0.5 * baseScale, 0.7 * baseScale, 0.01]} scale={0.4 * baseScale * hoverScale}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial 
              color="#2a2a4e"
              transparent 
              opacity={0.95 * opacity}
            />
          </mesh>
          {/* File type icon */}
          <Billboard>
            <Text
              fontSize={1}
              color={fileColor}
              anchorX="center"
              anchorY="middle"
            >
              {FILE_ICONS[file.type] || '◻'}
            </Text>
          </Billboard>
          {/* Extension label */}
          <Billboard position={[0, -0.8 * baseScale, 0.01]}>
            <Text
              fontSize={0.4}
              color={fileColor}
              anchorX="center"
              anchorY="middle"
            >
              {file.extension.toUpperCase()}
            </Text>
          </Billboard>
          {/* Glow */}
          <mesh scale={baseScale * 1.4 * hoverScale} position={[0, 0, -0.05]}>
            <planeGeometry args={[1.8, 2.2]} />
            <meshBasicMaterial 
              color={fileColor}
              transparent 
              opacity={0.15 * opacity}
              blending={AdditiveBlending}
            />
          </mesh>
          <Billboard position={[0, baseScale * 1.5 + 0.5, 0]}>
            <Text
              fontSize={0.5}
              color="#fff"
              anchorX="center"
              anchorY="middle"
              maxWidth={4}
              outlineWidth={0.02}
              outlineColor="#000"
            >
              {file.name}
            </Text>
          </Billboard>
        </group>
      );
    }
  }

  // NEAR LOD - full preview
  if (lod === 'preview') {
    if (isImage && texture) {
      return (
        <group 
          ref={groupRef} 
          position={[x, y, z]} 
          onClick={handleClick} 
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <mesh ref={meshRef} scale={baseScale * 2 * hoverScale}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial
              map={texture}
              transparent
              opacity={opacity}
            />
          </mesh>
          <mesh scale={baseScale * 2.2 * hoverScale} position={[0, 0, -0.1]}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial 
              color={fileColor}
              transparent 
              opacity={0.2 * opacity}
              blending={AdditiveBlending}
            />
          </mesh>
          <Billboard position={[0, baseScale * 2 + 1, 0]}>
            <Text
              fontSize={0.4}
              color="#fff"
              anchorX="center"
              anchorY="middle"
              maxWidth={5}
              outlineWidth={0.02}
              outlineColor="#000"
            >
              {file.name}
            </Text>
          </Billboard>
        </group>
      );
    } else {
      // Large file icon for non-images
      return (
        <group 
          ref={groupRef} 
          position={[x, y, z]} 
          onClick={handleClick} 
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          {/* File icon background */}
          <mesh scale={baseScale * 1.8 * hoverScale}>
            <planeGeometry args={[2, 2.5]} />
            <meshBasicMaterial 
              color="#1a1a2e"
              transparent 
              opacity={0.95 * opacity}
            />
          </mesh>
          {/* Folded corner */}
          <mesh position={[0.6 * baseScale, 0.9 * baseScale, 0.01]} scale={0.5 * baseScale * hoverScale}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial 
              color="#2a2a4e"
              transparent 
              opacity={0.95 * opacity}
            />
          </mesh>
          {/* File type icon */}
          <Billboard>
            <Text
              fontSize={1.5}
              color={fileColor}
              anchorX="center"
              anchorY="middle"
            >
              {FILE_ICONS[file.type] || '◻'}
            </Text>
          </Billboard>
          {/* Extension label */}
          <Billboard position={[0, -1 * baseScale, 0.01]}>
            <Text
              fontSize={0.5}
              color={fileColor}
              anchorX="center"
              anchorY="middle"
            >
              {file.extension.toUpperCase()}
            </Text>
          </Billboard>
          {/* Glow */}
          <mesh scale={baseScale * 2 * hoverScale} position={[0, 0, -0.1]}>
            <planeGeometry args={[2, 2.5]} />
            <meshBasicMaterial 
              color={fileColor}
              transparent 
              opacity={0.2 * opacity}
              blending={AdditiveBlending}
            />
          </mesh>
          <Billboard position={[0, baseScale * 2 + 0.8, 0]}>
            <Text
              fontSize={0.4}
              color="#fff"
              anchorX="center"
              anchorY="middle"
              maxWidth={5}
              outlineWidth={0.02}
              outlineColor="#000"
            >
              {file.name}
            </Text>
          </Billboard>
        </group>
      );
    }
  }

  return null;
}
