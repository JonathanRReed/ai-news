import React, { useEffect, useRef } from 'react';

// Rose Pine color palette for pixels
const COLORS = [
  { r: 156, g: 207, b: 216 }, // foam/cyan - #9ccfd8
  { r: 196, g: 167, b: 231 }, // iris/purple - #c4a7e7
  { r: 235, g: 188, b: 186 }, // rose - #ebbcba
  { r: 246, g: 193, b: 119 }, // gold - #f6c177
  { r: 224, g: 222, b: 244 }, // text - #e0def4
];

interface Pixel {
  x: number;
  y: number;
  opacity: number;
  targetOpacity: number;
  delay: number;
  duration: number;
  elapsed: number;
  colorIndex: number;
  phase: number; // for subtle color shimmer
}

interface PulseWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  colorIndex: number;
}

const NeuralGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const pulsesRef = useRef<PulseWave[]>([]);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const frameIntervalRef = useRef<number>(0); // For frame throttling

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
      // Increased spacing to reduce pixel count and improve performance
      const spacing = window.innerWidth < 768 ? 14 : 12;
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
              colorIndex: Math.random() < 0.7 ? 4 : Math.floor(Math.random() * 4), // mostly white, some colored
              phase: Math.random() * Math.PI * 2,
            });
          }
        }
      }

      pixelsRef.current = pixels;
      pulsesRef.current = [];
    };

    // Spawn a new pulse wave occasionally
    const maybeSpawnPulse = () => {
      if (Math.random() < 0.003 && pulsesRef.current.length < 3) {
        const brightPixels = pixelsRef.current.filter(p => p.opacity > 0.5);
        if (brightPixels.length > 0) {
          const source = brightPixels[Math.floor(Math.random() * brightPixels.length)];
          pulsesRef.current.push({
            x: source.x,
            y: source.y,
            radius: 0,
            maxRadius: 150 + Math.random() * 200,
            opacity: 0.4,
            colorIndex: Math.floor(Math.random() * 4),
          });
        }
      }
    };


    const animate = (timestamp: number) => {
      if (!ctx || !canvas) return;

      const deltaTime = timestamp - lastTimeRef.current;
      
      // Throttle to ~30fps max to reduce CPU usage
      frameIntervalRef.current += deltaTime;
      if (frameIntervalRef.current < 33) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastTimeRef.current = timestamp;
      const dt = Math.min(frameIntervalRef.current, 50); // cap delta to prevent jumps
      frameIntervalRef.current = 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      maybeSpawnPulse();

      // Update and draw pulse waves
      pulsesRef.current = pulsesRef.current.filter(pulse => {
        pulse.radius += dt * 0.08;
        pulse.opacity = 0.4 * (1 - pulse.radius / pulse.maxRadius);
        
        if (pulse.radius >= pulse.maxRadius) return false;

        const color = COLORS[pulse.colorIndex];
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse.opacity * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        return true;
      });

      // Draw neural connections between nearby bright pixels
      const brightPixels = pixelsRef.current.filter(p => p.opacity > 0.45);
      ctx.lineWidth = 0.5;
      for (let i = 0; i < brightPixels.length; i++) {
        for (let j = i + 1; j < brightPixels.length; j++) {
          const p1 = brightPixels[i];
          const p2 = brightPixels[j];
          const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
          
          if (dist < 60 && dist > 15) {
            const connectionOpacity = (1 - dist / 60) * Math.min(p1.opacity, p2.opacity) * 0.25;
            const color = COLORS[p1.colorIndex];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${connectionOpacity})`;
            ctx.stroke();
          }
        }
      }

      // Update and draw pixels
      pixelsRef.current.forEach(pixel => {
        pixel.elapsed += dt;
        pixel.phase += dt * 0.001;

        // Check if pixel is affected by any pulse wave
        let pulseBoost = 0;
        pulsesRef.current.forEach(pulse => {
          const dist = Math.sqrt(Math.pow(pixel.x - pulse.x, 2) + Math.pow(pixel.y - pulse.y, 2));
          const ringWidth = 30;
          if (Math.abs(dist - pulse.radius) < ringWidth) {
            const proximity = 1 - Math.abs(dist - pulse.radius) / ringWidth;
            pulseBoost = Math.max(pulseBoost, proximity * pulse.opacity * 0.8);
          }
        });

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
            // Occasionally change color
            if (Math.random() < 0.1) {
              pixel.colorIndex = Math.random() < 0.7 ? 4 : Math.floor(Math.random() * 4);
            }
          }
        }

        const effectiveOpacity = Math.min(pixel.opacity + pulseBoost, 1);

        if (effectiveOpacity > 0.02) {
          const size = effectiveOpacity > 0.5 ? 2.5 : effectiveOpacity > 0.3 ? 2 : 1.5;
          const color = COLORS[pixel.colorIndex];
          
          // Subtle shimmer effect
          const shimmer = 1 + Math.sin(pixel.phase) * 0.08;
          const r = Math.min(255, color.r * shimmer);
          const g = Math.min(255, color.g * shimmer);
          const b = Math.min(255, color.b * shimmer);
          
          const glow = effectiveOpacity > 0.55 ? 0.35 : 0;
          
          if (glow > 0) {
            ctx.shadowBlur = 5;
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${glow})`;
          } else {
            ctx.shadowBlur = 0;
          }
          
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(effectiveOpacity, 0.95)})`;
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
        opacity: 0.38,
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
};

export default NeuralGrid;
