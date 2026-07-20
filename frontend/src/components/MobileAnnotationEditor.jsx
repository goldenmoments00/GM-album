import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Undo, Redo, Trash2, Download, MessageSquare, 
  Paintbrush, Highlighter, Square, Circle, ArrowUpRight
} from 'lucide-react';

export default function MobileAnnotationEditor({ 
  images = [], 
  onClose, 
  metadata = {} 
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const bottomToolbarRef = useRef(null);
  
  const [bgCanvas, setBgCanvas] = useState(null);
  const [paths, setPaths] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  const [tool, setTool] = useState('brush'); // brush, highlight, rect, circle, arrow, text
  const [color, setColor] = useState('#ff0000'); // red
  const [size, setSize] = useState(6);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);

  const colors = ['#ff0000', '#3b82f6', '#22c55e', '#eab308', '#ffffff'];
  const sizes = [
    { label: 'S', val: 3 },
    { label: 'M', val: 6 },
    { label: 'L', val: 12 }
  ];

  // Initialize Background Image (Stitching)
  useEffect(() => {
    if (images.length === 0) return;
    
    const loadImages = async () => {
      const loadedImages = await Promise.all(images.map(src => {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => {
            console.error('Failed to load annotation image source', src);
            resolve(null);
          };
          img.src = src;
        });
      }));
      
      const validImages = loadedImages.filter(Boolean);
      if (validImages.length === 0) return;
      
      const totalWidth = validImages.reduce((sum, img) => sum + img.width, 0);
      const maxHeight = Math.max(...validImages.map(img => img.height));
      
      const bCanvas = document.createElement('canvas');
      bCanvas.width = totalWidth;
      bCanvas.height = maxHeight;
      const bCtx = bCanvas.getContext('2d');
      
      let currentX = 0;
      validImages.forEach(img => {
        bCtx.drawImage(img, currentX, 0, img.width, img.height);
        currentX += img.width;
      });
      
      setBgCanvas(bCanvas);
    };
    
    loadImages();
  }, [images]);

  // Handle Resize and Redraw
  useEffect(() => {
    const redraw = () => {
      if (!canvasRef.current || !containerRef.current || !bgCanvas) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Use layout dimensions to avoid getBoundingClientRect issues in transformed containers
      const cWidth = containerRef.current.clientWidth;
      const cHeight = containerRef.current.clientHeight;
      canvas.width = cWidth;
      canvas.height = cHeight;
      
      // Calculate fit
      const scale = Math.min(canvas.width / bgCanvas.width, canvas.height / bgCanvas.height);
      const drawW = bgCanvas.width * scale;
      const drawH = bgCanvas.height * scale;
      const offsetX = (canvas.width - drawW) / 2;
      const offsetY = (canvas.height - drawH) / 2;
      
      // Draw BG
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bgCanvas, offsetX, offsetY, drawW, drawH);
      
      // Draw Paths
      const allPaths = [...paths, currentPath].filter(Boolean);
      
      allPaths.forEach(p => {
        ctx.beginPath();
        if (p.tool === 'highlight') {
          ctx.strokeStyle = p.color + '66'; // transparent
          ctx.globalCompositeOperation = 'multiply';
        } else {
          ctx.strokeStyle = p.color;
          ctx.globalCompositeOperation = 'source-over';
        }
        
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (p.tool === 'brush' || p.tool === 'highlight' || p.tool === 'pen') {
          if (p.points.length > 0) {
            ctx.moveTo(p.points[0].x * scale + offsetX, p.points[0].y * scale + offsetY);
            p.points.forEach(pt => {
              ctx.lineTo(pt.x * scale + offsetX, pt.y * scale + offsetY);
            });
            ctx.stroke();
          }
        } else if (p.tool === 'text') {
          ctx.font = `bold ${p.size * 6}px sans-serif`;
          ctx.fillStyle = p.color;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillText(p.text, p.startX * scale + offsetX, p.startY * scale + offsetY);
        } else if (p.points.length > 0) {
          const start = p.points[0];
          const end = p.points[p.points.length - 1];
          const sx = start.x * scale + offsetX;
          const sy = start.y * scale + offsetY;
          const ex = end.x * scale + offsetX;
          const ey = end.y * scale + offsetY;
          
          if (p.tool === 'rect') {
            ctx.strokeRect(sx, sy, ex - sx, ey - sy);
          } else if (p.tool === 'circle') {
            const radius = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2));
            ctx.arc(sx, sy, radius, 0, Math.PI * 2);
            ctx.stroke();
          } else if (p.tool === 'arrow') {
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            
            // Arrowhead
            const angle = Math.atan2(ey - sy, ex - sx);
            const headLen = 15;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
          }
        }
      });
      ctx.globalCompositeOperation = 'source-over';
    };
    
    redraw();
  }, [bgCanvas, paths, currentPath]);

  // ──── COORDINATE SYSTEM ────
  // The editor is rendered via a React Portal on document.body (outside DesktopViewer's
  // rotated container). In portrait mode, the editor applies its own CSS rotation:
  //   transform: rotate(90deg) translateY(-100%), transformOrigin: top left
  //   width: 100vh, height: 100vw
  //
  // CSS transforms break getBoundingClientRect() for coordinate mapping, so we use
  // PURE MATH to convert physical screen coordinates → editor layout coordinates.
  //
  // The rotation formula (derived from the CSS transform matrix):
  //   physical(px, py) = (editorHeight - layoutY, layoutX)
  //   Therefore: layoutX = py, layoutY = editorHeight - px
  //   where editorHeight = 100vw = window.innerWidth
  //
  // The canvas container sits at layoutY = 60 (below 60px top toolbar).
  // So: canvasLocalX = layoutX, canvasLocalY = layoutY - 60

  const getPos = useCallback((physicalX, physicalY) => {
    if (!bgCanvas || !canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    
    let canvasLocalX, canvasLocalY;
    
    if (isPortrait) {
      // Convert physical screen coords → editor layout coords
      const layoutX = physicalY; // physical Y maps to layout X
      const layoutY = window.innerWidth - physicalX; // physical X inverted maps to layout Y
      
      // Canvas container starts at layout Y = 50 (below 50px top toolbar)
      canvasLocalX = layoutX;
      canvasLocalY = layoutY - 50;
    } else {
      // No rotation, standard mapping
      const rect = canvas.getBoundingClientRect();
      canvasLocalX = physicalX - rect.left;
      canvasLocalY = physicalY - rect.top;
    }
    
    // Map from canvas pixel space to background image space
    const scale = Math.min(canvas.width / bgCanvas.width, canvas.height / bgCanvas.height);
    const drawW = bgCanvas.width * scale;
    const drawH = bgCanvas.height * scale;
    const offsetX = (canvas.width - drawW) / 2;
    const offsetY = (canvas.height - drawH) / 2;
    
    return {
      x: (canvasLocalX - offsetX) / scale,
      y: (canvasLocalY - offsetY) / scale
    };
  }, [bgCanvas]);

  // Use refs to hold mutable state for native event handlers
  const drawingRef = useRef(false);
  const currentPathRef = useRef(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const pathsRef = useRef(paths);
  const undoStackRef = useRef(undoStack);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { pathsRef.current = paths; }, [paths]);
  useEffect(() => { undoStackRef.current = undoStack; }, [undoStack]);



  // Attach native (non-React) event listeners to the canvas container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // The global hack on Touch/PointerEvent prototypes swaps X↔Y in portrait.
    // Reverse it to get the real physical screen coordinates.
    const extractCoords = (e) => {
      const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
      let rawX, rawY;
      
      if (e.touches && e.touches.length > 0) {
        const t = e.touches[0];
        if (isPortrait) {
          rawX = window.innerWidth - t.clientY;
          rawY = t.clientX;
        } else {
          rawX = t.clientX;
          rawY = t.clientY;
        }
      } else {
        if (isPortrait) {
          rawX = window.innerWidth - e.clientY;
          rawY = e.clientX;
        } else {
          rawX = e.clientX;
          rawY = e.clientY;
        }
      }
      return { rawX, rawY };
    };

    const onDown = (e) => {
      const { rawX, rawY } = extractCoords(e);
      const pos = getPos(rawX, rawY);
      if (!pos) return;
      
      drawingRef.current = true;
      const newPath = { tool: toolRef.current, color: colorRef.current, size: sizeRef.current, points: [pos] };
      currentPathRef.current = newPath;
      setCurrentPath(newPath);
    };

    const onMove = (e) => {
      if (!drawingRef.current || !currentPathRef.current) return;
      e.preventDefault(); // Prevent scroll while drawing
      
      const { rawX, rawY } = extractCoords(e);
      const pos = getPos(rawX, rawY);
      if (!pos) return;
      
      let updated;
      const curTool = currentPathRef.current.tool;
      if (curTool === 'brush' || curTool === 'highlight' || curTool === 'pen') {
        updated = { ...currentPathRef.current, points: [...currentPathRef.current.points, pos] };
      } else {
        updated = { ...currentPathRef.current, points: [currentPathRef.current.points[0], pos] };
      }
      currentPathRef.current = updated;
      setCurrentPath(updated);
    };

    const onUp = () => {
      if (drawingRef.current && currentPathRef.current) {
        const newPaths = [...pathsRef.current, currentPathRef.current];
        setUndoStack([...undoStackRef.current, pathsRef.current]);
        setPaths(newPaths);
        setCurrentPath(null);
        currentPathRef.current = null;
        setRedoStack([]);
      }
      drawingRef.current = false;
    };

    // Use ONLY touch events on touch devices, ONLY pointer events on non-touch.
    // This prevents the double-fire bug where both touchstart and pointerdown
    // trigger onDown, corrupting freehand paths.
    const isTouchDevice = 'ontouchstart' in window;
    
    if (isTouchDevice) {
      container.addEventListener('touchstart', onDown, { passive: false });
      container.addEventListener('touchmove', onMove, { passive: false });
      container.addEventListener('touchend', onUp);
      container.addEventListener('touchcancel', onUp);
    } else {
      container.addEventListener('pointerdown', onDown);
      container.addEventListener('pointermove', onMove);
      container.addEventListener('pointerup', onUp);
      container.addEventListener('pointercancel', onUp);
    }

    return () => {
      if (isTouchDevice) {
        container.removeEventListener('touchstart', onDown);
        container.removeEventListener('touchmove', onMove);
        container.removeEventListener('touchend', onUp);
        container.removeEventListener('touchcancel', onUp);
      } else {
        container.removeEventListener('pointerdown', onDown);
        container.removeEventListener('pointermove', onMove);
        container.removeEventListener('pointerup', onUp);
        container.removeEventListener('pointercancel', onUp);
      }
    };
  }, [getPos]);

  // Actions
  const undo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack([paths, ...redoStack]);
    setPaths(previous);
    setUndoStack(undoStack.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setUndoStack([...undoStack, paths]);
    setPaths(next);
    setRedoStack(redoStack.slice(1));
  };

  const clear = () => {
    setUndoStack([...undoStack, paths]);
    setPaths([]);
    setRedoStack([]);
  };

  const handleSave = () => {
    if (!bgCanvas) return;
    
    // Generate final hi-res canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = bgCanvas.width;
    outCanvas.height = bgCanvas.height;
    const ctx = outCanvas.getContext('2d');
    
    ctx.drawImage(bgCanvas, 0, 0);
    
    // Calculate scale for export sizing
    const cWidth = containerRef.current.clientWidth;
    const cHeight = containerRef.current.clientHeight;
    const exportScale = Math.min(cWidth / bgCanvas.width, cHeight / bgCanvas.height);
    
    // Draw paths exactly like redraw but scale=1, offsetX=0, offsetY=0
    paths.forEach(p => {
      ctx.beginPath();
      if (p.tool === 'highlight') {
        ctx.strokeStyle = p.color + '66';
        ctx.globalCompositeOperation = 'multiply';
      } else {
        ctx.strokeStyle = p.color;
        ctx.globalCompositeOperation = 'source-over';
      }
      
      ctx.lineWidth = p.size / exportScale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (p.tool === 'brush' || p.tool === 'highlight' || p.tool === 'pen') {
        if (p.points.length > 0) {
          ctx.moveTo(p.points[0].x, p.points[0].y);
          p.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.stroke();
        }
      } else if (p.points.length > 1) {
        const start = p.points[0];
        const end = p.points[p.points.length - 1];
        
        if (p.tool === 'rect') {
          ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        } else if (p.tool === 'circle') {
          const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.tool === 'arrow') {
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const headLen = 15 / exportScale;
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      }
    });
    
    const dataUrl = outCanvas.toDataURL('image/png', 1.0);
    
    // Download image
    const link = document.createElement('a');
    const filename = `Album_Changes_${metadata.albumId || 'Page'}.png`;
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Open WhatsApp
    const message = `Hi GoldenMoment,\n\nI would like to request some changes to my album.\n\nAlbum ID: ${metadata.albumId || 'Unknown'}\nPage: ${metadata.pageInfo || 'Unknown'}\n\nPlease find the attached annotated screenshot showing the required changes.\n\nThanks.`;
    const waUrl = `whatsapp://send?phone=916009426410&text=${encodeURIComponent(message)}`;
    
    setTimeout(() => {
      window.location.href = waUrl;
      onClose();
    }, 500);
  };

  // Determine if portrait
  const isPortraitScreen = typeof window !== 'undefined' && window.innerWidth < 768 && window.innerHeight > window.innerWidth;

  const editorUI = (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: isPortraitScreen ? '100vh' : '100vw',
      height: isPortraitScreen ? '100vw' : '100vh',
      backgroundColor: '#000', zIndex: 100000, display: 'flex', flexDirection: 'column',
      // Rotate the editor to landscape when phone is portrait
      ...(isPortraitScreen ? {
        transformOrigin: 'top left',
        transform: 'rotate(90deg) translateY(-100%)',
      } : {})
    }}>
      {/* Top Toolbar */}
      <div style={{
        height: '50px', backgroundColor: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(10px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px',
        color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', padding: '8px' }}>
          <X size={22} />
        </button>
        
        {/* Undo / Redo / Clear — centered in top bar */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button onClick={undo} disabled={undoStack.length === 0} style={{ background: 'none', border: 'none', color: undoStack.length ? 'white' : '#555', padding: '8px' }}><Undo size={20} /></button>
          <button onClick={redo} disabled={redoStack.length === 0} style={{ background: 'none', border: 'none', color: redoStack.length ? 'white' : '#555', padding: '8px' }}><Redo size={20} /></button>
          <button onClick={clear} disabled={paths.length === 0} style={{ background: 'none', border: 'none', color: paths.length ? '#e74c3c' : '#555', padding: '8px' }}><Trash2 size={20} /></button>
        </div>
        
        <button onClick={handleSave} style={{ 
          background: 'var(--color-gold)', border: 'none', color: '#1a120b', 
          padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', display: 'flex', gap: '5px', alignItems: 'center', fontSize: '0.85rem'
        }}>
          <MessageSquare size={14} /> Send
        </button>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'none' }}
      >
        <canvas ref={canvasRef} style={{ touchAction: 'none', display: 'block' }} />
      </div>

      {/* Bottom Tools Toolbar — single compact row */}
      <div ref={bottomToolbarRef} style={{
        backgroundColor: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(10px)', 
        padding: '8px 10px',
        borderTop: '1px solid rgba(255,255,255,0.1)', 
        display: 'flex', alignItems: 'center', gap: '8px',
        overflowX: 'auto', flexShrink: 0
      }}>
        {/* Tool buttons */}
        {[
          { id: 'brush', icon: Paintbrush },
          { id: 'highlight', icon: Highlighter },
          { id: 'arrow', icon: ArrowUpRight },
          { id: 'rect', icon: Square },
          { id: 'circle', icon: Circle }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setTool(t.id)}
            style={{
              background: tool === t.id ? 'rgba(255,255,255,0.2)' : 'none',
              border: 'none', color: tool === t.id ? 'var(--color-gold)' : 'white',
              padding: '8px', borderRadius: '8px', minWidth: '36px',
              display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
            }}
          >
            <t.icon size={18} />
          </button>
        ))}

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />

        {/* Colors */}
        {colors.map(c => (
          <button 
            key={c} onClick={() => setColor(c)}
            style={{
              width: '22px', height: '22px', borderRadius: '50%', background: c, flexShrink: 0,
              border: color === c ? '2px solid white' : '2px solid transparent',
              boxShadow: color === c ? '0 0 0 1px var(--color-gold)' : 'none'
            }}
          />
        ))}

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />

        {/* Sizes */}
        {sizes.map(s => (
          <button 
            key={s.label} onClick={() => setSize(s.val)}
            style={{
              background: 'none', flexShrink: 0,
              border: size === s.val ? '1px solid var(--color-gold)' : '1px solid rgba(255,255,255,0.2)',
              color: size === s.val ? 'var(--color-gold)' : 'white',
              borderRadius: '10px',
              padding: '3px 7px',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );

  // Render via portal to bypass DesktopViewer's rotated container
  return createPortal(editorUI, document.body);
}
