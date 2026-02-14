import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';
import { UI } from './components/UI';
import { useStore } from './store';
import { useEffect, useRef } from 'react';

function VRButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { setVREnabled } = useStore();

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const checkVR = async () => {
      if ('xr' in navigator) {
        const xr = (navigator as any).xr;
        const supported = await xr.isSessionSupported('immersive-vr');
        if (supported) {
          button.style.display = 'block';
          button.onclick = async () => {
            try {
              const session = await xr.requestSession('immersive-vr');
              session.addEventListener('end', () => {
                setVREnabled(false);
              });
              setVREnabled(true);
            } catch (err) {
              console.error('VR session failed:', err);
            }
          };
        } else {
          button.style.display = 'none';
        }
      } else {
        button.style.display = 'none';
      }
    };

    checkVR();
  }, [setVREnabled]);

  return (
    <button
      ref={buttonRef}
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        padding: '12px 24px',
        backgroundColor: '#4a9eff',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: '14px',
        display: 'none',
        zIndex: 1000
      }}
    >
      Enter VR
    </button>
  );
}

function App() {
  const { vrEnabled, setVREnabled } = useStore();

  useEffect(() => {
    const checkVR = () => {
      if ('xr' in navigator) {
        (navigator as any).xr.isSessionSupported('immersive-vr').then((supported: boolean) => {
          setVREnabled(supported);
        });
      }
    };
    checkVR();
  }, [setVREnabled]);

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 100], fov: 75 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        vr={vrEnabled}
      >
        <Scene />
      </Canvas>
      <VRButton />
      <UI />
    </>
  );
}

export default App;
