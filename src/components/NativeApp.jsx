import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function NativeApp() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Scroll snapping for the section
    gsap.to(containerRef.current, {
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        snap: {
          snapTo: 1,
          duration: 0.5,
          delay: 0.1,
          ease: 'power2.inOut'
        }
      }
    });
  }, []);

  return (
    <section ref={containerRef} className="pt-24 pb-[100px] md:pt-32 md:pb-32 bg-transparent relative overflow-hidden flex flex-col items-center justify-center">
      {/* Optimized Background glow (No filter blur to fix lag) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,20,147,0.1) 0%, transparent 70%)' }} />

      <div className="max-w-4xl mx-auto px-6 relative z-20 mb-12 md:mb-20 text-center flex flex-col items-center reveal">
        <div className="badge mb-10 px-6 py-2.5 bg-[#FF1493]/10 text-[#FF1493] border-[#FF1493]/20 text-[10px] tracking-[0.4em] uppercase font-bold rounded-full">Built with React Native</div>
        <h2 className="font-outfit font-black mb-7 tracking-tightest leading-[1.1] text-balance mx-auto" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
          One Codebase. <br className="md:hidden" />
          <span className="text-shimmer">Any Devices.</span>
        </h2>
      </div>

      {/* Overlapping tilted layout (V Shape) */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-center relative z-5 h-[650px] md:h-[650px] overflow-hidden">

        {/* Samsung S24 Ultra Mockup (Left, tilted right) */}
        <div className="absolute left-1/2 -translate-x-[75%] md:-translate-x-[90%] z-10 rotate-[-10deg] md:rotate-12 hover:rotate-[-5deg] md:hover:rotate-6 hover:z-30 transition-all duration-500 ease-out group scale-[0.85] md:scale-100 origin-bottom md:origin-center">
          {/* Armor Aluminum Frame (Sharp corners) */}
          <div className="relative w-[280px] h-[580px] bg-black rounded-[12px] shadow-2xl border-[6px] border-[#3a3a3a] border-y-[#2a2a2a] p-[2px] overflow-hidden flex flex-col items-center">
            {/* Screen bezel */}
            <div className="relative w-full h-full bg-black rounded-[8px] overflow-hidden border border-[#222]">
              {/* Punch hole camera */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0a0a0a] rounded-full z-20 shadow-[0_0_4px_rgba(0,0,0,1)] border border-[#1a1a1a]"></div>
              <img src="/screenshots/screen2.jpg" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Android Interface" />
              <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/5 to-transparent pointer-events-none"></div>
            </div>
            {/* Hardware Buttons */}
            <div className="absolute top-[120px] -left-[8px] w-1.5 h-10 bg-[#2a2a2a] rounded-l-md"></div>
            <div className="absolute top-[180px] -left-[8px] w-1.5 h-20 bg-[#2a2a2a] rounded-l-md"></div>
          </div>
        </div>

        {/* iPhone 17 Pro Max Mockup (Right, tilted left) */}
        <div className="absolute left-1/2 -translate-x-[25%] md:translate-x-[10%] z-20 rotate-[10deg] md:-rotate-12 hover:rotate-[5deg] md:hover:-rotate-6 hover:z-30 transition-all duration-500 ease-out group scale-[0.85] md:scale-100 origin-bottom md:origin-center">
          {/* Titanium Frame */}
          <div className="relative w-[280px] h-[580px] bg-[#000] rounded-[55px] shadow-[0_20px_50px_rgba(255,20,147,0.15)] border-[8px] border-[#5a5a5c] p-[3px] overflow-hidden flex flex-col items-center">
            {/* Screen bezel */}
            <div className="relative w-full h-full bg-black rounded-[44px] overflow-hidden border border-[#222]">
              {/* Dynamic Island */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-[20px] z-20 shadow-[0_0_10px_rgba(0,0,0,0.8)] flex items-center justify-end px-2.5">
                <div className="w-2 h-2 rounded-full bg-[#0a0a0a] shadow-[inset_0_0_2px_rgba(255,255,255,0.2)]"></div>
              </div>
              <img src="/screenshots/screen1.jpg" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="iOS Interface" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
            </div>
            {/* Hardware Buttons */}
            <div className="absolute top-[100px] -left-[10px] w-1 h-6 bg-[#4a4a4c] rounded-l-md"></div>
            <div className="absolute top-[140px] -left-[10px] w-1 h-12 bg-[#4a4a4c] rounded-l-md"></div>
            <div className="absolute top-[200px] -left-[10px] w-1 h-12 bg-[#4a4a4c] rounded-l-md"></div>
            <div className="absolute top-[160px] -right-[10px] w-1 h-16 bg-[#4a4a4c] rounded-r-md"></div>
          </div>
        </div>

      </div>

      {/* Foolproof Gap Spacer */}
      <div className="hidden md:block w-full h-[70px]"></div>

      {/* Scroll Indicator
      <div className="relative pb-5 flex flex-col items-center gap-0 animate-bounce opacity-60 z-30">
        <span className="text-[10px] font-bold text-[#FF1493] uppercase tracking-[0.3em]">Scroll</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#FF1493]">
          <polyline points="7 13 12 18 17 13"></polyline>
          <polyline points="7 6 12 11 17 6"></polyline>
        </svg>
      </div> */}
    </section>
  );
}
