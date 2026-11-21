/* Clinica Dentară Lumina 3D — interacțiuni, scroll fluid (Lenis) și animații (GSAP + ScrollTrigger) */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mobileMQ = matchMedia('(max-width: 899px)');
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const animate = hasGsap && !reduce;
  const S = window.toothState;
  const root = document.documentElement;
  let lenis = null;

  $('#year').textContent = new Date().getFullYear();
  const fmt = n => Math.round(n).toLocaleString('ro-RO');

  /* ================= UI independent de GSAP ================= */

  // Nav + FAB + meniu mobil
  const nav = $('#nav'), burger = $('#burger'), drawer = $('#drawer'), fab = $('.fab');
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 24);
    fab.classList.toggle('is-visible', y > 700);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const setDrawer = open => {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Închide meniul' : 'Deschide meniul');
    if (lenis) open ? lenis.stop() : lenis.start();
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setDrawer(!drawer.classList.contains('is-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') setDrawer(false); });
  matchMedia('(min-width: 900px)').addEventListener('change', e => e.matches && setDrawer(false));

  // Linkuri ancoră (cu Lenis dacă există)
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    setDrawer(false);
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -64, duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) });
    else (target === 0 ? window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }) : target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));
  }));

  // Secțiunea curentă în meniu
  const links = $$('.nav__links a');
  const secObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) links.forEach(l => l.classList.toggle('is-current', l.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => secObs.observe(s));

  // Taburi prețuri
  const tabs = $$('.tab'), panels = $$('.panel');
  const showTab = tab => {
    const next = $('#' + tab.getAttribute('aria-controls'));
    const current = panels.find(p => !p.hidden);
    if (current === next) return;
    tabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    const swap = () => {
      if (current) current.hidden = true;
      next.hidden = false;
      if (animate) gsap.fromTo($$('li', next), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, stagger: .06, ease: 'power3.out', overwrite: true });
      if (hasGsap) ScrollTrigger.refresh();
    };
    if (animate && current) gsap.to($$('li', current), { opacity: 0, y: -8, duration: .2, stagger: .02, ease: 'power2.in', onComplete: swap });
    else swap();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showTab(t));
    t.addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!k) return;
      const n = tabs[(i + k + tabs.length) % tabs.length];
      n.focus(); showTab(n);
    });
  });
  $('#panel-prev').hidden = false;

  // Acordeon FAQ
  $$('.acc__btn').forEach(btn => btn.addEventListener('click', () => {
    const item = btn.closest('.acc__item');
    const open = btn.getAttribute('aria-expanded') === 'true';
    $$('.acc__item.is-open').forEach(i => {
      if (i !== item) { i.classList.remove('is-open'); $('.acc__btn', i).setAttribute('aria-expanded', 'false'); }
    });
    item.classList.toggle('is-open', !open);
    btn.setAttribute('aria-expanded', String(!open));
    if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 600);
  }));

  // Carusel recenzii
  const slides = $$('.slide'), dotsEl = $('#dots');
  let cur = 0, timer;
  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.className = 'dot-btn'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Recenzia ' + (i + 1));
    b.addEventListener('click', () => { go(i); restart(); });
    dotsEl.appendChild(b);
    return b;
  });
  const mark = () => dots.forEach((d, i) => d.setAttribute('aria-selected', String(i === cur)));
  const go = (n, dir = 1) => {
    const next = (n + slides.length) % slides.length;
    if (next === cur) return;
    const from = slides[cur], to = slides[next];
    cur = next; mark();
    if (animate) {
      gsap.killTweensOf([from, to]);
      to.classList.add('is-active');
      gsap.fromTo(to, { opacity: 0, x: 40 * dir }, { opacity: 1, x: 0, duration: .8, ease: 'power3.out' });
      gsap.to(from, { opacity: 0, x: -40 * dir, duration: .5, ease: 'power2.in', onComplete: () => from.classList.remove('is-active') });
    } else { from.classList.remove('is-active'); to.classList.add('is-active'); }
  };
  const restart = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => go(cur + 1), 7000); };
  $('#next').addEventListener('click', () => { go(cur + 1, 1); restart(); });
  $('#prev').addEventListener('click', () => { go(cur - 1, -1); restart(); });
  const slider = $('.slider');
  ['mouseenter', 'focusin'].forEach(ev => slider.addEventListener(ev, () => clearInterval(timer)));
  ['mouseleave', 'focusout'].forEach(ev => slider.addEventListener(ev, restart));
  mark(); restart();

  // Formular
  const form = $('#form');
  $('#date').min = new Date().toISOString().split('T')[0];
  const setErr = (input, msg) => {
    const field = input.closest('.field');
    if (field) { field.classList.toggle('has-error', !!msg); $('.err', field).textContent = msg; }
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#name'), phone = $('#phone'), gdpr = $('#gdpr');
    const nameOk = name.value.trim().split(/\s+/).filter(Boolean).length >= 2;
    setErr(name, nameOk ? '' : 'Te rugăm să introduci numele și prenumele.');
    const d = phone.value.replace(/[\s.\-()]/g, '');
    const phoneOk = /^(\+40|0040|0)7\d{8}$/.test(d) || /^(\+40|0)[23]\d{8}$/.test(d);
    setErr(phone, phoneOk ? '' : 'Introdu un număr valid, de ex. 0721 000 000.');
    $('#gdpr-err').textContent = gdpr.checked ? '' : 'Este necesar acordul pentru a te putea contacta.';
    if (!(nameOk && phoneOk && gdpr.checked)) { ($('.has-error input', form) || gdpr).focus(); return; }
    const box = $('#success');
    box.hidden = false; box.classList.add('is-shown');
    if (animate) gsap.from(box, { opacity: 0, y: 20, duration: .6, ease: 'power3.out' });
    form.reset();
  });
  $$('input', form).forEach(i => i.addEventListener('input', () => setErr(i, '')));

  /* ================= Fără GSAP: degradare elegantă ================= */
  const finishLoader = () => { $('#loader').style.display = 'none'; document.body.classList.remove('is-loading'); };
  if (!hasGsap) {
    finishLoader();
    $$('[data-count]').forEach(c => c.textContent = fmt(+c.dataset.count) + (c.dataset.suffix || ''));
    S.s = 1.1;
    addEventListener('scroll', () => { $('#gl').style.opacity = scrollY < innerHeight * .8 ? 1 : 0; }, { passive: true });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ================= Scroll fluid (Lenis) ================= */
  if (animate && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on('scroll', e => { ScrollTrigger.update(); S.vel = e.velocity; });
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();                       // pornește după loader
  }

  /* ================= Poza dintelui 3D per secțiune ================= */
  const poseSecs = $$('main [data-pose]');
  const spacer = $('.hero__space');
  let introDone = false, currentSec = poseSecs[0];

  const heroY = () => {                 // pe mobil: dintele stă în spațiul rezervat din hero
    const r = spacer.getBoundingClientRect();
    const c = r.top + scrollY + r.height / 2;
    return -((c - innerHeight / 2) / (innerHeight / 2));
  };
  const parsePose = sec => {
    const raw = (mobileMQ.matches && sec.dataset.poseM) ? sec.dataset.poseM : sec.dataset.pose;
    const [x, y, s] = raw.split(',').map(parseFloat);
    return { x, y: (sec.id === 'top' && mobileMQ.matches) ? heroY() : y, s };
  };
  const applyPose = (sec, opts = {}) => {
    currentSec = sec;
    if (!introDone) return;
    const p = parsePose(sec);
    const idx = poseSecs.indexOf(sec);
    gsap.to(S, {
      x: p.x, y: p.y, s: p.s, ry: 0.35 + idx * 0.85,
      duration: reduce ? 0 : (opts.duration || 1.5),
      ease: opts.ease || 'power3.inOut', overwrite: 'auto'
    });
  };
  poseSecs.forEach(sec => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onEnter: () => applyPose(sec), onEnterBack: () => applyPose(sec)
    });
  });
  addEventListener('resize', () => applyPose(currentSec, { duration: .4 }));

  // Culoarea de fundal trece lin între secțiuni
  $$('main [data-bg]').forEach(sec => {
    const bg = sec.dataset.bg;
    const to = () => gsap.to(document.body, { backgroundColor: bg, duration: reduce ? 0 : .9, ease: 'power2.out', overwrite: 'auto' });
    ScrollTrigger.create({ trigger: sec, start: 'top 72%', end: 'bottom 72%', onEnter: to, onEnterBack: to });
  });

  /* ================= Intro: loader → hero ================= */
  const startIntro = () => {
    finishLoader();
    introDone = true;
    if (lenis) lenis.start();
    if (!animate) {
      applyPose(currentSec);
      return;
    }
    applyPose(currentSec, { duration: 2.2, ease: 'expo.out' });
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .to('.hero h1 .word > span', { yPercent: 0, duration: 1.3, stagger: .06 })
      .to('[data-hero="fade"]', { opacity: 1, y: 0, duration: 1, stagger: .1 }, '-=.9')
      .from('.nav', { yPercent: -100, opacity: 0, duration: 1 }, '-=1');
  };

  /* ================= Reduced motion: totul static ================= */
  if (!animate) {
    $$('[data-count]').forEach(c => c.textContent = fmt(+c.dataset.count) + (c.dataset.suffix || ''));
    ScrollTrigger.sort();
    startIntro();
    return;
  }

  /* ================= Animații ================= */

  // Titluri împărțite pe cuvinte
  const split = el => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'word';
          const i = document.createElement('span'); i.textContent = part;
          w.appendChild(i); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    el.setAttribute('aria-label', el.textContent.trim());
    walk(el);
    $$('.word', el).forEach(w => w.setAttribute('aria-hidden', 'true'));
  };
  $$('[data-split]').forEach(split);
  gsap.set('.hero h1 .word > span', { yPercent: 120 });
  gsap.set('[data-hero="fade"]', { opacity: 0, y: 24 });

  $$('[data-split]').forEach(h => {
    if (h.closest('.hero')) return;
    gsap.from($$('.word > span', h), {
      yPercent: 120, rotate: 4, duration: 1.1, stagger: .045, ease: 'power4.out',
      scrollTrigger: { trigger: h, start: 'top 88%', once: true }
    });
  });

  // Reveal-uri: tranziții diferite între secțiuni
  const variants = { up: { y: 40 }, left: { x: 80 }, right: { x: -80 }, scale: { scale: .94, y: 20 } };
  $$('[data-reveal]').forEach(el => {
    const v = variants[el.dataset.reveal] || variants.up;
    gsap.from(el, { opacity: 0, ...v, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  $$('[data-stagger]').forEach(group => {
    gsap.from($$(':scope > *', group), {
      opacity: 0, y: 40, duration: .9, stagger: .1, ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 88%', once: true }
    });
  });

  // Contoare
  $$('[data-count]').forEach(c => {
    const end = +c.dataset.count, suf = c.dataset.suffix || '', o = { v: 0 };
    ScrollTrigger.create({
      trigger: c, start: 'top 92%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power2.out', onUpdate: () => { c.textContent = fmt(o.v) + suf; } })
    });
  });

  // Progres
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { scrub: .3, start: 0, end: 'max' } });

  // Hero: textul se estompează și urcă la ieșire; mesh-ul se mișcă
  gsap.to('.hero__stack', { y: -90, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__mesh', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // Marquee: viteza depinde de scroll
  const mq = gsap.to('.marquee__track', { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
  let dir = 1;
  gsap.ticker.add(() => {
    const v = S.vel || 0;
    if (Math.abs(v) > .4) dir = v > 0 ? 1 : -1;
    const target = dir * (1 + Math.min(Math.abs(v), 24) * .35);
    mq.timeScale(mq.timeScale() + (target - mq.timeScale()) * .08);
    S.vel *= .92;
  });

  // Servicii: scroll orizontal pe desktop (fixat în pagină)
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const sec = $('.hscroll'), track = $('.hscroll__track');
    root.classList.add('hpin');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    // cardurile se înclină ușor în funcție de poziție
    $$('.card', track).forEach(card => {
      gsap.fromTo(card, { rotateY: 12, y: 26, transformPerspective: 1200 }, {
        rotateY: -12, y: -26, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 100%', end: 'right 0%', scrub: true }
      });
    });
    return () => root.classList.remove('hpin');
  });
  mm.add('(max-width: 899px)', () => {
    $$('.hscroll .card').forEach(card => {
      gsap.from(card, { opacity: 0, y: 50, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 90%', once: true } });
    });
  });

  // Proces: linia se desenează, pașii se aprind, dintele se rotește
  gsap.to('.steps__line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 65%', end: 'bottom 65%', scrub: .4 } });
  $$('.step').forEach(step => {
    ScrollTrigger.create({ trigger: step, start: 'top 65%', toggleClass: { targets: step, className: 'is-on' } });
    gsap.from($$('h3, p', step), { opacity: 0, x: 28, duration: .9, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: step, start: 'top 88%', once: true } });
  });
  gsap.to(S, { extra: Math.PI * 2, ease: 'none', scrollTrigger: { trigger: '.process', start: 'top 60%', end: 'bottom 60%', scrub: .6 } });

  // Cursor personalizat + butoane magnetice (doar cu mouse)
  if (finePointer) {
    const cursor = $('.cursor');
    root.classList.add('has-cursor');
    const cx = gsap.quickTo(cursor, 'x', { duration: .35, ease: 'power3' });
    const cy = gsap.quickTo(cursor, 'y', { duration: .35, ease: 'power3' });
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('a, button, [data-cursor], input, select, textarea');
      cursor.classList.toggle('is-link', !!t);
      const label = e.target.closest('[data-cursor]');
      cursor.dataset.label = label ? label.dataset.cursor : '';
      cursor.classList.toggle('has-label', !!label);
    });
    $$('[data-magnetic]').forEach(b => {
      const xTo = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' });
      const yTo = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * .25);
        yTo((e.clientY - (r.top + r.height / 2)) * .35);
      });
      b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  ScrollTrigger.sort();

  /* ================= Pornește loader-ul ================= */
  const n = $('#loaderN'), c = { v: 0 };
  let started = false;
  const go2 = () => { if (started) return; started = true; startIntro(); };
  gsap.to(c, {
    v: 100, duration: 1.3, ease: 'power2.inOut',
    onUpdate: () => { n.textContent = Math.round(c.v); },
    onComplete: () => {
      gsap.to('.loader', { yPercent: -100, duration: .9, ease: 'power4.inOut', onStart: go2 });
    }
  });
  gsap.to('.loader__bar i', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' });
  setTimeout(go2, 5000);                // plasă de siguranță
  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
