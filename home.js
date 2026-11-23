/* Laadpagina → Beginpagina → Landingspagina */
(function () {

  var telefoon = document.getElementById('phone');
  var statusbalk = document.getElementById('statusbar');
  var homebalk = document.querySelector('.homebar');
  var klok = document.getElementById('klok');

  var laadpagina = document.getElementById('laadpagina');
  var beginpagina = document.getElementById('beginpagina');
  var beginKnop = document.getElementById('begin-knop');
  var app = document.getElementById('app-virus');

  var terugknop = document.getElementById('terug');
  var titel = document.getElementById('titel');
  var huidige = 'p-menu';

  var titels = {
    'p-menu': '',
    'p-dashboard': 'Dashboard',
    'p-statistiek': 'Statistieken',
    'p-voorspelling': 'Voorspelling',
    'p-sim': 'Simulatie',
    'p-virus': 'Wat is een virus?',
    'p-pandemie': 'Pandemieën',
    'p-vaccin': 'Vaccins',
    'p-bigdata': 'Big Data',
    'p-over': 'Over deze app'
  };

  /* ---------- Klok in de statusbalk ---------- */
  function toonTijd() {
    klok.textContent = new Date().toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  toonTijd();
  setInterval(toonTijd, 20000);

  var appbody = document.querySelector('.appbody');

  /* ---------- Laadpagina → Beginpagina ---------- */
  function toonBeginpagina() {
    laadpagina.classList.add('verberg');
    beginpagina.hidden = false;
    // force reflow zodat de animatie opnieuw start
    void beginpagina.offsetWidth;
    beginpagina.classList.add('toon');
    // laadpagina helemaal verbergen na de overgang
    setTimeout(function () {
      laadpagina.hidden = true;
    }, 600);
  }

  var autostart = new URLSearchParams(window.location.search).get('autostart') === '1';

  if (autostart) {
    laadpagina.classList.add('verberg');
    laadpagina.hidden = true;
    beginpagina.classList.remove('toon');
    beginpagina.hidden = true;
    app.classList.add('open');
    app.setAttribute('aria-hidden', 'false');
    statusbalk.classList.add('in-app');
    homebalk.classList.add('in-app');
  } else {
    // Na ~2,2 seconden van laadpagina naar beginpagina
    setTimeout(toonBeginpagina, 2200);
  }

  /* ---------- Beginpagina → Landingspagina ---------- */
  function openApp() {
    beginpagina.classList.remove('toon');
    setTimeout(function () {
      beginpagina.hidden = true;
    }, 500);

    app.classList.add('open');
    app.setAttribute('aria-hidden', 'false');
    statusbalk.classList.add('in-app');
    homebalk.classList.add('in-app');
    toonPagina('p-menu');
  }

  beginKnop.addEventListener('click', openApp);

  /* ---------- Pagina's binnen VirusSim ---------- */
  function toonPagina(id) {
    // Simulatie pauzeren als je de simulatiepagina verlaat
    if (huidige === 'p-sim' && id !== 'p-sim') {
      document.dispatchEvent(new Event('app-gesloten'));
    }

    document.querySelectorAll('.page').forEach(function (p) {
      p.hidden = (p.id !== id);
    });

    terugknop.hidden = (id === 'p-menu');
    titel.textContent = titels[id] || '';
    if (appbody) appbody.scrollTop = 0;
    huidige = id;

    /* Tabbalk bijwerken: Kaart = menu/kaartweergave */
    document.querySelectorAll('.tabbar .tab').forEach(function (tab) {
      var actief = tab.dataset.tab === id;
      tab.classList.toggle('is-actief', actief);
      if (actief) {
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.removeAttribute('aria-current');
      }
    });

    document.dispatchEvent(new CustomEvent('pagina-gewijzigd', { detail: { id: id } }));

    // Landingspagina-animatie of pagina-entree opnieuw starten
    if (id === 'p-menu') {
      var menu = document.getElementById('p-menu');
      menu.classList.remove('animeer');
      void menu.offsetWidth;
      menu.classList.add('animeer');
      // Elke menu-item krijgt zijn eigen vertraging (werkt met elk aantal items)
      menu.querySelectorAll('.menuitem').forEach(function (item, i) {
        item.style.animationDelay = (0.16 + i * 0.05) + 's';
      });
    } else {
      var doel = document.getElementById(id);
      if (doel) {
        doel.classList.remove('page-enter');
        void doel.offsetWidth;
        doel.classList.add('page-enter');
      }
    }
  }

  if (autostart) {
    toonPagina('p-menu');
  }

  document.querySelectorAll('.menuitem').forEach(function (knop) {
    knop.addEventListener('click', function () {
      toonPagina(knop.dataset.page);
    });
  });

  /* Tabbalk onderin: Kaart, Dashboard, Statistiek, Voorspelling */
  document.querySelectorAll('.tabbar .tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      toonPagina(tab.dataset.tab);
    });
  });

  terugknop.addEventListener('click', function () {
    toonPagina('p-menu');
  });

  /* ---------- App sluiten → terug naar beginpagina ---------- */
  function sluit() {
    app.classList.remove('open');
    app.setAttribute('aria-hidden', 'true');
    statusbalk.classList.remove('in-app');
    homebalk.classList.remove('in-app');

    // Terug naar het menu (pauzeert ook de simulatie)
    toonPagina('p-menu');
    document.dispatchEvent(new Event('app-gesloten'));

    // Beginpagina opnieuw tonen
    beginpagina.hidden = false;
    void beginpagina.offsetWidth;
    beginpagina.classList.add('toon');
  }

  document.getElementById('homeknop').addEventListener('click', sluit);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (huidige !== 'p-menu') {
        toonPagina('p-menu');
      } else if (app.classList.contains('open')) {
        sluit();
      }
    }
  });

})();
