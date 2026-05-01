import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export default function Contact() {
  const [status, setStatus] = useState('idle');
  const sectionRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(contentRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1, scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' } }
    );
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      e.target.reset();
      setTimeout(() => setStatus('idle'), 3000);
    }, 1500);
  };

  return (
    <section id="contact" ref={sectionRef} className="section-pad relative overflow-hidden bg-[#050505]">
      
      {/* Subtle top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,20,147,0.2)] to-transparent" />

      <div className="w-full max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center" ref={contentRef}>
        
        <div className="text-center mb-32 flex flex-col items-center w-full">
          <div className="badge mb-8 px-5 py-2.5 bg-[#FF1493]/10 text-[#FF1493] border-[#FF1493]/20 text-[10px] tracking-[0.3em]">Support & Enquiries</div>
          <h2 className="font-outfit font-black mb-10 tracking-tightest leading-[1.1] text-balance mx-auto" style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)' }}>
            Let's <span className="text-shimmer">Connect.</span>
          </h2>
          <p className="text-text-muted text-lg md:text-xl max-w-xl mx-auto text-balance leading-relaxed">
            Whether you have feedback, partnership ideas, or need support — we're here to help.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { icon: '📧', label: 'Email', value: 'hello@sheild.app' },
              { icon: '🌐', label: 'Website', value: 'sheild.app' },
              { icon: '📍', label: 'Location', value: 'Mumbai, IN' },
            ].map((info, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center">
                <div className="text-2xl mb-4">{info.icon}</div>
                <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">{info.label}</p>
                <p className="text-white font-medium">{info.value}</p>
              </div>
            ))}
          </div>

          <div className="p-10 md:p-16 rounded-[60px] bg-white/[0.02] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF1493]/5 blur-[120px] -translate-y-1/2 translate-x-1/2" />
            
            <form onSubmit={handleSubmit} className="relative z-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest ml-1">Full Name</label>
                  <input type="text" required className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-4 focus:ring-[#FF1493]/10 transition-all" placeholder="Jane Doe" />
                </div>
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-widest ml-1">Email Address</label>
                  <input type="email" required className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-4 focus:ring-[#FF1493]/10 transition-all" placeholder="jane@example.com" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest ml-1">Subject</label>
                <input type="text" required className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-4 focus:ring-[#FF1493]/10 transition-all" placeholder="How can we help?" />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest ml-1">Your Message</label>
                <textarea required rows="6" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-4 focus:ring-[#FF1493]/10 transition-all resize-none" placeholder="Write your message here..."></textarea>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn btn-pink w-full py-6 text-xl font-black rounded-2xl shadow-[0_25px_50px_rgba(255,20,147,0.3)]"
              >
                {status === 'idle' && 'Send Message'}
                {status === 'loading' && 'Processing...'}
                {status === 'success' && 'Message Sent Successfully ✓'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
