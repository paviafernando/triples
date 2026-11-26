/* Triples — reemplaza los emojis de la interfaz por los íconos dibujados (assets/ui) */
'use strict';
(function () {
  var M = {
    '🎯': 'practica', '🏆': 'concurso', '🐣': 'facil', '🏀': 'normal', '🔥': 'pro', '👆': 'deslizar', '🏹': 't_gomera', '⏱️': 'medidor', '⏱': 'medidor',
    '📱': 'simulacion', '⚙️': 'opciones', '⚙': 'opciones', '👑': 'princesa', '🔊': 'sonido', '🔇': 'mudo', '🤐': 'mudo', '🏟️': 'publico', '🏟': 'publico',
    '🎶': 'musica', '🎵': 'musica', '🗣️': 'voz', '🗣': 'voz', '🏠': 'inicio', '⏸️': 'pausa', '⏸': 'pausa', '⛶': 'pantalla', '🔄': 'rotar', '🪙': 'moneda',
    '🏅': 'medalla', '🤖': 'robot', '➕': 'nuevo', '✏️': 'editar', '✏': 'editar', '⭐': 'estrella', '💰': 'money', '🔒': 'candado', '✔': 'ok', '✓': 'ok',
    '▶️': 'jugar', '▶': 'jugar', '↩': 'volver', '🖐️': 't_rack', '🌊': 't_swish5', '🥉': 't_c20', '🥈': 't_c25', '🥇': 't_c30',
    '🦄': 'a_unicornio', '🐱': 'a_gato', '🐶': 'a_perro', '🦊': 'a_zorro', '🐼': 'a_panda', '🐸': 'a_rana', '🦁': 'a_leon', '🐵': 'a_mono',
    '🐧': 'a_pinguino', '🐰': 'a_conejo', '🐯': 'a_tigre', '🐻': 'a_oso', '🐨': 'a_koala', '🐙': 'a_pulpo', '🦖': 'a_dino', '🐝': 'a_abeja'
  };
  var keys = Object.keys(M).sort(function (a, b) { return b.length - a.length; });
  var RE = new RegExp('(' + keys.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')️?', 'g');
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, OPTION: 1, TITLE: 1, CANVAS: 1 };
  window.ICON = function (k) { return '/assets/ui/' + k + '.webp'; };
  function swap(node) {
    var t = node.nodeValue;
    if (t && window.LANG === 'en' && !node.__en) { var tt = T(t); node.__en = 1; if (tt !== t) { node.nodeValue = tt; t = tt; } }
    RE.lastIndex = 0; if (!t || !RE.test(t)) return;
    var p = node.parentNode; if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[data-noicon]'))) return;
    var frag = document.createDocumentFragment(), last = 0; RE.lastIndex = 0; var m;
    while ((m = RE.exec(t))) {
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      var k = M[m[1]] || M[m[1].replace('️', '')], img = document.createElement('img');
      img.src = ICON(k); img.alt = m[0]; img.draggable = false; img.className = k.indexOf('a_') === 0 ? 'ic ia' : 'ic';
      frag.appendChild(img); last = RE.lastIndex;
    }
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    p.replaceChild(frag, node);
  }
  function walk(root) {
    if (root.nodeType === 3) { swap(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false), list = [], n;
    while ((n = w.nextNode())) list.push(n);
    list.forEach(swap);
  }
  var busy = false;
  new MutationObserver(function (ms) {
    if (busy) return; busy = true;
    ms.forEach(function (m) { if (m.type === 'characterData') swap(m.target); else for (var i = 0; i < m.addedNodes.length; i++) walk(m.addedNodes[i]); });
    busy = false;
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  walk(document.body);
  if (window.LANG === 'en') { var ph = document.querySelectorAll('[placeholder],[title]'); for (var i = 0; i < ph.length; i++) { if (ph[i].placeholder) ph[i].placeholder = T(ph[i].placeholder); if (ph[i].title) ph[i].title = T(ph[i].title); } }
  // pelotas dibujadas para la cancha
  var BALLS = window.BALL_IMGS = {};
  ['pelota', 'pelota_money', 'pelota_arcoiris', 'pelota_fuego', 'pelota_oro'].forEach(function (k) { var im = new Image(); im.onload = function () { BALLS[k] = im; }; im.src = ICON(k); });
})();
