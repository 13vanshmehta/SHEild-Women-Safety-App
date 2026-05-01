import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function Download() {
  const sectionRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(sectionRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' } }
    );
  }, []);

  return (
    <section id="download" ref={sectionRef} className="section-pad relative overflow-hidden bg-[#050505]">
      
      {/* Premium Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FF1493]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#FF1493]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center">
        <div className="w-full bg-white/[0.02] border border-white/5 rounded-[60px] text-center p-12 md:p-28 relative overflow-hidden flex flex-col items-center">
          
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF1493]/5 to-transparent opacity-50" />
          
          <div className="relative z-10 flex flex-col items-center">
            <img src="/logo.png" alt="SHEild" className="h-24 mx-auto mb-12 drop-shadow-[0_0_30px_rgba(255,20,147,0.3)] hover:scale-110 transition-transform duration-500" />

            <h2 className="font-outfit font-black text-5xl md:text-8xl mb-10 tracking-tightest leading-tight text-balance">
              Ready to <span className="text-shimmer">Take Control?</span>
            </h2>
            
            <p className="text-text-muted text-xl md:text-2xl mb-16 max-w-3xl mx-auto leading-relaxed text-balance">
              Download the official SHEild app today and join thousands of women who trust us for their safety.
            </p>

            <div className="flex flex-wrap gap-8 justify-center mb-24">
              <div className="store-btn-wrapper relative group">
                <button className="btn btn-glass px-12 py-6 rounded-3xl border-white/10 bg-white/5 opacity-40 cursor-not-allowed flex items-center gap-4 text-lg">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.3414C16.899 16.3314 16.195 17.3114 15.111 17.3314C14.045 17.3514 13.702 16.7014 12.479 16.7014C11.256 16.7014 10.875 17.3314 9.882 17.3514C8.889 17.3714 8.113 16.3014 7.481 15.3914C6.189 13.5314 5.201 10.0914 6.529 7.79143C7.188 6.65143 8.358 5.93143 9.613 5.91143C10.569 5.89143 11.478 6.55143 12.062 6.55143C12.646 6.55143 13.738 5.75143 14.89 5.87143C15.372 5.89143 16.726 6.07143 17.568 7.30143C17.502 7.34143 15.912 8.27143 15.929 10.1514C15.949 12.4114 17.892 13.1714 17.912 13.1814C17.896 13.2314 17.597 14.2614 16.884 15.3014L17.523 15.3414ZM14.17 4.10143C14.686 3.48143 15.034 2.62143 14.939 1.76143C14.195 1.79143 13.295 2.26143 12.76 2.88143C12.282 3.43143 11.864 4.31143 11.974 5.15143C12.805 5.21143 13.654 4.72143 14.17 4.10143Z"/>
                  </svg>
                  App Store
                </button>
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Coming Soon</div>
              </div>

              <div className="store-btn-wrapper relative group">
                <button className="btn btn-glass px-12 py-6 rounded-3xl border-white/10 bg-white/5 opacity-40 cursor-not-allowed flex items-center gap-4 text-lg">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a2.29 2.29 0 0 1-.61-1.583V3.397c0-.583.224-1.132.61-1.583zm11.53 11.53l3.14 1.782c1.026.583 1.026 1.536 0 2.119l-3.14 1.782-3.48-3.48 3.48-3.48zM4.341 2.546l10.25 10.25-1.53 1.53L4.34 4.076a2.29 2.29 0 0 1 .001-1.53zm0 18.908c-.287-.146-.532-.367-.714-.643l8.73-8.73 1.53 1.53-9.546 9.546c.001-.583-.001-1.166 0-1.703z"/>
                  </svg>
                  Play Store
                </button>
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Coming Soon</div>
              </div>
            </div>

            {/* Primary CTA Breakout */}
            <div className="flex justify-center scale-110 md:scale-125">
               <a href="/app-release.apk" download="SHEild.apk" className="btn btn-pink text-2xl px-16 py-7 font-black rounded-[32px] shadow-[0_30px_100px_rgba(255,20,147,0.5)] hover:shadow-[0_30px_120px_rgba(255,20,147,0.7)] hover:scale-105 transition-all duration-500 flex items-center gap-5">
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                 </svg>
                 Download Latest APK
               </a>
            </div>
          </div>

        </div>

        {/* Modern Stepper Instructions */}
        <div className="mt-40 w-full max-w-5xl mx-auto">
          <h4 className="text-center font-outfit font-black text-2xl md:text-3xl mb-16 text-white/90 uppercase tracking-[0.4em]">Installation Guide</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Download', desc: 'Get the latest app-release.apk safely from our server.' },
              { step: '02', title: 'Authorize', desc: 'Enable "Unknown Sources" in your browser settings.' },
              { step: '03', title: 'Launch', desc: 'Follow the prompts and start your journey with SHEild.' },
            ].map((item, i) => (
              <div key={i} className="relative group p-10 rounded-[48px] bg-white/[0.02] border border-white/5 hover:border-[#FF1493]/30 transition-all duration-500 flex flex-col items-center text-center">
                <div className="text-5xl font-outfit font-black text-[#FF1493]/10 group-hover:text-[#FF1493]/30 transition-colors mb-8">{item.step}</div>
                <h5 className="font-outfit font-bold text-2xl mb-4 text-white">{item.title}</h5>
                <p className="text-text-muted text-base leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
