import { Suspense, useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { Fog, Vector3, Color } from 'three';
import { FileCloud } from './FileCloud';
import { useFileLoader } from '../hooks/useFileLoader';
import { useWebSocket } from '../hooks/useWebSocket';
import { useStore } from '../store';
import { distributeFilesInSpace } from '../utils/spatialDistribution';

const CAMERA_DAMPING = 0.03;
const DOLLY_SPEED = 0.5;

export function Scene() {
  const { scene, camera, gl } = useThree();
  const { files, cameraTarget, setCameraTarget, isFocused, setIsFocused, clearFocus, selectedFileId } = useStore();

  const cameraVelocity = useRef(new Vector3());
  const lookAtTarget = useRef(new Vector3(0, 0, 0));
  const currentLookAt = useRef(new Vector3(0, 0, 0));
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const spherical = useRef({ theta: 0, phi: Math.PI / 2, radius: 100 });

  useFileLoader();
  useWebSocket();

  useEffect(() => {
    // Deep space navy/black background
    scene.background = new Color('#020205');
    // Dark hazy fog allowing visibility of distant glowing objects
    scene.fog = new Fog('#050510', 100, 900);

    return () => {
      scene.background = null;
      scene.fog = null;
    };
  }, [scene]);

  // ESC to clear focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearFocus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearFocus]);

  // Mouse controls
  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || isFocused) return;

      const deltaX = e.clientX - lastMouse.current.x;
      const deltaY = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      spherical.current.theta -= deltaX * 0.005;
      spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi + deltaY * 0.005));
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Dolly forward/backward
      const direction = new Vector3();
      camera.getWorldDirection(direction);

      const dollyAmount = -e.deltaY * DOLLY_SPEED * 0.1;
      cameraVelocity.current.add(direction.multiplyScalar(dollyAmount));
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [gl, camera, isFocused]);

  useFrame((state, _delta) => {
    // Camera flight to target
    if (cameraTarget) {
      const targetPos = new Vector3(...cameraTarget.position);
      const targetLookAt = new Vector3(...cameraTarget.lookAt);

      // Smooth lerp to target
      camera.position.lerp(targetPos, CAMERA_DAMPING * 2);
      currentLookAt.current.lerp(targetLookAt, CAMERA_DAMPING * 2);
      camera.lookAt(currentLookAt.current);

      // Check if arrived
      if (camera.position.distanceTo(targetPos) < 0.1) {
        setIsFocused(true);
        setCameraTarget(null);
      }
    } else if (!isFocused) {
      // Free navigation mode
      if (!isDragging.current) {
        // Apply velocity with damping
        camera.position.add(cameraVelocity.current);
        cameraVelocity.current.multiplyScalar(0.92);
      } else {
        // Orbit around lookAt point
        const { theta, phi, radius } = spherical.current;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        camera.position.set(
          lookAtTarget.current.x + x,
          lookAtTarget.current.y + y,
          lookAtTarget.current.z + z
        );
        camera.lookAt(lookAtTarget.current);
      }

      // Update spherical from camera position
      if (!isDragging.current) {
        const offset = camera.position.clone().sub(lookAtTarget.current);
        spherical.current.radius = offset.length();
        spherical.current.theta = Math.atan2(offset.z, offset.x);
        spherical.current.phi = Math.acos(Math.max(-1, Math.min(1, offset.y / spherical.current.radius)));
      }
    } else {
      // Focused mode - slight drift
      const time = state.clock.elapsedTime;
      const drift = new Vector3(
        Math.sin(time * 0.1) * 0.02,
        Math.cos(time * 0.15) * 0.01,
        Math.sin(time * 0.12) * 0.02
      );
      camera.position.add(drift);

      if (selectedFileId) {
        const file = useStore.getState().files.get(selectedFileId);
        if (file?.position) {
          currentLookAt.current.lerp(new Vector3(...file.position), 0.05);
          camera.lookAt(currentLookAt.current);
        }
      }
    }
  });

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
      <ambientLight intensity={0.2} color="#101030" />

      {/* Central bright soft light */}
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#fff8e7" distance={300} decay={2} />

      {/* Nebula colored ambient glow lights */}
      <pointLight position={[100, 50, -100]} intensity={2} color="#00ffff" distance={400} decay={2.5} /> {/* Cyan */}
      <pointLight position={[-120, -40, 60]} intensity={2} color="#ff4500" distance={400} decay={2.5} /> {/* Burnt Orange */}
      <pointLight position={[50, 100, 80]} intensity={1.5} color="#8a2be2" distance={350} decay={2.5} /> {/* Violet */}

      <ParallaxStarfield />

      <Suspense fallback={null}>
        <FileCloud />
      </Suspense>

      <EffectComposer>
        <ToneMapping />
      </EffectComposer>
    </>
  );
}

function ParallaxStarfield() {
  const { camera } = useThree();
  const stars1Ref = useRef<any>(null);
  const stars2Ref = useRef<any>(null);
  const stars3Ref = useRef<any>(null);
  const groupRef = useRef<any>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Parallax based on camera position
    if (groupRef.current) {
      groupRef.current.position.x = -camera.position.x * 0.05; // Slightly increased parallax
      groupRef.current.position.y = -camera.position.y * 0.05;
      groupRef.current.position.z = -camera.position.z * 0.05;
    }

    // Slow rotation
    if (stars1Ref.current) {
      stars1Ref.current.rotation.y = time * 0.02;
    }
    if (stars2Ref.current) {
      stars2Ref.current.rotation.y = time * 0.015;
    }
    if (stars3Ref.current) {
      stars3Ref.current.rotation.y = time * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <Stars ref={stars1Ref} radius={300} depth={50} count={6000} factor={4} saturation={1} fade speed={1} />
      <Stars ref={stars2Ref} radius={600} depth={100} count={4000} factor={6} saturation={1} fade speed={1} />
      <Stars ref={stars3Ref} radius={900} depth={100} count={2000} factor={8} saturation={1} fade speed={1} />
    </group>
  );
}
