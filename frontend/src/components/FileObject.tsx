import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3, TextureLoader, Texture } from 'three';
import { Text } from '@react-three/drei';
import { useStore, FileData } from '../store';

interface FileObjectProps {
  file: FileData;
  lod: 'point' | 'icon' | 'preview';
}

export function FileObject({ file, lod }: FileObjectProps) {
  const meshRef = useRef<Mesh>(null);
  const { thumbnails, setThumbnail, markLoaded } = useStore();
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const [texture, setTexture] = useState<Texture | null>(null);
  const thumbnailUrl = thumbnails.get(file.id);

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

  useFrame((state) => {
    if (meshRef.current && file.position) {
      const [x, y, z] = file.position;
      meshRef.current.position.set(x, y, z);
      
      const drift = Math.sin(state.clock.elapsedTime + x * 0.01) * 0.1;
      meshRef.current.position.y += drift;
    }
  });

  if (!file.position) return null;

  const [x, y, z] = file.position;
  const distance = new Vector3(x, y, z).distanceTo(new Vector3(0, 0, 0));
  const scale = Math.max(0.1, Math.min(2, 50 / Math.max(distance, 1)));

  if (lod === 'point') {
    return (
      <mesh position={[x, y, z]} scale={0.3}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color="#4a9eff" />
      </mesh>
    );
  }

  if (lod === 'icon') {
    return (
      <group position={[x, y, z]}>
        <mesh scale={scale * 0.5}>
          <boxGeometry args={[1, 1, 0.1]} />
          <meshBasicMaterial color="#666" />
        </mesh>
        <Text
          position={[0, -0.6, 0]}
          fontSize={0.2}
          color="#fff"
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
        >
          {file.name}
        </Text>
      </group>
    );
  }

  if (lod === 'preview') {
    return (
      <group position={[x, y, z]}>
        <mesh ref={meshRef} scale={scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={texture || undefined}
            transparent
            opacity={texture ? 1 : 0.5}
          />
        </mesh>
        <Text
          position={[0, -0.6, 0]}
          fontSize={0.15}
          color="#fff"
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
        >
          {file.name}
        </Text>
      </group>
    );
  }

  return null;
}
