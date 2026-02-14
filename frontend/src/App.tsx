import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';
import { UI } from './components/UI';

function App() {
  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 100], fov: 75 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
      <UI />
    </>
  );
}

export default App;
