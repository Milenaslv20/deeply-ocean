/* ==========================================================================
   PARALLAX DE PROFUNDIDADE (EIXO Z) — visão geral
   --------------------------------------------------------------------------
   1. Cada .zone tem uma posição FIXA no eixo Z (--z), definida no CSS.
      Quanto mais negativo, mais "longe" ela começa.
   2. O scroll do usuário NÃO move a página — ele só atualiza um número,
      `target`, que representa o quanto já "viajamos" para frente.
   3. A cada frame, suavizamos esse número (`eased`) e aplicamos
      translateZ(eased) no contêiner #world. Como o CSS soma translateZ
      aninhados, a posição final de cada zona em relação à câmera vira
      (z da zona + eased). Quando esse total passa por perto de 0, a
      zona está "na frente da câmera": grande, nítida e opaca. Longe
      disso, ela encolhe e desaparece — é o que cria o efeito de vídeo/
      túnel em vez de uma rolagem comum.
   ========================================================================== */

  const SPACING   = 1200;                 // distância entre cada zona (px)
  const PERSPECT  = 2400;                 // deve bater com o CSS "perspective"
  const FADE_DIST = SPACING * 0.9;        // a que distância uma zona já sumiu

  const zones = Array.from(document.querySelectorAll('.zone'));
  const zValues = zones.map(z => parseFloat(getComputedStyle(z).getPropertyValue('--z')) ||
                                  parseFloat(z.style.getPropertyValue('--z')));
  const maxScroll = (zones.length - 1) * SPACING;

  const world    = document.getElementById('world');
  const backdrop = document.getElementById('backdrop');
  const hint     = document.getElementById('hint');
  const track    = document.getElementById('progress-track');
  const langSwitcher = document.getElementById('language-switcher');
  const langToggle = document.getElementById('lang-toggle');
  const langOptions = Array.from(document.querySelectorAll('.lang-option'));

  const translations = {
    pt: {
      hint: 'role para entrar',
      title: 'Descida',
      'depth-0': '0 metros',
      'depth-1': '200 metros',
      'depth-2': '1.000 metros',
      'depth-3': '4.000 metros',
      'depth-4': '6.000 – 11.000 metros',
      'title-0': 'Descida',
      'title-1': 'Zona crepuscular',
      'title-2': 'Zona da meia-noite',
      'title-3': 'Planície abissal',
      'title-4': 'A fossa',
      'copy-0': 'Role a tela (mouse, trackpad ou dedo). Em vez de mover a página pra cima ou pra baixo, você vai voando para dentro dela — cada cena fica parada numa distância diferente no eixo Z.',
      'copy-1': 'A luz do sol já não chega aqui em quantidade suficiente para a fotossíntese. A bioluminescência começa a substituir o sol como principal fonte de luz.',
      'copy-2': 'Escuridão total. A pressão já é centenas de vezes maior que na superfície — e ainda assim a vida persiste, só que mais lenta e mais estranha.',
      'copy-3': 'Um deserto de lama fria que cobre a maior parte do fundo oceânico do planeta. A temperatura mal passa de 2°C.',
      'copy-4': 'No ponto mais fundo do oceano, a pressão é mais de mil vezes maior que na superfície.',
      'end-signature': '— fim da descida —'
    },
    en: {
      hint: 'scroll to enter',
      title: 'Descent',
      'depth-0': '0 meters',
      'depth-1': '200 meters',
      'depth-2': '1,000 meters',
      'depth-3': '4,000 meters',
      'depth-4': '6,000 – 11,000 meters',
      'title-0': 'Descent',
      'title-1': 'Twilight zone',
      'title-2': 'Midnight zone',
      'title-3': 'Abyssal plain',
      'title-4': 'The trench',
      'copy-0': 'Scroll the screen (mouse, trackpad or finger). Instead of moving the page up or down, you are flying inside it — each scene stays fixed at a different depth on the Z axis.',
      'copy-1': 'Sunlight no longer reaches here in sufficient quantity for photosynthesis. Bioluminescence begins to replace the sun as the main source of light.',
      'copy-2': 'Total darkness. Pressure is already hundreds of times greater than at the surface — and yet life persists, only slower and stranger.',
      'copy-3': 'A cold mud desert covering most of the ocean floor. The temperature barely rises above 2°C.',
      'copy-4': 'At the deepest point of the ocean, the pressure is more than a thousand times greater than at the surface.',
      'end-signature': '— end of the descent —'
    }
  };

  let currentLang = 'pt';

  function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    document.title = lang === 'en' ? 'Deeply Ocean' : 'Oceano Profundo';

    const entries = document.querySelectorAll('[data-i18n]');
    entries.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key]) {
        el.textContent = translations[lang][key];
      }
    });

    langOptions.forEach(button => {
      const active = button.dataset.lang === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });

    if (lang === 'en') {
      langToggle.setAttribute('aria-label', 'Select language');
    } else {
      langToggle.setAttribute('aria-label', 'Selecionar idioma');
    }
  }

  langToggle.addEventListener('click', () => {
    langSwitcher.classList.toggle('open');
    const isOpen = langSwitcher.classList.contains('open');
    langToggle.setAttribute('aria-expanded', String(isOpen));
  });

  langOptions.forEach(option => {
    option.addEventListener('click', () => {
      applyLanguage(option.dataset.lang);
      langSwitcher.classList.remove('open');
      langToggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (event) => {
    if (!langSwitcher.contains(event.target)) {
      langSwitcher.classList.remove('open');
      langToggle.setAttribute('aria-expanded', 'false');
    }
  });

  applyLanguage(currentLang);

  // cor de fundo que fica mais escura conforme a profundidade aumenta
  const stops = ['#BFEFF5', '#2E6E92', '#123C5C', '#0B2138', '#01040A'];

  function lerpColor(hexA, hexB, t){
    const a = hexA.match(/\w\w/g).map(h => parseInt(h, 16));
    const b = hexB.match(/\w\w/g).map(h => parseInt(h, 16));
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }

  // pontos de navegação, um por zona — clicar leva direto até ela
  zones.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot';
    dot.setAttribute('aria-label', 'Ir para a zona ' + (i + 1));
    dot.addEventListener('mousedown', e => e.preventDefault());
    dot.addEventListener('click', () => { target = i * SPACING; });
    track.appendChild(dot);
  });
  const dots = Array.from(track.children);

  // bolhinhas decorativas + atmosfera cinematográfica
  zones.forEach(zone => {
    const mist = document.createElement('div');
    mist.className = 'mist';
    zone.appendChild(mist);

    const starfield = document.createElement('div');
    starfield.className = 'starfield';
    zone.appendChild(starfield);

    const count = 6 + Math.floor(Math.random() * 5);
    for(let i = 0; i < count; i++){
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 3 + Math.random() * 8;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.opacity = 0.2 + Math.random() * 0.4;
      p.style.animationDelay = (Math.random() * 5) + 's';
      zone.appendChild(p);
    }
  });

  let target = 0;   // valor "cru", atualizado direto pelo input do usuário
  let eased  = 0;   // valor suavizado, usado de fato no render
  let lastEased = 0;
  let started = false;

  function clampTarget(){
    target = Math.max(0, Math.min(maxScroll, target));
  }

  // ---- entradas: roda do mouse -------------------------------------------
  window.addEventListener('wheel', e => {
    e.preventDefault();
    target += e.deltaY * 1.15;
    clampTarget();
    markStarted();
  }, { passive: false });

  // ---- entradas: toque (celular / trackpad touch) ------------------------
  let touchY = null;
  window.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: false });
  window.addEventListener('touchmove', e => {
    e.preventDefault();
    if(touchY === null) return;
    const y = e.touches[0].clientY;
    target += (touchY - y) * 3;
    touchY = y;
    clampTarget();
    markStarted();
  }, { passive: false });

  // ---- entradas: teclado (acessibilidade) --------------------------------
  window.addEventListener('keydown', e => {
    const step = SPACING * 0.35;
    if(['ArrowDown','PageDown',' '].includes(e.key)) target += step;
    else if(['ArrowUp','PageUp'].includes(e.key)) target -= step;
    else if(e.key === 'Home') target = 0;
    else if(e.key === 'End') target = maxScroll;
    else return;
    e.preventDefault();
    clampTarget();
    markStarted();
  });

  function markStarted(){
    if(!started){ started = true; hint.style.opacity = '0'; }
  }

  // ---- loop de render: suaviza o movimento e aplica os transforms -------
  function render(){
    eased += (target - eased) * 0.08;         // easing (inércia suave)

    world.style.transform = `translateZ(${eased}px)`;

    zones.forEach((zone, i) => {
      const effectiveZ = zValues[i] + eased;   // posição final relativa à câmera
      const distance = Math.abs(effectiveZ);
      const opacity = Math.max(0, 1 - distance / FADE_DIST);
      zone.style.opacity = opacity.toFixed(3);
      zone.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none';
    });

    // realça o ponto de navegação mais próximo da cena atual
    const activeIndex = Math.round(eased / SPACING);
    dots.forEach((d, i) => d.classList.toggle('active', i === activeIndex));

    // interpola a cor de fundo conforme o progresso
    const progress = eased / maxScroll;                 // 0 → 1
    const scaled = progress * (stops.length - 1);
    const idx = Math.min(stops.length - 2, Math.floor(scaled));
    const localT = scaled - idx;
    backdrop.style.background =
      `radial-gradient(circle at 50% 50%, ${lerpColor(stops[idx], stops[idx + 1], localT)}, #01040A 140%)`;

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
