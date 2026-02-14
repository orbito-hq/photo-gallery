import { useStore } from '../store';

export function UI() {
  const { totalFiles, hoveredFileId, files, isFocused, selectedFileId, clearFocus } = useStore();
  const hoveredFile = hoveredFileId ? files.get(hoveredFileId) : null;
  const selectedFile = selectedFileId ? files.get(selectedFileId) : null;

  return (
    <>
      {/* Stats */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: '#fff',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: '13px',
          pointerEvents: 'none',
          zIndex: 1000,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)'
        }}
      >
        <div style={{ opacity: 0.9 }}>Files: {totalFiles}</div>
        <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.5 }}>
          Drag to orbit • Scroll to fly • Click to focus
        </div>
        {isFocused && (
          <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.5 }}>
            Press ESC to return
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {hoveredFile && !isFocused && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '14px',
            padding: '10px 20px',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: '8px',
            border: '1px solid rgba(74, 158, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            pointerEvents: 'none',
            zIndex: 1000,
            maxWidth: '400px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontWeight: 600 }}>{hoveredFile.name}</div>
          <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
            {formatFileSize(hoveredFile.size)} • {hoveredFile.type}
          </div>
        </div>
      )}

      {/* Focused file info */}
      {isFocused && selectedFile && (
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '16px',
            padding: '16px 32px',
            background: 'linear-gradient(135deg, rgba(74, 158, 255, 0.15), rgba(0,0,0,0.8))',
            borderRadius: '12px',
            border: '1px solid rgba(74, 158, 255, 0.4)',
            backdropFilter: 'blur(20px)',
            zIndex: 1000,
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>{selectedFile.name}</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>
            {formatFileSize(selectedFile.size)} • {selectedFile.type} • {selectedFile.extension}
          </div>
          <button
            onClick={() => clearFocus()}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: 'rgba(74, 158, 255, 0.2)',
              border: '1px solid rgba(74, 158, 255, 0.5)',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '12px'
            }}
          >
            Return (ESC)
          </button>
        </div>
      )}
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}
