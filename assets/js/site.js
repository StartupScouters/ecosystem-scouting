/* Shared behaviour for all pages: wires config values into the page
   and draws the decorative starfield. No dependencies. */
(function () {
  var CONFIG = window.SCOUTING_CONFIG || {};

  // Contact e-mail links
  document.querySelectorAll('[data-contact-email]').forEach(function (a) {
    if (CONFIG.contactEmail) {
      a.setAttribute('href', 'mailto:' + CONFIG.contactEmail);
      if (a.hasAttribute('data-show-address')) a.textContent = CONFIG.contactEmail;
    }
  });

  // Response time and year
  document.querySelectorAll('[data-response-days]').forEach(function (el) {
    if (CONFIG.responseDays) el.textContent = CONFIG.responseDays;
  });
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Starfield (deterministic so the layout is stable across reloads)
  var host = document.getElementById('stars');
  if (host && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 170; i++) {
      var r = rnd(), size = r > 0.9 ? 3 : (r > 0.5 ? 2 : 1);
      var el = document.createElement('span');
      el.className = 'star';
      el.style.cssText = 'left:' + (rnd() * 100).toFixed(2) + '%;top:' + (rnd() * 100).toFixed(2) + '%;width:' + size + 'px;height:' + size + 'px;background:' + (rnd() > 0.7 ? '#C9A2FF' : '#FFFFFF') + ';animation-duration:' + (2.4 + rnd() * 5).toFixed(2) + 's;animation-delay:' + (-rnd() * 8).toFixed(2) + 's';
      frag.appendChild(el);
    }
    host.appendChild(frag);
  }
})();
