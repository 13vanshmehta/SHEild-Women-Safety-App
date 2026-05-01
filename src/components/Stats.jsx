import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { 
    value: '50K+', 
    label: 'Protected Users', 
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ) 
  },
  { 
    value: '1.2M', 
    label: 'Safe Journeys', 
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ) 
  },
  { 
    value: '12K+', 
    label: 'SOS Resolved', 
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ) 
  },
  { 
    value: '100K+', 
    label: 'Trust Circles', 
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ) 
  },
];

export default function Stats() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    cardsRef.current.forEach((card, i) => {
      if (!card) return;
      gsap.fromTo(card,
        { opacity: 0, y: 30, scale: 0.95 },
        {
          opacity: 1, y: 0, scale: 1, duration: 0.8,
          delay: i * 0.1,
          ease: "power2.out",
          scrollTrigger: { trigger: sectionRef.current, start: 'top 85%' }
        }
      );
    });
  }, []);

  return (
    <section ref={sectionRef} className="py-48 relative bg-[#050505] w-full overflow-hidden">
      
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[500px] bg-[#FF1493]/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center">
        
        {/* Section Header */}
        <div className="text-center mb-32 flex flex-col items-center w-full">
          <h2 className="font-outfit font-black text-5xl md:text-6xl mb-8 tracking-tightest text-center w-full">
            Numbers That <span className="text-shimmer">Matter.</span>
          </h2>
          <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto text-balance opacity-80 text-center">
            Our mission is simple: to make the world a safer place for everyone, one alert at a time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {stats.map((s, i) => (
            <div
              key={s.label}
              ref={el => cardsRef.current[i] = el}
              className="group relative p-10 rounded-[48px] border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500 overflow-hidden flex flex-col items-center text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF1493]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-[#FF1493] mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  {s.icon}
                </div>
                <div className="font-outfit font-black text-6xl text-white mb-4 tracking-tighter tabular-nums">
                  {s.value}
                </div>
                <div className="text-text-muted text-[11px] font-black uppercase tracking-[0.4em]">{s.label}</div>
              </div>

              {/* Decorative border glow */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#FF1493]/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
