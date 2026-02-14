import { useStore } from '../store';

export function UI() {
  const { totalFiles } = useStore();

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      <div>Files: {totalFiles}</div>
      <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
        Use mouse to orbit, scroll to zoom
      </div>
    </div>
  );
}
