import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Navbar from './Navbar';
import toast from 'react-hot-toast';

export default function Hero() {
  const heroRef = useRef(null);
  const contentRef = useRef(null);

  const handleStoreClick = () => {
    toast('Launching Soon! Please use the APK for now.', {
      icon: '🚀',
      style: {
        borderRadius: '12px',
        background: '#111',
        color: '#fff',
        border: '1px solid rgba(255, 20, 147, 0.3)',
        fontSize: '14px',
        fontWeight: '500',
        fontFamily: 'Inter, sans-serif',
      },
    });
  };

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(contentRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1.2 }
    );

    // Scroll snapping for the section
    gsap.to(heroRef.current, {
      scrollTrigger: {
        trigger: heroRef.current,
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
    <section ref={heroRef} className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-transparent">
      <Navbar />

      {/* Background Glow */}
      <div className="hero-glow" />

      <div className="max-w-7xl mx-auto px-6 w-full text-center relative z-10 flex flex-col items-center pt-[40px] md:pt-[60px]">
        <div ref={contentRef} className="flex flex-col items-center w-full">
          <div className="badge mb-8 md:mb-20 shadow-lg px-6 py-2.5 bg-white/5 border border-white/10 rounded-full text-[10px] tracking-[0.2em] uppercase font-bold text-white/60" style={{ marginBottom: window.innerWidth < 768 ? '20px' : '40px' }}>
            <span className="badge-dot" />
            Women Safety App · V1.0 Launch
          </div>

          <h1 className="font-outfit font-black text-4xl sm:text-5xl md:text-8xl tracking-tighter text-center w-full leading-[1.05] text-balance" style={{ paddingBottom: window.innerWidth < 768 ? '30px' : '70px' }}>
            Your Shield, <span className="text-shimmer">Every Step</span> <br className="hidden md:block" /> of the Way.
          </h1>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-6 justify-center items-center w-full">

            <a href="/app-release.apk" download="SHEild.apk" className="btn btn-magical text-sm px-6 py-4 w-[200px] h-[54px] flex items-center justify-center gap-3">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download APK
            </a>

            <div className="store-btn-wrapper relative group">
              <button
                onClick={handleStoreClick}
                className="btn btn-glass text-sm px-6 py-4 w-[200px] h-[54px] flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg viewBox="0 0 512 512" width="20" height="20" fill="currentColor">
                  <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
                </svg>
                Play Store
              </button>
            </div>

            <div className="store-btn-wrapper relative group">
              <button
                onClick={handleStoreClick}
                className="btn btn-glass text-sm px-6 py-4 w-[200px] h-[54px] flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg viewBox="0 0 384 512" width="20" height="20" fill="currentColor">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
                App Store
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-60">
        <span className="text-[10px] font-bold text-[#FF1493] uppercase tracking-[0.3em]">Scroll</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#FF1493]">
          <polyline points="7 13 12 18 17 13"></polyline>
          <polyline points="7 6 12 11 17 6"></polyline>
        </svg>
      </div>
    </section>
  );
}
