'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Box } from '@mui/material';
import Script from 'next/script';

interface Props {
  mode: 'dark' | 'light';
}

const DARK_CONFIG = {
  color: 0x00897b,
  color2: 0x004d40,
  backgroundColor: 0x0a0f1a,
};

const LIGHT_CONFIG = {
  color: 0x4db6ac,
  color2: 0x80cbc4,
  backgroundColor: 0xe8ecf1,
};

export function VantaGlobeBackground({ mode }: Props) {
  const vantaRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vantaEffect = useRef<any>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(0);

  const initVanta = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any;
    if (!vantaRef.current || !W.VANTA?.GLOBE || !W.THREE) return;
    if (vantaEffect.current) vantaEffect.current.destroy();

    const cfg = mode === 'dark' ? DARK_CONFIG : LIGHT_CONFIG;
    vantaEffect.current = W.VANTA.GLOBE({
      el: vantaRef.current,
      THREE: W.THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1.0,
      scaleMobile: 1.0,
      size: 1.2,
      points: 8,
      maxDistance: 22,
      spacing: 18,
      ...cfg,
    });
  }, [mode]);

  useEffect(() => {
    if (scriptsLoaded >= 2) initVanta();
  }, [scriptsLoaded, initVanta]);

  // Slow auto-rotation: simulate gentle mouse drift when user isn't hovering
  useEffect(() => {
    let frame: number;
    const startTime = Date.now();
    const animate = () => {
      if (vantaEffect.current) {
        const t = (Date.now() - startTime) / 1000;
        // Slow circular drift — completes one revolution every ~60 seconds
        vantaEffect.current.mouseX = Math.sin(t * 0.1) * 0.3;
        vantaEffect.current.mouseY = Math.cos(t * 0.07) * 0.15;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      if (vantaEffect.current) vantaEffect.current.destroy();
    };
  }, []);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded((n) => n + 1)}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.globe.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded((n) => n + 1)}
      />
      <Box
        ref={vantaRef}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
