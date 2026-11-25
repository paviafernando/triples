# Triples 🏀

Concurso de triples estilo NBA para jugar en familia, en la tele, la compu o el celu.

- **Modos:** 🎯 **Práctica** (elegís la posición, tirás sin reloj, racha y porcentaje) y 🏆 **Concurso** (5 racks de 5 pelotas contra reloj, la última de cada rack es la *money ball* blanca, azul y roja que vale 2, y elegís un rack entero de money balls). Por turnos con podio y rival de la compu opcional.
- **Jugadores:** tu propio cabezón o estrellas con habilidades propias (puntería, fuerza justa, ritmo y money ball): Curry (el mejor), Dončić, LeBron, Jordan, Kobe, Shaq, Manu y Bird.
- **Editor del avatar:** altura, peso, contextura, piel, cara, ojos, barba, anteojos, corte y color de pelo, vincha, colores y número de camiseta, nombre en la espalda, muñequeras/mangas, cadena, protector bucal, aro, coronita, rodilleras y tatuajes. Las habilidades se mejoran con monedas.
- **Festejos:** cuando metés las 5 de un rack. Tu jugador elige entre 5 (baile, avioncito, músculos, saludo, corazón); cada estrella tiene el suyo (el “noche, noche” de Curry, la tiza de LeBron, el shrug de Jordan, el murciélago de Manu…).
- **Formas de tirar:** 👆 deslizar hasta la zona verde, ⏱️ medidor (0 del control remoto o espacio) y 📱 **modo simulación**: con la palma sobre la pantalla, el celu en posición de tiro vibra (y hace “tic”) cuando está listo; al tirar, el acelerómetro estima la fuerza y la brújula/el movimiento lateral la dirección, y suena la pelota saliendo de la mano. Se calibra una vez (posición + 3 tiros buenos).
- **Dificultad:** 🐣 Fácil (más cerca, con ayuda, ideal para chicos), 🏀 Normal (línea de triple real), 🔥 Pro.
- Física de verdad: la pelota rebota en el aro y el tablero, puede bailar y entrar.
- 👑 Modo princesa (cancha rosa y money ball arcoíris), sonidos, público y voz desactivables, trofeos y récords por jugador.
- **Tele + celulares:** QR en el inicio; cada celu es un jugador y sirve para tirar (deslizar, botón o simulación) y como control con números. Integrado con PF Juegos (`?hub=CODE`, sala `triples-CODE`, botón 🏠).
- Control remoto: todo se maneja con los números (insignias amarillas), 0 = acción principal/tirar, volver = pausa/inicio.
- Funciona sin internet en un solo dispositivo (service worker).

Sitio estático sin build: `index.html` + `js/` (`data.js` jugadores y opciones, `avatar.js` dibujo y festejos, `court.js` cancha 3D y física, `sensors.js` modo simulación, `app.js` pantallas, partida y red).
