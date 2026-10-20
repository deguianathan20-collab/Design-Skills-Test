(() => {
  const root = document.documentElement;
  // .motion is set in <head> unless the visitor prefers reduced motion.
  const motion = root.classList.contains('motion');
  root.classList.add('motion-live');

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const setIndex = (els) => els.forEach((el, i) => el.style.setProperty('--i', i));
  const liveRegion = $('[data-announcer]');
  const announce = (text) => { liveRegion.textContent = ''; requestAnimationFrame(() => { liveRegion.textContent = text; }); };

  const hero = $('.hero');

  /* =========================================================
     Hero intro: rack focus, header drop, typed headline and lede
     ========================================================= */

  // Wrap every character in a span (hidden until typed). Words stay unbreakable,
  // and a screen-reader copy of the full text sits alongside.
  function splitForTyping(el) {
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    const sr = Object.assign(document.createElement('span'), { className: 'sr-only', textContent: text });
    const layer = Object.assign(document.createElement('span'), { className: 'type-layer' });
    layer.setAttribute('aria-hidden', 'true');
    const chars = [];
    const addChar = (parent, c) => {
      const s = Object.assign(document.createElement('span'), { className: 'type-ch', textContent: c });
      parent.append(s);
      chars.push(s);
    };
    text.split(' ').forEach((word, i, words) => {
      const w = Object.assign(document.createElement('span'), { className: 'type-word' });
      for (const c of word) addChar(w, c);
      layer.append(w);
      if (i < words.length - 1) addChar(layer, ' ');
    });
    el.replaceChildren(sr, layer);
    el.classList.add('type-on');
    return { el, text, layer, chars };
  }

  // Reveal characters one by one with a little human irregularity.
  async function typeOut({ chars }, caret, { speed, jitter, space = 0, pause = 0, onProgress }) {
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      ch.classList.add('on');
      ch.after(caret);
      onProgress?.(i / (chars.length - 1));
      let delay = speed + Math.random() * jitter;
      if (ch.textContent === ' ') delay += space;
      if (/[.,!?]/.test(ch.textContent)) delay += pause;
      await wait(delay);
    }
  }

  // Swap the span soup back to plain text once typed, so selection and kerning are clean.
  const finishTyping = ({ el, text }) => { el.textContent = text; };

  async function heroIntro() {
    const title = $('.hero__title');
    const lede = $('.hero__lede');

    // Start the rack focus once the photo can actually paint.
    const photo = new Image();
    photo.src = 'assets/hero-bg.jpg';
    const decoded = photo.decode ? photo.decode().catch(() => {}) : new Promise((r) => { photo.onload = photo.onerror = r; });
    Promise.race([decoded, wait(2500)]).then(() => hero.classList.add('is-loaded'));
    hero.classList.add('is-intro');

    const t = splitForTyping(title);
    const l = splitForTyping(lede);
    const caret = Object.assign(document.createElement('span'), { className: 'caret is-blinking' });
    caret.setAttribute('aria-hidden', 'true');
    t.layer.firstChild.prepend(caret);

    await wait(700);                         // cursor blinks while the header settles
    caret.classList.remove('is-blinking');   // a typing cursor holds steady

    let ctaShown = false;
    await typeOut(t, caret, {
      speed: 38, jitter: 42, space: 30,
      onProgress: (p) => { if (!ctaShown && p > 0.6) { ctaShown = true; hero.classList.add('is-cta'); } },
    });
    finishTyping(t);
    setTimeout(() => hero.classList.add('is-card'), 200);

    l.layer.firstChild.prepend(caret);
    await wait(240);
    await typeOut(l, caret, { speed: 9, jitter: 10, pause: 140 });
    finishTyping(l);

    lede.append(caret);
    caret.classList.add('is-blinking');
    await wait(2600);
    caret.classList.add('is-out');
    await wait(500);
    caret.remove();
  }

  /* =========================================================
     Intro for the design assessment team. Shown once per browser session;
     the hero intro waits until it's dismissed so reviewers see it play.
     ========================================================= */
  const SEEN_KEY = 'camera-store:intro-seen';
  const session = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* private mode: show again next time */ } },
  };
  const introModal = $('[data-intro-modal]');
  const notesPill = $('[data-intro-open]');
  let heroStarted = false;
  const startHero = () => {
    if (heroStarted || !motion) return;
    heroStarted = true;
    heroIntro();
  };

  const openIntro = () => {
    if (introModal.open) return;
    introModal.showModal();
    root.classList.add('no-scroll');
    notesPill.hidden = true;
    requestAnimationFrame(() => requestAnimationFrame(() => introModal.classList.add('is-open')));
  };
  const closeIntro = async () => {
    if (!introModal.open || introModal.classList.contains('is-closing')) return;
    session.set(SEEN_KEY, '1');
    introModal.classList.add('is-closing');
    if (motion) await wait(320);
    notesPill.hidden = false;   // visible before close() so focus can return to it
    introModal.classList.remove('is-open', 'is-closing');
    introModal.close();
    root.classList.remove('no-scroll');
    startHero();
  };

  introModal.addEventListener('cancel', (e) => { e.preventDefault(); closeIntro(); });   // Escape
  introModal.addEventListener('click', (e) => { if (e.target === introModal) closeIntro(); });   // backdrop
  $$('[data-intro-close]', introModal).forEach((btn) => btn.addEventListener('click', closeIntro));
  notesPill.addEventListener('click', openIntro);

  // Reviewers whose system reduces motion get a one-click way to see the animations.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !root.classList.contains('motion-forced')) {
    $('[data-motion-note]', introModal).hidden = false;
    $('[data-motion-on]', introModal).addEventListener('click', () => {
      session.set(SEEN_KEY, '1');
      const url = new URL(location.href);
      url.searchParams.set('motion', 'on');
      location.href = url.href;
    });
  }

  if (session.get(SEEN_KEY)) {
    notesPill.hidden = false;
    startHero();
  } else {
    setTimeout(openIntro, motion ? 300 : 0);
  }

  /* =========================================================
     Scroll reveals: focus pull, rise, shutter
     ========================================================= */
  const countUp = (el) => {
    const match = el.textContent.trim().match(/^([\d.]+)(.*)$/);
    if (!match || !motion) return;
    const target = parseFloat(match[1]);
    const decimals = (match[1].split('.')[1] || '').length;
    const suffix = match[2];
    const start = performance.now();
    const duration = 1200;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = (0).toFixed(decimals) + suffix;
    setTimeout(() => requestAnimationFrame(tick), 250);
  };

  function initReveals() {
    const all = $$('[data-reveal]');
    if (!motion) { all.forEach((el) => el.classList.add('is-in', 'is-settled')); return; }

    const groups = $$('[data-reveal-group]');
    groups.forEach((g) => {
      const step = Number(g.dataset.revealStep) || 90;
      $$('[data-reveal]', g).forEach((el, i) => el.style.setProperty('--d', `${i * step}ms`));
    });

    // After the entrance, hand transitions back to the component (hover states etc.).
    const settle = (el) => {
      const delay = parseFloat(el.style.getPropertyValue('--d')) || 0;
      setTimeout(() => el.classList.add('is-settled'), delay + 1700);
    };
    const reveal = (els) => els.forEach((el) => {
      el.classList.add('is-in');
      settle(el);
      $$('[data-count]', el).forEach(countUp);
    });

    // What to watch -> what to reveal. A group reveals all its children together.
    // A shutter starts fully clipped (zero visible area), so watch its parent instead.
    const watch = new Map();
    groups.forEach((g) => watch.set(g, $$('[data-reveal]', g)));
    all.filter((el) => !el.closest('[data-reveal-group]')).forEach((el) => {
      const sentinel = el.dataset.reveal === 'shutter' ? el.parentElement : el;
      watch.set(sentinel, [...(watch.get(sentinel) || []), el]);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(watch.get(entry.target));
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

    watch.forEach((els, sentinel) => {
      // Anything already scrolled past (e.g. reload mid-page) appears at once.
      if (sentinel.getBoundingClientRect().bottom < 0) { reveal(els); return; }
      io.observe(sentinel);
    });
  }
  initReveals();

  /* =========================================================
     Parallax: hero photo and the large images drift slower than the page
     ========================================================= */
  function initParallax() {
    if (!motion) return;
    const heroPhoto = $('.hero__photo');
    const items = $$('[data-parallax]');
    let ticking = false;

    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      if (window.scrollY <= hero.offsetHeight) heroPhoto.style.translate = `0 ${(window.scrollY * 0.28).toFixed(1)}px`;
      for (const el of items) {
        const box = el.parentElement.getBoundingClientRect();
        if (box.bottom < -100 || box.top > vh + 100) continue;
        const p = (box.top + box.height / 2 - vh / 2) / (vh / 2 + box.height / 2);
        el.style.setProperty('--p', Math.max(-1, Math.min(1, p)).toFixed(3));
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }
  initParallax();

  /* =========================================================
     Hero photo: pause the slow drift off screen, and on desktop
     shift the photo slightly with the cursor, like a viewfinder.
     ========================================================= */
  function initHeroDrift() {
    if (!motion) return;
    const drift = $('.hero__drift');
    new IntersectionObserver(([entry]) => hero.classList.toggle('is-offscreen', !entry.isIntersecting)).observe(hero);

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1025px)');
    let targetX = 0, targetY = 0, x = 0, y = 0, frame = 0;
    const step = () => {
      x += (targetX - x) * 0.07;
      y += (targetY - y) * 0.07;
      drift.style.setProperty('--px', `${x.toFixed(2)}px`);
      drift.style.setProperty('--py', `${y.toFixed(2)}px`);
      const settled = Math.abs(targetX - x) < 0.05 && Math.abs(targetY - y) < 0.05;
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    const kick = () => { if (!frame) frame = requestAnimationFrame(step); };

    hero.addEventListener('pointermove', (e) => {
      if (!finePointer.matches || e.pointerType !== 'mouse') return;
      const box = hero.getBoundingClientRect();
      const max = Math.min(14, box.width * 0.008);   // stays inside the 6% overscan
      targetX = -((e.clientX - box.left) / box.width - 0.5) * 2 * max;
      targetY = -((e.clientY - box.top) / box.height - 0.5) * 2 * max * 0.7;
      kick();
    });
    hero.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; kick(); });
  }
  initHeroDrift();

  /* =========================================================
     Mega menu: hover on desktop, click and keyboard everywhere
     ========================================================= */
  const trigger = $('[data-mega-trigger]');
  const mega = $('[data-mega]');
  const canHover = window.matchMedia('(min-width: 1025px) and (hover: hover)');
  const typesList = $('.mega__types');
  const highlight = $('.type-highlight', typesList);
  const typeRows = $$('.mega-type', typesList);
  const activeRow = typeRows.find((r) => r.classList.contains('is-active')) || typeRows[0];
  let closeTimer;

  setIndex([...$$('.mega__types > li:not(.type-highlight)', mega), ...$$('.link-col', mega), ...$$('.mini-card', mega), $('.mega__footer', mega)]);

  // Measure the <li>: its stagger animation makes it the row's offsetParent, so row.offsetTop reads 0.
  const moveHighlight = (row, instant = false) => {
    if (instant) highlight.style.transition = 'none';
    highlight.style.setProperty('--y', `${row.parentElement.offsetTop}px`);
    highlight.style.setProperty('--h', `${row.offsetHeight}px`);
    if (instant) { highlight.offsetHeight; highlight.style.transition = ''; }
  };
  typeRows.forEach((row) => {
    row.addEventListener('mouseenter', () => moveHighlight(row));
    row.addEventListener('focus', () => moveHighlight(row));
  });
  typesList.addEventListener('mouseleave', () => moveHighlight(activeRow));

  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true';
  const setMega = (open) => {
    clearTimeout(closeTimer);
    if (open && !isOpen()) moveHighlight(activeRow, true);
    mega.toggleAttribute('data-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    // In the hero the photo dims; from the sticky bar the whole page dims instead.
    hero.classList.toggle('is-menu-open', open && !stuck);
    scrim.classList.toggle('is-on', open && stuck);
  };

  /* ---------- Sticky header: pins as a white bar once the hero header scrolls away ---------- */
  const siteHeader = $('.site-header');
  const scrim = $('[data-scrim]');
  let stuck = false;
  let stickAt = 0;

  // Measure while the header is in the page flow; the hero reserves that space when it pins.
  const measureHeader = () => {
    if (stuck) return;
    stickAt = siteHeader.offsetTop + siteHeader.offsetHeight;
    hero.style.setProperty('--header-space', `${siteHeader.offsetHeight}px`);
  };
  const setStuck = (on, animate = true) => {
    if (on === stuck) return;
    if (isOpen()) setMega(false);
    stuck = on;
    siteHeader.classList.toggle('no-anim', !animate);
    siteHeader.classList.toggle('is-stuck', on);
    hero.classList.toggle('has-stuck-header', on);
  };
  const updateStuck = (animate = true) => setStuck(window.scrollY > stickAt, animate);

  measureHeader();
  updateStuck(false);
  window.addEventListener('scroll', () => updateStuck(), { passive: true });
  window.addEventListener('resize', () => {
    // Header height changes between breakpoints: re-measure it in place, then re-pin without replaying the slide-in.
    setStuck(false, false);
    measureHeader();
    updateStuck(false);
  });
  document.fonts?.ready.then(() => { if (!stuck) measureHeader(); });

  [trigger, mega].forEach((el) => {
    el.addEventListener('mouseenter', () => { if (canHover.matches) setMega(true); });
    el.addEventListener('mouseleave', () => {
      if (canHover.matches) closeTimer = setTimeout(() => setMega(false), 180);
    });
  });
  // With a mouse, hover already opened it, so a click keeps it open; touch and keyboard toggle.
  trigger.addEventListener('click', () => setMega(canHover.matches ? true : !isOpen()));
  mega.addEventListener('focusout', (e) => {
    if (!mega.contains(e.relatedTarget) && e.relatedTarget !== trigger) setMega(false);
  });
  document.addEventListener('click', (e) => {
    if (isOpen() && !mega.contains(e.target) && !trigger.contains(e.target)) setMega(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { setMega(false); trigger.focus(); }
  });

  /* =========================================================
     Tablet and mobile drawer
     ========================================================= */
  const drawer = $('[data-drawer]');
  const menuToggle = $('.menu-toggle');
  let lastFocus = null;

  const setDrawer = (open, focusSearch = false) => {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    menuToggle.setAttribute('aria-expanded', String(open));
    root.classList.toggle('no-scroll', open);
    if (open) {
      lastFocus = document.activeElement;
      const target = focusSearch ? $('input', drawer) : $('.drawer__close', drawer);
      requestAnimationFrame(() => target.focus());
    } else if (lastFocus) {
      lastFocus.focus();
    }
  };

  $$('[data-drawer-open]').forEach((btn) => {
    btn.addEventListener('click', () => setDrawer(true, btn.hasAttribute('data-focus-search')));
  });
  $$('[data-drawer-close]', drawer).forEach((btn) => btn.addEventListener('click', () => setDrawer(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) setDrawer(false);
  });
  window.matchMedia('(min-width: 1025px)').addEventListener('change', (e) => {
    if (e.matches && drawer.classList.contains('is-open')) setDrawer(false);
  });

  /* =========================================================
     Product tabs: sliding indicator, arrow-key support, card reshuffle
     ========================================================= */
  const tabList = $('[role="tablist"]');
  const tabs = $$('[role="tab"]', tabList);
  const indicator = $('.tab-indicator', tabList);
  const track = $('#popular-track');
  const cards = $$('.product-card', track);
  let shuffling = false;

  const moveIndicator = (tab, instant = false) => {
    if (instant) indicator.style.transition = 'none';
    indicator.style.setProperty('--x', `${tab.offsetLeft}px`);
    indicator.style.setProperty('--w', `${tab.offsetWidth}px`);
    if (instant) { indicator.offsetHeight; indicator.style.transition = ''; }
  };
  const selectedTab = () => tabs.find((t) => t.getAttribute('aria-selected') === 'true');
  tabList.classList.add('has-indicator');
  moveIndicator(selectedTab(), true);
  document.fonts?.ready.then(() => moveIndicator(selectedTab(), true));
  window.addEventListener('resize', () => moveIndicator(selectedTab(), true));

  const relabelCards = () => {
    const label = selectedTab().textContent.trim();
    cards.forEach((c) => { $('.tag', c).textContent = label; });
  };

  async function reshuffle() {
    if (!motion) { relabelCards(); return; }
    if (shuffling) return;          // the running shuffle picks up the latest tab when it swaps
    shuffling = true;
    const out = cards.map((c, i) => c.animate(
      [{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: 'translateY(12px)', filter: 'blur(6px)' }],
      { duration: 200, delay: i * 35, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
    ));
    await Promise.all(out.map((a) => a.finished));
    relabelCards();
    track.scrollTo({ left: 0 });
    const back = cards.map((c, i) => c.animate(
      [{ opacity: 0, transform: 'translateY(18px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'none' }],
      { duration: 560, delay: i * 70, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' },
    ));
    await Promise.all(back.map((a) => a.finished));
    [...out, ...back].forEach((a) => a.cancel());
    shuffling = false;
  }

  const selectTab = (tab) => {
    if (tab === selectedTab()) return;
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    moveIndicator(tab);
    reshuffle();
  };
  tabList.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) selectTab(tab);
  });
  tabList.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const tab = tabs[(next + tabs.length) % tabs.length];
    tab.focus();
    selectTab(tab);
  });

  /* =========================================================
     Product carousel arrows
     ========================================================= */
  const prev = $('[data-carousel-prev]');
  const next = $('[data-carousel-next]');
  const step = () => cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
  const updateArrows = () => {
    if (track.scrollWidth <= track.clientWidth + 1) {
      // Nothing to scroll: keep the design's resting state.
      prev.dataset.live = 'false';
      next.dataset.live = 'true';
      return;
    }
    prev.dataset.live = String(track.scrollLeft > 4);
    next.dataset.live = String(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  };
  const behavior = motion ? 'smooth' : 'auto';
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior }));
  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();

  /* =========================================================
     Button confirmations: Add to Cart, Subscribe, Get a Quote
     ========================================================= */
  const CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="m10 15.17 9.19-9.19 1.41 1.42L10 18 3.64 11.64l1.41-1.42L10 15.17Z" fill="currentColor"/></svg>';

  const confirmButton = (btn, label, ms) => {
    btn.dataset.label ??= btn.textContent.trim();
    btn.style.minWidth = `${btn.offsetWidth}px`;       // keep the pill the same size while the label swaps
    btn.classList.add('is-done');
    btn.innerHTML = `<span class="btn__label">${CHECK}${label}</span>`;
    clearTimeout(btn._reset);
    btn._reset = setTimeout(() => {
      btn.classList.remove('is-done');
      btn.innerHTML = `<span class="btn__label">${btn.dataset.label}</span>`;
      setTimeout(() => { btn.style.minWidth = ''; }, 400);
    }, ms);
  };

  const shake = (el) => {
    if (!motion) return;
    el.animate(
      [{ transform: 'none' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(2px)' }, { transform: 'none' }],
      { duration: 420, easing: 'ease-out' },
    );
  };

  // Bag count, badge bump and toast
  const bag = $('[data-bag]');
  const badge = $('.badge', bag);
  const toast = $('[data-toast]');
  let bagCount = Number(badge.textContent) || 0;
  let toastTimer;

  const hideToast = () => toast.classList.remove('is-shown');
  const showToast = (name, src) => {
    $('.toast__name', toast).textContent = name;
    $('.toast__img', toast).src = src;
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 3200);
  };
  toast.addEventListener('mouseenter', () => clearTimeout(toastTimer));
  toast.addEventListener('mouseleave', () => { toastTimer = setTimeout(hideToast, 1600); });

  $$('[data-add-to-cart]').forEach((btn) => btn.addEventListener('click', () => {
    if (btn.classList.contains('is-done')) return;
    const card = btn.closest('.product-card');
    const name = $('.product-meta__name', card).textContent.trim();
    confirmButton(btn, 'Added', 1800);
    bagCount += 1;
    badge.textContent = bagCount;
    bag.setAttribute('aria-label', `Bag, ${bagCount} items`);
    badge.classList.remove('is-bump');
    void badge.offsetWidth;
    badge.classList.add('is-bump');
    showToast(name, $('.product-card__media img', card).currentSrc);
    announce(`${name} added to your bag. ${bagCount} items in your bag.`);
  }));

  // Forms on this mockup don't post anywhere.
  $$('form[action="#"]').forEach((form) => form.addEventListener('submit', (e) => e.preventDefault()));

  const tradeForm = $('[data-trade-form]');
  tradeForm.addEventListener('submit', () => {
    const input = $('input', tradeForm);
    if (!input.value.trim()) { shake(tradeForm); input.focus(); return; }
    confirmButton($('button', tradeForm), 'Request sent', 2400);
    announce(`Quote requested for ${input.value.trim()}. We'll email you within two minutes.`);
    input.value = '';
  });

  const subscribeForm = $('[data-subscribe-form]');
  const emailInput = $('input', subscribeForm);
  emailInput.addEventListener('invalid', () => shake($('.pill-field', subscribeForm)));
  subscribeForm.addEventListener('submit', () => {
    confirmButton($('button', subscribeForm), 'Subscribed', 2600);
    announce('Subscribed. Your first email arrives on Friday.');
    emailInput.value = '';
  });

  /* =========================================================
     Shorter placeholders on phones
     ========================================================= */
  const phone = window.matchMedia('(max-width: 640px)');
  const shortInputs = $$('[data-placeholder-short]');
  shortInputs.forEach((input) => { input.dataset.placeholderLong = input.placeholder; });
  const setPlaceholders = () => shortInputs.forEach((input) => {
    input.placeholder = phone.matches ? input.dataset.placeholderShort : input.dataset.placeholderLong;
  });
  phone.addEventListener('change', setPlaceholders);
  setPlaceholders();

  /* ---------- Review state: index.html?menu=open pins the mega menu open ---------- */
  if (new URLSearchParams(location.search).get('menu') === 'open') setMega(true);
})();
