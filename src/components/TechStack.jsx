import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const technologies = [
  { name: 'React Native', desc: 'Mobile App Framework', icon: 'https://cdn.simpleicons.org/react' },
  { name: 'Express JS', desc: 'Robust Backend API', icon: 'https://cdn.simpleicons.org/express/white' },
  { name: 'Mongo DB', desc: 'Scalable Database', icon: 'https://cdn.simpleicons.org/mongodb' },
  { name: 'Firebase', desc: 'Realtime Sync & Auth', icon: 'https://cdn.simpleicons.org/firebase' },
  { name: 'Google Cloud', desc: 'Enterprise Hosting', icon: 'https://cdn.simpleicons.org/googlecloud' },
  { name: 'Twilio', desc: 'SMS Emergency Alerts', icon: 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDBDNS4zNzMgMCAwIDUuMzczIDAgMTJzNS4zNzMgMTIgMTIgMTIgMTItNS4zNzMgMTItMTJTMTguNjI3IDAgMTIgMHptMCAxOC42NmE2LjY2IDYuNjYgMCAxIDEtLjAwMS0xMy4zMjIgNi42NiA2LjY2IDAgMCAxIC4wMDEgMTMuMzIyek0xMC42NyAxMS4zM2ExLjMzIDEuMzMgMCAxIDAgMi42NyAwIDEuMzMgMS4zMyAwIDAgMC0yLjY3IDB6bTAgMi42NmExLjMzIDEuMzMgMCAxIDAgMi42NyAwIDEuMzMgMS4zMyAwIDAgMC0yLjY3IDB6bTIuNjYtMi42NmExLjMzIDEuMzMgMCAxIDAgMi42NyAwIDEuMzMgMS4zMyAwIDAgMC0yLjY3IDB6bTAtMi42NmExLjMzIDEuMzMgMCAxIDAgMi42NyAwIDEuMzMgMS4zMyAwIDAgMC0yLjY3IDB6IiBmaWxsPSIjRjIyRjQ2Ii8+PC9zdmc+' },
  { name: 'SendGrid', desc: 'Transactional Emails', icon: 'https://www.vectorlogo.zone/logos/sendgrid/sendgrid-icon.svg' },
  { name: 'Google Places', desc: 'Location Discovery', icon: 'https://cdn.simpleicons.org/googlemaps' },
  { name: 'Geoapify', desc: 'Geocoding & Routing', icon: 'https://cdn.simpleicons.org/openstreetmap' },
  { name: 'Open Street Maps', desc: 'Reliable Map Data', icon: 'https://cdn.simpleicons.org/openstreetmap' },
];

export default function TechStack() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardsRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="tech" ref={sectionRef} className="pt-[300px] mb-[300px] mb-[100px] px-6 bg-transparent relative overflow-hidden z-20 flex flex-col items-center">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF1493]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-[120px] flex flex-col items-center">
          <div className="badge inline-flex mb-10 px-6 py-2.5 bg-[#111] border border-white/10 text-[#FF1493] text-[10px] tracking-[0.4em] uppercase font-bold rounded-full">
            <span className="badge-dot mr-2" />
            Infrastructure & Technology
          </div>
          <h2 className="font-outfit font-black text-white leading-[1.1] tracking-tightest text-balance max-w-2xl" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}>
            Powered by Next-Gen <span className="text-shimmer">Tech Stack.</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 justify-center w-full">
          {technologies.map((tech, i) => (
            <div
              key={tech.name}
              ref={(el) => (cardsRef.current[i] = el)}
              className="group relative bg-[#0a0a0a] border border-white/5 rounded-[20px] p-6 hover:bg-[#111] hover:border-[#FF1493]/30 transition-all duration-300 flex flex-col justify-between aspect-square"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF1493]/0 to-[#FF1493]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[20px]" />

              <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FF1493]/10 transition-transform duration-500">
                  <img src={tech.icon} alt={tech.name} className="w-8 h-8 object-contain group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-8">
                  <h3 className="text-white font-bold text-lg mb-1">{tech.name}</h3>
                  <p className="text-[#FF1493] text-[10px] tracking-wider uppercase font-semibold">{tech.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
