import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

import CustomCursor from './components/CustomCursor';
import Hero from './components/Hero';
import NativeApp from './components/NativeApp';
import Features from './components/Features';
import TechStack from './components/TechStack';
import Team from './components/Team';
import Footer from './components/Footer';
import { Toaster } from 'react-hot-toast';
import './index.css';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export default function App() {
  useEffect(() => {
    // 1. Reveal elements on scroll
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      }),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden relative cursor-none">
      <Toaster position="bottom-right" reverseOrder={false} />
      <CustomCursor />
      <div className="grain-bg" />
      <main>
        <Hero />
        <NativeApp />
        <Features />
        <TechStack />
        <Team />
      </main>
      <Footer />
    </div>
  );
}
