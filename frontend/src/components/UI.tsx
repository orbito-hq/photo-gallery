import { useStore } from '../store';
import { useMemo } from 'react';

export function UI() {
  const { totalFiles, hoveredFileId, files, isFocused, selectedFileId, clearFocus } = useStore();
  const hoveredFile = hoveredFileId ? files.get(hoveredFileId) : null;
  const selectedFile = selectedFileId ? files.get(selectedFileId) : null;

  const fileStats = useMemo(() => {
    let images = 0;
    let videos = 0;
    let pdfs = 0;
    let docs = 0;
    let other = 0;

    files.forEach(file => {
      if (file.type === 'image') images++;
      else if (file.type === 'video') videos++;
      else if (file.extension === '.pdf') pdfs++;
      else if (['.doc', '.docx', '.txt'].includes(file.extension)) docs++;
      else other++;
    });

    return { images, videos, pdfs, docs, other };
  }, [files]);

  return (
    <>
      {/* Stats Panel */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          color: 'rgba(255, 255, 255, 0.9)',
          fontFamily: "'Inter', sans-serif",
          fontSize: '13px',
          pointerEvents: 'none',
          zIndex: 1000,
          background: 'rgba(5, 5, 5, 0.6)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          minWidth: '220px'
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'rgba(255, 255, 255, 0.4)',
              marginBottom: '4px',
              fontWeight: 600
            }}>
              Total Assets
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#fff',
              letterSpacing: '-0.5px'
            }}>
              {totalFiles}
            </div>
          </div>

          <div style={{
            height: '1px',
            background: 'rgba(255, 255, 255, 0.1)',
            margin: '4px 0'
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <StatRow label="Images" count={fileStats.images} color="#4a9eff" />
            <StatRow label="Videos" count={fileStats.videos} color="#ff4a4a" />
            <StatRow label="PDFs" count={fileStats.pdfs} color="#ffb34a" />
            <StatRow label="Documents" count={fileStats.docs} color="#4aff9e" />
            <StatRow label="Other" count={fileStats.other} color="#a64aff" />
          </div>

          <div style={{
            marginTop: '12px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div>• Drag to orbit</div>
            <div>• Scroll to fly</div>
            <div>• Click to focus</div>
            {isFocused && <div style={{ color: '#4a9eff' }}>• Press ESC to return</div>}
          </div>
        </div>
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
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
            padding: '12px 24px',
            background: 'rgba(5, 5, 5, 0.8)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)',
            pointerEvents: 'none',
            zIndex: 1000,
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{hoveredFile.name}</div>
          <div style={{ fontSize: '12px', opacity: 0.6 }}>
            {formatFileSize(hoveredFile.size)} • {hoveredFile.type}
          </div>
        </div>
      )}

      {/* Focused file info */}
      {isFocused && selectedFile && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            fontSize: '16px',
            padding: '20px 40px',
            background: 'rgba(5, 5, 5, 0.8)',
            borderRadius: '20px',
            border: '1px solid rgba(74, 158, 255, 0.3)',
            backdropFilter: 'blur(24px)',
            zIndex: 1000,
            maxWidth: '600px',
            textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '18px' }}>
            {selectedFile.name}
          </div>
          <div style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span>{formatFileSize(selectedFile.size)}</span>
            <span style={{ width: '3px', height: '3px', background: 'currentColor', borderRadius: '50%' }} />
            <span style={{ textTransform: 'uppercase' }}>{selectedFile.extension.replace('.', '')}</span>
            <span style={{ width: '3px', height: '3px', background: 'currentColor', borderRadius: '50%' }} />
            <span>{new Date(selectedFile.createdAt).toLocaleDateString()}</span>
          </div>
          <button
            onClick={() => clearFocus()}
            style={{
              marginTop: '16px',
              padding: '8px 20px',
              background: 'rgba(74, 158, 255, 0.15)',
              border: '1px solid rgba(74, 158, 255, 0.3)',
              borderRadius: '8px',
              color: '#4a9eff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(74, 158, 255, 0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(74, 158, 255, 0.15)'}
          >
            Return to orbit
          </button>
        </div>
      )}
    </>
  );
}

function StatRow({ label, count, color }: { label: string; count: number; color: string }) {
  if (count === 0) return null;
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '13px',
      color: 'rgba(255, 255, 255, 0.8)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
        {label}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", opacity: 0.6 }}>
        {count}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}
