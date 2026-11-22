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

  // Na ~2,2 seconden van laadpagina naar beginpagina
  setTimeout(toonBeginpagina, 2200);

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
    titel.textContent = titels[id];
    app.scrollTop = 0;
    huidige = id;

    // Landingspagina-animatie opnieuw starten telkens als het menu getoond wordt
    if (id === 'p-menu') {
      var menu = document.getElementById('p-menu');
      menu.classList.remove('animeer');
      void menu.offsetWidth;
      menu.classList.add('animeer');
    }
  }

  document.querySelectorAll('.menuitem').forEach(function (knop) {
    knop.addEventListener('click', function () {
      toonPagina(knop.dataset.page);
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
