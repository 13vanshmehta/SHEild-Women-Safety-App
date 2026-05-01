import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    tag: 'Emergency',
    title: 'Voice-Based SOS',
    description: 'Trigger an SOS instantly using custom voice commands. Alerts are automatically sent to your emergency contacts via SMS, WhatsApp, and in-app groups, complete with your live coordinates, battery level, network strength, and exact time.',
    image: '/screenshots/feature1.png',
  },
  {
    tag: 'Live Tracking',
    title: 'Track Me',
    description: 'Keep your trusted network close with real-time live tracking. Monitor the exact GPS locations of your emergency contacts and group members on an interactive map, complete with live online and offline status indicators to ensure everyone is safe and accounted for.',
    image: '/screenshots/feature2.jpg',
  },
  {
    tag: 'Network',
    title: 'Trust Circle',
    description: 'Create dedicated in-app groups with friends, family, and colleagues to stay connected and coordinate safety. Easily import trusted individuals directly from your phone book into your designated Emergency Contacts list to ensure they receive critical alerts the moment you need help.',
    image: '/screenshots/feature3.png',
  },
  {
    tag: 'Encrypted Chat',
    title: 'Secure Group Chat',
    description: 'Communicate securely with end-to-end encryption. Seamlessly share live locations, photos, and critical documents within your Trust Circle group chats, ensuring your sensitive information remains private and protected at all times.',
    image: '/screenshots/feature4.png',
  },
  {
    tag: 'Safe Zones',
    title: 'Nearby Safe Spots',
    description: 'Instantly locate the closest safe havens and police stations directly from your home screen. Our intelligent routing system actively scans your current location to identify available nearby restaurants, hospitals, schools, and verified public safe spots when you need them most.',
    image: '/screenshots/feature5.jpg',
  },
  {
    tag: 'Access',
    title: 'Frictionless Login',
    description: 'Access your safety network instantly with secure authentication. Log in seamlessly using Google or Apple OAuth for lightning-fast onboarding, or opt for a traditional email and password combination for complete control over your account.',
    image: '/screenshots/feature6.jpg',
  },
  {
    tag: 'Alerts',
    title: 'Multi-Channel Updates',
    description: 'Keep your trusted circle informed with automated multi-channel updates. Critical alerts, status changes, and live tracking links are instantly broadcasted to your emergency contacts via WhatsApp, SMS, and secure in-app group chats to guarantee the message gets through.',
    image: '/screenshots/feature8_new.png',
  },
  {
    tag: 'Integration',
    title: 'Native Maps Support',
    description: 'Seamlessly integrate with your favorite navigation tools. Open live locations shared by group members directly in native applications like Google Maps or Apple Maps, enabling faster, real-time turn-by-turn tracking when every second counts.',
    image: '/screenshots/feature8.jpg',
  },
];

/* ── Samsung Galaxy S-series Frame ── */
export function SamsungPhone({ image, alt, scale = 1 }) {
  return (
    <div className="relative w-full h-full" style={{ transform: `scale(${scale})` }}>
      <div
        className="absolute inset-0"
        style={{
          borderRadius: '38px',
          background: 'linear-gradient(160deg, #3a3a3a 0%, #1c1c1c 30%, #252525 60%, #111 100%)',
          boxShadow:
            '0 0 0 1px #444, 0 0 0 2px #111, 0 50px 100px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      />
      <div
        className="absolute overflow-hidden bg-black"
        style={{
          inset: '5px',
          borderRadius: '34px',
        }}
      >
        <div
          className="absolute z-30"
          style={{
            top: '14px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#070707',
            boxShadow: '0 0 0 1px #1a1a1a, inset 0 0 3px rgba(0,0,0,1)',
          }}
        />
        <img
          src={image}
          alt={alt}
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(130deg, rgba(255,255,255,0.04) 0%, transparent 45%)',
          }}
        />
      </div>
      <div
        className="absolute"
        style={{ top: '80px', left: '-3px', width: '3px', height: '28px', borderRadius: '2px 0 0 2px', background: 'linear-gradient(90deg, #111, #303030)' }}
      />
      <div
        className="absolute"
        style={{ top: '120px', left: '-3px', width: '3px', height: '50px', borderRadius: '2px 0 0 2px', background: 'linear-gradient(90deg, #111, #303030)' }}
      />
      <div
        className="absolute"
        style={{ top: '110px', right: '-3px', width: '3px', height: '60px', borderRadius: '0 2px 2px 0', background: 'linear-gradient(90deg, #303030, #111)' }}
      />
      <div
        className="absolute"
        style={{
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '32px',
          height: '3px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.06)',
        }}
      />
    </div>
  );
}

