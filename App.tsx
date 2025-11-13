import React, { useState, useRef, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import { editImage, detectHeadshot } from './services/geminiService';

type HeadshotBounds = { x: number; y: number; width: number; height: number } | null;
type Point = { x: number; y: number };

// --- ICONS ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
);

const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
);

const MagicWandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83zM3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM5.92 19H5v-.92l9.06-9.06.92.92L5.92 19z"/>
    </svg>
);

const RevertIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
    </svg>
);

const Spinner: React.FC<{ text?: string }> = ({ text }) => (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center rounded-lg z-20">
        <svg className="animate-spin h-10 w-10 text-white mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {text && <p className="text-white text-lg animate-pulse">{text}</p>}
    </div>
);

const GameOnFrame: React.FC<{ fontFamily: string }> = ({ fontFamily }) => {
    // fontFamily prop is ignored to better match the reference image's sans-serif style.
    const sansSerif = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";
    const colors = {
      red: '#F44336',
      yellow: '#FFEB3B',
      green: '#4CAF50',
      blue: '#2196F3'
    };

    return (
        <svg width="1080" height="1350" viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="logoGradient" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor={colors.red} />
                    <stop offset="100%" stopColor={colors.yellow} />
                </linearGradient>

                <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                
                <filter id="strongNeonGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="25" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur2" />
                    <feMerge>
                        <feMergeNode in="blur1" />
                        <feMergeNode in="blur2" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            
            {/* Corner Shapes */}
            <path d="M0 0 H250 L0 250 V0 Z" fill={colors.red} />
            <path d="M1080 0 H830 L1080 250 V0 Z" fill={colors.blue} />
            <path d="M0 1350 V1100 L250 1350 H0 Z" fill={colors.green} />
            <path d="M1080 1350 V1100 L830 1350 H1080 Z" fill={colors.yellow} />

            {/* Perspective Grid */}
            <g stroke={colors.green} strokeWidth="1" strokeOpacity="0.3">
                <path d="M0 675 H1080" />
                <path d="M0 750 H1080" />
                <path d="M0 825 H1080" />
                <path d="M0 900 H1080" />
                <path d="M0 975 H1080" />
                <path d="M0 1050 H1080" />
                <path d="M0 1125 H1080" />
                <path d="M0 1200 H1080" />
                <path d="M0 1275 H1080" />

                <path d="M540 620 L-210 1350" />
                <path d="M540 620 L-60 1350" />
                <path d="M540 620 L90 1350" />
                <path d="M540 620 L240 1350" />
                <path d="M540 620 L390 1350" />
                <path d="M540 620 L690 1350" />
                <path d="M540 620 L840 1350" />
                <path d="M540 620 L990 1350" />
                <path d="M540 620 L1140 1350" />
                <path d="M540 620 L1290 1350" />
            </g>
            
            {/* Glowing Yellow Circle (around the photo) */}
            <circle cx="540" cy="620" r="300" stroke={colors.yellow} strokeWidth="15" fill="none" filter="url(#strongNeonGlow)" />
            
            {/* Title */}
            <g style={{ fontFamily: sansSerif, textTransform: 'uppercase' }} textAnchor="middle" filter="url(#neonGlow)">
                <text x="540" y="200" fill="url(#logoGradient)" fontSize="130" fontWeight="bold" letterSpacing="15">GAME ON</text>
            </g>
            
            {/* Lower Text */}
            <g style={{ fontFamily: sansSerif, textTransform: 'uppercase' }} textAnchor="middle" fill="white">
                <text x="540" y="980" fontSize="36" letterSpacing="3">I have turned my game on,</text>
                <text x="540" y="1030" fontSize="36" letterSpacing="3">what about you?</text>
                <text x="540" y="1120" fontSize="24" letterSpacing="2" fill={colors.green} filter="url(#neonGlow)">GET YOUR GAME ON!</text>
            </g>
        </svg>
    );
};


