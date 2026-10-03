import { useEffect } from 'react';
import { Link } from 'react-router-dom';

function Home() {
  useEffect(() => {
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Ripple on buttons (touch + mouse)
    const onBtnClick = (e) => {
      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX || rect.width / 2) - rect.left;
      const y = (e.clientY || rect.height / 2) - rect.top;
      const s = document.createElement('span');
      s.className = 'jh-ripple';
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      btn.appendChild(s);
      setTimeout(() => s.remove(), 650);
    };
    const btns = Array.from(document.querySelectorAll('.jh-page .jh-btn'));
    btns.forEach((b) => b.addEventListener('click', onBtnClick));

    // Tilt + orbs parallax — desktop pointer only
    let raf2 = 0;
    let cx = 0, cy = 0;
    const tiltCard = document.getElementById('jh-tiltCard');
    const floatingBadge = document.getElementById('jh-floatingBadge');
    const onTilt = (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      if (tiltCard) {
        tiltCard.style.transform = `rotateX(${ny * -12}deg) rotateY(${nx * 12}deg) translateZ(16px)`;
        if (floatingBadge) floatingBadge.style.transform = `translate(${nx * 22}px, ${ny * 22}px)`;
      }
      document.querySelectorAll('.jh-page .tilt-item').forEach((item) => {
        const rect = item.getBoundingClientRect();
        const ix = rect.left + rect.width / 2;
        const iy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - ix, e.clientY - iy);
        if (dist < 420) {
          const f = parseFloat(item.getAttribute('data-tilt') || '0.03');
          item.style.transform = `translate(${(e.clientX - ix) * f}px, ${(e.clientY - iy) * f}px)`;
        } else {
          item.style.transform = '';
        }
      });
    };
    const onOrbMouse = (e) => {
      cx = (e.clientX / window.innerWidth - 0.5) * 36;
      cy = (e.clientY / window.innerHeight - 0.5) * 36;
    };
    const animateOrbs = () => {
      const sy = window.pageYOffset;
      document.querySelectorAll('.jh-page .glow-orb').forEach((orb) => {
        const speed = parseFloat(orb.getAttribute('data-speed') || '0.08');
        const xf = parseFloat(orb.getAttribute('data-x') || '1');
        const yf = parseFloat(orb.getAttribute('data-y') || '1');
        orb.style.transform = `translate(${cx * xf}px, ${sy * speed * 1.2 + cy * yf}px)`;
      });
      raf2 = requestAnimationFrame(animateOrbs);
    };
    if (isFinePointer && !prefersReducedMotion) {
      window.addEventListener('mousemove', onTilt);
      window.addEventListener('mousemove', onOrbMouse);
      raf2 = requestAnimationFrame(animateOrbs);
    }

    // Vanta birds backgrounds (hero + testimonials + CTA) — desktop pointer only, loaded from CDN
    let vantaEffects = [];
    let vantaCancelled = false;
    const loadScript = (src) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });
    if (isFinePointer && !prefersReducedMotion) {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js')
        .then(() => loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.birds.min.js'))
        .then(() => {
          if (vantaCancelled) return;
          if (!window.VANTA) return;
          const targets = [
            { el: '#jh-hero', quantity: 4 },
            { el: '#jh-how', quantity: 3 },
            { el: '#jh-testimonials', quantity: 3 },
            { el: '#jh-cta-section', quantity: 3 },
          ];
          targets.forEach(({ el, quantity }) => {
            if (!document.querySelector(el)) return;
            try {
              vantaEffects.push(window.VANTA.BIRDS({
                el,
                mouseControls: true,
                touchControls: false,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                backgroundColor: 0xf8fafc,
                backgroundAlpha: 0,
                color1: 0x4338ca,
                color2: 0x6366f1,
                birdSize: 1.20,
                wingSpan: 24.00,
                quantity,
              }));
            } catch (e) { /* vanta unavailable — section renders normally */ }
          });
        })
        .catch(() => { /* CDN unreachable — hero renders normally */ });
    }

    // Hero scroll parallax — first section only, desktop pointer only
    const heroGrid = document.querySelector('.jh-page .jh-hero-grid');
    const heroDemo = document.querySelector('.jh-page .tilt-wrap');
    let ticking = false;
    const onHeroScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sy = window.pageYOffset;
        if (heroGrid && sy < window.innerHeight) {
          heroGrid.style.transform = `translateY(${sy * 0.06}px)`;
          if (heroDemo) heroDemo.style.transform = `translateY(${sy * 0.12}px)`;
        }
        ticking = false;
      });
    };
    if (isFinePointer && !prefersReducedMotion) {
      window.addEventListener('scroll', onHeroScroll, { passive: true });
    }

    // Reveal + counters + ring
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        entry.target.querySelectorAll('.jh-counter').forEach((counter) => {
          if (counter.dataset.done) return;
          counter.dataset.done = '1';
          const target = parseInt(counter.getAttribute('data-target') || '0', 10);
          const suffix = counter.getAttribute('data-suffix') || '';
          if (prefersReducedMotion) {
            counter.textContent = target.toLocaleString() + suffix;
            return;
          }
          let count = 0;
          const step = Math.max(1, target / 50);
          const tick = () => {
            count += step;
            if (count < target) {
              counter.textContent = Math.ceil(count).toLocaleString() + suffix;
              setTimeout(tick, 30);
            } else {
              counter.textContent = target.toLocaleString() + suffix;
            }
          };
          tick();
        });
        const ring = document.getElementById('jh-progressCircle');
        const pct = document.getElementById('jh-matchPct');
        if (ring && pct && !ring.classList.contains('animated')) {
          ring.classList.add('animated');
          ring.style.strokeDashoffset = '24';
          if (prefersReducedMotion) {
            pct.textContent = '91%';
          } else {
            let p = 0;
            const iv = setInterval(() => {
              p += 1;
              if (p >= 91) { p = 91; clearInterval(iv); }
              pct.textContent = `${p}%`;
            }, 15);
          }
        }
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.jh-page .reveal-on-scroll, .jh-page .jh-stats').forEach((el) => io.observe(el));

    return () => {
      cancelAnimationFrame(raf2);
      window.removeEventListener('mousemove', onTilt);
      window.removeEventListener('mousemove', onOrbMouse);
      window.removeEventListener('scroll', onHeroScroll);
      btns.forEach((b) => b.removeEventListener('click', onBtnClick));
      vantaCancelled = true;
      vantaEffects.forEach((fx) => { try { fx.destroy(); } catch (e) {} });
      vantaEffects = [];
      io.disconnect();
    };
  }, []);

  return (
    <div className="jh-page">
      <style>{`
        .jh-page{font-family:'Inter',sans-serif;background:#fff;color:#475569;line-height:1.6;overflow-x:hidden;position:relative;width:100%}
        .jh-page h1,.jh-page h2,.jh-page h3{font-family:'Sora',sans-serif;color:#0f172a}
        .jh-wrap{max-width:1200px;margin:0 auto;padding:0 32px;position:relative;z-index:2;width:100%}
        .glow-bg{position:fixed;top:0;left:0;width:100%;height:100vh;overflow:hidden;pointer-events:none;z-index:-1}
        .glow-orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:.75;will-change:transform}
        .orb-1{width:600px;height:600px;top:-150px;right:-150px;background:radial-gradient(circle,rgba(99,102,241,.35) 0%,rgba(79,70,229,.1) 70%)}
        .orb-2{width:700px;height:700px;top:25%;left:-250px;background:radial-gradient(circle,rgba(6,182,212,.25) 0%,rgba(5,150,105,.08) 70%)}
        .orb-3{width:550px;height:550px;top:60%;right:-100px;background:radial-gradient(circle,rgba(139,92,246,.3) 0%,rgba(99,102,241,.1) 70%)}
        .orb-4{width:650px;height:650px;bottom:-200px;left:10%;background:radial-gradient(circle,rgba(99,102,241,.25) 0%,rgba(6,182,212,.1) 70%)}
        .tilt-wrap{perspective:1000px;transform-style:preserve-3d}
        .jh-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:12px;font-weight:600;font-size:14.5px;cursor:pointer;border:1px solid transparent;transition:all .2s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden;text-decoration:none;white-space:nowrap}
        .jh-btn-primary{background:linear-gradient(135deg,#4338ca,#372abf);color:#fff;box-shadow:0 4px 14px rgba(67,56,202,.3),inset 0 1px 0 rgba(255,255,255,.2)}
        .jh-btn-primary:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 8px 25px rgba(67,56,202,.45)}
        .jh-btn-ghost{background:#f8fafc;color:#0f172a;border-color:#e2e8f0}
        .jh-btn-ghost:hover{background:#f1f5f9;transform:translateY(-1px)}
        .jh-btn-lg{padding:14px 28px;font-size:15.5px}
        .jh-btn-primary::after{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(60deg,transparent,rgba(255,255,255,.15),transparent);transform:rotate(30deg) translateX(-100%);transition:transform .7s ease}
        .jh-btn-primary:hover::after{transform:rotate(30deg) translateX(100%)}
        .jh-ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,.4);transform:scale(0);animation:jhRipple .6s linear;pointer-events:none;width:12px;height:12px}
        @keyframes jhRipple{to{transform:scale(4);opacity:0}}
        .jh-hero{padding:90px 0 110px;position:relative;overflow:hidden}
        .jh-hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:center}
        .jh-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(67,56,202,.08);border:1px solid rgba(67,56,202,.2);color:#4338ca;font-size:13px;font-weight:600;padding:6px 16px;border-radius:999px;margin-bottom:24px;max-width:100%}
        .jh-eyebrow .dot{width:6px;height:6px;border-radius:50%;background:#4338ca;box-shadow:0 0 8px #4338ca;flex-shrink:0}
        .jh-hero h1{font-size:clamp(32px,5vw,54px);line-height:1.1;font-weight:800;letter-spacing:-1px;margin-bottom:20px;word-wrap:break-word}
        .jh-hero h1 span{background:linear-gradient(135deg,#0f172a 20%,#4338ca 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
        .jh-lead{font-size:clamp(15px,2vw,17.5px);max-width:500px;margin-bottom:32px;line-height:1.7}
        .jh-actions{display:flex;gap:16px;align-items:center;margin-bottom:28px;flex-wrap:wrap}
        .jh-trust{display:flex;gap:20px;font-size:13.5px;color:#64748b;flex-wrap:wrap;row-gap:10px}
        .jh-demo-card{background:rgba(255,255,255,.9);backdrop-filter:blur(12px);border:1px solid #e2e8f0;border-radius:24px;padding:32px;box-shadow:0 20px 40px rgba(0,0,0,.06);transition:transform .1s ease-out,box-shadow .3s ease;transform-style:preserve-3d;max-width:100%}
        .jh-ring-row{display:flex;align-items:center;gap:24px;padding:16px 0 24px;border-bottom:1px dashed #e2e8f0;margin-bottom:20px;flex-wrap:wrap}
        .jh-ring{position:relative;width:104px;height:104px;flex-shrink:0}
        .jh-ring svg{transform:rotate(-90deg);filter:drop-shadow(0 4px 10px rgba(67,56,202,.15));width:100%;height:100%}
        .jh-pct{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .jh-criteria{display:flex;flex-direction:column;gap:10px}
        .jh-crow{display:flex;align-items:center;justify-content:space-between;font-size:13.5px;gap:10px;flex-wrap:wrap}
        .jh-crow:hover{transform:translateX(4px)}
        .jh-badge{display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:12px;padding:4px 10px;border-radius:8px;white-space:nowrap;flex-shrink:0}
        .jh-ok{background:rgba(5,150,105,.1);color:#059669;border:1px solid rgba(5,150,105,.25)}
        .jh-warn{background:rgba(217,119,6,.1);color:#d97706;border:1px solid rgba(217,119,6,.25)}
        .jh-stats{padding:60px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:rgba(248,250,252,.8)}
        .jh-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
        .jh-stat{background:rgba(255,255,255,.85);border:1px solid #e2e8f0;padding:20px;border-radius:16px;box-shadow:0 2px 4px rgba(0,0,0,.02);transition:all .3s;min-width:0}
        .jh-stat:hover{border-color:rgba(67,56,202,.4);transform:translateY(-6px);box-shadow:0 15px 35px rgba(67,56,202,.12)}
        .jh-stat{background:rgba(255,255,255,.85);border:1px solid #e2e8f0;padding:20px;border-radius:16px;box-shadow:0 2px 4px rgba(0,0,0,.02);transition:all .3s;min-width:0}
        .jh-stat:hover{border-color:rgba(67,56,202,.4);transform:translateY(-6px);box-shadow:0 15px 35px rgba(67,56,202,.12)}
        .jh-stat b{font-family:'Sora',sans-serif;font-size:clamp(22px,4vw,36px);font-weight:800;display:block;color:#0f172a;background:linear-gradient(135deg,#0f172a,#4338ca);-webkit-background-clip:text;background-clip:text;color:transparent;word-break:break-word}
        .jh-stat span{font-family:'Inter',sans-serif;font-size:13px;font-weight:500;color:#475569;display:block;margin-top:6px}
        .jh-section{padding:100px 0;position:relative}
        .jh-section.alt{background:rgba(248,250,252,.5)}
        .jh-head{max-width:600px;margin:0 auto 60px;text-align:center;padding:0 4px}
        .jh-head h2{font-size:clamp(26px,4vw,38px);line-height:1.25}
        .jh-tag{font-size:12.5px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px}
        .jh-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
        .jh-steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
        .jh-test-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
        .jh-test-card{background:rgba(255,255,255,.85);border:1px solid #e2e8f0;border-radius:20px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,.03);transition:all .3s;min-width:0}
        .jh-test-card:hover{border-color:rgba(67,56,202,.4);transform:translateY(-6px);box-shadow:0 20px 40px rgba(0,0,0,.08)}
        .jh-card{background:rgba(255,255,255,.85);border:1px solid #e2e8f0;border-radius:20px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,.03);display:flex;flex-direction:column;justify-content:space-between;transition:all .3s;min-width:0}
        .jh-card:hover{border-color:rgba(67,56,202,.4);transform:translateY(-6px);box-shadow:0 20px 40px rgba(67,56,202,.1)}
        .jh-cta{background:linear-gradient(135deg,rgba(248,250,252,.9),rgba(241,245,249,.9));border:1px solid #e2e8f0;border-radius:24px;padding:64px 56px;display:flex;align-items:center;justify-content:space-between;gap:40px;box-shadow:0 20px 50px rgba(0,0,0,.04);flex-wrap:wrap}
        .jh-cta h2{font-size:clamp(22px,4vw,32px);max-width:480px;line-height:1.3}
        #jh-hero canvas{position:absolute !important;top:0;left:0;z-index:0;pointer-events:none}
        #jh-hero .jh-wrap{position:relative;z-index:1}
        #jh-testimonials canvas,#jh-cta-section canvas,#jh-how canvas{position:absolute !important;top:0;left:0;z-index:0;pointer-events:none}
        #jh-testimonials .jh-wrap,#jh-cta-section .jh-wrap,#jh-how .jh-wrap{position:relative;z-index:1}
        .jh-cta-dark{background:linear-gradient(135deg,#1e1b4b,#4338ca);border-color:#3730a3;box-shadow:0 20px 50px rgba(67,56,202,.3)}
        .jh-cta-dark h2{color:#fff}
        .jh-cta-dark p{color:rgba(255,255,255,.75)}
        .reveal-on-scroll{opacity:0;transform:translateY(30px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
        .reveal-on-scroll.revealed{opacity:1;transform:translateY(0)}
        @media(max-width:1024px){.jh-wrap{padding:0 24px}.jh-grid3{grid-template-columns:repeat(2,1fr)}.jh-steps-grid,.jh-test-grid{grid-template-columns:repeat(3,1fr);gap:18px}.jh-stats{padding:48px 0}.jh-stats-grid{grid-template-columns:repeat(2,1fr);gap:18px}}
        @media(max-width:860px){.jh-grid3{grid-template-columns:1fr}.jh-steps-grid,.jh-test-grid{grid-template-columns:1fr}}
        @media(max-width:768px){
          .jh-wrap{padding:0 20px}.jh-hero{padding:40px 0 70px}.jh-hero-grid{grid-template-columns:1fr;gap:56px}
          .jh-float-badge{position:static !important;margin:16px 0 0 !important;width:100% !important;max-width:100% !important;justify-content:center}
          .jh-actions{flex-direction:column;align-items:stretch}.jh-actions .jh-btn{width:100%}
          .jh-trust{flex-direction:column;gap:10px}
          .jh-demo-card{padding:22px}.jh-stats-grid{grid-template-columns:repeat(2,1fr);gap:14px}
          .jh-grid3{grid-template-columns:1fr;gap:18px}.jh-section{padding:64px 0}
          .jh-cta{flex-direction:column;text-align:center;padding:40px 22px}
        }
        @media(max-width:480px){
          .jh-wrap{padding:0 16px}.jh-demo-card{padding:18px;border-radius:18px}
          .jh-ring{width:84px;height:84px}
        }
        @media(max-width:360px){.jh-hero h1{letter-spacing:-.5px}}
        @media(max-height:480px) and (orientation:landscape){.jh-hero{padding:28px 0 40px}}
        @media(min-width:1920px){.jh-wrap{max-width:1320px}}
        @media(prefers-reduced-motion:reduce){.reveal-on-scroll{opacity:1;transform:none}}
      `}</style>

      <div className="glow-bg">
        <div className="glow-orb orb-1" data-speed="0.08" data-x="1.2" data-y="1.5" />
        <div className="glow-orb orb-2" data-speed="-0.1" data-x="-1.5" data-y="1.2" />
        <div className="glow-orb orb-3" data-speed="0.06" data-x="1.1" data-y="-1.3" />
        <div className="glow-orb orb-4" data-speed="-0.09" data-x="-1.3" data-y="-1.1" />
      </div>

      <section className="jh-hero" id="jh-hero">
        <div className="jh-wrap jh-hero-grid">
          <div>
            <div className="jh-eyebrow"><span className="dot" /> 412 new notifications matched this week</div>
            <h1>Government job matching, <span>made simple.</span></h1>
            <p className="jh-lead">JobHexa is an elite matching engine for government jobs. Build one profile, and get scored against every live notification for qualification, age, category and state — automatically.</p>
            <div className="jh-actions">
              <Link className="jh-btn jh-btn-primary" style={{padding:'14px 28px',fontSize:'15.5px'}} to="/register">Start for free</Link>
              <Link className="jh-btn jh-btn-ghost" style={{padding:'14px 28px',fontSize:'15.5px'}} to="/jobs">See how it works</Link>
            </div>
            <div className="jh-trust">
              <span>✓ Free forever plan</span>
              <span>✓ No credit card required</span>
              <span>✓ Set up in 2 minutes</span>
            </div>
          </div>
          <div className="tilt-wrap" style={{perspective:1000}}>
            <div className="jh-demo-card" id="jh-tiltCard">
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
                <div>
                  <div style={{fontSize:'11.5px',color:'#4338ca',fontWeight:700}}>ELIGIBILITY CHECK</div>
                  <div style={{fontFamily:'Sora',fontSize:19,fontWeight:700}}>SSC CGL 2026</div>
                </div>
                <div className="jh-badge jh-ok">Eligible</div>
              </div>
              <div className="jh-ring-row">
                <div className="jh-ring">
                  <svg height="104" width="104" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" fill="none" r="42" stroke="#e2e8f0" strokeWidth="9" />
                    <circle id="jh-progressCircle" cx="50" cy="50" fill="none" r="42" stroke="#4338ca" strokeDasharray="264" strokeDashoffset="264" strokeLinecap="round" strokeWidth="9" />
                  </svg>
                  <div className="jh-pct" style={{position:'absolute',top:0,left:0,right:0,bottom:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                    <b id="jh-matchPct" style={{fontSize:25,fontWeight:800}}>0%</b><span style={{fontSize:11}}>match</span>
                  </div>
                </div>
                <div style={{fontSize:14,flex:1,minWidth:180}}>Matched on <b>qualification</b>, <b>age</b> and <b>category</b>. One item needs attention.</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10,fontSize:'13.5px'}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><span>Qualification — Bachelor&apos;s degree</span><span className="jh-badge jh-ok">✓ Met</span></div>
                <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><span>Age — 27, within 18–32 (OBC +3)</span><span className="jh-badge jh-ok">✓ Met</span></div>
                <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><span>Category relaxation — OBC applied</span><span className="jh-badge jh-ok">✓ Met</span></div>
                <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><span>State domicile — confirm required</span><span className="jh-badge" style={{background:'rgba(217,119,6,.1)',color:'#d97706'}}>Check</span></div>
              </div>
              <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',fontSize:'11.5px',color:'#64748b',flexWrap:'wrap',gap:6,fontFamily:"'JetBrains Mono',monospace"}}>
                <span>REF: SSC-CGL-2026-0417</span><span>Last date: 12 Sep 2026</span>
              </div>
            </div>
            <div id="jh-floatingBadge" className="jh-float-badge" style={{position:'absolute',top:'100%',marginTop:16,left:24,right:24,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'12px 18px',fontSize:13,fontWeight:600,width:'fit-content',maxWidth:'calc(100% - 48px)'}}>Match logged · just now</div>
          </div>
        </div>
      </section>

      <section className="jh-stats reveal-on-scroll">
        <div className="jh-wrap jh-stats-grid">
          {[
            {v:18240,s:'+',l:'Notifications tracked'},
            {v:96500,s:'+',l:'Eligibility checks run'},
            {v:4100,s:'+',l:'Deadline reminders sent'},
            {v:28,s:'',l:'States and UTs covered'},
          ].map((x)=>(
            <div key={x.l} className="jh-stat tilt-item" data-tilt="0.05">
              <b className="jh-counter" data-target={x.v} data-suffix={x.s}>0</b>
              <span>{x.l}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="jh-section">
        <div className="jh-wrap">
          <div className="jh-head">
            <div className="jh-tag">FEATURES</div>
            <h2>Everything you need, in one place</h2>
            <p>From matching to deadlines to plain-language summaries — one platform for the whole process.</p>
          </div>
          <div className="jh-grid3">
            {[
              ['◎','Eligibility matching','Qualification, age, category and domicile checked against every notification.','SSC CGL — Eligible','/jobs'],
              ['✉','Deadline reminders','Emails at 7, 3 and 1 day before deadline, and on the last day.','3 days left','/notifications'],
              ['▤','Application tracker','Saved, Applied, Admit Card, Exam Given, Result Checked.','5 stages','/applications'],
              ['✦','AI notification summaries','Long PDFs turned into plain-language summaries.','PDF → summary','/chat'],
              ['☰','Search and filters','Filter by state, department, exam type or deadline.','28 states','/jobs'],
              ['◈','Ask the assistant','Answers on syllabus, fee, age limits for any notification.','Ask anything →','/chat'],
            ].map(([icon,t,d,c,link])=>(
              <Link key={t} to={link} className="jh-card tilt-item" data-tilt="0.03" style={{textDecoration:'none'}}>
                <div>
                  <div style={{width:48,height:48,borderRadius:14,background:'rgba(67,56,202,.08)',color:'#4338ca',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24,fontSize:20}}>{icon}</div>
                  <h3 style={{fontSize:18,marginBottom:10}}>{t}</h3>
                  <p style={{fontSize:'14.5px',marginBottom:20}}>{d}</p>
                </div>
                <span style={{fontSize:'12.5px',fontWeight:600,background:'#f8fafc',border:'1px solid #e2e8f0',padding:'6px 12px',borderRadius:10,width:'fit-content'}}>{c}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="jh-section alt" id="jh-how">
        <div className="jh-wrap">
          <div className="jh-head">
            <div className="jh-tag">HOW IT WORKS</div>
            <h2>Live in under 2 minutes</h2>
          </div>
          <div className="jh-steps-grid">
            {[['1','Create your profile','Qualification, DOB, state, category and exam types.'],['2','Get matched automatically','Every notification scored the moment it is published.'],['3','Track it to the result','Save, apply, get reminded before every deadline.']].map(([n,t,d])=>(
              <div key={n} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'36px 32px'}}>
                <div style={{width:44,height:44,background:'linear-gradient(135deg,#4338ca,#372abf)',color:'#fff',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24,fontWeight:800}}>{n}</div>
                <h3 style={{fontSize:19,marginBottom:12}}>{t}</h3>
                <p style={{fontSize:15}}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="jh-section alt reveal-on-scroll" id="jh-testimonials">
        <div className="jh-wrap">
          <div className="jh-head">
            <div className="jh-tag">TESTIMONIALS</div>
            <h2>Built for people, not just filters</h2>
          </div>
          <div className="jh-test-grid">
            {[
              ['"I used to check six different websites every morning. Now I get one email when something actually matches me."','AR','Ananya R.','B.Com graduate, Uttar Pradesh'],
              ['"The eligibility breakdown is what sold me — it told me exactly why I wasn\'t eligible for one exam instead of just hiding it."','SK','Sandeep K.','Engineering graduate, Bihar'],
              ['"Missed a deadline once because I forgot to check a site. Haven\'t missed one since switching to JobHexa\'s reminders."','PM','Pooja M.','B.Sc graduate, Maharashtra'],
            ].map(([q,initials,n,r])=>(
              <div key={n} className="jh-test-card tilt-item" data-tilt="0.03">
                <p style={{fontSize:15,color:'#0f172a',lineHeight:1.7,marginBottom:24}}>{q}</p>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:42,height:42,borderRadius:'50%',background:'rgba(67,56,202,.1)',border:'1px solid rgba(67,56,202,.3)',color:'#4338ca',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0}}>{initials}</div>
                  <div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{n}</div><div style={{fontSize:13,color:'#64748b'}}>{r}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="jh-section" id="jh-cta-section">
        <div className="jh-wrap">
          <div className="jh-cta jh-cta-dark">
            <div>
              <h2>Stop checking ten websites for one notification.</h2>
              <p>Free to join. Your data is used only to match you to jobs.</p>
            </div>
            <Link className="jh-btn jh-btn-primary jh-btn-lg" to="/register">Start for free</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
