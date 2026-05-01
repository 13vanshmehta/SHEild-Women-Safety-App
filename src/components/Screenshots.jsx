import { useEffect, useRef } from 'react';

// Array of all 10 screenshots
const screenshots = Array.from({ length: 10 }, (_, i) => `/screenshots/screen${i + 1}.jpg`);

export default function Screenshots() {
  const sectionRef = useRef(null);

  return (
    <section id="screenshots" ref={sectionRef} className="section-pad bg-[#000000] relative overflow-hidden">
      {/* Fade edges */}
      <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-[#000000] to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-[#000000] to-transparent z-10 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10 mb-24 text-center flex flex-col items-center">
        <div className="badge mb-8 px-5 py-2.5 bg-[#FF1493]/10 text-[#FF1493] border-[#FF1493]/20 text-[10px] tracking-[0.3em]">📱 The Experience</div>
        <h2 className="font-outfit font-black mb-10 tracking-tightest leading-[1.1] text-balance mx-auto" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
          Beautifully <span className="text-shimmer">Designed.</span>
        </h2>
        <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto text-balance leading-relaxed">
          A seamless, intuitive interface designed for high-stress situations. Every feature is exactly where you need it to be.
        </p>
      </div>

      <div className="marquee-container py-10">
        <div className="marquee-track">
          {/* Duplicate list twice for seamless infinite scroll */}
          {[...screenshots, ...screenshots].map((src, idx) => (
            <div key={idx} className="marquee-item">
              <img src={src} alt={`SHEild Interface ${idx + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
      
      <p className="text-center text-text-muted text-sm mt-8">Hover over screenshots to pause</p>
    </section>
  );
}
