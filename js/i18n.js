/* Triples — idioma (es / en). Los textos están escritos en castellano; en inglés se traducen al vuelo. */
'use strict';
var LANG = (function () { try { return JSON.parse(localStorage.getItem('triples-v1')).prefs.lang || 'es'; } catch (e) { return (navigator.language || 'es').slice(0, 2) === 'en' ? 'en' : 'es'; } })();
document.documentElement.lang = LANG;
var EN = [
  // frases largas primero (se ordenan solas por largo)
  ['5 racks contra reloj. La última de cada rack es la money ball (vale 2).', '5 racks against the clock. The last ball of each rack is the money ball (worth 2).'],
  ['Elegí la posición y tirá todo lo que quieras. Rack perfecto = festejo.', 'Pick a spot and shoot all you want. Perfect rack = celebration.'],
  ['Tocá para sumar o sacar · con el celu se suman solos', 'Tap to add or remove · phones join by themselves'],
  ['Tocá un jugador para cambiarle el nombre, reiniciarlo o borrarlo', 'Tap a player to rename, reset or delete'],
  ['¡Creá tu jugador para empezar!', 'Create your player to start!'],
  ['Escaneá el QR o entrá a', 'Scan the QR or go to'],
  [': cada celu es un jugador y puede tirar deslizando o en', ': every phone is a player and can shoot by flicking or in'],
  ['modo simulación', 'simulation mode'],
  ['La money ball (la última de cada rack) es la blanca, azul y roja y vale 2.', 'The money ball (last of each rack) is the red, white and blue one and is worth 2.'],
  ['En modo princesa la money ball es un arcoíris', 'In princess mode the money ball is a rainbow'],
  ['Tirá con un latigazo hacia arriba: rápido = fuerte, llená el anillo hasta la zona verde', 'Flick up: faster = stronger, fill the ring to the green zone'],
  ['Arrastrá rápido hacia arriba con el mouse · o usá el 0 / espacio', 'Drag up fast with the mouse · or use 0 / space'],
  ['Apretá 0 para tirar y otra vez (o soltá) en la zona verde', 'Press 0 to shoot and again (or release) in the green zone'],
  ['Mantené apretado y soltá en la zona verde', 'Hold and release in the green zone'],
  ['Latigazo hacia arriba: rápido = fuerte · llená el anillo hasta lo verde', 'Flick up: faster = stronger · fill the ring to the green'],
  ['Elegí tu rack de money balls', 'Pick your money-ball rack'],
  ['Todas las pelotas de ese rack valen 2', 'Every ball in that rack is worth 2'],
  ['Agarrá el celu con la', 'Hold the phone with your'], ['palma sobre la pantalla', 'palm on the screen'], [', como si fuera la pelota. Así podés tirar de verdad.', ', like it was the ball. Then you can really shoot.'],
  ['Levantalo a tu', 'Raise it to your'], ['posición de tiro', 'shooting position'], [', mirando hacia el aro (la tele), y quedate', ', facing the hoop (the TV), and stay'], ['quieto', 'still'], ['. Vas a escuchar “tic” y vibra.', '. You will hear a “tick” and it vibrates.'],
  ['Ahora hacé', 'Now make'], ['3 tiros buenos', '3 good shots'], ['(sin soltar el celu 😅). Volvé a la posición de tiro antes de cada uno.', '(don\'t let go of the phone 😅). Go back to the shooting position before each one.'],
  ['¡Listo! Ya podés tirar en modo simulación.', 'Done! You can now shoot in simulation mode.'],
  ['Palma sobre la pantalla, levantá el celu como la pelota. Vibra cuando estás listo: ¡tirá!', 'Palm on the screen, raise the phone like the ball. It vibrates when ready: shoot!'],
  ['Agarrá el celu con la palma en la pantalla y tirá como si fuera la pelota', 'Hold the phone with your palm on the screen and shoot like it was the ball'],
  ['Palma sobre la pantalla, celu en posición de tiro… ¡y tirá!', 'Palm on the screen, phone in shooting position… and shoot!'],
  ['Mantené apretado para salir', 'Hold to exit'],
  ['Sin internet no se puede usar el celu como mando', 'No internet: the phone can\'t be used as a controller'],
  ['Usá los números para elegir en la tele', 'Use the numbers to choose on the TV'], ['Mirá la tele · usá los números', 'Watch the TV · use the numbers'],
  ['Conectando con la tele…', 'Connecting to the TV…'], ['(podés tirar vos)', '(you can shoot)'],
  ['Cambia de posición en cada rack', 'Changes spot every rack'], ['Se queda en la misma posición', 'Stays on the same spot'],
  ['Saliste del modo simulación', 'You left simulation mode'], ['Hace falta permiso para usar los sensores', 'Sensor permission is needed'], ['Hace falta permiso para los sensores', 'Sensor permission is needed'],
  ['¿Reiniciar los puntajes de ', 'Reset scores for '], ['¿Borrar a ', 'Delete '], ['Puntajes reiniciados', 'Scores reset'],
  ['¡Embocá más!', 'Score more!'], ['Te faltan ', 'You need '],
  ['Cambiar de posición: ', 'Change spot: '], ['Calibrar simulación', 'Calibrate simulation'], ['Calibrar de nuevo', 'Calibrate again'], ['Invertir lados', 'Flip sides'], ['Sensibilidad', 'Sensitivity'], ['Brújula', 'Compass'],
  ['¿Quién sale segundo?', 'Who\'s coming in second?'], ['¡No los escucho!', 'Can\'t hear you!'], ['Encogida de hombros', 'The Shrug'], ['Mentón de Mamba', 'Mamba Chin'], ['El murciélago', 'The Bat'], ['Noche, noche', 'Night Night'], ['¡El Rey!', 'The King!'],
  ['Saludo al público', 'Salute the crowd'], ['Avioncito', 'Airplane'], ['Músculos', 'Muscles'], ['Corazón', 'Heart'], ['Baile', 'Dance'],
  ['El mejor tirador de la historia', 'Greatest shooter ever'], ['Triples imposibles de un pie', 'Impossible one-leg threes'], ['El Rey: fuerza y cabeza', 'The King: power and brains'], ['Su Majestad del aire', 'His Airness'], ['Mentalidad Mamba', 'Mamba Mentality'], ['Gigante… pero de lejos ni ahí', 'Giant… but no range at all'], ['Magia argentina', 'Argentine magic'], ['Ganó 3 concursos de triples seguidos', 'Won 3 straight three-point contests'],
  ['Más cerca, con guía y ayuda', 'Closer, with guide and help'], ['Línea de triple de verdad', 'Real three-point line'], ['Como en la NBA, sin ayuda', 'Like the pros, no help'],
  ['Esquina izquierda', 'Left corner'], ['Esquina derecha', 'Right corner'], ['Ala izquierda', 'Left wing'], ['Ala derecha', 'Right wing'], ['Frente', 'Top of the key'],
  ['Primer triple', 'First three'], ['Rack perfecto (5 de 5)', 'Perfect rack (5 of 5)'], ['Money ball adentro', 'Money ball made'], ['10 seguidos', '10 in a row'], ['5 limpios seguidos', '5 swishes in a row'], ['20 puntos en un concurso', '20 points in a contest'], ['25 puntos en un concurso', '25 points in a contest'], ['30 puntos en un concurso', '30 points in a contest'], ['Le ganaste a la compu', 'Beat the computer'], ['Embocaste en modo simulación', 'Scored in simulation mode'],
  ['¡RACK PERFECTO!', 'PERFECT RACK!'], ['¡ESTÁ ON FIRE!', 'HE\'S ON FIRE!'], ['¡LIMPITA!', 'SWISH!'], ['¡ADENTRO!', 'GOOD!'], ['¡De tablero!', 'Off the glass!'], ['¡Bailó y entró!', 'Rattled in!'], ['¡Casi!', 'So close!'], ['¡Afuera!', 'Miss!'], ['Uhh, casi…', 'Ooh, almost…'],
  ['Se fue a la derecha', 'Wide right'], ['Se fue a la izquierda', 'Wide left'], ['Quedó corta', 'Too short'], ['Se pasó de largo', 'Too long'],
  ['¡Nuevo récord!', 'New record!'], ['embocadas', 'made'], ['mejor racha', 'best streak'], ['monedas', 'coins'], ['récord ', 'record '], ['Mejor racha', 'Best streak'], ['Racha ', 'Streak '], [' seguidas', ' in a row'],
  ['¿A qué jugamos?', 'What do we play?'], ['¿Con quién tirás?', 'Who do you shoot with?'], ['¿con quién tirás?', 'who do you shoot with?'], ['¿Quién juega?', 'Who\'s playing?'], ['¿Quién sos?', 'Who are you?'],
  ['Editar jugadores', 'Edit players'], ['Editar jugador', 'Edit player'], ['Nuevo jugador', 'New player'], ['Crear jugador', 'Create player'], ['Reiniciar puntajes', 'Reset scores'], ['Tu nombre', 'Your name'], ['Escribí tu nombre', 'Type your name'],
  ['Todos los juegos', 'All games'], ['Pantalla completa', 'Fullscreen'], ['Modo simulación', 'Simulation mode'], ['Posición de tiro', 'Shooting position'], ['¡Listo! Tirá', 'Ready! Shoot'], ['¡Salió!', 'Released!'],
  ['Siguiente: ', 'Next: '], ['Turno de ', 'Up next: '], ['Le toca a', 'Up next:'], ['Tira ', 'Shooting: '], ['Te toca!', 'Your turn!'], ['se desconectó', 'disconnected'], ['se sumó', 'joined'], ['Trofeo: ', 'Trophy: '],
  ['Ver podio', 'See podium'], ['Podio', 'Podium'], ['¡Una más!', 'One more!'], ['¡Otra!', 'Again!'], ['Terminar', 'Quit'], ['Inicio', 'Home'], ['Seguir', 'Resume'], ['Pausa', 'Pause'], ['Cancelar', 'Cancel'], ['Empezar', 'Start'], ['A jugar', 'Play'], ['Calibrar', 'Calibrate'],
  ['Práctica', 'Practice'], ['Concurso', 'Contest'], ['Dificultad', 'Difficulty'], ['Fácil', 'Easy'], ['Sin rival', 'No rival'], ['Rival: ', 'Rival: '], ['Tirar: ', 'Shoot: '], ['Deslizar', 'Flick'], ['Medidor', 'Meter'], ['Simulación', 'Simulation'], ['Botón', 'Button'],
  ['Opciones', 'Options'], ['Modo princesa', 'Princess mode'], ['Modo normal', 'Normal mode'], ['Princesa', 'Princess'], ['Sonidos', 'Sounds'], ['Sonido', 'Sound'], ['Público', 'Crowd'], ['Música', 'Music'], ['Voz', 'Voice'], ['Idioma', 'Language'],
  ['puntos', 'points'], ['segundos', 'seconds'], ['jugador', 'player'], ['Nuevo', 'New'], ['Editar', 'Edit'], ['Borrar', 'Delete'], ['Volver', 'Back'], ['Listo', 'Done'], ['Jugar', 'Play'], ['Siguiente', 'Next'],
  ['MÁS', 'MORE'], ['¡JUSTO!', 'PERFECT!'], ['¡FUERTE!', 'TOO HARD!'], ['¡YA!', 'GO!'],
  ['¡A tirar!', 'Let\'s go!'], ['tira con', 'shoots with'], ['¡Listo!', 'Done!'], ['Mi jugador', 'My player'], ['Siguiente tirador', 'Next shooter'], ['¡Te toca!', 'Your turn!'],
  ['Apoyá el dedo, estirá hacia ABAJO como una gomera y soltá: más estirado = más fuerte', 'Touch, pull DOWN like a slingshot and release: more stretch = more power'], ['Tirachinas', 'Slingshot'], ['Gomera', 'Slingshot'], ['Latigazo', 'Flick'], ['Simular', 'Simulate'],
  ['Cómo tirar', 'How to shoot'], ['Usar este', 'Use this one'], ['Tirás con: ', 'Shooting with: '],
  ['Apoyá el dedo en cualquier lado de la pantalla.', 'Touch anywhere on the screen.'], ['Estirá hacia ABAJO, como una gomera: cuanto más estirás, más fuerte.', 'Pull DOWN like a slingshot: the more you stretch, the stronger.'], ['Para apuntar, estirá un poquito para el costado contrario (la flecha te muestra adónde va).', 'To aim, pull slightly to the opposite side (the arrow shows where it goes).'], ['Cuando la barra está en verde, soltá.', 'When the bar is green, release.'],
  ['Apoyá el dedo y hacé un latigazo rápido hacia arriba.', 'Touch and flick up fast.'], ['No hace falta dibujar la curva: la estela es solo un efecto.', 'No need to draw the curve: the trail is just an effect.'], ['La fuerza sale de la VELOCIDAD del dedo; la dirección, del final del gesto.', 'Power comes from finger SPEED; direction from the end of the gesture.'], ['Un golpe de muñeca al final le da más efecto a la pelota.', 'A wrist snap at the end adds more spin.'],
  ['Apretá 0 (o tocá y mantené) y la barra empieza a subir.', 'Press 0 (or touch and hold) and the bar starts rising.'], ['Soltá (o apretá otra vez) cuando esté en la zona verde.', 'Release (or press again) in the green zone.'], ['Ideal para la tele con el control remoto.', 'Great for the TV remote.'],
  ['Agarrá el celu como siempre: la palma atrás y la pantalla mirándote.', 'Hold the phone normally: palm behind, screen facing you.'], ['Subilo a la frente, como la pelota antes de tirar, y quedate quieto: vibra y hace "tic".', 'Raise it to your forehead like the ball before a shot and stay still: it vibrates and ticks.'], ['Tirá con el brazo y la muñeca como un tiro de verdad (¡sin soltarlo!).', 'Shoot with arm and wrist like a real shot (don\'t let go!).'], ['La primera vez se calibra: tu posición y 3 tiros.', 'The first time it calibrates: your position and 3 shots.'],
  ['Celu a la frente, quieto hasta que vibra… ¡y tirá!', 'Phone at your forehead, still until it vibrates… and shoot!'], ['Agarrá el celu normal, subilo a la frente y tirá como si fuera la pelota', 'Hold the phone normally, raise it to your forehead and shoot like it was the ball'],
  ['estirá hacia abajo', 'pull down'], ['latigazo rápido hacia arriba', 'fast flick up'], ['apretá 0', 'press 0'], ['soltá en lo verde', 'release in the green'], ['¡justo!', 'perfect!'], ['subí el celu a la frente', 'raise the phone to your forehead'], ['quedate quieto', 'stay still'], ['¡tirá como una pelota!', 'shoot like a ball!'], ['quieto… ¡bzz!', 'still… bzz!'], ['¡Soltá!', 'Release!'], ['quietud', 'stillness'], ['posición', 'position'], ['movimiento', 'motion'], ['fuerza', 'power'], ['¡LISTO! TIRÁ', 'READY! SHOOT'],
  ['Agarrá el celu', 'Hold the phone'], ['como siempre', 'normally'], [': la palma atrás y la pantalla mirándote. Vas a tirar con el celu como si fuera la pelota (¡sin soltarlo!).', ': palm behind, screen facing you. You will shoot with the phone like it was the ball (don\'t let go!).'],
  ['Subilo a la', 'Raise it to your'], ['frente', 'forehead'], [', como la pelota antes de tirar, mirando al aro (la tele), y quedate', ' like the ball before a shot, facing the hoop (the TV), and stay'], ['hasta que se llene el círculo.', 'until the circle fills.'],
  ['con el brazo y la muñeca. Antes de cada uno volvé a la frente y esperá el ¡bzz!', 'with arm and wrist. Before each one go back to the forehead and wait for the bzz!'],
  ['Puntería', 'Accuracy'], ['Fuerza justa', 'Touch'], ['Ritmo', 'Rhythm']
].sort(function (a, b) { return b[0].length - a[0].length; });
function T(s) {
  if (LANG !== 'en' || !s) return s;
  for (var i = 0; i < EN.length; i++) if (s.indexOf(EN[i][0]) >= 0) s = s.split(EN[i][0]).join(EN[i][1]);
  return s;
}
function setLang(l) {
  try { var S0 = JSON.parse(localStorage.getItem('triples-v1')) || {}; S0.prefs = S0.prefs || {}; S0.prefs.lang = l; localStorage.setItem('triples-v1', JSON.stringify(S0)); } catch (e) {}
  location.reload();
}
