import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const team = [
  {
    name: 'Vansh Mehta',
    role: 'Software Developer Engineer',
    image: '/team/vansh.jpg',
    github: 'https://github.com/13vanshmehta',
    linkedin: 'https://www.linkedin.com/in/vansh-mehta-vsm13'
  },
  {
    name: 'Swarnim Bane',
    role: 'Software Developer Engineer',
    image: '/team/swarnim.jpg',
    github: 'https://github.com/swarnim0129',
    linkedin: 'https://www.linkedin.com/in/swarnimbane0129'
  },
  {
    name: 'Sohan Neogi',
    role: 'AI Engineer',
    image: '/team/sohan.jpg',
    github: 'https://github.com/Mr123Anonymous',
    linkedin: 'https://www.linkedin.com/in/sohan-neogi-7848a92aa'
  },
  {
    name: 'Umar Khatri',
    role: 'Software Developer Engineer',
    image: '/team/umar.jpg',
    github: 'https://github.com/umar-khatri',
    linkedin: 'https://www.linkedin.com/in/umar-khatri/'
  }
];

const mentor = {
  name: 'Prof. Monali Deshmukh',
  role: 'Professor',
  image: '/team/monali.jpg',
  linkedin: 'https://www.linkedin.com/in/monali-deshmukh-732ab421'
};

export default function Team() {
  const sectionRef = useRef(null);

  useEffect(() => {
    // Removed animation to ensure visibility
    const ctx = gsap.context(() => { }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="team" className="pt-[250px] pb-[200px] px-6 bg-transparent relative overflow-hidden z-20 flex flex-col items-center" style={{ marginTop: '70px', marginBottom: '70px' }}>
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF1493]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto relative z-10 text-center">
        <div className="flex flex-col items-center mb-[100px] mt-[100px]">
          <div className="badge inline-flex mb-8 px-6 py-2.5 bg-[#111] border border-white/10 text-[#FF1493] text-[10px] tracking-[0.4em] uppercase font-bold rounded-full">
            <span className="badge-dot mr-2" />
            The Minds Behind SHEild
          </div>
          <h2 className="font-outfit font-black text-white leading-[1.1] tracking-tightest text-balance" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '20px' }}>
            Our Brilliant Team
          </h2>
        </div>

        {/* Mentor Section */}
        <div className="mb-20 flex justify-center" style={{ marginBottom: '60px' }}>
          <div className="team-card group relative w-48 h-[240px] bg-[#0a0a0a] border border-white/5 rounded-[24px] overflow-hidden hover:border-[#FF1493]/30 transition-all duration-500">
            <div className="h-full w-full p-6 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full border-2 border-[#FF1493]/20 p-1 mb-4 group-hover:scale-105 transition-transform duration-500">
                <div className="w-full h-full rounded-full bg-[#111] overflow-hidden flex items-center justify-center">
                  {mentor.image ? (
                    <img src={mentor.image} alt={mentor.name} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                  ) : (
                    <span className="text-2xl font-black text-white">{mentor.name.charAt(0)}</span>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{mentor.name}</h3>
              <p className="text-[#FF1493] text-[9px] tracking-widest uppercase font-bold mb-3">{mentor.role}</p>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-[#000]/90 translate-y-full group-hover:translate-y-0 transition-transform duration-500 flex items-center justify-center gap-6">
                <a href={mentor.linkedin} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Team Grid - Using flex with justify-center and larger gap for better spacing */}
        <div className="flex flex-wrap justify-center gap-12 max-w-7xl mx-auto px-4">
          {team.map((member) => (
            <div key={member.name} className="team-card group relative w-[240px] h-[240px] bg-[#0a0a0a] border border-white/5 rounded-[24px] overflow-hidden hover:border-[#FF1493]/30 transition-all duration-500">
              <div className="h-full w-full p-6 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl border border-white/10 p-1 mb-4 group-hover:scale-105 group-hover:border-[#FF1493]/30 transition-all duration-500">
                  <div className="w-full h-full rounded-2xl bg-[#111] overflow-hidden flex items-center justify-center">
                    {member.image ? (
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                      <span className="text-xl font-black text-white/50">{member.name.split(' ').map(n => n[0]).join('')}</span>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{member.name}</h3>
                <p className="text-white/40 text-[9px] tracking-widest uppercase font-bold mb-3">{member.role}</p>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-[#000]/90 translate-y-full group-hover:translate-y-0 transition-transform duration-500 flex items-center justify-center gap-6">
                  <a href={member.github} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                  </a>
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
