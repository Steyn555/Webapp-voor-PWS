/* Beginscherm: apps openen en sluiten */
(function () {

  var telefoon = document.getElementById('phone');
  var statusbalk = document.getElementById('statusbar');
  var homebalk = document.querySelector('.homebar');
  var klok = document.getElementById('klok');
  var openApp = null;

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
    document.getElementById('app-virus').scrollTop = 0;
    huidige = id;
  }

  document.querySelectorAll('.menuitem').forEach(function (knop) {
    knop.addEventListener('click', function () {
      toonPagina(knop.dataset.page);
    });
  });

  terugknop.addEventListener('click', function () {
    toonPagina('p-menu');
  });

  /* ---------- Klok in de statusbalk ---------- */
  function toonTijd() {
    klok.textContent = new Date().toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  toonTijd();
  setInterval(toonTijd, 20000);

  /* ---------- App openen ---------- */
  function open(id, icoon) {
    var app = document.getElementById(id);
    var tel = telefoon.getBoundingClientRect();
    var ico = icoon.getBoundingClientRect();

    // De app groeit vanaf de plek van het icoon
    app.style.transformOrigin =
      (ico.left + ico.width / 2 - tel.left) + 'px ' +
      (ico.top + ico.height / 2 - tel.top) + 'px';

    app.classList.add('open');
    app.setAttribute('aria-hidden', 'false');
    statusbalk.classList.add('in-app');
    homebalk.classList.add('in-app');
    openApp = app;
  }

  /* ---------- App sluiten ---------- */
  function sluit() {
    if (!openApp) return;

    openApp.classList.remove('open');
    openApp.setAttribute('aria-hidden', 'true');
    statusbalk.classList.remove('in-app');
    homebalk.classList.remove('in-app');
    openApp = null;

    // Terug naar het menu (pauzeert ook de simulatie)
    toonPagina('p-menu');
    document.dispatchEvent(new Event('app-gesloten'));
  }

  /* ---------- Knoppen ---------- */
  document.querySelectorAll('.appicon').forEach(function (knop) {
    knop.addEventListener('click', function () {
      open(knop.dataset.app, knop);
    });
  });

  document.getElementById('homeknop').addEventListener('click', sluit);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') sluit();
  });

})();