export default function Footer() {
  const cols = [
    {
      heading: 'Product',
      links: ['Features', 'Interface', 'Download'],
    },
    {
      heading: 'Security',
      links: ['Privacy Policy', 'Encryption', 'Native Mode'],
    },
    {
      heading: 'Company',
      links: ['About Us', 'Contact Us', 'Affiliates'],
    },
    {
      heading: 'Resources',
      links: ['Help Center', 'Support', 'Terms'],
    },
  ];

  const socials = [
    <path key="fb" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
    <path key="tw" d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />,
    <><rect key="ig1" x="2" y="2" width="20" height="20" rx="5" ry="5" /><path key="ig2" d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /></>,
    <><path key="li1" d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4V9h4v2" /><rect key="li2" x="2" y="9" width="4" height="12" /><circle key="li3" cx="4" cy="4" r="2" /></>,
    <path key="gh" d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />,
  ];

  return (
    <footer className="w-full relative overflow-hidden mt-[300px]">
      {/* Subtle glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#FF1493]/4 blur-[100px] rounded-full pointer-events-none" />

      {/* Top hairline */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ── Main container, strictly centered ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 48px 0' }} className="relative z-10">

        {/* Top row: logo left, links right */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '80px', flexWrap: 'wrap' }}>

          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="font-outfit font-black tracking-tighter uppercase" style={{ fontSize: '42px', lineHeight: 1 }}>
              <span className="text-white">SHE</span>
              <span className="bg-gradient-to-r from-[#FF1493] to-[#c0156f] bg-clip-text text-transparent">ILD</span>
            </span>
            <span style={{ fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,20,147,0.6)', display: 'block' }}>
              A Women Safety App
            </span>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.28)', lineHeight: 1.8, marginTop: '8px', maxWidth: '200px' }}>
              Real-time safety for every woman, everywhere.
            </p>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
            {cols.map((col) => (
              <div key={col.heading} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h4 style={{ fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 800, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                  {col.heading}
                </h4>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, color: 'rgba(255,255,255,0.28)', textDecoration: 'none', transition: 'color 0.3s' }}
                        onMouseEnter={e => e.target.style.color = '#FF1493'}
                        onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.28)'}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent)', margin: '60px 0' }} />

        {/* Bottom: socials + copyright centered */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', paddingBottom: '60px' }}>

          <div style={{ display: 'flex', gap: '14px' }}>
            {socials.map((icon, i) => (
              <button
                key={i}
                style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.3s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,20,147,0.6)'; e.currentTarget.style.background = 'rgba(255,20,147,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {icon}
                </svg>
              </button>
            ))}
          </div>

          <p style={{ fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', margin: 0 }}>
            © {new Date().getFullYear()} SHEild · All rights reserved
          </p>
        </div>

      </div>
    </footer>
  );
}
