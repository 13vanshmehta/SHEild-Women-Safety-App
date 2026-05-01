import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const slides = [
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

/* ── Samsung Galaxy S24 Ultra Frame (High-Fidelity) ── */
function SamsungPhone({ image, images, activeIndex = 0, alt }) {
  const sources = images || [image];

  return (
    <div className="relative w-full h-full will-change-transform group">
      <div className="absolute inset-0 bg-[#0a0a0a] rounded-[10px] shadow-2xl border-[3px] border-[#2a2a2a] border-y-[#1a1a1a] p-[1.5px] overflow-hidden flex flex-col items-center">
        <div className="relative w-full h-full bg-black rounded-[7px] overflow-hidden">

          {/* Front Camera */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0a0a0a] rounded-full z-30 shadow-[0_0_4px_rgba(0,0,0,1)] border border-[#1a1a1a]"></div>

          {sources.map((src, i) => (
            <img
              key={src}
              src={src}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out z-10 ${i === activeIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
                }`}
              alt={`${alt} - Slide ${i + 1}`}
              loading="lazy"
            />
          ))}

          {/* Screen glare effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-20"></div>
        </div>

        {/* Side buttons */}
        <div className="absolute top-[80px] -right-[4px] w-[1px] h-[30px] bg-[#2a2a2a] rounded-r-md z-30"></div>
        <div className="absolute top-[130px] -right-[4px] w-[1px] h-[50px] bg-[#2a2a2a] rounded-r-md z-30"></div>
      </div>
    </div>
  );
}

export default function Features() {
  const containerRef = useRef(null);
  const headingContainerRef = useRef(null);
  const badgeRef = useRef(null);
  const headingRef = useRef(null);
  const centerPhoneRef = useRef(null);
  const leftPhoneRef = useRef(null);
  const rightPhoneRef = useRef(null);
  const farLeftPhoneRef = useRef(null);
  const farRightPhoneRef = useRef(null);
  const contentWrapperRef = useRef(null);
  const slideContentRefs = useRef([]);

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    let phoneTargetYOffset = 0;
    let textTargetYOffset = 0;

    const calculateOffsets = () => {
      if (centerPhoneRef.current && containerRef.current) {
        gsap.set(centerPhoneRef.current, { y: 0, x: 0, scale: 1 });
        gsap.set(contentWrapperRef.current, { y: 0 });

        const phone = centerPhoneRef.current;
        const container = containerRef.current;

        const phoneRect = phone.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const phoneTopRelative = phoneRect.top - containerRect.top;
        const phoneHeight = phoneRect.height;
        const containerHeight = containerRect.height;

        const pinnedTop = 0;

        const phoneCenterY = pinnedTop + phoneTopRelative + (phoneHeight / 2);
        phoneTargetYOffset = (window.innerHeight / 2) - phoneCenterY;

        const textCenterY = pinnedTop + (containerHeight / 2);
        textTargetYOffset = (window.innerHeight / 2) - textCenterY;
      }
    };

    calculateOffsets();
    window.addEventListener('resize', calculateOffsets);

    const ctx = gsap.context(() => {
      // Intro Reveal Animation
      const introStart = 'top 85%';

      gsap.fromTo(centerPhoneRef.current,
        { y: window.innerHeight * 0.5, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: 'back.out(1.2)', scrollTrigger: { trigger: containerRef.current, start: introStart } }
      );

      gsap.fromTo(leftPhoneRef.current,
        { y: window.innerHeight * 0.5, x: -100, rotation: -30, opacity: 0 },
        { y: 32, x: 0, rotation: -12, duration: 1.2, ease: 'back.out(1.2)', scrollTrigger: { trigger: containerRef.current, start: introStart } }
      );

      gsap.fromTo(farLeftPhoneRef.current,
        { y: window.innerHeight * 0.5, x: -200, rotation: -45, opacity: 0 },
        { y: 64, x: 0, rotation: -24, duration: 1.2, delay: 0.1, ease: 'back.out(1.2)', scrollTrigger: { trigger: containerRef.current, start: introStart } }
      );

      gsap.fromTo(rightPhoneRef.current,
        { y: window.innerHeight * 0.5, x: 100, rotation: 30, opacity: 0 },
        { y: 32, x: 0, rotation: 12, duration: 1.2, ease: 'back.out(1.2)', scrollTrigger: { trigger: containerRef.current, start: introStart } }
      );

      gsap.fromTo(farRightPhoneRef.current,
        { y: window.innerHeight * 0.5, x: 200, rotation: 45, opacity: 0 },
        { y: 64, x: 0, rotation: 24, duration: 1.2, delay: 0.1, ease: 'back.out(1.2)', scrollTrigger: { trigger: containerRef.current, start: introStart } }
      );

      const totalSlides = slides.length;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          // Increased scroll distance dramatically to slow down the scroll effect
          end: `+=${(totalSlides + 8) * 350}vh`,
          pin: true,
          // Higher scrub value creates more delay/smoothing when scrolling fast
          scrub: 4,
          snap: {
            snapTo: [0, 0.1, 0.25, 0.35, ...slides.map((_, i) => 0.35 + ((i + 0.5) / totalSlides) * 0.65)],
            duration: { min: 1.2, max: 3.0 },
            delay: 0.2,
            ease: 'power2.inOut'
          },
          onUpdate: (self) => {
            const p = self.progress;
            const xTarget = - (window.innerWidth * 0.20);

            // PHASE 0: HOLD (0.0 to 0.1)
            if (p < 0.1) {
              setActiveSlide(0);
              gsap.set(contentWrapperRef.current, { opacity: 0, pointerEvents: 'none' });
              gsap.set(farLeftPhoneRef.current, { opacity: 1, y: 64 });
              gsap.set(leftPhoneRef.current, { opacity: 1, y: 32 });
              gsap.set(rightPhoneRef.current, { opacity: 1, y: 32 });
              gsap.set(farRightPhoneRef.current, { opacity: 1, y: 64 });
              gsap.set([headingRef.current, badgeRef.current], { opacity: 1, y: 0 });
              gsap.set(centerPhoneRef.current, { x: 0, y: 0, scale: 1, opacity: 1 });
            }
            // PHASE 1: TRAVEL (0.1 to 0.25)
            else if (p < 0.25) {
              setActiveSlide(0);
              gsap.set(contentWrapperRef.current, { opacity: 0, pointerEvents: 'none' });

              const transProgress = (p - 0.1) / 0.15;

              gsap.set([farLeftPhoneRef.current, farRightPhoneRef.current], {
                opacity: 1 - transProgress,
                y: 64 - transProgress * 150
              });

              gsap.set([leftPhoneRef.current, rightPhoneRef.current], {
                opacity: 1 - transProgress,
                y: 32 - transProgress * 150
              });

              gsap.set([headingRef.current, badgeRef.current], {
                opacity: 1 - transProgress,
                y: -transProgress * 100
              });

              gsap.set(centerPhoneRef.current, {
                x: transProgress * xTarget,
                y: transProgress * phoneTargetYOffset,
                scale: 1 + (transProgress * 0.15),
                opacity: 1
              });

            }
            // PHASE 1.5: SETTLE (0.25 to 0.35)
            else if (p < 0.35) {
              const settleProgress = (p - 0.25) / 0.1;

              gsap.set(centerPhoneRef.current, { x: xTarget, y: phoneTargetYOffset, scale: 1.15, opacity: 1 });
              gsap.set([farLeftPhoneRef.current, leftPhoneRef.current, rightPhoneRef.current, farRightPhoneRef.current, headingRef.current, badgeRef.current], { opacity: 0, pointerEvents: 'none' });

              gsap.set(contentWrapperRef.current, { y: textTargetYOffset, opacity: settleProgress, pointerEvents: 'auto' });
              setActiveSlide(0);

              slideContentRefs.current.forEach((slide, i) => {
                if (!slide) return;
                gsap.set(slide, { y: i === 0 ? '0%' : '150%', opacity: i === 0 ? 1 : 0 });
              });
            }
            // PHASE 2: PPTX (0.35 to 1.0)
            else {
              gsap.set([farLeftPhoneRef.current, leftPhoneRef.current, rightPhoneRef.current, farRightPhoneRef.current, headingRef.current, badgeRef.current], { opacity: 0, pointerEvents: 'none' });
              gsap.set(contentWrapperRef.current, { y: textTargetYOffset, opacity: 1, pointerEvents: 'auto' });

              gsap.set(centerPhoneRef.current, { x: xTarget, y: phoneTargetYOffset, scale: 1.15, opacity: 1 });

              const presentationProgress = (p - 0.35) / 0.65;
              const rawIndex = presentationProgress * totalSlides;
              const idx = Math.min(Math.floor(rawIndex), totalSlides - 1);
              const slideStepProgress = rawIndex - idx;

              setActiveSlide(idx);

              slideContentRefs.current.forEach((slide, i) => {
                if (!slide) return;

                if (i === idx) {
                  if (slideStepProgress > 0.85 && i < totalSlides - 1) {
                    const t = (slideStepProgress - 0.85) / 0.15;
                    gsap.set(slide, { y: `${-t * 150}%`, opacity: 1 - t });
                  } else {
                    gsap.set(slide, { y: '0%', opacity: 1 });
                  }
                } else if (i === idx + 1) {
                  if (slideStepProgress > 0.85 && i < totalSlides - 1) {
                    const t = (slideStepProgress - 0.85) / 0.15;
                    gsap.set(slide, { y: `${150 - t * 150}%`, opacity: t });
                  } else {
                    gsap.set(slide, { y: '150%', opacity: 0 });
                  }
                } else {
                  gsap.set(slide, { y: i < idx ? '-150%' : '150%', opacity: 0 });
                }
              });
            }
          }
        }
      });
    }, containerRef);

    return () => {
      window.removeEventListener('resize', calculateOffsets);
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="features"
      ref={containerRef}
      className="relative bg-transparent w-full h-screen overflow-hidden z-40 flex flex-col items-center justify-center"
    >
      {/* Refined Ambient Background Gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-br from-[#FF1493]/10 via-[#9b4dca]/5 to-transparent blur-[120px] rounded-full pointer-events-none" />

      {/* PHASE 1: OVERVIEW */}
      <div className="relative z-10 px-6 flex flex-col items-center justify-center w-full">

        <div ref={headingContainerRef} className="flex flex-col items-center text-center w-full will-change-transform mb-6 mt-8">
          <div ref={badgeRef} className="badge mb-10 px-6 py-2.5 bg-[#FF1493]/10 text-[#FF1493] border border-[#FF1493]/20 text-[10px] tracking-[0.4em] uppercase font-bold rounded-full">
            Core Features · Safety Ecosystem
          </div>
          <div ref={headingRef}>
            <h2 className="font-outfit font-black mb-10 tracking-tightest leading-[1.1] text-balance mx-auto text-white" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
              Everything You Need To <br className="md:hidden" />
              Stay <span className="text-shimmer">Protected.</span>
            </h2>
          </div>
        </div>

        {/* Scaled phones with an elegant stagger */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-8 lg:gap-10 relative w-full overflow-visible mt-6">
          <div ref={farLeftPhoneRef} className="hidden sm:block w-[90px] sm:w-[120px] md:w-[150px] lg:w-[180px] aspect-[9/19] rotate-[-24deg] translate-y-16 opacity-40 hover:opacity-100 transition-opacity duration-500 -mr-6 md:-mr-10">
            <SamsungPhone image="/screenshots/phone_far_left.jpg" alt="Far Left Screen" />
          </div>
          <div ref={leftPhoneRef} className="w-[110px] sm:w-[140px] md:w-[170px] lg:w-[210px] aspect-[9/19] rotate-[-12deg] translate-y-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
            <SamsungPhone image="/screenshots/track_me.jpg" alt="Track Me" />
          </div>
          <div ref={centerPhoneRef} className="w-[130px] sm:w-[170px] md:w-[200px] lg:w-[250px] aspect-[9/19] z-50 shadow-[0_0_80px_rgba(255,20,147,0.2)] rounded-[10px] opacity-0">
            <SamsungPhone images={slides.map(s => s.image)} activeIndex={activeSlide} alt="SHEild App Interface" />
          </div>
          <div ref={rightPhoneRef} className="w-[110px] sm:w-[140px] md:w-[170px] lg:w-[210px] aspect-[9/19] rotate-[12deg] translate-y-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
            <SamsungPhone image="/screenshots/feature3.png" alt="Trust Circle" />
          </div>
          <div ref={farRightPhoneRef} className="hidden sm:block w-[90px] sm:w-[120px] md:w-[150px] lg:w-[180px] aspect-[9/19] rotate-[24deg] translate-y-16 opacity-40 hover:opacity-100 transition-opacity duration-500 -ml-6 md:-ml-10">
            <SamsungPhone image="/screenshots/phone_far_right.jpg" alt="Far Right Screen" />
          </div>
        </div>
      </div>

      {/* PHASE 2: PPTX */}
      <div
        ref={contentWrapperRef}
        className="absolute top-1/2 left-[52%] -translate-y-1/2 w-full max-w-xl h-[60vh] z-20 pointer-events-none opacity-0 px-6"
      >
        {slides.map((s, i) => (
          <div
            key={s.title}
            ref={(el) => (slideContentRefs.current[i] = el)}
            className="absolute inset-0 flex flex-col justify-center gap-4 will-change-transform"
          >
            <div className="flex items-center gap-4">
              <div className="h-[2px] w-10 bg-gradient-to-r from-[#FF1493] to-transparent" />
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#FF1493]/90">
                {s.tag}
              </span>
            </div>
            <h3 className="font-outfit font-bold text-white leading-tight tracking-tight" style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)' }}>
              {s.title}
            </h3>
            <p className="text-white/60 leading-relaxed max-w-md text-base md:text-lg font-light mt-2">
              {s.description}
            </p>
            <div className="flex items-center gap-3 pt-6">
              {slides.map((_, j) => (
                <div
                  key={j}
                  className="rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: j === i ? '32px' : '6px',
                    height: '6px',
                    background: j === i ? '#FF1493' : 'rgba(255,255,255,0.1)'
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