const App = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalMimeType, setOriginalMimeType] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [headshotBounds, setHeadshotBounds] = useState<HeadshotBounds>(null);
  const [downloadedImageFile, setDownloadedImageFile] = useState<File | null>(null);
  
  // State for manual adjustments
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ startPoint: Point; startPan: Point } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const isWebShareSupported = typeof navigator.share === 'function';

  useEffect(() => {
    const newDisplayImage = editedImage || originalImage;
    if (newDisplayImage !== displayImage) {
        setDisplayImage(newDisplayImage);
    }
  }, [originalImage, editedImage]);

  useEffect(() => {
      if (displayImage) {
          drawCanvas().catch(err => {
            console.error("Error drawing preview canvas:", err);
            setError(err instanceof Error ? err.message : "Failed to draw preview.");
          });
      }
  }, [displayImage, headshotBounds, zoom, pan]);

  const resetAdjustments = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  
  const drawCanvas = (targetCanvas?: HTMLCanvasElement, downloadSize = { width: 1080, height: 1350 }): Promise<void> => {
    return new Promise((resolve, reject) => {
        const canvas = targetCanvas || canvasRef.current;
        if (!canvas || !displayImage) {
            return reject(new Error("Canvas or display image is not ready."));
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error("Could not get canvas context."));
        }
        
        canvas.width = downloadSize.width;
        canvas.height = downloadSize.height;

        const userImage = new Image();
        userImage.crossOrigin = 'anonymous';

        userImage.onload = () => {
            // Set background color
            ctx.fillStyle = '#0A011A';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Define the circular clipping path
            const photoCx = 540;
            const photoCy = 620;
            const photoRadius = 300;
            const clipPath = new Path2D();
            clipPath.arc(photoCx, photoCy, photoRadius, 0, Math.PI * 2);
            
            ctx.save();
            ctx.clip(clipPath);

            // --- Draw User Image with Headshot Focus & Manual Adjustments ---
            const destX = photoCx - photoRadius;
            const destY = photoCy - photoRadius;
            const destSize = photoRadius * 2;

            let sx, sy, sWidth, sHeight;

            if (headshotBounds) {
                const { x, y, width, height } = headshotBounds;
                const faceCenterX = (x + width / 2) * userImage.width;
                const faceCenterY = (y + height / 2) * userImage.height;
                const faceSize = Math.max(width * userImage.width, height * userImage.height) * 1.8; 
                sWidth = faceSize;
                sHeight = faceSize;
                sx = faceCenterX - sWidth / 2;
                sy = faceCenterY - sHeight / 2;
            } else {
                sWidth = Math.min(userImage.width, userImage.height);
                sHeight = sWidth;
                sx = (userImage.width - sWidth) / 2;
                sy = (userImage.height - sHeight) / 2;
            }
            
            const currentZoom = 1 / zoom;
            sx += (sWidth - sWidth * currentZoom) / 2;
            sy += (sHeight - sHeight * currentZoom) / 2;
            sWidth *= currentZoom;
            sHeight *= currentZoom;
            
            sx -= pan.x * (sWidth / destSize);
            sy -= pan.y * (sHeight / destSize);

            ctx.drawImage(userImage, sx, sy, sWidth, sHeight, destX, destY, destSize, destSize);

            ctx.restore();

            // --- Draw SVG Frame ---
            const svgString = ReactDOMServer.renderToStaticMarkup(
                <GameOnFrame fontFamily="'Press Start 2P', cursive" />
            );
            const frameImage = new Image();
            frameImage.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
            frameImage.onload = () => {
                ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
                resolve();
            };
            frameImage.onerror = () => {
                reject(new Error("Failed to load the photo frame graphic."));
            };
        };
        userImage.onerror = () => {
            reject(new Error("Failed to load the uploaded image."));
        };

        // This must be the last thing to run to trigger the onload events
        userImage.src = displayImage;
    });
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setLoadingText('Analyzing photo...');
      setError(null);
      setEditedImage(null);
      setHeadshotBounds(null);
      setDownloadedImageFile(null); // Reset share button on new upload
      resetAdjustments();

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setOriginalImage(base64);
        setOriginalMimeType(file.type);
        
        const imageData = base64.split(',')[1];
        try {
          const bounds = await detectHeadshot(imageData, file.type);
          setHeadshotBounds(bounds);
        } catch (err) {
            console.error(err);
            setError("Could not analyze photo for headshot detection.");
        } finally {
            setIsLoading(false);
            setLoadingText('');
        }
      };
      reader.onerror = () => {
          setError("Failed to read the image file.");
          setIsLoading(false);
      }
      reader.readAsDataURL(file);
    }
  };

  const handleEnhance = async () => {
    if (!originalImage || !originalMimeType) {
      setError("Please upload an image first.");
      return;
    }
    setIsLoading(true);
    setLoadingText('Enhancing with AI...');
    setError(null);
    setDownloadedImageFile(null); // Reset share state
    try {
      const imageData = originalImage.split(',')[1];
      const newImage = await editImage(imageData, originalMimeType, "Enhance the lighting and colors to make this photo look more vibrant and epic, suitable for a gaming event promo picture.");
      setEditedImage(`data:${originalMimeType};base64,${newImage}`);
    } catch (err) {
        if (err instanceof Error) {
            setError(`AI enhancement failed: ${err.message}`);
        } else {
            setError("An unknown error occurred during AI enhancement.");
        }
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  const handleRevert = () => {
    setEditedImage(null);
    setDownloadedImageFile(null); // Reset share state
  };
  
  const handleDownload = async () => {
    if (!displayImage) {
        setError("There is no image to download.");
        return;
    }
    setLoadingText('Preparing download...');
    setIsLoading(true);
    setError(null);
    
    const downloadCanvas = document.createElement('canvas');
    try {
        await drawCanvas(downloadCanvas);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Could not prepare image for download.";
        setError(message);
        setIsLoading(false);
        setLoadingText('');
        return;
    }


    downloadCanvas.toBlob((blob) => {
        if (!blob) {
            setError("Failed to create image file.");
            setIsLoading(false);
            setLoadingText('');
            return;
        }
        
        // For Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'game-on-photo.png';
        link.href = url;
        document.body.appendChild(link); // Required for Firefox compatibility
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // For Sharing
        const imageFile = new File([blob], 'game-on-photo.png', { type: 'image/png' });
        setDownloadedImageFile(imageFile);
        
        setIsLoading(false);
        setLoadingText('');
    }, 'image/png');
  };
  
  const handleShare = async () => {
    if (!downloadedImageFile || !isWebShareSupported) {
        setError("Sharing is not available or no image has been prepared.");
        return;
    }
    try {
        const shareData = {
            files: [downloadedImageFile],
            title: 'GAME ON!',
            text: 'I have turned my game on! Get your custom photo frame for Rendezvous 2025. Join here: https://bit.ly/rendezvous-2025',
        };
        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            setError("This content cannot be shared.");
        }
    } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
             setError(`Sharing failed: ${err.message}`);
        }
    }
  };
  
  const openRegistration = () => {
      window.open('https://bit.ly/rendezvous-2025', '_blank');
  };

  // --- Pan and Zoom Handlers ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ 
      startPoint: { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY },
      startPan: pan
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) return;
    e.preventDefault();
    const dx = e.nativeEvent.offsetX - dragStart.startPoint.x;
    const dy = e.nativeEvent.offsetY - dragStart.startPoint.y;
    setPan({ 
      x: dragStart.startPan.x + dx,
      y: dragStart.startPan.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      setIsDragging(true);
      setDragStart({
        startPoint: { x: offsetX, y: offsetY },
        startPan: pan
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    const dx = offsetX - dragStart.startPoint.x;
    const dy = offsetY - dragStart.startPoint.y;
    setPan({
      x: dragStart.startPan.x + dx,
      y: dragStart.startPan.y + dy
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0A011A] text-white">
      <main className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8">
        
        <div className="w-full lg:w-1/3 flex flex-col items-center lg:items-start gap-4 order-2 lg:order-1">
          <h1 className="text-4xl font-bold text-center lg:text-left" style={{fontFamily: "'Press Start 2P', cursive"}}>GAME ON</h1>
          <p className="text-gray-300 text-center lg:text-left">Create your event profile picture. Upload a photo and see the magic!</p>

          <div className="w-full bg-gray-800 bg-opacity-50 p-6 rounded-lg border border-gray-700 space-y-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
            >
              <UploadIcon />
              {originalImage ? 'Upload New Photo' : 'Upload Photo'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              accept="image/png, image/jpeg"
            />

            {originalImage && (
              <div className="space-y-2">
                <label htmlFor="zoom" className="block text-sm font-medium text-gray-300">Zoom</label>
                <input
                  id="zoom"
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  disabled={isLoading}
                />
                <button onClick={resetAdjustments} className="text-xs text-yellow-400 hover:underline">Reset Position</button>
              </div>
            )}
            
            <button
                onClick={handleEnhance}
                disabled={!originalImage || isLoading || !!editedImage}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
            >
                <MagicWandIcon />
                Enhance with AI
            </button>

            {editedImage && (
                 <button
                    onClick={handleRevert}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
                >
                    <RevertIcon />
                    Revert to Original
                </button>
            )}

            <hr className="border-gray-600"/>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleDownload}
                disabled={!displayImage || isLoading}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
              >
                <DownloadIcon />
                Download
              </button>
              
              {isWebShareSupported && (
                <button
                    onClick={handleShare}
                    disabled={!downloadedImageFile || isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-500 text-black font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
                >
                    <ShareIcon />
                    Share
                </button>
              )}
            </div>
            
            <button
              onClick={openRegistration}
              className="w-full bg-transparent border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold py-3 px-4 rounded-lg transition-all pulse-glow-yellow"
            >
                Register Now!
            </button>
          </div>
          {error && <p className="text-red-400 mt-2 text-center lg:text-left">{error}</p>}
        </div>
        
        <div className="w-full lg:w-2/3 flex items-center justify-center order-1 lg:order-2">
            <div className="relative w-full max-w-lg aspect-[1080/1350]">
                {isLoading && <Spinner text={loadingText} />}
                <canvas 
                    ref={canvasRef} 
                    className="w-full h-full rounded-lg border-2 border-gray-700 cursor-grab active:cursor-grabbing"
                    style={{ display: displayImage ? 'block' : 'none' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                />
                {!displayImage && (
                     <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-400 bg-gray-900">
                        <UploadIcon className="w-16 h-16 mb-4" />
                        <span className="text-xl">Image Preview</span>
                     </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;
