'use strict';

// ====================================================
// DRAGON SLAYER ADVENTURES - Sprites (Pixel Art)
// Todas las funciones de dibujo del juego
// ====================================================

const Sprites = {

  // ─── Helper: dibuja un rect "píxel" escalado ─────
  _p(ctx, rx, ry, rw, rh, color, ox, oy, scale) {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.floor(ox + rx * scale),
      Math.floor(oy + ry * scale),
      Math.ceil(rw * scale),
      Math.ceil(rh * scale)
    );
  },

  // ─── JUGADOR ──────────────────────────────────────
  drawPlayer(ctx, x, y, frame, dir, state) {
    ctx.save();
    // Flip horizontal si mira a la izquierda
    if (dir === -1) {
      ctx.translate(x + 24, y);
      ctx.scale(-1, 1);
      x = 0; y = 0;
    } else {
      ctx.translate(x, y);
      ctx.scale(1, 1);
      x = 0; y = 0;
    }

    const S = 2; // escala de píxel
    const p = (rx, ry, rw, rh, color) =>
      this._p(ctx, rx, ry, rw, rh, color, x, y, S);

    const isRun    = state === 'run';
    const isJump   = state === 'jump';
    const isAttack = state === 'attack';
    const isHurt   = state === 'hurt';
    const isDead   = state === 'dead';

    if (isDead) {
      // Muerto: cuerpo girado
      ctx.globalAlpha = 0.7;
      p(0, 12, 20, 4,  '#2E86AB');
      p(2, 10,  6, 3,  '#DEB887');
      p(0, 15,  8, 3,  '#1E3A5F');
      p(9, 15,  8, 3,  '#1E3A5F');
      ctx.globalAlpha = 1;
      ctx.restore();
      return;
    }

    // ── Cálculo dinámico de piernas y pies según el estado ──
    let pLeft  = { px: 1, py: 13, pw: 4, ph: 4, bx: 1, by: 17, bw: 5, bh: 3 };
    let pRight = { px: 7, py: 13, pw: 4, ph: 4, bx: 7, by: 17, bw: 5, bh: 3 };
    let bodyBounce = 0;
    let armSwing = 0;

    if (isRun) {
      // Ciclo de carrera de 4 frames con flexión y zancada
      const f = frame % 4;
      if (f === 0) {
        // Pierna izquierda atrás elevada, pierna derecha adelante pisando
        pLeft  = { px: -1, py: 12, pw: 4, ph: 4, bx: -2, by: 15, bw: 5, bh: 3 };
        pRight = { px: 8,  py: 13, pw: 4, ph: 4, bx: 8,  by: 17, bw: 6, bh: 3 };
        armSwing = 2;
      } else if (f === 1) {
        // Transición central con rebote del cuerpo
        bodyBounce = -1;
        pLeft  = { px: 2, py: 13, pw: 4, ph: 4, bx: 2, by: 16, bw: 5, bh: 3 };
        pRight = { px: 6, py: 13, pw: 4, ph: 4, bx: 6, by: 17, bw: 5, bh: 3 };
        armSwing = 0;
      } else if (f === 2) {
        // Pierna izquierda adelante pisando, pierna derecha atrás elevada
        pLeft  = { px: 8,  py: 13, pw: 4, ph: 4, bx: 8,  by: 17, bw: 6, bh: 3 };
        pRight = { px: -1, py: 12, pw: 4, ph: 4, bx: -2, by: 15, bw: 5, bh: 3 };
        armSwing = -2;
      } else {
        // Transición central opuesta
        bodyBounce = -1;
        pLeft  = { px: 6, py: 13, pw: 4, ph: 4, bx: 6, by: 17, bw: 5, bh: 3 };
        pRight = { px: 2, py: 13, pw: 4, ph: 4, bx: 2, by: 16, bw: 5, bh: 3 };
        armSwing = 0;
      }
    } else if (isJump) {
      // Salto atlético / acrobático en el aire:
      // Pierna delantera recogida al pecho y pierna trasera estirada hacia abajo
      pLeft  = { px: 0, py: 13, pw: 4, ph: 5, bx: -1, by: 18, bw: 5, bh: 3 }; // pierna estirada abajo
      pRight = { px: 7, py: 10, pw: 5, ph: 4, bx: 7,  by: 13, bw: 5, bh: 3 }; // pierna flexionada arriba
      bodyBounce = -1;
    } else if (isAttack) {
      // Pose de combate
      pLeft  = { px: -1, py: 13, pw: 4, ph: 4, bx: -2, by: 17, bw: 5, bh: 3 };
      pRight = { px: 8,  py: 13, pw: 4, ph: 4, bx: 8,  by: 17, bw: 6, bh: 3 };
    } else if (isHurt) {
      // Retroceso por impacto
      pLeft  = { px: 0, py: 12, pw: 4, ph: 4, bx: -1, by: 15, bw: 5, bh: 3 };
      pRight = { px: 7, py: 13, pw: 4, ph: 4, bx: 6,  by: 16, bw: 5, bh: 3 };
      bodyBounce = 1;
    }

    const headOff = (isJump ? -1 : 0) + bodyBounce;

    // ── Piernas (Pantalones) ──
    p(pLeft.px,  pLeft.py,  pLeft.pw,  pLeft.ph,  '#1E3A5F');
    p(pRight.px, pRight.py, pRight.pw, pRight.ph, '#1E3A5F');
    // Rodilleras
    p(pLeft.px + 1,  pLeft.py + 1,  2, 2, '#2E4E7F');
    p(pRight.px + 1, pRight.py + 1, 2, 2, '#2E4E7F');

    // ── Botas / Pies (Moviéndose con las piernas) ──
    p(pLeft.bx,  pLeft.by,  pLeft.bw,  pLeft.bh,  '#2E1A0A');
    p(pRight.bx, pRight.by, pRight.bw, pRight.bh, '#2E1A0A');
    // Suelas y detalle de bota
    p(pLeft.bx,  pLeft.by + pLeft.bh - 1,  pLeft.bw,  1, '#4A2D10');
    p(pRight.bx, pRight.by + pRight.bh - 1, pRight.bw, 1, '#4A2D10');
    p(pLeft.bx + 1,  pLeft.by, 2, 1, '#5C3814');
    p(pRight.bx + 1, pRight.by, 2, 1, '#5C3814');

    // ── Cinturón ──
    p(0,  12 + bodyBounce, 12, 2,  '#8B4513');
    p(5,  12 + bodyBounce,  2, 2,  '#FFD700'); // hebilla dorada

    // ── Cuerpo/túnica ──
    const bodyCol = isHurt ? '#FF8888' : '#2E86AB';
    p(0,   7 + bodyBounce, 12, 6,  bodyCol);
    // Detalle pecho
    p(1,   8 + bodyBounce,  5, 4,  isHurt ? '#FFAAAA' : '#3A9AC0');
    // Insignia
    p(2,   9 + bodyBounce,  3, 2,  '#C0C0C0');
    p(3,   9 + bodyBounce,  1, 2,  '#FFD700');

    // ── Brazos ──
    if (isAttack) {
      // Brazo izquierdo
      p(-2,  7 + bodyBounce,  3, 5, bodyCol);
      // Brazo derecho extendido con hacha
      p(12,  6 + bodyBounce,  8, 4, bodyCol);
      // Mango del hacha
      p(18,  4 + bodyBounce,  3, 10, '#8B4513');
      // Hoja del hacha
      p(14,  2 + bodyBounce,  7, 7, '#C0C0C0');
      p(15,  3 + bodyBounce,  5, 5, '#D8D8D8');
      // Brillo del hacha
      p(15,  3 + bodyBounce,  2, 2, '#FFFFFF');
      p(21,  6 + bodyBounce,  1, 5, '#C0C0C0');
    } else if (isJump) {
      // Brazos elevados equilibrando en el aire
      p(-2,  5 + bodyBounce, 3, 5, bodyCol);
      p(11,  5 + bodyBounce, 3, 5, bodyCol);
      p(-2,  4 + bodyBounce, 3, 2, '#888888');
      p(11,  4 + bodyBounce, 3, 2, '#888888');
    } else {
      // Brazos balanceándose al correr
      const armL = armSwing;
      const armR = -armSwing;
      p(-2,  7 + armL + bodyBounce, 3, 5, bodyCol);
      p(11,  7 + armR + bodyBounce, 3, 5, bodyCol);
      // Guanteletes
      p(-2, 11 + armL + bodyBounce, 3, 2, '#888888');
      p(11, 11 + armR + bodyBounce, 3, 2, '#888888');
    }

    // ── Cuello ──
    p(4,   5 + headOff,  4, 3,  '#DEB887');

    // ── Cabeza ──
    p(1, headOff + 0, 10, 6, '#DEB887');
    // Sombra bajo la barbilla
    p(1, headOff + 5, 10, 1, '#C4A882');

    // ── Pelo ──
    p(1, headOff - 1, 10, 2, '#8B4513');
    p(1, headOff + 0,  2, 4, '#8B4513');   // patillas
    p(0, headOff - 1, 12, 2, '#7A3B10');   // pelo superior oscuro

    // ── Ojos ──
    p(3, headOff + 2, 2, 2, '#1A1A2E');
    p(7, headOff + 2, 2, 2, '#1A1A2E');
    // Brillo del ojo
    p(3, headOff + 2, 1, 1, '#FFFFFF');
    p(7, headOff + 2, 1, 1, '#FFFFFF');
    // Cejas
    p(3, headOff + 1, 2, 1, isHurt ? '#FF2222' : '#6B3A1F');
    p(7, headOff + 1, 2, 1, isHurt ? '#FF2222' : '#6B3A1F');

    // ── Boca ──
    if (isJump || isAttack) {
      p(4, headOff + 4, 4, 1, '#8B0000'); // boca abierta
      p(4, headOff + 4, 1, 1, '#FFFFFF'); // diente
      p(7, headOff + 4, 1, 1, '#FFFFFF');
    } else {
      p(4, headOff + 4, 4, 1, '#7A3020'); // boca cerrada
    }

    // ── Casco/tiara (detalle de guerrero) ──
    p(3, headOff - 2, 6, 2, '#C0C0C0');
    p(5, headOff - 3, 2, 2, '#FFD700');  // joya central

    ctx.restore();
  },

  // ─── ZOMBIE ───────────────────────────────────────
  drawZombie(ctx, x, y, frame, dir, dying) {
    ctx.save();
    if (dir === -1) {
      ctx.translate(x + 22, y);
      ctx.scale(-1, 1);
      x = 0; y = 0;
    } else {
      ctx.translate(x, y);
      x = 0; y = 0;
    }

    const S = 2;
    const p = (rx, ry, rw, rh, color) =>
      this._p(ctx, rx, ry, rw, rh, color, x, y, S);

    if (dying) ctx.globalAlpha = 0.6;

    const skinCol  = '#6B8C4A';
    const skinDark = '#4A6A2E';
    const clothCol = '#4A3728';
    const pantCol  = '#2C2416';

    const armSwing = Math.sin(frame * 1.3) * 1.5;

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + 11*S, y + 18*S, 8*S, 2.5*S, 0, 0, Math.PI * 2);
    ctx.fill();

    // Botas rasgadas
    p(1, 16, 4, 2, '#1A0F05');
    p(7, 16, 4, 2, '#1A0F05');

    // Piernas
    const legP = Math.sin(frame * 1.1) * 1.5;
    p(1, 10 + legP, 4, 7, pantCol);
    p(7, 10 - legP, 4, 7, pantCol);

    // Ropa rasgada (cuerpo)
    p(0,  5, 11, 6, clothCol);
    // Rasgaduras
    p(2,  6,  1, 3, skinCol);
    p(8,  7,  1, 2, skinCol);
    p(4,  9,  3, 1, skinCol);

    // Brazos extendidos (zombie clásico)
    p(-5, 5 + armSwing, 6, 3, skinCol);
    p(11, 5 - armSwing, 6, 3, skinCol);
    // Manos con garras
    p(-6, 5 + armSwing, 2, 3, skinDark);
    p(17, 5 - armSwing, 2, 3, skinDark);
    p(-6, 5 + armSwing, 1, 1, '#DDDDAA');
    p(17, 5 - armSwing, 1, 1, '#DDDDAA');

    // Cuello
    p(4,  3,  3, 3, skinCol);

    // Cabeza (ligeramente inclinada = +1 en x)
    p(1, -2, 9, 7, skinCol);
    // Mancha oscura en la cabeza
    p(6, -2, 3, 2, skinDark);
    p(2, -1, 2, 2, skinDark);

    // Pelo muerto (verde oscuro)
    p(1, -3, 9, 2, '#2D4A1E');
    p(1, -3, 2, 4, '#1E3A14');

    // Ojos rojos brillantes
    p(2,  0, 2, 2, '#FF0000');
    p(7,  0, 2, 2, '#FF0000');
    p(2,  0, 1, 1, '#FF6666');
    p(7,  0, 1, 1, '#FF6666');

    // Boca abierta (gemido)
    p(3,  3, 4, 2, '#1A0500');
    p(3,  3, 1, 1, '#EEEECC'); // dientes podridos
    p(5,  3, 1, 1, '#EEEECC');
    p(7,  3, 1, 1, '#EEEECC');

    // Sangre/moretones
    p(3, -1, 1, 2, '#3A1A00');
    p(8,  1, 1, 2, '#3A1A00');

    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // ─── DRAGÓN (normal y jefe) ───────────────────────
  drawDragon(ctx, x, y, frame, dir, isBoss) {
    const S    = isBoss ? 2.5 : 1.8;
    const W    = isBoss ? 80  : 44;

    ctx.save();
    if (dir === -1) {
      ctx.translate(x + W, y);
      ctx.scale(-1, 1);
      x = 0; y = 0;
    } else {
      ctx.translate(x, y);
      x = 0; y = 0;
    }

    const p = (rx, ry, rw, rh, color) =>
      this._p(ctx, rx, ry, rw, rh, color, x, y, S);

    const bodyCol  = isBoss ? '#7B0F1A' : '#CC2200';
    const bodyDark = isBoss ? '#4A0A10' : '#880000';
    const bellyCol = isBoss ? '#4A1E00' : '#FF6600';
    const wingCol  = isBoss ? '#4A0A14' : '#990000';
    const eyeCol   = isBoss ? '#FF8800' : '#FFEE00';
    const scaleCol = isBoss ? '#550A10' : '#AA1800';

    const wingUp = frame === 0;

    // ── Alas ──
    if (wingUp) {
      p(-7, -10, 8, 14, wingCol);
      p(-5, -12, 4,  4, wingCol);
      p(33,  -9, 8, 13, wingCol);
      p(37, -11, 4,  4, wingCol);
    } else {
      p(-7,   6, 8, 12, wingCol);
      p(-5,  16, 6,  4, wingCol);
      p(33,   7, 8, 11, wingCol);
      p(37,  16, 6,  4, wingCol);
    }
    // Membranas del ala
    p(-4, wingUp ? -8 : 8, 5, 2, isBoss ? '#6A0A10' : '#AA1100');
    p(34, wingUp ? -7 : 9, 5, 2, isBoss ? '#6A0A10' : '#AA1100');

    // ── Cola ──
    p(28,  12,  8, 5, bodyCol);
    p(34,  14,  8, 5, scaleCol);
    p(40,  16,  6, 4, bodyDark);
    p(44,  18,  4, 3, bodyDark);
    // Punta de la cola (triángulo)
    p(46,  17,  3, 5, bodyDark);
    p(48,  18,  2, 3, '#FFD700');

    // ── Cuerpo ──
    p( 2,   5, 27, 18, bodyCol);
    // Escamas
    p( 5,   6,  4,  3, scaleCol);
    p(12,   6,  4,  3, scaleCol);
    p(19,   6,  4,  3, scaleCol);
    p( 8,  11,  4,  3, scaleCol);
    p(15,  11,  4,  3, scaleCol);
    p(22,  11,  4,  3, scaleCol);

    // ── Panza ──
    p( 5,   9, 19, 12, bellyCol);
    p( 6,  10, 17,  2, '#FF8833'); // brillo panza
    // Segmentos de panza
    p( 6,  12,  2,  8, '#EE5500');
    p(10,  12,  2,  8, '#EE5500');
    p(14,  12,  2,  8, '#EE5500');
    p(18,  12,  2,  8, '#EE5500');

    // ── Patas ──
    p( 5,  22,  6, 8, bodyCol);
    p(18,  22,  6, 8, bodyCol);
    // Garras
    p( 3,  28,  8, 3, bodyDark);
    p(16,  28,  8, 3, bodyDark);
    p( 3,  30,  2, 2, '#FFEEAA');
    p( 6,  30,  2, 2, '#FFEEAA');
    p( 9,  30,  2, 2, '#FFEEAA');
    p(16,  30,  2, 2, '#FFEEAA');
    p(19,  30,  2, 2, '#FFEEAA');
    p(22,  30,  2, 2, '#FFEEAA');

    // ── Cuello ──
    p( 1,  -2,  8,  9, bodyCol);
    p( 2,  -1,  6,  4, scaleCol);

    // ── Cabeza ──
    p(-3, -14, 16, 14, bodyCol);
    // Parte superior
    p(-2, -15, 14,  3, scaleCol);

    // ── Hocico ──
    p(-8,  -9,  8,  8, bodyCol);
    p(-9,  -8, 10,  3, scaleCol);
    // Fosas nasales
    p(-6,  -5,  2,  2, bodyDark);
    p(-2,  -5,  2,  2, bodyDark);

    // ── Ojo ──
    p( 5,  -12,  5,  5, eyeCol);
    p( 6,  -11,  3,  3, '#1A0000');
    p( 6,  -11,  1,  1, '#FFFFFF');  // brillo
    // Párpado
    p( 5,  -12,  5,  1, bodyCol);

    // ── Dientes ──
    p(-8,  -2,  2,  4, '#FFFFF0');
    p(-5,  -2,  2,  4, '#FFFFF0');
    p(-2,  -2,  2,  4, '#FFFFF0');
    // Colmillos extra en jefe
    if (isBoss) {
      p(-9,  -3,  2,  5, '#FFFFF0');
      p(-1,  -3,  2,  5, '#FFFFF0');
    }

    // ── Cuernos ──
    if (isBoss) {
      p( 4, -20,  3, 7, bodyDark);
      p( 8, -22,  3, 9, bodyDark);
      p( 5, -20,  1, 7, '#6A0A14');
      // Llamas en cuernos (fase 2 visual se aplica en game.js)
    } else {
      p( 5, -17,  2, 5, bodyDark);
      p( 8, -15,  2, 4, bodyDark);
    }

    ctx.restore();
  },

  // ─── HACHA ────────────────────────────────────────
  drawAxe(ctx, x, y) {
    // Mango
    ctx.fillStyle = '#6B3A10';
    ctx.fillRect(x + 6, y + 2, 4,  14);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 7, y + 2, 2,  13);

    // Hoja principal
    ctx.fillStyle = '#AAAAAA';
    ctx.fillRect(x,     y,    10,  10);
    ctx.fillStyle = '#CCCCCC';
    ctx.fillRect(x + 1, y + 1, 8,  7);
    // Filo inferior
    ctx.fillStyle = '#AAAAAA';
    ctx.fillRect(x + 8, y + 4,  6,  4);
    ctx.fillStyle = '#BBBBBB';
    ctx.fillRect(x + 9, y + 5,  4,  3);

    // Brillo del filo
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 1, y + 1,  3,  2);
    ctx.fillRect(x + 9, y + 5,  2,  1);

    // Orificio del hacha
    ctx.fillStyle = '#777777';
    ctx.fillRect(x + 3, y + 3,  4,  3);
    ctx.fillStyle = '#555555';
    ctx.fillRect(x + 4, y + 4,  2,  2);

    // Remache
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + 7, y + 5,  2,  2);
  },

  // ─── BOMBA EXPLOSIVA ─────────────────────────────
  drawBomb(ctx, x, y, angle, frame) {
    ctx.save();
    ctx.translate(x + 8, y + 8);
    ctx.rotate(angle || 0);

    // Sombra exterior
    ctx.fillStyle = '#111118';
    ctx.beginPath();
    ctx.arc(0, 1, 8, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo esférico metálico
    ctx.fillStyle = '#2A2A38';
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Brillo esférico
    ctx.fillStyle = '#666688';
    ctx.beginPath();
    ctx.arc(-2.5, -2.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-3, -3, 2, 2);

    // Boquilla de la mecha
    ctx.fillStyle = '#888899';
    ctx.fillRect(-2, -8.5, 4, 2);

    // Mecha encendida (animada con chispas de fuego)
    ctx.strokeStyle = '#D2B48C';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8.5);
    ctx.quadraticCurveTo(2, -11, 4, -13);
    ctx.stroke();

    // Chispa / fuego de mecha
    const sparkCol = frame % 2 === 0 ? '#FFEE00' : '#FF3300';
    ctx.fillStyle = sparkCol;
    ctx.beginPath();
    ctx.arc(4, -13, 2.5 + (frame % 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(3.5, -13.5, 1.5, 1.5);

    ctx.restore();
  },

  // ─── BOLA DE FUEGO ───────────────────────────────
  drawFireball(ctx, x, y, frame, isBoss) {
    const r = isBoss ? 12 : 8;
    const cx = x + r;
    const cy = y + r;
    const puls = Math.sin(frame * 0.8) * 1.5;

    // Aura exterior
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#FF4400';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5 + puls, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Cuerpo principal
    const colors = ['#FF4500', '#FF6600', '#FF8800', '#FF2200'];
    ctx.fillStyle = colors[frame % 4];
    ctx.beginPath();
    ctx.arc(cx, cy, r + puls, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo brillante
    ctx.fillStyle = '#FFDD00';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Centro blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 1, cy - 1, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Estela (hacia la izquierda)
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(x - 10, y + r - 3, 10, 6);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#FF4400';
    ctx.fillRect(x - 18, y + r - 2, 8, 4);
    ctx.globalAlpha = 1;
  },

  // ─── MONEDA ───────────────────────────────────────
  drawCoin(ctx, x, y, frame) {
    // Spin: varía el ancho para simular giro 3D
    const widths = [16, 15, 12, 8, 3, 8, 12, 15];
    const w = widths[frame % 8];
    const ox = x + (16 - w) / 2;

    // Sombra de borde
    ctx.fillStyle = '#9A6800';
    ctx.fillRect(ox + 1, y + 2, w - 1, 13);

    // Cuerpo dorado
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(ox, y + 1, w, 13);

    // Brillo superior
    ctx.fillStyle = '#FFFF88';
    ctx.fillRect(ox + 1, y + 1, Math.max(1, w - 2), 4);

    // Símbolo $ (solo cuando hay suficiente ancho)
    if (w >= 10) {
      ctx.fillStyle = '#B8860B';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$', x + 8, y + 12);
    }
  },

  // ─── CORAZÓN / VIDA ───────────────────────────────
  drawHeart(ctx, x, y, full) {
    const c  = full ? '#FF3333' : '#444444';
    const cl = full ? '#FF7777' : '#666666';

    // Forma de corazón con rectángulos
    ctx.fillStyle = c;
    ctx.fillRect(x + 3,  y,     4, 2);
    ctx.fillRect(x + 9,  y,     4, 2);
    ctx.fillRect(x + 1,  y + 2, 12, 4);
    ctx.fillRect(x + 2,  y + 6,  9, 2);
    ctx.fillRect(x + 3,  y + 8,  7, 2);
    ctx.fillRect(x + 5,  y +10,  4, 2);
    ctx.fillRect(x + 6,  y +12,  2, 2);

    // Brillo interno
    if (full) {
      ctx.fillStyle = cl;
      ctx.fillRect(x + 4,  y + 2, 3, 3);
      ctx.fillRect(x + 10, y + 2, 2, 2);
    }
  },

  // ─── CORAZÓN COLECCIONABLE FLOTANTE ───────────────
  drawHeartItem(ctx, x, y, frame) {
    ctx.save();
    const pulse = Math.sin(frame * 1.5) * 1.2;

    // Aura suave
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#FF3366';
    ctx.beginPath();
    ctx.arc(x + 9, y + 9, 10 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Corazón principal
    ctx.fillStyle = '#FF1A4B';
    ctx.fillRect(x + 3,  y + 2, 5, 3);
    ctx.fillRect(x + 10, y + 2, 5, 3);
    ctx.fillRect(x + 2,  y + 4, 14, 5);
    ctx.fillRect(x + 4,  y + 9, 10, 3);
    ctx.fillRect(x + 6,  y + 12, 6, 3);
    ctx.fillRect(x + 8,  y + 15, 2, 2);

    // Brillo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 4,  y + 3, 3, 2);
    ctx.fillRect(x + 11, y + 3, 2, 1);
    ctx.fillRect(x + 3,  y + 5, 2, 2);

    ctx.restore();
  },

  // ─── TÓNICO / POCIÓN DE SALUD ─────────────────────
  drawPotionItem(ctx, x, y, frame) {
    ctx.save();
    const f = frame % 2;

    // Aura mágica
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.arc(x + 9, y + 9, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Tapón de corcho
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(x + 7, y, 4, 3);

    // Cuello del frasco
    ctx.fillStyle = '#DDEEFF';
    ctx.fillRect(x + 6, y + 3, 6, 2);

    // Cuerpo de vidrio
    ctx.fillStyle = '#BBEEFF';
    ctx.fillRect(x + 3, y + 5, 12, 11);
    ctx.fillStyle = '#99DDFF';
    ctx.fillRect(x + 2, y + 7, 14, 8);

    // Líquido mágico curativo (verde/turquesa brillante)
    ctx.fillStyle = '#00FF88';
    ctx.fillRect(x + 4, y + 8, 10, 7);
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(x + 3, y + 9, 12, 5);

    // Burbujas y brillo
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 4, y + 6, 2, 7);
    if (f === 0) {
      ctx.fillRect(x + 8, y + 11, 2, 2);
    } else {
      ctx.fillRect(x + 10, y + 9, 2, 2);
    }

    ctx.restore();
  },

  // ─── PLATAFORMAS / TILES ──────────────────────────
  drawPlatform(ctx, x, y, w, h, type) {
    // Culling básico
    if (x + w < -32 || x > 832 || y + h < -32 || y > 482) return;

    const TILE = 32;

    if (type === 'grass') {
      // ── Pasto ──
      for (let tx = 0; tx < w; tx += TILE) {
        const tw = Math.min(TILE, w - tx);
        const px = x + tx;

        // Tierra base
        ctx.fillStyle = '#795548';
        ctx.fillRect(px, y + 7, tw, h - 7);

        // Capas de tierra
        ctx.fillStyle = '#6D4C41';
        ctx.fillRect(px, y + 11, tw, 6);
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(px, y + 17, tw, h - 17);

        // Raíces
        ctx.fillStyle = '#4E342E';
        if (tw > 12) ctx.fillRect(px + 3,  y + 14, 3, 6);
        if (tw > 20) ctx.fillRect(px + 14, y + 12, 3, 8);
        if (tw > 28) ctx.fillRect(px + 24, y + 15, 3, 5);

        // Piedras en la tierra
        ctx.fillStyle = '#9E9E9E';
        if (tw > 8)  ctx.fillRect(px + 5,  y + 16, 4, 3);
        if (tw > 20) ctx.fillRect(px + 18, y + 13, 5, 4);

        // Franja verde superior
        ctx.fillStyle = '#388E3C';
        ctx.fillRect(px, y, tw, 8);
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(px, y, tw, 6);
        ctx.fillStyle = '#66BB6A';
        ctx.fillRect(px, y, tw, 2);

        // Briznas de pasto
        ctx.fillStyle = '#2E7D32';
        for (let i = 3; i < tw - 3; i += 5) {
          ctx.fillRect(px + i, y - 3, 1, 4);
          if (i + 2 < tw) ctx.fillRect(px + i + 2, y - 2, 1, 3);
        }

        // Flores ocasionales
        if (tx % 64 === 0 && tw > 16) {
          ctx.fillStyle = '#FFFF66';
          ctx.fillRect(px + 8, y - 4, 2, 2);
          ctx.fillStyle = '#FF9999';
          ctx.fillRect(px + 7, y - 5, 4, 1);
          ctx.fillRect(px + 8, y - 6, 2, 2);
        }
      }

    } else if (type === 'stone') {
      // ── Piedra de cueva ──
      for (let tx = 0; tx < w; tx += TILE) {
        const tw = Math.min(TILE, w - tx);
        const px = x + tx;

        // Base
        ctx.fillStyle = '#37474F';
        ctx.fillRect(px, y, tw, h);
        // Variación de color
        ctx.fillStyle = '#2E3E47';
        ctx.fillRect(px, y + h/2, tw, h/2);

        // Patrón de ladrillo de piedra
        for (let row = 0; row < h; row += 8) {
          const off = (Math.floor(row / 8) % 2) * 16;
          ctx.fillStyle = '#263238';
          // línea horizontal
          ctx.fillRect(px, y + row, tw, 1);
          // líneas verticales
          for (let col = off; col < tw; col += 32) {
            ctx.fillRect(px + col % tw, y + row, 1, 8);
          }
        }

        // Borde superior (brillo)
        ctx.fillStyle = '#546E7A';
        ctx.fillRect(px, y,     tw, 2);
        ctx.fillStyle = '#607D8B';
        ctx.fillRect(px, y,     tw, 1);

        // Grietas
        ctx.fillStyle = '#1C2830';
        ctx.fillRect(px + 4,  y + 4, 1,  9);
        ctx.fillRect(px + 5,  y + 7, 3,  1);
        ctx.fillRect(px + 18, y + 11, 1, 7);

        // Gotas de humedad
        ctx.fillStyle = '#2A4A5A';
        ctx.fillRect(px + 10, y,  2, 5);
        ctx.fillRect(px + 10, y + 5, 1, 3);

        // Musgo
        ctx.fillStyle = '#1B5E20';
        ctx.fillRect(px + 8,  y + 1, 3, 2);
        ctx.fillRect(px + 22, y + 1, 4, 2);
      }

    } else if (type === 'brick') {
      // ── Ladrillo de castillo ──
      for (let tx = 0; tx < w; tx += TILE) {
        const tw = Math.min(TILE, w - tx);
        const px = x + tx;

        // Base oscura
        ctx.fillStyle = '#3D1A55';
        ctx.fillRect(px, y, tw, h);
        ctx.fillStyle = '#2A1038';
        ctx.fillRect(px, y + h/2, tw, h/2);

        // Patrón de ladrillo
        for (let row = 0; row < h; row += 10) {
          const off = (Math.floor(row / 10) % 2) * 16;
          ctx.fillStyle = '#1A0825';
          ctx.fillRect(px, y + row, tw, 1);
          for (let col = off; col < tw + 32; col += 32) {
            ctx.fillRect(px + col % tw, y + row, 1, 10);
          }
        }

        // Borde luminoso
        ctx.fillStyle = '#5A2878';
        ctx.fillRect(px, y, tw, 2);
        ctx.fillStyle = '#6A3888';
        ctx.fillRect(px, y, tw, 1);

        // Runas brillantes (detalle mágico)
        ctx.fillStyle = '#6600CC';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(px + 5,  y + 3, 3, 5);
        ctx.fillRect(px + 20, y + 5, 2, 4);
        ctx.globalAlpha = 1;

        // Musgo del castillo
        ctx.fillStyle = '#1A4A1A';
        ctx.fillRect(px + 10, y + 1, 4, 3);
        ctx.fillRect(px + 24, y + 2, 3, 2);

        // Ojos malvados incrustados
        if (tx % 96 === 0 && tw >= 24 && h >= 16) {
          ctx.fillStyle = '#CC0000';
          ctx.fillRect(px + 12, y + 4, 2, 2);
          ctx.fillRect(px + 17, y + 4, 2, 2);
          ctx.fillStyle = '#FF3333';
          ctx.fillRect(px + 12, y + 4, 1, 1);
          ctx.fillRect(px + 17, y + 4, 1, 1);
        }
      }
    } else if (type === 'cloud') {
      // ── Plataforma de nube (con alto contraste y volumen visible) ──
      // Borde y sombra inferior azul cielo oscuro
      ctx.fillStyle = '#1A4878';
      ctx.fillRect(x, y + 2, w, h);
      
      // Base sombreada de la nube
      ctx.fillStyle = '#5A94D4';
      ctx.fillRect(x + 2, y + 6, w - 4, h - 6);
      ctx.fillStyle = '#7EAFE6';
      ctx.fillRect(x + 2, y + 4, w - 4, h - 8);

      // Superficie esponjosa blanca brillante
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + 2, y + 2, w - 4, Math.max(6, h - 8));

      // Pompones superiores de nube definidos
      const step = 20;
      for (let tx = 0; tx < w; tx += step) {
        const curW = Math.min(step, w - tx);
        // Sombra de pompón
        ctx.fillStyle = '#2A5A90';
        ctx.beginPath();
        ctx.arc(x + tx + curW/2, y + 1, curW/2 + 1, Math.PI, 0);
        ctx.fill();
        // Pompón blanco
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + tx + curW/2, y + 2, curW/2, Math.PI, 0);
        ctx.fill();
      }

      // Brillo superior blanco puro
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + 4, y, w - 8, 3);
      // Detalle de nubes esponjosas internas
      ctx.fillStyle = '#E6F0FA';
      for (let tx = 8; tx < w - 8; tx += 28) {
        ctx.fillRect(x + tx, y + 4, 14, 4);
      }

    } else if (type === 'metal') {
      // ── Plataforma metalica (avion/militar) ──
      for (let tx=0; tx<w; tx+=32) {
        const tw = Math.min(32, w-tx); const px = x+tx;
        ctx.fillStyle = '#4A5560'; ctx.fillRect(px, y, tw, h);
        ctx.fillStyle = '#5A6570'; ctx.fillRect(px, y, tw, h/3);
        // Tornillos
        ctx.fillStyle = '#888888';
        ctx.beginPath(); ctx.arc(px+6, y+6, 3, 0, Math.PI*2); ctx.fill();
        if (tw > 20) { ctx.beginPath(); ctx.arc(px+tw-6, y+6, 3, 0, Math.PI*2); ctx.fill(); }
        // Rayado metalico
        ctx.strokeStyle = '#606A70'; ctx.lineWidth = 1;
        for (let sl=0; sl<tw; sl+=8) { ctx.beginPath(); ctx.moveTo(px+sl, y); ctx.lineTo(px+sl+4, y+h); ctx.stroke(); }
        // Borde superior brillante
        ctx.fillStyle = '#6A7580'; ctx.fillRect(px, y, tw, 2);
        ctx.fillStyle = '#7A8590'; ctx.fillRect(px, y, tw, 1);
        // Remaches
        ctx.fillStyle = '#999999';
        if (tw > 12) ctx.fillRect(px+3, y+h-5, 4, 4);
        if (tw > 24) ctx.fillRect(px+tw-7, y+h-5, 4, 4);
      }

    } else if (type === 'sand') {
      // ── Plataforma de arena ──
      for (let tx=0; tx<w; tx+=32) {
        const tw = Math.min(32, w-tx); const px = x+tx;
        ctx.fillStyle = '#CC8833'; ctx.fillRect(px, y, tw, h);
        ctx.fillStyle = '#BB7722'; ctx.fillRect(px, y+h*.4, tw, h*.6);
        // Granulos de arena
        ctx.fillStyle = '#DDAA44';
        ctx.fillRect(px, y, tw, 6);
        ctx.fillStyle = '#EECC66';
        ctx.fillRect(px, y, tw, 2);
        // Textura granulosa
        ctx.fillStyle = '#AA6611';
        for (let gx=2; gx<tw-2; gx+=5) {
          if (gx%7===0) ctx.fillRect(px+gx, y+3, 2, 2);
          if (gx%11===0) ctx.fillRect(px+gx, y+8, 2, 3);
        }
        // Piedras pequeñas
        ctx.fillStyle = '#AA8855';
        if (tw > 10) ctx.fillRect(px+4, y+h-6, 5, 5);
        if (tw > 22) ctx.fillRect(px+18, y+h-4, 4, 4);
      }

    } else if (type === 'coral') {
      // ── Plataforma de coral submarino ──
      for (let tx=0; tx<w; tx+=32) {
        const tw = Math.min(32, w-tx); const px = x+tx;
        ctx.fillStyle = '#1A4A5A'; ctx.fillRect(px, y, tw, h);
        ctx.fillStyle = '#0E3444'; ctx.fillRect(px, y+h*.4, tw, h*.6);
        ctx.fillStyle = '#CC4444'; ctx.fillRect(px, y, tw, 8);
        ctx.fillStyle = '#DD6666'; ctx.fillRect(px, y, tw, 4);
        ctx.fillStyle = '#EE8888'; ctx.fillRect(px, y, tw, 2);
        const coralColors = ['#FF4466','#FF6644','#FF8844','#CC44AA'];
        for (let cx2=2; cx2<tw-4; cx2+=9) {
          ctx.fillStyle = coralColors[(cx2/9)%4];
          ctx.fillRect(px+cx2, y-5, 4, 6);
          ctx.fillRect(px+cx2-1, y-8, 2, 4);
        }
        ctx.fillStyle = '#2A8844';
        if (tw > 15) ctx.fillRect(px+10, y-8, 3, 9);
      }

    } else if (type === 'lava') {
      // ── Plataforma volcánica / río de lava ──
      for (let tx=0; tx<w; tx+=32) {
        const tw = Math.min(32, w-tx); const px = x+tx;
        // Roca basáltica oscura
        ctx.fillStyle = '#1A0C08'; ctx.fillRect(px, y, tw, h);
        ctx.fillStyle = '#2D140C'; ctx.fillRect(px, y+2, tw, h-4);
        // Grietas incandescentes
        ctx.fillStyle = '#FF3300';
        ctx.fillRect(px+4, y+6, 6, 2); ctx.fillRect(px+16, y+10, 8, 2);
        ctx.fillStyle = '#FF9900';
        ctx.fillRect(px+5, y+7, 4, 1); ctx.fillRect(px+18, y+11, 4, 1);
        // Magma ardiente superior
        ctx.fillStyle = '#FF2200'; ctx.fillRect(px, y, tw, 4);
        ctx.fillStyle = '#FF8800'; ctx.fillRect(px, y, tw, 2);
        ctx.fillStyle = '#FFEE44';
        for (let lx=3; lx<tw-3; lx+=8) ctx.fillRect(px+lx, y-1, 3, 2);
      }

    } else if (type === 'ice') {
      // ── Plataforma de hielo cristalino ──
      for (let tx=0; tx<w; tx+=32) {
        const tw = Math.min(32, w-tx); const px = x+tx;
        ctx.fillStyle = '#4A8BB8'; ctx.fillRect(px, y, tw, h);
        ctx.fillStyle = '#7AC0E8'; ctx.fillRect(px, y, tw, h/2);
        ctx.fillStyle = '#AEE4FF'; ctx.fillRect(px, y, tw, 4);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(px, y, tw, 2);
        // Destellos de hielo
        ctx.fillStyle = '#FFFFFF';
        if (tw > 10) ctx.fillRect(px+6, y+6, 3, 3);
        if (tw > 22) ctx.fillRect(px+20, y+8, 2, 2);
      }

    } else if (type === 'temple') {
      // ── Plataforma de templo antiguo con oro ──
      for (let tx=0; tx<w; tx+=32) {
        const tw = Math.min(32, w-tx); const px = x+tx;
        ctx.fillStyle = '#3E3424'; ctx.fillRect(px, y, tw, h);
        ctx.fillStyle = '#5A4E38'; ctx.fillRect(px, y+2, tw, h-4);
        ctx.fillStyle = '#8B7B58'; ctx.fillRect(px, y, tw, 4);
        // Franja dorada de templo
        ctx.fillStyle = '#FFD700'; ctx.fillRect(px, y+1, tw, 2);
        ctx.fillStyle = '#FFAA00'; ctx.fillRect(px+4, y+6, tw-8, 3);
        ctx.fillStyle = '#2A2014'; ctx.fillRect(px+6, y+h-4, 4, 3);
      }
    }
  },

  // ─── PORTAL DE META ───────────────────────────────
  drawPortal(ctx, x, y, color, frame) {
    const t     = frame * 0.06;
    const pulse = 1 + Math.sin(t * 2.5) * 0.12;
    const rx    = 22 * pulse;
    const ry    = 30 * pulse;

    // Aura exterior
    const grad = ctx.createRadialGradient(x + 20, y + 30, 2, x + 20, y + 30, 48);
    grad.addColorStop(0,   color + 'BB');
    grad.addColorStop(0.5, color + '44');
    grad.addColorStop(1,   'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 30, y - 20, 100, 100);

    // Anillo exterior
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 30, rx + 4, ry + 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Anillo interior
    ctx.strokeStyle = color + 'BB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 30, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Interior del portal
    ctx.globalAlpha = 0.3 + Math.sin(t) * 0.1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 30, rx - 2, ry - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Partículas orbitando
    for (let i = 0; i < 8; i++) {
      const angle = t * 1.5 + (i / 8) * Math.PI * 2;
      const px2 = x + 20 + Math.cos(angle) * (rx + 6) * pulse;
      const py2 = y + 30 + Math.sin(angle) * (ry + 6) * pulse;
      const size = 3 + Math.sin(angle * 3) * 1;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7 + Math.sin(angle) * 0.3;
      ctx.fillRect(px2 - size / 2, py2 - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    // Símbolo de estrella en el centro
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.6 + Math.sin(t * 3) * 0.4;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★', x + 20, y + 36);
    ctx.globalAlpha = 1;

    // Etiqueta
    ctx.fillStyle = color;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    const labelY = y + 68;
    ctx.fillText('[ META ]', x + 20, labelY);
  },


  // ─── SOLDADO ──────────────────────────────────────
  drawSoldier(ctx, x, y, frame, dir, dying) {
    ctx.save();
    if (dir === -1) { ctx.translate(x + 22, y); ctx.scale(-1, 1); x = 0; y = 0; }
    else            { ctx.translate(x, y); x = 0; y = 0; }
    const S = 2;
    const p = (rx, ry, rw, rh, color) => this._p(ctx, rx, ry, rw, rh, color, x, y, S);
    if (dying) ctx.globalAlpha = 0.6;

    const legP = Math.sin(frame * 1.1) * 1.5;
    // Botas militares
    p(1, 17, 5, 3, '#2A1A00'); p(7, 17, 5, 3, '#2A1A00');
    // Pantalon verde
    p(1, 10+legP, 4, 8, '#3A5A1A'); p(7, 10-legP, 4, 8, '#3A5A1A');
    // Cuerpo / chaleco
    p(0, 5, 12, 6, '#4A6A2A');
    // Bolsillos
    p(1, 6, 3, 3, '#3A5A1A'); p(8, 6, 3, 3, '#3A5A1A');
    // Brazos
    const armS = Math.sin(frame * 1.1) * 1.5;
    p(-2, 5+armS, 3, 6, '#4A6A2A'); p(11, 5-armS, 3, 6, '#4A6A2A');
    // Manos
    p(-2, 10+armS, 3, 2, '#C4A882'); p(11, 10-armS, 3, 2, '#C4A882');
    // Arma (rifle)
    p(12, 6, 9, 2, '#333333'); p(19, 5, 2, 5, '#222222');
    // Cuello
    p(4, 3, 4, 3, '#C4A882');
    // Cabeza
    p(1, -3, 10, 7, '#C4A882');
    // Casco militar
    p(0, -6, 12, 4, '#3A5A1A');
    p(-1,-5, 14, 2, '#2A4A0A');
    p(0, -4, 12, 1, '#4A7A2A');
    // Ojos
    p(2, -1, 2, 2, '#1A1A2E'); p(7, -1, 2, 2, '#1A1A2E');
    p(2, -1, 1, 1, '#FFFFFF'); p(7, -1, 1, 1, '#FFFFFF');
    // Boca
    p(4, 2, 4, 1, '#8B4513');
    // Insignia en el casco
    p(5, -5, 2, 1, '#FFD700');

    ctx.globalAlpha = 1; ctx.restore();
  },

  // ─── ENEMIGO ACUATICO (PEZ) ───────────────────────
  drawFish(ctx, x, y, frame, dir) {
    ctx.save();
    if (dir === -1) { ctx.translate(x + 36, y); ctx.scale(-1, 1); x = 0; y = 0; }
    else            { ctx.translate(x, y); x = 0; y = 0; }
    const S = 2;
    const p = (rx, ry, rw, rh, color) => this._p(ctx, rx, ry, rw, rh, color, x, y, S);

    const bodyCol  = '#00668A';
    const bodyDark = '#004466';
    const bellyCol = '#00AACC';
    const finCol   = '#005577';
    const tailWave = frame === 0 ? 2 : -2;

    // Cola (animada)
    p(13, 4+tailWave, 5, 8, finCol);
    p(16, 6+tailWave, 4, 4, bodyDark);

    // Cuerpo principal (elipse)
    p(1,  3, 14, 10, bodyCol);
    p(2,  4, 12,  8, bodyCol);
    p(0,  5, 16,  6, bodyCol);
    // Panza
    p(2,  6, 10,  5, bellyCol);
    p(3,  7,  8,  3, '#00CCEE');
    // Escamas
    p(3,  4,  3,  3, bodyDark); p(7, 4, 3, 3, bodyDark);
    p(5,  8,  3,  3, bodyDark); p(9, 8, 3, 3, bodyDark);

    // Aleta dorsal
    p(5, 0, 6, 5, finCol);
    p(6, 1, 4, 3, '#0077AA');
    // Aleta pectoral
    p(4, 9, 4, 4, finCol);

    // Cabeza / boca
    p(-2, 5, 5, 6, bodyCol);
    p(-4, 6, 4, 4, bodyCol);
    // Boca abierta (animada)
    if (frame === 0) {
      p(-5, 6, 4, 2, bodyDark);
      p(-5, 8, 4, 2, '#FFFFF0');
    } else {
      p(-4, 7, 3, 2, bodyDark);
    }
    // Ojo grande
    p(0,  5, 4, 4, '#FFEE00');
    p(1,  6, 2, 2, '#001122');
    p(1,  6, 1, 1, '#FFFFFF');
    // Dientes peligrosos
    p(-5, 6, 1, 2, '#FFFFF0'); p(-4, 6, 1, 2, '#FFFFF0');

    ctx.restore();
  },


  // ─── TIBURÓN DEVORADOR (SHARK) ────────────────────
  drawShark(ctx, x, y, frame, dir) {
    ctx.save();
    if (dir === -1) { ctx.translate(x + 44, y); ctx.scale(-1, 1); x = 0; y = 0; }
    else            { ctx.translate(x, y); x = 0; y = 0; }
    const S = 2;
    const p = (rx, ry, rw, rh, color) => this._p(ctx, rx, ry, rw, rh, color, x, y, S);

    const bodyCol  = '#4A607A';
    const bodyDark = '#2E3E52';
    const bellyCol = '#D8E2EC';
    const tailP    = (frame % 2 === 0) ? 2 : -2;

    // Cola de tiburón
    p(16, 4+tailP, 4, 8, bodyCol);
    p(19, 2+tailP, 3, 12, bodyDark);

    // Aleta dorsal imponente
    p(7, -4, 5, 6, bodyDark);
    p(8, -2, 3, 4, bodyCol);

    // Cuerpo
    p(0, 3, 17, 8, bodyCol);
    p(2, 2, 14, 2, bodyCol);
    // Vientre blanco
    p(1, 8, 14, 4, bellyCol);
    p(3, 10, 10, 2, '#FFFFFF');

    // Aleta pectoral
    p(6, 9, 5, 5, bodyDark);

    // Hocico y mandíbula
    p(-4, 4, 5, 6, bodyCol);
    p(-6, 5, 3, 4, bodyCol);
    // Dientes afilados
    p(-5, 7, 5, 2, '#FFFFFF');
    p(-3, 8, 4, 1, '#FF2222'); // interior boca
    p(-4, 7, 1, 1, '#EEEEEE'); p(-2, 7, 1, 1, '#EEEEEE');

    // Ojo feroz
    p(-1, 4, 3, 3, '#FF2200');
    p(0, 5, 1, 1, '#FFFFFF');

    // Branquias
    p(3, 5, 1, 4, '#1E2836');
    p(4, 5, 1, 4, '#1E2836');

    ctx.restore();
  },

  // ─── PULPO GIGANTE (OCTOPUS) ──────────────────────
  drawOctopus(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(x, y);
    const S = 2;
    const p = (rx, ry, rw, rh, color) => this._p(ctx, rx, ry, rw, rh, color, 0, 0, S);

    const f = frame % 4;
    const tWave = f === 0 ? 0 : f === 1 ? 2 : f === 2 ? 0 : -2;

    // Cabeza de pulpo
    p(2, 0, 12, 11, '#8A2BE2');
    p(4, -2, 8, 4, '#9932CC');
    p(5, -3, 6, 2, '#BA55D3');
    // Brillo cabeza
    p(4, 1, 3, 3, '#DDA0DD');

    // Ojos grandes amarillos
    p(3, 5, 4, 4, '#FFEE00');
    p(9, 5, 4, 4, '#FFEE00');
    p(4, 6, 2, 2, '#110022');
    p(10, 6, 2, 2, '#110022');
    p(5, 6, 1, 1, '#FFFFFF');
    p(11, 6, 1, 1, '#FFFFFF');

    // Sifón / boca
    p(6, 9, 4, 3, '#4B0082');

    // 4 Tentáculos ondulantes
    p(0, 11, 3, 6+tWave, '#7B1FA2');
    p(4, 11, 3, 7-tWave, '#8E24AA');
    p(8, 11, 3, 7+tWave, '#8E24AA');
    p(12, 11, 3, 6-tWave, '#7B1FA2');
    // Ventosas
    p(1, 13, 1, 2, '#FFD700');
    p(5, 14, 1, 2, '#FFD700');
    p(9, 14, 1, 2, '#FFD700');
    p(13, 13, 1, 2, '#FFD700');

    ctx.restore();
  },

  // ─── AVIÓN ENEMIGO (PLANE) ────────────────────────
  drawPlaneEnemy(ctx, x, y, frame, dir) {
    ctx.save();
    if (dir === -1) { ctx.translate(x + 40, y); ctx.scale(-1, 1); x = 0; y = 0; }
    else            { ctx.translate(x, y); x = 0; y = 0; }
    const S = 2;
    const p = (rx, ry, rw, rh, color) => this._p(ctx, rx, ry, rw, rh, color, x, y, S);

    const f = frame % 2;

    // Fuselaje militar
    p(0, 6, 18, 5, '#4A5844');
    p(2, 4, 12, 3, '#5A6854');
    // Nariz del avión
    p(18, 7, 3, 3, '#2A3024');

    // Hélice giratoria
    const propCol = f === 0 ? '#E0E0E0' : '#888888';
    p(21, 3, 1, 11, propCol);

    // Cabina de piloto (vidrio azul brillante)
    p(7, 3, 5, 3, '#00CCFF');
    p(8, 4, 3, 1, '#FFFFFF');

    // Alas
    p(5, 1, 7, 3, '#3A4834');
    p(4, 10, 8, 3, '#3A4834');

    // Alerón trasero
    p(-2, 2, 4, 5, '#2A3824');
    p(-3, 3, 2, 3, '#FF3300'); // insignia roja

    // Fuego de escape
    p(-4, 7, 3, 2, f === 0 ? '#FF6600' : '#FFCC00');

    ctx.restore();
  },

  // ─── PROYECTIL DE TINTA ───────────────────────────
  drawInk(ctx, x, y, frame) {
    ctx.save();
    ctx.fillStyle = '#1A002E';
    ctx.beginPath();
    ctx.arc(x + 6, y + 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4A0E6B';
    ctx.beginPath();
    ctx.arc(x + 4, y + 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // ─── HUD: BARRA DE ENERGIA DEL JEFE ───────────────
  drawBossBar(ctx, hp, maxHp, phase, name) {
    const BW = 320;
    const BH = 18;
    const BX = (800 - BW) / 2;
    const BY = 12;

    // Fondo
    ctx.fillStyle = '#000000BB';
    ctx.fillRect(BX - 4, BY - 4, BW + 8, BH + 24);
    ctx.strokeStyle = '#660000';
    ctx.lineWidth = 2;
    ctx.strokeRect(BX - 4, BY - 4, BW + 8, BH + 24);

    // Riel de la barra
    ctx.fillStyle = '#330000';
    ctx.fillRect(BX, BY, BW, BH);

    // Relleno de energía
    const pct = Math.max(0, hp / maxHp);
    const barColor = phase >= 2 ? '#FF4400' : '#CC0000';
    ctx.fillStyle = barColor;
    ctx.fillRect(BX, BY, BW * pct, BH);

    // Brillo
    ctx.fillStyle = phase >= 2 ? '#FF8866' : '#FF4444';
    ctx.fillRect(BX, BY, BW * pct, 4);

    // Bordes de segmento
    for (let i = 1; i < maxHp; i++) {
      ctx.fillStyle = '#00000066';
      ctx.fillRect(BX + (BW / maxHp) * i - 1, BY, 2, BH);
    }

    // Nombre
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      name + (phase >= 2 ? '  ⚠ FASE 2 ⚠' : ''),
      800 / 2,
      BY + BH + 14
    );
  },

  // ─── ESTRELLAS DE FONDO ───────────────────────────
  drawStar(ctx, x, y, size, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, size, size);
    ctx.globalAlpha = 1;
  },

  // ─── ANTORCHA DE CUEVA ───────────────────────────
  drawTorch(ctx, x, y, frame) {
    // Poste
    ctx.fillStyle = '#6B3A10';
    ctx.fillRect(x - 3, y, 6, 18);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - 2, y, 4, 17);
    // Soporte
    ctx.fillStyle = '#555555';
    ctx.fillRect(x - 5, y + 2, 10, 4);

    const flick = Math.sin(frame * 0.25) * 2;

    // Fuego
    ctx.fillStyle = '#FF6600';
    ctx.beginPath();
    ctx.arc(x, y - 6 + flick, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF9900';
    ctx.beginPath();
    ctx.arc(x, y - 8 + flick, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFEE00';
    ctx.beginPath();
    ctx.arc(x - 1, y - 9 + flick, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - 1, y - 10 + flick, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Halo de luz
    const grd = ctx.createRadialGradient(x, y - 6, 0, x, y - 6, 45);
    grd.addColorStop(0, 'rgba(255,150,50,0.22)');
    grd.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 45, y - 51, 90, 90);
  }
};
