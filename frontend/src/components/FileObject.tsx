import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, AdditiveBlending } from 'three';
import { Html } from '@react-three/drei';
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

// SVG Icons for file types
const VideoIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2" fill="rgba(0,0,0,0.3)"/>
    <polygon points="10,8 16,12 10,16" fill={color}/>
  </svg>
);

const TextIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4h16v16H4V4z" stroke={color} strokeWidth="2" fill="rgba(0,0,0,0.3)" rx="1"/>
    <line x1="7" y1="8" x2="17" y2="8" stroke={color} strokeWidth="2"/>
    <line x1="7" y1="12" x2="15" y2="12" stroke={color} strokeWidth="2"/>
    <line x1="7" y1="16" x2="12" y2="16" stroke={color} strokeWidth="2"/>
  </svg>
);

const BinaryIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="2" width="18" height="20" rx="2" stroke={color} strokeWidth="2" fill="rgba(0,0,0,0.3)"/>
    <text x="7" y="10" fill={color} fontSize="6" fontFamily="monospace">01</text>
    <text x="7" y="16" fill={color} fontSize="6" fontFamily="monospace">10</text>
  </svg>
);

const ImageIcon = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" fill="rgba(0,0,0,0.3)"/>
    <circle cx="8" cy="8" r="2" fill={color}/>
    <path d="M21 15l-5-5-4 4-3-3-6 6v2a2 2 0 002 2h14a2 2 0 002-2v-4z" fill={color} opacity="0.5"/>
  </svg>
);

const FileIcon = ({ type, size }: { type: string; size: number }) => {
  const color = FILE_COLORS[type] || '#4a9eff';
  switch (type) {
    case 'video': return <VideoIcon color={color} size={size} />;
    case 'text': return <TextIcon color={color} size={size} />;
    case 'binary': return <BinaryIcon color={color} size={size} />;
    case 'image': return <ImageIcon color={color} size={size} />;
    default: return <BinaryIcon color={color} size={size} />;
  }
};

export function FileObject({ file, lod }: FileObjectProps) {
  const groupRef = useRef<any>(null);
  const { 
    thumbnails, setThumbnail, markLoaded, 
    setSelectedFile, setCameraTarget, setHoveredFile,
    selectedFileId, hoveredFileId, isFocused 
  } = useStore();
  const { camera } = useThree();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hoverScale, setHoverScale] = useState(1);
  const thumbnailUrl = thumbnails.get(file.id);
  
  const isSelected = selectedFileId === file.id;
  const isHovered = hoveredFileId === file.id;
  const isImage = file.type === 'image';
  const fileColor = FILE_COLORS[file.type] || '#4a9eff';

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

  const handleClick = () => {
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

  const handlePointerOver = () => {
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
    const targetScale = isHovered ? 1.15 : 1;
    setHoverScale(prev => prev + (targetScale - prev) * 0.1);
  });

  if (!file.position) return null;

  const [x, y, z] = file.position;
  const opacity = isFocused && !isSelected ? 0.3 : 1;

  // Size based on LOD - bigger sizes
  const sizes = {
    point: { img: 150, icon: 150 },
    icon: { img: 250, icon: 250 },
    preview: { img: 750, icon: 750 }
  };
  
  const size = sizes[lod];

  return (
    <group ref={groupRef} position={[x, y, z]}>
      {/* Glow effect behind */}
      <mesh scale={hoverScale * (lod === 'preview' ? 3 : lod === 'icon' ? 2 : 1.2)} position={[0, 0, -0.1]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial 
          color={fileColor}
          transparent 
          opacity={0.15 * opacity * (isHovered ? 1.5 : 1)}
          blending={AdditiveBlending}
        />
      </mesh>
      
      <Html
        center
        distanceFactor={lod === 'preview' ? 8 : lod === 'icon' ? 12 : 18}
        style={{
          opacity,
          transition: 'opacity 0.3s, transform 0.2s',
          transform: `scale(${hoverScale})`,
          pointerEvents: 'auto'
        }}
        occlude={false}
      >
        <div
          onClick={handleClick}
          onMouseEnter={handlePointerOver}
          onMouseLeave={handlePointerOut}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          {isImage ? (
            <div
              style={{
                width: size.img,
                height: size.img,
                borderRadius: 6,
                overflow: 'hidden',
                border: `2px solid ${isHovered ? fileColor : 'rgba(255,255,255,0.3)'}`,
                boxShadow: isHovered 
                  ? `0 0 24px ${fileColor}80, 0 6px 16px rgba(0,0,0,0.6)` 
                  : '0 4px 12px rgba(0,0,0,0.4)',
                background: '#fff',
                transition: 'border 0.2s, box-shadow 0.2s'
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={file.name}
                  onLoad={() => setImageLoaded(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: imageLoaded ? 1 : 0,
                    transition: 'opacity 0.3s'
                  }}
                />
              ) : (
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: '#fff'
                }}>
                  <FileIcon type="image" size={size.icon * 0.6} />
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                width: size.icon,
                height: size.icon * 1.2,
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a2e, #0a0a15)',
                border: `2px solid ${isHovered ? fileColor : 'rgba(255,255,255,0.15)'}`,
                boxShadow: isHovered 
                  ? `0 0 20px ${fileColor}80, 0 4px 12px rgba(0,0,0,0.5)` 
                  : '0 4px 12px rgba(0,0,0,0.5)',
                transition: 'border 0.2s, box-shadow 0.2s',
                padding: 8
              }}
            >
              <FileIcon type={file.type} size={size.icon * 0.6} />
              <div style={{
                marginTop: 4,
                fontSize: Math.max(8, size.icon * 0.15),
                color: fileColor,
                fontFamily: 'monospace',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                {file.extension}
              </div>
            </div>
          )}
          
          {/* Filename label */}
          {(isHovered || lod === 'preview') && (
            <div
              style={{
                marginTop: 8,
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.8)',
                borderRadius: 4,
                fontSize: lod === 'preview' ? 12 : 10,
                color: '#fff',
                maxWidth: size.img + 40,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'system-ui, sans-serif',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}
            >
              {file.name}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
