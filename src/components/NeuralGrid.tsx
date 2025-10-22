import React, { useEffect, useRef } from 'react';

interface Pixel {
  x: number;
  y: number;
  opacity: number;
  targetOpacity: number;
  delay: number;
  duration: number;
  elapsed: number;
}

const NeuralGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initializePixels();
    };

    const initializePixels = () => {
      const pixels: Pixel[] = [];
      const spacing = 10;
      const cols = Math.floor(canvas.width / spacing);
      const rows = Math.floor(canvas.height / spacing);
      
      const centerX = cols / 2;
      const centerY = rows / 2 + rows * 0.15;
      const maxDistFromCenter = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const distFromCenter = Math.sqrt(
            Math.pow(col - centerX, 2) + Math.pow(row - centerY, 2)
          );
          
          const centerFade = 1 - (distFromCenter / maxDistFromCenter);
          const edgeFade = Math.pow(centerFade, 1.5);
          
          if (Math.random() > 0.25 && edgeFade > 0.03) {
            pixels.push({
              x: col * spacing,
              y: row * spacing,
              opacity: Math.random() * 0.25 * edgeFade,
              targetOpacity: (0.3 + Math.random() * 0.7) * edgeFade,
              delay: Math.random() * 2500,
              duration: 600 + Math.random() * 1800,
              elapsed: 0,
            });
          }
        }
      }

      pixelsRef.current = pixels;
    };

    const animate = (_timestamp: number) => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pixelsRef.current.forEach(pixel => {
        pixel.elapsed += 16;

        if (pixel.elapsed >= pixel.delay) {
          const progress = Math.min((pixel.elapsed - pixel.delay) / pixel.duration, 1);
          const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          pixel.opacity = pixel.opacity + (pixel.targetOpacity - pixel.opacity) * eased * 0.12;

          if (progress >= 1) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2 + canvas.height * 0.15;
            const distFromCenter = Math.sqrt(
              Math.pow(pixel.x - centerX, 2) + 
              Math.pow(pixel.y - centerY, 2)
            );
            const maxDist = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
            const centerFade = 1 - (distFromCenter / maxDist);
            const edgeFade = Math.pow(centerFade, 1.5);
            
            pixel.targetOpacity = (0.2 + Math.random() * 0.8) * edgeFade;
            pixel.delay = Math.random() * 2000;
            pixel.duration = 500 + Math.random() * 1500;
            pixel.elapsed = 0;
          }
        }

        if (pixel.opacity > 0.02) {
          const size = pixel.opacity > 0.5 ? 2.5 : pixel.opacity > 0.3 ? 2 : 1.5;
          const colorVariation = Math.floor(220 + Math.random() * 12);
          const glow = pixel.opacity > 0.6 ? 0.3 : 0;
          
          if (glow > 0) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = `rgba(${colorVariation}, 222, 244, ${glow})`;
          } else {
            ctx.shadowBlur = 0;
          }
          
          ctx.fillStyle = `rgba(${colorVariation}, 222, 244, ${Math.min(pixel.opacity, 0.95)})`;
          ctx.fillRect(pixel.x, pixel.y, size, size);
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        mixBlendMode: 'lighten',
        opacity: 0.32,
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
};

export default NeuralGrid;
