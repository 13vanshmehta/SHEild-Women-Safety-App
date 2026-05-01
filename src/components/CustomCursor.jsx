import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const followerRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const follower = followerRef.current;
    const glow = glowRef.current;
    
    if (!cursor || !follower || !glow) return;

    // Set initial position
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    gsap.set(follower, { xPercent: -50, yPercent: -50 });
    gsap.set(glow, { xPercent: -50, yPercent: -50 });

    const xSetCursor = gsap.quickTo(cursor, "x", { duration: 0.1, ease: "power3" });
    const ySetCursor = gsap.quickTo(cursor, "y", { duration: 0.1, ease: "power3" });
    const xSetFollower = gsap.quickTo(follower, "x", { duration: 0.5, ease: "power3" });
    const ySetFollower = gsap.quickTo(follower, "y", { duration: 0.5, ease: "power3" });
    const xSetGlow = gsap.quickTo(glow, "x", { duration: 1.2, ease: "power3" });
    const ySetGlow = gsap.quickTo(glow, "y", { duration: 1.2, ease: "power3" });

    const onMouseMove = (e) => {
      xSetCursor(e.clientX);
      ySetCursor(e.clientY);
      xSetFollower(e.clientX);
      ySetFollower(e.clientY);
      xSetGlow(e.clientX);
      ySetGlow(e.clientY);
    };

    const onMouseEnter = () => {
      gsap.to(cursor, { scale: 1.5, duration: 0.3 });
      gsap.to(follower, { scale: 1.5, backgroundColor: 'rgba(255, 20, 147, 0.1)', duration: 0.3 });
    };

    const onMouseLeave = () => {
      gsap.to(cursor, { scale: 1, duration: 0.3 });
      gsap.to(follower, { scale: 1, backgroundColor: 'transparent', duration: 0.3 });
    };

    window.addEventListener('mousemove', onMouseMove);
    
    // Add hover effect to all links and buttons
    const interactables = document.querySelectorAll('a, button, .cursor-pointer');
    interactables.forEach(el => {
      el.addEventListener('mouseenter', onMouseEnter);
      el.addEventListener('mouseleave', onMouseLeave);
    });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      interactables.forEach(el => {
        el.removeEventListener('mouseenter', onMouseEnter);
        el.removeEventListener('mouseleave', onMouseLeave);
      });
    };
  }, []);

  return (
    <>
      {/* Tiny solid dot */}
      <div 
        ref={cursorRef} 
        className="fixed top-0 left-0 w-2 h-2 bg-[#FF1493] rounded-full pointer-events-none z-[9999] mix-blend-screen"
      />
      {/* Glowing follower ring */}
      <div 
        ref={followerRef} 
        className="fixed top-0 left-0 w-8 h-8 border border-[#FF1493] rounded-full pointer-events-none z-[9998] shadow-[0_0_10px_rgba(255,20,147,0.5)]"
      />
      {/* Massive ambient glow follower */}
      <div 
        ref={glowRef}
        className="fixed top-0 left-0 w-[400px] h-[400px] bg-[#FF1493]/10 blur-[100px] rounded-full pointer-events-none z-[1]"
      />
    </>
  );
}
