import { useState, useRef, useEffect } from 'react';

export function WebcamOverlay() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Position and Size State
    const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 320 });
    const [size, setSize] = useState({ width: 300, height: 300 });

    // Dragging State
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Resizing State
    const [isResizing, setIsResizing] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (isEnabled && !isMinimized && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isEnabled, isMinimized]);

    // Handle Window Resize to keep webcam in bounds
    useEffect(() => {
        const handleResize = () => {
            setPosition(prev => ({
                x: Math.min(prev.x, window.innerWidth - size.width - 20),
                y: Math.min(prev.y, window.innerHeight - size.height - 20)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [size]);

    // Mouse Move Handler (for Dragging & Resizing)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            } else if (isResizing) {
                const newWidth = Math.max(150, e.clientX - position.x);
                const newHeight = Math.max(150, e.clientY - position.y);
                setSize({ width: newWidth, height: newHeight }); // Keep aspect ratio logic if needed, but free resize for now
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragOffset, position]);

    const handleEnable = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            streamRef.current = stream;
            setIsEnabled(true);
            setIsMinimized(false);
            // Reset position to bottom-right initially
            setPosition({ x: window.innerWidth - 340, y: window.innerHeight - 340 });
        } catch (err) {
            console.error('Failed to access webcam:', err);
        }
    };

    const handleDisable = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsEnabled(false);
        setIsMinimized(false);
    };

    const toggleMinimize = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent drag start
        setIsMinimized(prev => !prev);
    };

    const startDrag = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return; // Don't drag if clicking buttons
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const startResize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
    };

    if (!isEnabled) {
        return (
            <button
                onClick={handleEnable}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 2000,
                    padding: '12px 20px',
                    background: 'rgba(20, 20, 20, 0.6)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(12px)',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
                    fontFamily: "'Inter', sans-serif"
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(30, 30, 30, 0.8)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(20, 20, 20, 0.6)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
            >
                Enable Webcam
            </button>
        );
    }

    if (isMinimized) {
        return (
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px', // Minimized view stays fixed bottom-right for simplicity
                zIndex: 2000,
                display: 'flex',
                gap: '8px',
                padding: '12px',
                background: 'rgba(20, 20, 20, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <button
                    onClick={toggleMinimize}
                    style={{
                        background: 'rgba(74, 158, 255, 0.2)',
                        border: '1px solid rgba(74, 158, 255, 0.3)',
                        borderRadius: '6px',
                        color: '#4a9eff',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(74, 158, 255, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(74, 158, 255, 0.2)'}
                >
                    Show
                </button>
                <button
                    onClick={handleDisable}
                    style={{
                        background: 'rgba(255, 68, 68, 0.2)',
                        border: '1px solid rgba(255, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#ff4444',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'}
                >
                    Disable
                </button>
            </div>
        );
    }

    return (
        <div
            onMouseDown={startDrag}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex: 2000,
                borderRadius: '24px',
                overflow: 'hidden',
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(20px)',
                boxShadow: `0 24px 48px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, ${isDragging ? '0.3' : '0.1'})`,
                transition: isDragging || isResizing ? 'none' : 'box-shadow 0.3s ease',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none'
            }}
        >
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: '16px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
                zIndex: 10,
                opacity: 0,
                transition: 'opacity 0.2s ease'
            }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
            >
                <button
                    onClick={toggleMinimize}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                    title="Minimize"
                >
                    _
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleDisable(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        background: 'rgba(255, 68, 68, 0.2)',
                        border: '1px solid rgba(255, 68, 68, 0.3)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        color: '#ff4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'}
                    title="Disable"
                >
                    ✕
                </button>
            </div>

            {/* Resize Handle */}
            <div
                onMouseDown={startResize}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '20px',
                    height: '20px',
                    cursor: 'nwse-resize',
                    zIndex: 20,
                    background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.5) 50%)',
                    borderBottomRightRadius: '24px'
                }}
            />

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    opacity: 0.9,
                    pointerEvents: 'none' // Let events pass through to container for dragging
                }}
            />
        </div>
    );
}
