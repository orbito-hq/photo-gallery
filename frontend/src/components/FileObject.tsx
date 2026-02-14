import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3, TextureLoader, Texture, AdditiveBlending, Color } from 'three';
import { Text, Billboard } from '@react-three/drei';
import { useStore, FileData } from '../store';

interface FileObjectProps {
  file: FileData;
  lod: 'point' | 'icon' | 'preview';
}

const FOCUS_DISTANCE = 8;

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

  useEffect(() => {
    if (lod === 'preview' && !thumbnailUrl && !textureUrl) {
      loadThumbnail();
    }
  }, [lod, thumbnailUrl, textureUrl]);

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
  const distanceFromCenter = new Vector3(x, y, z).length();
  const baseScale = Math.max(1, Math.min(3, file.size / 100000));
  
  // Fade non-selected files when focused
  const opacity = isFocused && !isSelected ? 0.3 : 1;

  if (lod === 'point') {
    return (
      <group 
        ref={groupRef}
        position={[x, y, z]} 
        onClick={handleClick} 
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Glowing dot */}
        <mesh scale={0.8 * hoverScale}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial 
            color={isHovered ? "#7ec8ff" : "#4a9eff"} 
            transparent 
            opacity={opacity}
          />
        </mesh>
        {/* Glow halo */}
        <mesh scale={1.5 * hoverScale}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial 
            color="#4a9eff" 
            transparent 
            opacity={0.15 * opacity}
            blending={AdditiveBlending}
          />
        </mesh>
        {/* Hover tooltip */}
        {isHovered && (
          <Billboard position={[0, 1.5, 0]}>
            <Text
              fontSize={0.8}
              color="#fff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.05}
              outlineColor="#000"
            >
              {file.name}
            </Text>
          </Billboard>
        )}
      </group>
    );
  }

  if (lod === 'icon') {
    return (
      <group 
        ref={groupRef} 
        position={[x, y, z]} 
        onClick={handleClick} 
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Square plane */}
        <mesh scale={baseScale * hoverScale}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial 
            color={isHovered ? "#888" : "#555"} 
            transparent 
            opacity={opacity * 0.9}
          />
        </mesh>
        {/* Border glow */}
        <mesh scale={baseScale * hoverScale * 1.1}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial 
            color="#4a9eff" 
            transparent 
            opacity={0.2 * opacity}
            blending={AdditiveBlending}
          />
        </mesh>
        <Billboard position={[0, baseScale + 0.5, 0]}>
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

  if (lod === 'preview') {
    return (
      <group 
        ref={groupRef} 
        position={[x, y, z]} 
        onClick={handleClick} 
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Preview image */}
        <mesh ref={meshRef} scale={baseScale * 1.5 * hoverScale}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial
            map={texture || undefined}
            color={texture ? "#ffffff" : "#333"}
            transparent
            opacity={texture ? opacity : 0.5 * opacity}
          />
        </mesh>
        {/* Soft glow behind */}
        <mesh scale={baseScale * 1.8 * hoverScale} position={[0, 0, -0.1]}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial 
            color="#4a9eff" 
            transparent 
            opacity={0.15 * opacity}
            blending={AdditiveBlending}
          />
        </mesh>
        <Billboard position={[0, baseScale * 1.5 + 0.8, 0]}>
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

  return null;
}
