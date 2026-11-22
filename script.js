(function () {

  /* ---------- Instellingen van de simulatie ---------- */
  var BREEDTE = 600;
  var HOOGTE = 340;
  var STRAAL = 5;          // grootte van een persoon
  var DAG = 30;            // aantal beeldjes (frames) per dag

  // Toestanden van een persoon
  var GEZOND = 0;
  var BESMET = 1;
  var HERSTELD = 2;
  var GEVACCINEERD = 3;
  var OVERLEDEN = 4;

  /* ---------- Elementen opzoeken ---------- */
  var $ = function (id) { return document.getElementById(id); };

  var simCanvas = $('sim');
  var sim = simCanvas.getContext('2d');

  var chartCanvas = $('chart');
  var chart = chartCanvas.getContext('2d');

  var sliders = ['N', 'P', 'T', 'A', 'V', 'M'];

  // Hoe de waarde naast elke schuifbalk getoond wordt
  var weergave = {
    N: function (v) { return v; },
    P: function (v) { return v + '%'; },
    T: function (v) { return v; },
    A: function (v) { return v + '%'; },
    V: function (v) { return v + '%'; },
    M: function (v) { return v + '%'; }
  };

  /* ---------- Toestand van de simulatie ---------- */
  var mensen = [];
  var geschiedenis = [];   // per dag: aantal mensen per toestand
  var frame = 0;
  var loopt = false;
  var piek = 0;
  var klaar = false;

  /* ---------- Schuifbalken ---------- */
  function toonWaarden() {
    sliders.forEach(function (k) {
      $('o' + k).textContent = weergave[k]($(k).value);
    });
  }

  sliders.forEach(function (k) {
    $(k).addEventListener('input', toonWaarden);
  });

  toonWaarden();

  /* ---------- Hulpfuncties ---------- */
  function kleur(naam) {
    var waarde = getComputedStyle(document.documentElement).getPropertyValue(naam).trim();
    return waarde || '#888';
  }

  function telMensen() {
    var tel = [0, 0, 0, 0, 0];
    mensen.forEach(function (p) { tel[p.status]++; });
    return tel;
  }

  /* ---------- Opnieuw beginnen ---------- */
  function reset() {
    var aantal = +$('N').value;
    var thuisblijvers = +$('A').value / 100;
    var gevaccineerd = +$('V').value / 100;

    mensen = [];
    geschiedenis = [];
    frame = 0;
    piek = 0;
    klaar = false;

    for (var i = 0; i < aantal; i++) {
      var staatStil = Math.random() < thuisblijvers;
      var hoek = Math.random() * Math.PI * 2;
      var snelheid = staatStil ? 0 : 0.8 + Math.random() * 0.8;

      mensen.push({
        x: STRAAL + Math.random() * (BREEDTE - 2 * STRAAL),
        y: STRAAL + Math.random() * (HOOGTE - 2 * STRAAL),
        vx: Math.cos(hoek) * snelheid,
        vy: Math.sin(hoek) * snelheid,
        status: Math.random() < gevaccineerd ? GEVACCINEERD : GEZOND,
        ziekDagen: 0       // hoe lang deze persoon al besmet is (in frames)
      });
    }

    // Maak één gezond persoon besmet
    var eerste = mensen.findIndex(function (p) { return p.status === GEZOND; });
    if (eerste < 0) eerste = 0;
    mensen[eerste].status = BESMET;

    geschiedenis.push(telMensen());
    tekenAlles();
    toonCijfers();
    $('res').textContent = 'Simulatie loopt...';
  }

  /* ---------- Eén stap in de simulatie ---------- */
  function stap() {
    var ziekteduur = +$('T').value * DAG;
    var kans = +$('P').value / 100;
    var sterfte = +$('M').value / 100;

    // 1. Iedereen beweegt, en zieke mensen worden langzaam beter
    mensen.forEach(function (p) {
      if (p.status === OVERLEDEN) return;

      p.x += p.vx;
      p.y += p.vy;

      // Stuiteren tegen de rand
      if (p.x < STRAAL || p.x > BREEDTE - STRAAL) p.vx *= -1;
      if (p.y < STRAAL || p.y > HOOGTE - STRAAL) p.vy *= -1;
      p.x = Math.max(STRAAL, Math.min(BREEDTE - STRAAL, p.x));
      p.y = Math.max(STRAAL, Math.min(HOOGTE - STRAAL, p.y));

      if (p.status === BESMET) {
        p.ziekDagen++;
        if (p.ziekDagen > ziekteduur) {
          p.status = Math.random() < sterfte ? OVERLEDEN : HERSTELD;
        }
      }
    });

    // 2. Besmette mensen kunnen gezonde mensen in de buurt besmetten
    var afstand2 = (STRAAL * 2.4) * (STRAAL * 2.4);

    for (var i = 0; i < mensen.length; i++) {
      var a = mensen[i];
      if (a.status !== BESMET) continue;

      for (var j = 0; j < mensen.length; j++) {
        var b = mensen[j];
        if (b.status !== GEZOND) continue;

        var dx = a.x - b.x;
        var dy = a.y - b.y;

        if (dx * dx + dy * dy < afstand2 && Math.random() < kans * 0.08) {
          b.status = BESMET;
          b.ziekDagen = 0;
        }
      }
    }

    // 3. Elke dag onthouden we de aantallen voor de grafiek
    frame++;
    if (frame % DAG === 0) {
      geschiedenis.push(telMensen());
    }
  }

  /* ---------- Tekenen ---------- */
  function tekenAlles() {
    var kleuren = [
      kleur('--gezond'),
      kleur('--besmet'),
      kleur('--hersteld'),
      kleur('--vaccin'),
      kleur('--overleden')
    ];

    sim.clearRect(0, 0, BREEDTE, HOOGTE);

    mensen.forEach(function (p) {
      sim.beginPath();
      sim.arc(p.x, p.y, STRAAL, 0, Math.PI * 2);
      sim.fillStyle = kleuren[p.status];
      sim.globalAlpha = p.status === OVERLEDEN ? 0.35 : 1;
      sim.fill();

      // Zachte gloed om besmette mensen
      if (p.status === BESMET) {
        sim.globalAlpha = 0.25;
        sim.beginPath();
        sim.arc(p.x, p.y, STRAAL * 2, 0, Math.PI * 2);
        sim.fill();
      }
    });

    sim.globalAlpha = 1;
    tekenGrafiek(kleuren);
  }

  function tekenGrafiek(kleuren) {
    var breedte = 600;
    var hoogte = 150;
    var totaal = mensen.length || 1;
    var punten = Math.max(geschiedenis.length, 40);

    // Volgorde van onder naar boven: besmet eerst, dan de rest
    var volgorde = [BESMET, GEZOND, HERSTELD, GEVACCINEERD, OVERLEDEN];
    var onder = geschiedenis.map(function () { return 0; });

    chart.clearRect(0, 0, breedte, hoogte);

    volgorde.forEach(function (status) {
      var boven = geschiedenis.map(function (dag, i) {
        return onder[i] + dag[status];
      });

      chart.beginPath();

      // Bovenrand van dit vlak (van links naar rechts)
      geschiedenis.forEach(function (dag, i) {
        var x = i / (punten - 1) * breedte;
        var y = hoogte - boven[i] / totaal * hoogte;
        if (i === 0) chart.moveTo(x, y);
        else chart.lineTo(x, y);
      });

      // Onderrand van dit vlak (van rechts naar links)
      for (var i = geschiedenis.length - 1; i >= 0; i--) {
        chart.lineTo(i / (punten - 1) * breedte, hoogte - onder[i] / totaal * hoogte);
      }

      chart.closePath();
      chart.fillStyle = kleuren[status];
      chart.globalAlpha = status === BESMET ? 1 : 0.45;
      chart.fill();

      onder = boven;
    });

    chart.globalAlpha = 1;
  }

  /* ---------- Cijfers en eindresultaat ---------- */
  function toonCijfers() {
    var tel = telMensen();

    $('nS').textContent = tel[GEZOND];
    $('nI').textContent = tel[BESMET];
    $('nR').textContent = tel[HERSTELD];
    $('nV').textContent = tel[GEVACCINEERD];
    $('nD').textContent = tel[OVERLEDEN];
    $('day').textContent = Math.floor(frame / DAG);

    if (tel[BESMET] > piek) piek = tel[BESMET];

    // Niemand meer besmet: de epidemie is voorbij
    if (tel[BESMET] === 0 && !klaar && frame > 0) {
      klaar = true;
      loopt = false;

      var aantal = mensen.length;
      var ziek = aantal - tel[GEZOND] - tel[GEVACCINEERD];

      $('res').textContent =
        'Klaar na ' + Math.floor(frame / DAG) + ' dagen. ' +
        'Piek: ' + piek + ' tegelijk besmet. ' +
        'In totaal werd ' + Math.round(ziek / aantal * 100) + '% van de mensen ziek, ' +
        tel[OVERLEDEN] + ' overleden.';
    }
  }

  /* ---------- Hoofdlus ---------- */
  function lus() {
    if (loopt) {
      stap();
      stap();
      if (frame % 2 === 0) {
        tekenAlles();
        toonCijfers();
      }
    }
    requestAnimationFrame(lus);
  }

  /* ---------- Knoppen ---------- */
  $('go').addEventListener('click', function () {
    reset();
    loopt = true;
    $('pause').textContent = 'Pauzeer';
  });

  $('pause').addEventListener('click', function () {
    if (klaar || !mensen.length) return;
    loopt = !loopt;
    this.textContent = loopt ? 'Pauzeer' : 'Verdergaan';
  });

  // Voorbeelden: geen maatregelen, afstand houden, vaccinatie
  var voorbeelden = [
    { P: 60, A: 0,  V: 0  },
    { P: 60, A: 70, V: 0  },
    { P: 60, A: 0,  V: 80 }
  ];

  document.querySelectorAll('.presets button').forEach(function (knop) {
    knop.addEventListener('click', function () {
      var v = voorbeelden[+knop.dataset.p];
      Object.keys(v).forEach(function (k) { $(k).value = v[k]; });
      toonWaarden();
      reset();
      loopt = true;
    });
  });

  /* ---------- Pauzeren als de app sluit ---------- */
  document.addEventListener('app-gesloten', function () {
    if (loopt) {
      loopt = false;
      $('pause').textContent = 'Verdergaan';
    }
  });

  /* ---------- Start ---------- */
  reset();
  $('res').textContent = 'Druk op Start of kies een voorbeeld.';
  loopt = false;
  lus();

})();