export default function FeatureShowcase() {
  const sectionRef = useRef(null);
  const phoneContainerRef = useRef(null);
  const slideRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const total = features.length;

      /* Phase 1 ── The phone "drops" into this section. */
      gsap.fromTo(
        phoneContainerRef.current,
        {
          y: -1200,
          x: 350,
          opacity: 1,
          scale: 1
        },
        {
          y: 0,
          x: 0,
          opacity: 1,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'top top',
            scrub: true,
          },
        }
      );

      /* Phase 2 ── Pinned Showcase. Content ONLY appears after phone is settled. */
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: `+=${total * 300}vh`, // Slower scroll
        pin: true,
        scrub: 4,
        onUpdate: (self) => {
          // The first 10% of this pinned section is the "Arrival/Settling" zone
          const settlingEnd = 0.1;

          if (self.progress < settlingEnd) {
            // Phone is arriving or settling. Keep content completely hidden.
            slideRefs.current.forEach(slide => {
              if (slide) gsap.set(slide, { opacity: 0, y: 100 });
            });
            setActiveIndex(0);
            return;
          }

          // Normalize progress after the settling zone
          const normalizedProgress = (self.progress - settlingEnd) / (1 - settlingEnd);
          const rawIndex = normalizedProgress * total;
          const idx = Math.min(Math.floor(rawIndex), total - 1);
          const progress = rawIndex - Math.floor(rawIndex);

          setActiveIndex(idx);

          slideRefs.current.forEach((slide, i) => {
            if (!slide) return;

            if (i < idx) {
              gsap.set(slide, { y: '-130%', opacity: 0, pointerEvents: 'none' });
            } else if (i === idx) {
              const yPct = -(progress * 130);
              const op = progress > 0.8 ? Math.max(0, 1 - (progress - 0.8) * 5) : 1;
              gsap.set(slide, { y: `${yPct}%`, opacity: op, pointerEvents: 'auto' });
            } else if (i === idx + 1) {
              const yPct = 130 - progress * 130;
              const op = progress > 0.2 ? Math.min(1, (progress - 0.2) * 5) : 0;
              gsap.set(slide, { y: `${yPct}%`, opacity: op, pointerEvents: 'none' });
            } else {
              gsap.set(slide, { y: '130%', opacity: 0, pointerEvents: 'none' });
            }
          });
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="feature-showcase"
      className="relative bg-[#050505] w-full h-screen flex items-center justify-center overflow-hidden"
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-0"
        style={{ width: '800px', height: '600px', background: 'rgba(255,20,147,0.02)', filter: 'blur(160px)', borderRadius: '50%' }}
      />

      <div className="w-full max-w-6xl mx-auto px-8 flex items-center gap-16 lg:gap-32 relative z-10 h-full">

        {/* LEFT ── Samsung Phone Container */}
        <div
          ref={phoneContainerRef}
          className="flex-shrink-0 relative"
          style={{ width: '380px', height: 'calc(380px * (18 / 9))' }}
        >
          {/* Spotlight behind phone */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[110%] bg-[#FF1493]/30 blur-[80px] rounded-full z-0 animate-pulse pointer-events-none" />
          
          <div className="relative z-10 w-full h-full">
            <SamsungPhone
              image={features[activeIndex].image}
              alt={features[activeIndex].title}
            />
          </div>
        </div>

        {/* RIGHT ── Sliding Feature Content (PPTX style) */}
        <div className="flex-1 relative overflow-hidden h-[60vh]">
          {features.map((f, i) => (
            <div
              key={f.title}
              ref={(el) => (slideRefs.current[i] = el)}
              className="absolute inset-0 flex flex-col justify-center gap-8 opacity-0 translate-y-[100px]"
            >
              <div className="flex items-center gap-3">
                <div className="h-px w-8 bg-[#FF1493]" />
                <span className="text-[12px] font-bold tracking-[0.4em] uppercase text-[#FF1493]">
                  {f.tag}
                </span>
              </div>

              <h3
                className="font-outfit font-black text-white leading-[1] tracking-tighter"
                style={{ fontSize: 'clamp(3rem, 5vw, 5rem)' }}
              >
                {f.title}
              </h3>

              <p className="text-text-muted leading-relaxed max-w-sm text-xl">
                {f.description}
              </p>

              {/* Progress bar */}
              <div className="flex items-center gap-3 pt-4">
                {features.map((_, j) => (
                  <div
                    key={j}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: j === i ? '32px' : '6px',
                      height: '6px',
                      background: j === i ? '#FF1493' : 'rgba(255,255,255,0.05)',
                    }}
                  />
                ))}
              </div>

              <p className="text-[12px] font-bold tracking-[0.3em] uppercase text-white/10 mt-2">
                {String(i + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
