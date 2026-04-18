import React, { useEffect, useRef } from 'react';

const COLORS = [
  { r: 230, g: 25, b: 25 },
  { r: 255, g: 42, b: 42 },
  { r: 234, g: 234, b: 234 },
  { r: 168, g: 168, b: 168 },
  { r: 234, g: 234, b: 234 },
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

interface Connection {
  from: number;
  to: number;
  distance: number;
}

const MAX_PIXELS = 900;
const MAX_MOBILE_PIXELS = 360;
const CONNECTION_DISTANCE = 64;
const MIN_CONNECTION_DISTANCE = 18;
const TARGET_FRAME_MS = 50;
const START_DELAY_MS = 300;

const NeuralGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
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

    let resizeTimer: number | undefined;
    let startTimer: number | undefined;
    let isRunning = false;

    const buildConnections = (pixels: Pixel[]) => {
      const connections: Connection[] = [];
      const buckets = new Map<string, number[]>();

      pixels.forEach((pixel, index) => {
        const bucketX = Math.floor(pixel.x / CONNECTION_DISTANCE);
        const bucketY = Math.floor(pixel.y / CONNECTION_DISTANCE);
        const key = `${bucketX}:${bucketY}`;
        const bucket = buckets.get(key);

        if (bucket) {
          bucket.push(index);
        } else {
          buckets.set(key, [index]);
        }
      });

      for (let i = 0; i < pixels.length; i++) {
        const p1 = pixels[i];
        const bucketX = Math.floor(p1.x / CONNECTION_DISTANCE);
        const bucketY = Math.floor(p1.y / CONNECTION_DISTANCE);

        for (let y = bucketY - 1; y <= bucketY + 1; y++) {
          for (let x = bucketX - 1; x <= bucketX + 1; x++) {
            const bucket = buckets.get(`${x}:${y}`);
            if (!bucket) continue;

            for (const j of bucket) {
              if (j <= i) continue;

              const p2 = pixels[j];
              const dx = p1.x - p2.x;
              const dy = p1.y - p2.y;
              const distanceSquared = dx * dx + dy * dy;

              if (
                distanceSquared > MIN_CONNECTION_DISTANCE * MIN_CONNECTION_DISTANCE &&
                distanceSquared < CONNECTION_DISTANCE * CONNECTION_DISTANCE
              ) {
                connections.push({
                  from: i,
                  to: j,
                  distance: Math.sqrt(distanceSquared),
                });
              }
            }
          }
        }
      }

      connectionsRef.current = connections;
    };

    const initializePixels = () => {
      const pixels: Pixel[] = [];
      const targetPixels = window.innerWidth < 768 ? MAX_MOBILE_PIXELS : MAX_PIXELS;
      const spacing = Math.max(24, Math.ceil(Math.sqrt((canvas.width * canvas.height) / targetPixels)));
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
          
          if (Math.random() > 0.42 && edgeFade > 0.04) {
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
      buildConnections(pixels);
      pulsesRef.current = [];
    };

    const updateCanvasSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      initializePixels();
    };

    // Spawn a new pulse wave occasionally
    const maybeSpawnPulse = () => {
      if (Math.random() < 0.0025 && pulsesRef.current.length < 2) {
        const brightPixels = pixelsRef.current.filter(p => p.opacity > 0.5);
        if (brightPixels.length > 0) {
          const source = brightPixels[Math.floor(Math.random() * brightPixels.length)];
          pulsesRef.current.push({
            x: source.x,
            y: source.y,
            radius: 0,
            maxRadius: 120 + Math.random() * 160,
            opacity: 0.4,
            colorIndex: Math.floor(Math.random() * 4),
          });
        }
      }
    };


    const animate = (timestamp: number) => {
      if (!ctx || !canvas) return;

      const deltaTime = timestamp - lastTimeRef.current;
      
      // Throttle to ~20fps max to keep the decorative layer off the critical path.
      frameIntervalRef.current += deltaTime;
      if (frameIntervalRef.current < TARGET_FRAME_MS) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastTimeRef.current = timestamp;
      const dt = Math.min(frameIntervalRef.current, 50); // cap delta to prevent jumps
      frameIntervalRef.current = 0;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

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

      // Draw precomputed nearby connections. Avoid pairwise distance checks per frame.
      ctx.lineWidth = 0.5;
      for (const connection of connectionsRef.current) {
        const p1 = pixelsRef.current[connection.from];
        const p2 = pixelsRef.current[connection.to];
        const minOpacity = Math.min(p1.opacity, p2.opacity);

        if (minOpacity <= 0.42) continue;

        const connectionOpacity = (1 - connection.distance / CONNECTION_DISTANCE) * minOpacity * 0.22;
        const color = COLORS[p1.colorIndex];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${connectionOpacity})`;
        ctx.stroke();
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

      if (isRunning) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    const start = () => {
      if (isRunning || document.hidden) return;
      isRunning = true;
      updateCanvasSize();
      lastTimeRef.current = window.performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const stop = () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    const handleResize = () => {
      if (resizeTimer) {
        window.clearTimeout(resizeTimer);
      }
      resizeTimer = window.setTimeout(updateCanvasSize, 150);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    startTimer = window.setTimeout(start, START_DELAY_MS);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (resizeTimer) {
        window.clearTimeout(resizeTimer);
      }
      if (startTimer) {
        window.clearTimeout(startTimer);
      }
      stop();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        mixBlendMode: 'lighten',
        opacity: 0.24,
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
};

export default NeuralGrid;
