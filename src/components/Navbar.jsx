import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: 'body',
        start: 'top top',
        end: '500px',
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          // Move up faster than scroll and fade out
          gsap.set(navRef.current, { 
            y: progress * -150, 
            opacity: 1 - (progress * 1.5)
          });
        }
      });
    });

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      ctx.revert();
    };
  }, []);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { name: 'Features', id: '#features' },
    { name: 'Interface', id: '#screenshots' },
    { name: 'Support', id: '#contact' },
  ];

  return (
    <>
      <nav
        ref={navRef}
        className={`navbar flex items-center justify-between transition-all duration-300 ${scrolled ? 'scrolled' : ''}`}
      >

        <div className="flex items-center cursor-pointer ml-2 transition-transform hover:scale-105" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="font-outfit font-black tracking-tighter text-[26px] md:text-[30px] uppercase">
            <span className="text-white">SHE</span><span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF1493] to-[#c0156f]">ILD</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => scrollTo(link.id)}
              className="text-sm font-medium text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              {link.name}
            </button>
          ))}
        </div>

        <div className="hidden md:block mr-1">
          <a href="/app-release.apk" download="SHEild.apk" className="btn btn-glass px-5 py-2 text-sm">
            Get App
          </a>
        </div>

        <button className="md:hidden text-white mr-2" onClick={() => setMobileMenuOpen(true)} aria-label="Open Menu">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
        </button>
      </nav>

      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="absolute top-6 right-6 text-white" onClick={() => setMobileMenuOpen(false)} aria-label="Close Menu">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        <div className="flex flex-col gap-8 text-center">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => scrollTo(link.id)}
              className="text-2xl font-outfit font-bold text-text-muted hover:text-white transition-colors"
            >
              {link.name}
            </button>
          ))}
          <a href="/app-release.apk" download="SHEild.apk" className="btn btn-primary mt-4" onClick={() => setMobileMenuOpen(false)}>
            Download APK
          </a>
        </div>
      </div>
    </>
  );
}
