'use strict';

// ====================================================
//   AVENTURAS MARCE!
//   Motor principal del juego – 3 Niveles
//   Controles: ← → Mover | ↑/Espacio Saltar | Z Hacha
// ====================================================

const CW = 800, CH = 450;          // Tamaño del canvas
const GRAVITY      = 0.52;
const MAX_FALL     = 14;
const PLAYER_SPD   = 4.6;
const JUMP_FORCE   = -11.5;
const AXE_SPD      = 9;
const INV_FRAMES   = 90;
const AXE_CD       = 28;

// Estado del juego
const GS = { MENU:0, PLAYING:1, PAUSED:2, LEVEL_DONE:3, GAME_OVER:4, VICTORY:5 };

// ─────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────
const Keys = {
  right:false, left:false, up:false, attack:false, bomb:false,
  _jump:false, _atk:false, _bomb:false,

  _mapKey(code, key, keyCode) {
    const kLower = (key || '').toLowerCase();
    if (code === 'ArrowRight' || code === 'KeyD' || kLower === 'd' || kLower === 'arrowright' || keyCode === 39 || keyCode === 68) return 'right';
    if (code === 'ArrowLeft' || code === 'KeyA' || kLower === 'a' || kLower === 'arrowleft' || keyCode === 37 || keyCode === 65) return 'left';
    if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space' || kLower === 'w' || kLower === ' ' || kLower === 'arrowup' || keyCode === 38 || keyCode === 87 || keyCode === 32) return 'up';
    if (code === 'ArrowDown' || code === 'KeyS' || kLower === 's' || kLower === 'arrowdown' || keyCode === 40 || keyCode === 83) return 'down';
    if (code === 'KeyZ' || code === 'KeyX' || kLower === 'z' || kLower === 'x' || keyCode === 90 || keyCode === 88) return 'attack';
    if (code === 'KeyC' || code === 'KeyB' || code === 'KeyV' || code === 'ShiftLeft' || code === 'ShiftRight' || kLower === 'c' || kLower === 'b' || kLower === 'v' || kLower === 'shift' || keyCode === 67 || keyCode === 66 || keyCode === 86 || keyCode === 16) return 'bomb';
    return null;
  },

  init() {
    const onDown = e => {
      const k = this._mapKey(e.code, e.key, e.keyCode);
      if (k) {
        if (!this[k]) {
          if (k === 'up') this._jump = true;
          if (k === 'attack') this._atk = true;
          if (k === 'bomb') this._bomb = true;
        }
        this[k] = true;
      }
    };
    const onUp = e => {
      const k = this._mapKey(e.code, e.key, e.keyCode);
      if (k) this[k] = false;
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
  },
  consumeJump()   { const v=this._jump; this._jump=false; return v; },
  consumeAttack() { const v=this._atk;  this._atk=false;  return v; },
  consumeBomb()   { const v=this._bomb; this._bomb=false; return v; }
};

// ─────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────
const clamp   = (v,a,b) => Math.max(a,Math.min(b,v));
const randI   = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const randF   = (a,b) => Math.random()*(b-a)+a;
const overlap = (ax,ay,aw,ah, bx,by,bw,bh) =>
  ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
const hitBox = overlap;

// ─────────────────────────────────────────────────────
// CÁMARA
// ─────────────────────────────────────────────────────
class Camera {
  constructor(lw, lh) {
    this.x=0; this.y=0;
    this.lw=lw; this.lh=lh;
    this.sx=0; this.sy=0; this.sd=0; this.si=0;
  }
  follow(px,py,pw,ph) {
    const tx = px+pw/2 - CW/2;
    const ty = py+ph/2 - CH/2;
    this.x += (tx-this.x)*0.09;
    this.y += (ty-this.y)*0.09;
    this.x  = clamp(this.x, 0, Math.max(0,this.lw-CW));
    this.y  = clamp(this.y, 0, Math.max(0,this.lh-CH));
  }
  shake(dur, intensity) { this.sd=dur; this.si=intensity||5; }
  update() {
    if(this.sd>0){ this.sx=(Math.random()-.5)*this.si; this.sy=(Math.random()-.5)*this.si; this.sd--; }
    else { this.sx=0; this.sy=0; }
  }
  sx2(wx){ return wx - this.x + this.sx; }
  sy2(wy){ return wy - this.y + this.sy; }
  wx(x){ return this.sx2(x); }
  wy(y){ return this.sy2(y); }
}

// ─────────────────────────────────────────────────────
// PARTÍCULA
// ─────────────────────────────────────────────────────
class Particle {
  constructor(x,y,color,vx,vy,life,size) {
    this.x=x; this.y=y; this.color=color;
    this.vx=vx??randF(-3,3);
    this.vy=vy??randF(-6,-1);
    this.life=life??40; this.ml=this.life;
    this.size=size??randI(3,7);
  }
  update(){ this.x+=this.vx; this.y+=this.vy; this.vy+=0.22; this.vx*=0.96; this.life--; }
  get alive(){ return this.life>0; }
  draw(ctx,cam){
    const a=this.life/this.ml;
    ctx.globalAlpha=a;
    ctx.fillStyle=this.color;
    ctx.fillRect(Math.floor(cam.sx2(this.x)-this.size/2), Math.floor(cam.sy2(this.y)-this.size/2), this.size, this.size);
    ctx.globalAlpha=1;
  }
}

// ─────────────────────────────────────────────────────
// HACHA (proyectil)
// ─────────────────────────────────────────────────────
class Axe {
  constructor(x,y,dir) {
    this.x=x; this.y=y;
    this.w=16; this.h=16;
    this.vx=dir*AXE_SPD; this.vy=-4;
    this.alive=true; this.angle=0;
    this.bounces=0; this.maxBounces=2;
  }
  update(platforms, game) {
    this.vy += 0.3;
    this.x  += this.vx;
    this.y  += this.vy;
    this.angle += this.vx > 0 ? 0.35 : -0.35;

    for(const p of platforms){
      if(!p.solid) continue;
      if(overlap(this.x,this.y,this.w,this.h, p.x,p.y,p.w,p.h)){
        const oB=(this.y+this.h)-p.y, oT=(p.y+p.h)-this.y;
        const oR=(this.x+this.w)-p.x, oL=(p.x+p.w)-this.x;
        const mv = Math.min(oB,oT), mh = Math.min(oR,oL);
        if(mv < mh){
          if(oB<oT){ this.y=p.y-this.h; this.vy*=-0.55; this.vx*=0.75; }
          else     { this.y=p.y+p.h;    this.vy*=-0.4; }
        } else {
          if(oR<oL){ this.x=p.x-this.w; } else { this.x=p.x+p.w; }
          this.vx *= -0.65;
        }
        this.bounces++;
        if(this.bounces>=this.maxBounces){ this.alive=false; return; }
      }
    }
    if(this.y>game.level.height+60 || this.x<-100 || this.x>game.level.width+100)
      this.alive=false;
  }
  draw(ctx,cam){
    const sx=cam.sx2(this.x+this.w/2), sy=cam.sy2(this.y+this.h/2);
    ctx.save();
    ctx.translate(Math.floor(sx), Math.floor(sy));
    ctx.rotate(this.angle);
    Sprites.drawAxe(ctx,-this.w/2,-this.h/2);
    ctx.restore();
  }
}


// ─────────────────────────────────────────────────────
// BOMBA EXPLOSIVA (arma secundaria)
// ─────────────────────────────────────────────────────
class Bomb {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = dir * 7.5;
    this.vy = -6.0;
    this.alive = true;
    this.timer = 110;
    this.frame = 0;
    this.ft = 0;
    this.angle = 0;
  }

  update(platforms, game) {
    this.vy += 0.38;
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.vx * 0.08;
    this.timer--;

    this.ft++;
    if (this.ft >= 5) {
      this.frame = (this.frame + 1) % 4;
      this.ft = 0;
    }

    // Colisión con plataformas
    for (const p of platforms) {
      if (!p.solid) continue;
      if (overlap(this.x, this.y, this.w, this.h, p.x, p.y, p.w, p.h)) {
        this.explode(game);
        return;
      }
    }

    // Colisión con enemigos
    for (const e of game.enemies) {
      if (!e.alive || e.dead) continue;
      if (overlap(this.x, this.y, this.w, this.h, e.x, e.y, e.w, e.h)) {
        this.explode(game);
        return;
      }
    }

    if (this.timer <= 0 || this.y > game.level.height + 60) {
      this.explode(game);
    }
  }

  explode(game) {
    if (!this.alive) return;
    this.alive = false;
    Sound.explosion();
    game.camera.shake(18, 8);

    const radius = 90;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    const colors = ['#FF2200', '#FF6600', '#FFAA00', '#FFDD00', '#555555', '#222222', '#FFFFFF'];
    for (let i = 0; i < 32; i++) {
      game.particles.push(new Particle(
        cx, cy,
        colors[i % colors.length],
        randF(-8, 8), randF(-10, 4),
        randI(35, 65), randI(6, 14)
      ));
    }

    // Daño masivo de área (3 puntos de daño)
    for (const e of game.enemies) {
      if (!e.alive || e.dead) continue;
      const ecx = e.x + e.w / 2;
      const ecy = e.y + e.h / 2;
      const dist = Math.hypot(ecx - cx, ecy - cy);
      if (dist <= radius) {
        e.takeDamage(3, game);
      }
    }
  }

  draw(ctx, cam) {
    if (!this.alive) return;
    Sprites.drawBomb(ctx, Math.floor(cam.sx2(this.x)), Math.floor(cam.sy2(this.y)), this.angle, this.frame);
  }
}

// ─────────────────────────────────────────────────────
// BOLA DE FUEGO
// ─────────────────────────────────────────────────────
class Fireball {
  constructor(x,y,dir,vx,vy,isBoss){
    this.x=x-8; this.y=y-8;
    this.w=isBoss?20:14; this.h=isBoss?20:14;
    this.vx=vx!==undefined?vx:dir*3.5;
    this.vy=vy!==undefined?vy:0;
    this.alive=true; this.frame=0; this.ft=0;
    this.isBoss=!!isBoss; this.time=0;
  }
  update(platforms,game){
    this.x+=this.vx; this.y+=this.vy;
    if(!this.isBoss) this.vy+=0.04;
    this.time++; this.ft++;
    if(this.ft>=4){ this.frame=(this.frame+1)%4; this.ft=0; }

    for(const p of platforms){
      if(!p.solid) continue;
      if(overlap(this.x,this.y,this.w,this.h, p.x,p.y,p.w,p.h)){
        this._explode(game); return;
      }
    }
    const pl=game.player;
    if(pl&&!pl.dead&&pl.invincible<=0&&
       overlap(this.x,this.y,this.w,this.h, pl.x,pl.y,pl.w,pl.h)){
      pl.takeDamage(1,game);
      this._explode(game); return;
    }
    if(this.time>360||this.x<-50||this.x>game.level.width+50||this.y>game.level.height+50)
      this.alive=false;
  }
  _explode(game){
    this.alive=false;
    const cols=['#FF6600','#FF4400','#FFAA00'];
    for(let i=0;i<7;i++){
      game.particles.push(new Particle(
        this.x+this.w/2, this.y+this.h/2,
        cols[i%3], randF(-5,5), randF(-5,5), 22, randI(3,6)
      ));
    }
  }
  draw(ctx,cam){
    Sprites.drawFireball(ctx, Math.floor(cam.sx2(this.x)), Math.floor(cam.sy2(this.y)), this.frame, this.isBoss);
  }
}

// ─────────────────────────────────────────────────────
// MONEDA
// ─────────────────────────────────────────────────────
class Coin {
  constructor(x,y){ this.x=x; this.y=y; this.w=16; this.h=16; this.alive=true; this.collected=false; this.frame=0; this.ft=0; this.t=Math.random()*Math.PI*2; this.ca=0; }
  update(player,game){
    if(this.collected){ this.ca++; if(this.ca>22) this.alive=false; return; }
    this.t+=0.045; this.ft++; if(this.ft>=7){this.frame=(this.frame+1)%8;this.ft=0;}
    const yy=this.y+Math.sin(this.t)*3;
    if(player&&!player.dead&&overlap(this.x,yy,this.w,this.h, player.x,player.y,player.w,player.h)){
      this.collected=true;
      player.coins++; player.score+=50;
      Sound.coin();
      for(let i=0;i<5;i++)
        game.particles.push(new Particle(this.x+8,this.y,'#FFD700',randF(-2,2),randF(-4,-1),22,4));
    }
  }
  draw(ctx,cam){
    if(!this.alive) return;
    if(this.collected){
      ctx.globalAlpha=Math.max(0,1-this.ca/22);
      ctx.fillStyle='#FFD700';
      ctx.font='bold 13px monospace'; ctx.textAlign='center';
      ctx.fillText('+50', cam.sx2(this.x+8), cam.sy2(this.y)-this.ca*2);
      ctx.globalAlpha=1; return;
    }
    Sprites.drawCoin(ctx, Math.floor(cam.sx2(this.x)), Math.floor(cam.sy2(this.y+Math.sin(this.t)*3)), this.frame);
  }
}


// ─────────────────────────────────────────────────────
// CORAZÓN / TÓNICO COLECCIONABLE (Curación y Vidas Extra)
// ─────────────────────────────────────────────────────
class HeartItem {
  constructor(x, y, isPotion = false) {
    this.x = x;
    this.y = y;
    this.w = 18;
    this.h = 18;
    this.alive = true;
    this.collected = false;
    this.isPotion = isPotion;
    this.frame = 0;
    this.ft = 0;
    this.t = Math.random() * Math.PI * 2;
    this.ca = 0;
    this.floatText = '';
  }

  update(player, game) {
    if (this.collected) {
      this.ca++;
      if (this.ca > 28) this.alive = false;
      return;
    }
    this.t += 0.055;
    this.ft++;
    if (this.ft >= 6) {
      this.frame = (this.frame + 1) % 4;
      this.ft = 0;
    }

    const yy = this.y + Math.sin(this.t) * 4;

    if (player && !player.dead && overlap(this.x, yy, this.w, this.h, player.x, player.y, player.w, player.h)) {
      this.collected = true;
      Sound.powerUp();

      if (player.hp < player.maxHp) {
        player.hp++;
        this.floatText = '+1 SALUD ❤';
      } else {
        player.lives++;
        player.score += 200;
        this.floatText = '+1 VIDA EXTRA ❤';
      }

      const cols = this.isPotion ? ['#00FFFF', '#00FF88', '#FFFFFF'] : ['#FF1A4B', '#FF88AA', '#FFFFFF'];
      for (let i = 0; i < 14; i++) {
        game.particles.push(new Particle(
          this.x + 9, this.y + 9,
          cols[i % cols.length],
          randF(-4, 4), randF(-6, -1),
          35, randI(4, 7)
        ));
      }
    }
  }

  draw(ctx, cam) {
    if (!this.alive) return;
    if (this.collected) {
      ctx.globalAlpha = Math.max(0, 1 - this.ca / 28);
      ctx.fillStyle = this.isPotion ? '#00FFFF' : '#FF1A4B';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.floatText, cam.sx2(this.x + 9), cam.sy2(this.y) - this.ca * 1.8);
      ctx.globalAlpha = 1;
      return;
    }
    const yy = this.y + Math.sin(this.t) * 4;
    if (this.isPotion) {
      Sprites.drawPotionItem(ctx, Math.floor(cam.sx2(this.x)), Math.floor(cam.sy2(yy)), this.frame);
    } else {
      Sprites.drawHeartItem(ctx, Math.floor(cam.sx2(this.x)), Math.floor(cam.sy2(yy)), this.frame);
    }
  }
}

// ─────────────────────────────────────────────────────
// JUGADOR
// ─────────────────────────────────────────────────────
class Player {
  constructor(x,y){
    this.x=x; this.y=y; this.w=24; this.h=40;
    this.vx=0; this.vy=0; this.dir=1;
    this.onGround=false; this.jumpCount=0;
    this.hp=3; this.maxHp=3; this.lives=3;
    this.coins=0; this.score=0;
    this.axes=[]; this.axeCd=0; this.invincible=0;
    this.bombs=5; this.maxBombs=5; this.bombCd=0; this.bombRegenTimer=0;
    this.dead=false; this.deathTimer=0;
    this.frame=0; this.ft=0;
    this.state='idle'; // idle|run|jump|attack|hurt|dead
    this.startX=x; this.startY=y;
  }

  update(keys, platforms, game){
    if(this.dead){
      this.deathTimer++;
      this.vy+=GRAVITY; this.y+=this.vy*0.5;
      if(this.deathTimer>100){
        this.lives--;
        if(this.lives<=0){ game.triggerGameOver(); }
        else             { this.respawn(game); }
      }
      return;
    }

    // Movimiento horizontal
    let moving=false;
    if(keys.left) { this.vx=-PLAYER_SPD; this.dir=-1; moving=true; }
    else if(keys.right){ this.vx= PLAYER_SPD; this.dir= 1; moving=true; }
    else { this.vx*=0.72; if(Math.abs(this.vx)<0.15) this.vx=0; }

    // Salto (doble salto permitido)
    if(keys.consumeJump()){
      if(this.jumpCount<2){
        if(this.jumpCount===0){ Sound.jump(); }
        else { Sound.doubleJump(); }
        this.vy = JUMP_FORCE + this.jumpCount*0.8;
        this.jumpCount++; this.onGround=false;
      }
    }

    // Atacar con Hacha
    if(keys.consumeAttack() && this.axeCd<=0){
      this._throwAxe(game);
    }
    if(this.axeCd>0) this.axeCd--;

    // Tirar Bomba
    if(keys.consumeBomb() && this.bombCd<=0 && this.bombs>0){
      this._throwBomb(game);
    }
    if(this.bombCd>0) this.bombCd--;

    // Regenerar bombas automáticamente con el tiempo
    if(this.bombs < this.maxBombs){
      this.bombRegenTimer++;
      if(this.bombRegenTimer >= 160){ // ~2.6 segundos
        this.bombs++;
        this.bombRegenTimer = 0;
      }
    }

    if(this.invincible>0) this.invincible--;

    // Gravedad
    this.vy = clamp(this.vy + GRAVITY, -20, MAX_FALL);

    // Mover y resolver colisiones
    this.x += this.vx;
    this._resolveX(platforms);
    this.y += this.vy;
    const wasGround = this.onGround;
    this.onGround = false;
    this._resolveY(platforms);
    if(this.onGround && !wasGround){
      if(this.vy>3) Sound.landing();
      this.jumpCount=0;
    }

    // Límites del nivel y lava mortal
    this.x = Math.max(0, this.x);
    if(this.y > game.level.height+80) {
      this.takeDamage(1, game, true);
    } else if(game.level.hasLava && this.y >= game.level.groundY - 12 && this.invincible <= 0) {
      // Quemadura en la lava
      Sound.lavaBurn();
      for(let i=0; i<16; i++){
        game.particles.push(new Particle(this.x + randF(0, this.w), this.y + this.h, '#FF3300', randF(-4, 4), randF(-7, -2), 30, randI(4, 9)));
      }
      if(game.infiniteLives){
        this.invincible = 40;
        this.vy = -12; // gran impulso para salir de la lava
      } else {
        this.takeDamage(1, game);
        this.vy = -9;
      }
    }

    // Estado de animación
    if(!this.dead){
      if(!this.onGround)  this.state='jump';
      else if(moving)     this.state='run';
      else                this.state='idle';
    }
    this.ft++;
    if(this.state==='run'&&this.ft>=5){ this.frame=(this.frame+1)%4; this.ft=0; }
    else if(this.state!=='run'){ if(this.ft>12) this.ft=0; }

    // Actualizar hachas
    this.axes=this.axes.filter(a=>a.alive);
    this.axes.forEach(a=>a.update(platforms,game));
  }

  _resolveX(platforms){
    for(const p of platforms){
      if(!p.solid) continue;
      if(overlap(this.x,this.y,this.w,this.h, p.x,p.y,p.w,p.h)){
        const oR=(this.x+this.w)-p.x, oL=(p.x+p.w)-this.x;
        if(oR<oL){ this.x=p.x-this.w; } else { this.x=p.x+p.w; }
        this.vx=0;
      }
    }
  }

  _resolveY(platforms){
    for(const p of platforms){
      if(!p.solid) continue;
      if(overlap(this.x,this.y,this.w,this.h, p.x,p.y,p.w,p.h)){
        const oB=(this.y+this.h)-p.y, oT=(p.y+p.h)-this.y;
        if(oB<oT){ this.y=p.y-this.h; this.vy=0; this.onGround=true; }
        else      { this.y=p.y+p.h;   if(this.vy<0) this.vy=0; }
      }
    }
  }

  _throwAxe(game){
    const ax = this.dir===1 ? this.x+this.w+2 : this.x-18;
    const ay = this.y + this.h*0.25;
    this.axes.push(new Axe(ax, ay, this.dir));
    this.axeCd=AXE_CD;
    this.state='attack';
    Sound.axeThrow();
  }

  _throwBomb(game){
    const bx = this.dir===1 ? this.x+this.w+4 : this.x-20;
    const by = this.y + this.h*0.2;
    game.bombs.push(new Bomb(bx, by, this.dir));
    this.bombs--;
    this.bombCd = 35;
    this.state = 'attack';
    Sound.bombThrow();
  }

  takeDamage(amount, game, fallDeath=false){
    if(this.invincible>0 || this.dead) return;

    if(game.infiniteLives || this.infiniteLives){
      this.hp = this.maxHp;
      this.lives = 999;
      this.invincible = INV_FRAMES + 15;
      Sound.playerHit();
      game.camera.shake(8, 4);
      this.vy = -6;
      this.vx = this.dir * -3;
      this.state = 'hurt';
      if(fallDeath){
        this.x = Math.max(50, this.x - 140);
        this.y = game.level.groundY - 56;
        this.vy = -8;
      }
      return;
    }

    this.hp-=amount; this.invincible=INV_FRAMES;
    Sound.playerHit(); game.camera.shake(12,6);
    this.vy=-5; this.vx=this.dir*-4;
    if(this.hp<=0 || fallDeath) this._die(game);
    else this.state='hurt';
  }

  _die(game){
    this.dead=true; this.deathTimer=0; this.state='dead'; this.vx=0;
    for(let i=0;i<14;i++)
      game.particles.push(new Particle(
        this.x+this.w/2, this.y+this.h/2,
        ['#FF6B6B','#FF4444','#FFAA00'][randI(0,2)],
        randF(-6,6), randF(-9,-2), 55
      ));
  }

  respawn(game){
    this.x=this.startX; this.y=this.startY;
    this.vx=0; this.vy=0; this.hp=this.maxHp;
    this.dead=false; this.deathTimer=0; this.state='idle';
    this.invincible=80; this.jumpCount=0;
    game.camera.x=0; game.camera.y=0;
  }

  draw(ctx, cam){
    if(this.dead && this.deathTimer>80) return;
    if(this.invincible>0 && Math.floor(this.invincible/5)%2===0) return;
    Sprites.drawPlayer(
      ctx,
      Math.floor(cam.sx2(this.x)),
      Math.floor(cam.sy2(this.y)),
      this.frame, this.dir, this.state
    );
  }
}

// ─────────────────────────────────────────────────────
// ZOMBIE
// ─────────────────────────────────────────────────────
class Zombie {
  constructor(data, platforms){
    this.w=22; this.h=36;
    this.x=data.x;
    this.y=this._findGround(data.x, platforms)-this.h;
    this.vx=-1.6; this.vy=0; this.dir=-1;
    this.pL=data.x; this.pR=data.x+(data.patrolW||120);
    this.alive=true; this.hp=1; this.dead=false; this.dt=0;
    this.frame=0; this.ft=0; this.onGround=false;
    this.speed=1.6+Math.random()*0.6;
  }
  _findGround(x, platforms){
    let best=9999;
    for(const p of platforms){
      if(!p.solid) continue;
      if(x+this.w>p.x && x<p.x+p.w && p.y>80) best=Math.min(best,p.y);
    }
    return best===9999?384:best;
  }
  update(dt, platforms, player, game){
    if(this.dead){ this.dt++; if(this.dt>45) this.alive=false; return; }

    this.x+=this.vx;
    if(this.x<=this.pL){ this.x=this.pL; this.vx=this.speed; this.dir=1; }
    else if(this.x+this.w>=this.pR){ this.x=this.pR-this.w; this.vx=-this.speed; this.dir=-1; }

    // Detección de borde de plataforma
    if(this.onGround){
      const cx=this.dir===1?this.x+this.w+4:this.x-4;
      const cy=this.y+this.h+10;
      let hasGround=false;
      for(const p of platforms){
        if(!p.solid) continue;
        if(cx>=p.x && cx<=p.x+p.w && cy>=p.y && cy<=p.y+p.h+12){ hasGround=true; break; }
      }
      if(!hasGround){ this.vx=-this.vx; this.dir=-this.dir; }
    }

    this.vy=clamp(this.vy+GRAVITY,-20,MAX_FALL);
    this.y+=this.vy; this.onGround=false;
    for(const p of platforms){
      if(!p.solid) continue;
      if(overlap(this.x,this.y,this.w,this.h, p.x,p.y,p.w,p.h)){
        const oB=(this.y+this.h)-p.y, oT=(p.y+p.h)-this.y;
        if(oB<oT){ this.y=p.y-this.h; this.vy=0; this.onGround=true; }
      }
    }

    this.ft++; if(this.ft>=9){this.frame=(this.frame+1)%4;this.ft=0;}

    if(player&&!player.dead&&player.invincible<=0&&
       overlap(this.x,this.y,this.w,this.h, player.x,player.y,player.w,player.h))
      player.takeDamage(1,game);
  }
  takeDamage(amount,game){
    this.hp-=amount;
    if(this.hp<=0) this._die(game); else Sound.axeHit();
  }
  _die(game){
    this.dead=true; Sound.enemyDie(); game.camera.shake(6,3);
    const cols=['#4CAF50','#8BC34A','#CDDC39'];
    for(let i=0;i<9;i++)
      game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, cols[i%3], randF(-4,4), randF(-7,-1),38));
    if(Math.random()<0.55) game.coins.push(new Coin(this.x+3,this.y));
    game.player.score+=100;
  }
  draw(ctx,cam){
    if(!this.alive) return;
    const a=this.dead?Math.max(0,1-this.dt/45):1;
    ctx.globalAlpha=a;
    Sprites.drawZombie(ctx, Math.floor(cam.sx2(this.x)), Math.floor(cam.sy2(this.y)), this.frame, this.dir, this.dead);
    ctx.globalAlpha=1;
  }
}

// ─────────────────────────────────────────────────────
// DRAGÓN VOLADOR
// ─────────────────────────────────────────────────────
class Dragon {
  constructor(data){
    this.x=data.x; this.y=data.y||155;
    this.startY=this.y; this.w=44; this.h=32;
    this.vx=-1.8; this.dir=-1;
    this.alive=true; this.hp=2; this.dead=false; this.dt=0;
    this.frame=0; this.ft=0;
    this.fbCd=randI(100,190);
    this.pL=data.x-(data.patrolW||160); this.pR=data.x+(data.patrolW||160);
    this.sin=Math.random()*Math.PI*2;
    this.speed=1.8+Math.random()*0.6;
    this.time=0;
  }
  update(dt, player, game){
    if(this.dead){ this.dt++; if(this.dt>55) this.alive=false; return; }
    this.time++;
    this.x+=this.vx;
    this.y=this.startY+Math.sin(this.time*0.028+this.sin)*38;
    if(this.x<=this.pL){ this.x=this.pL; this.vx=this.speed; this.dir=1; }
    else if(this.x+this.w>=this.pR){ this.x=this.pR-this.w; this.vx=-this.speed; this.dir=-1; }
    if(player) this.dir=player.x>this.x+this.w/2?1:-1;

    this.fbCd--;
    if(this.fbCd<=0&&player&&!player.dead){
      this.fbCd=randI(130,220);
      game.fireballs.push(new Fireball(
        this.x+(this.dir===1?this.w:0), this.y+this.h/2, this.dir
      ));
      Sound.fireball();
    }
    this.ft++; if(this.ft>=9){this.frame=(this.frame+1)%2;this.ft=0;}

    if(player&&!player.dead&&player.invincible<=0&&
       overlap(this.x,this.y,this.w,this.h, player.x,player.y,player.w,player.h))
      player.takeDamage(1,game);
  }
  takeDamage(amount,game){
    this.hp-=amount;
    if(this.hp<=0) this._die(game); else Sound.axeHit();
  }
  _die(game){
    this.dead=true; Sound.enemyDie(); game.camera.shake(8,4);
    const cols=['#FF4500','#FF8C00','#FFD700','#CC2200'];
    for(let i=0;i<13;i++)
      game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, cols[i%4], randF(-6,6), randF(-8,-1),48, randI(3,7)));
    if(Math.random()<0.7) game.coins.push(new Coin(this.x+this.w/2-8,this.y));
    game.player.score+=200;
  }
  draw(ctx,cam){
    if(!this.alive) return;
    const a=this.dead?Math.max(0,1-this.dt/55):1;
    ctx.globalAlpha=a;
    Sprites.drawDragon(ctx, Math.floor(cam.sx2(this.x)), Math.floor(cam.sy2(this.y)), this.frame, this.dir, false);
    ctx.globalAlpha=1;
  }
}

// ─────────────────────────────────────────────────────
// DRAGÓN JEFE
// ─────────────────────────────────────────────────────
class BossDragon {
  constructor(data){
    this.x=data.x; this.y=data.y||300;
    this.startX=data.x; this.startY=data.y||300;
    this.w=80; this.h=64;
    this.vx=-2.2; this.dir=-1;
    this.alive=true; this.hp=12; this.maxHp=12;
    this.dead=false; this.dt=0;
    this.frame=0; this.ft=0;
    this.phase=1; this.atTimer=0; this.time=0;
    this.pL = data.pL !== undefined ? data.pL : (data.x - 280);
    this.pR = data.pR !== undefined ? data.pR : (data.x + 180);
    this.introTimer=150; this.mode='patrol';
    this.chargeTimer=0; this.chargeDir=1;
  }
  update(dt, player, game){
    if(this.dead){
      this.dt++;
      if(this.dt%4===0&&this.dt<120){
        game.particles.push(new Particle(
          this.x+randF(0,this.w), this.y+randF(0,this.h),
          ['#FF4500','#FF8C00','#FFD700'][randI(0,2)],
          randF(-7,7), randF(-9,-2), 65, randI(4,10)
        ));
      }
      if(this.dt>=140){
        this.alive=false;
        if(game.levelIdx >= LEVEL_DATA.length - 1){
          game.state=GS.VICTORY;
          Sound.victory();
        } else {
          // Si no es el nivel final, suelta monedas y deja libre el camino hacia el portal del siguiente nivel
          for(let i=0; i<8; i++){
            game.coins.push(new Coin(this.x + i*16, this.y + 16));
          }
        }
      }
      return;
    }
    if(this.introTimer>0){
      this.introTimer--;
      if(this.introTimer===70){ Sound.bossRoar(); game.camera.shake(25,9); }
      return;
    }
    this.time++; this.atTimer++;

    // Fase 2 al 50% HP
    if(this.hp<=this.maxHp/2 && this.phase===1){
      this.phase=2; Sound.bossRoar(); game.camera.shake(18,7);
    }
    const spd=this.phase===2?3.2:2.2;

    if(this.mode==='patrol'){
      this.x+=this.vx*(spd/2.2);
      this.y=this.startY+Math.sin(this.time*0.022)*28;
      if(this.x<=this.pL){ this.x=this.pL; this.vx=Math.abs(this.vx); this.dir=1; }
      if(this.x+this.w>=this.pR){ this.x=this.pR-this.w; this.vx=-Math.abs(this.vx); this.dir=-1; }

      const shotInterval = this.phase===2?45:75;
      if(this.atTimer%shotInterval===0 && player&&!player.dead) this._shoot(game,player);
      if(this.phase===2 && this.atTimer%180===0 && player){
        this.mode='charge'; this.chargeTimer=50;
        this.chargeDir=player.x>this.x?1:-1;
      }
    } else if(this.mode==='charge'){
      this.x+=this.chargeDir*9;
      this.chargeTimer--;
      if(this.chargeTimer<=0||this.x<this.pL-60||this.x>this.pR+60){
        this.mode='patrol'; this.vx=-this.vx;
      }
    }

    if(player) this.dir=player.x>this.x+this.w/2?1:-1;
    this.ft++; if(this.ft>=6){this.frame=(this.frame+1)%2;this.ft=0;}

    if(player&&!player.dead&&player.invincible<=0&&
       overlap(this.x,this.y,this.w,this.h, player.x,player.y,player.w,player.h))
      player.takeDamage(1,game);
  }
  _shoot(game, player){
    Sound.fireball();
    const bx=this.x+this.w/2, by=this.y+this.h/2;
    if(this.phase===1){
      const dx=(player.x+player.w/2)-bx, dy=(player.y+player.h/2)-by;
      const len=Math.sqrt(dx*dx+dy*dy)||1;
      game.fireballs.push(new Fireball(bx,by,1,dx/len*5,dy/len*5,true));
    } else {
      for(let a=-1;a<=1;a++){
        const dx=(player.x+player.w/2)-bx+a*120, dy=(player.y+player.h/2)-by;
        const len=Math.sqrt(dx*dx+dy*dy)||1;
        game.fireballs.push(new Fireball(bx,by,1,dx/len*6,dy/len*6,true));
      }
      // Extra disparo hacia abajo en fase 2
      game.fireballs.push(new Fireball(bx,by,1,0,6,true));
    }
  }
  takeDamage(amount,game){
    this.hp-=amount; Sound.bossHit(); game.camera.shake(6,4);
    if(this.hp<=0){ this.dead=true; Sound.bossDie(); game.camera.shake(30,12); }
  }
  draw(ctx,cam){
    if(!this.alive) return;
    const sx=Math.floor(cam.sx2(this.x));
    const sy=Math.floor(cam.sy2(this.y));
    ctx.globalAlpha=this.introTimer>0
      ? Math.max(0,(150-this.introTimer)/150)
      : this.dead ? Math.max(0,1-this.dt/140) : 1;

    // Efecto de fase 2
    if(this.phase>=2&&!this.dead&&this.introTimer<=0){
      ctx.shadowColor='#FF0000';
      ctx.shadowBlur=20;
    }
    Sprites.drawDragon(ctx,sx,sy,this.frame,this.dir,true);
    ctx.shadowBlur=0; ctx.globalAlpha=1;

    // Barra de vida
    if(this.introTimer<=0&&!this.dead){
      Sprites.drawBossBar(ctx,this.hp,this.maxHp,this.phase,'⚔ DRAGÓN SUPREMO ⚔');
    }

    // Texto de intro
    if(this.introTimer>40){
      ctx.globalAlpha=(this.introTimer-40)/110;
      ctx.fillStyle='#FF0000';
      ctx.font='bold 28px monospace'; ctx.textAlign='center';
      ctx.fillText('¡¡JEFE FINAL!!', CW/2, CH/2-30);
      ctx.fillStyle='#FFD700';
      ctx.font='18px monospace';
      ctx.fillText('El Dragón Supremo despierta...', CW/2, CH/2+10);
      ctx.globalAlpha=1;
    }
  }
}


// =====================================================
// TIBURÓN DEVORADOR (enemigo acuático veloz)
// =====================================================
class Shark {
  constructor(data) {
    this.w = 40; this.h = 24;
    this.x = data.x; this.y = data.y || 220;
    this.startX = data.x; this.startY = this.y;
    this.pL = data.x; this.pR = data.x + (data.patrolW || 260);
    this.speed = 3.5; this.vx = -this.speed; this.vy = 0;
    this.dir = -1; this.alive = true; this.hp = 3; this.dead = false;
    this.dt = 0; this.frame = 0; this.ft = 0;
  }
  update(dt, player, game) {
    if (this.dead) { this.dt++; if (this.dt > 40) this.alive = false; return; }
    this.x += this.vx;
    if (this.x <= this.pL) { this.x = this.pL; this.vx = this.speed; this.dir = 1; }
    else if (this.x + this.w >= this.pR) { this.x = this.pR - this.w; this.vx = -this.speed; this.dir = -1; }

    // Ondulación vertical en el agua
    this.y = this.startY + Math.sin(this.x * 0.04) * 12;

    this.ft++;
    if (this.ft >= 6) { this.frame = (this.frame + 1) % 4; this.ft = 0; }

    // Embestida si el jugador está cerca
    if (player && !player.dead) {
      const dx = (player.x + player.w/2) - (this.x + this.w/2);
      const dy = (player.y + player.h/2) - (this.y + this.h/2);
      if (Math.abs(dx) < 180 && Math.abs(dy) < 60) {
        this.vx = (dx > 0 ? 1 : -1) * 4.6;
        this.dir = dx > 0 ? 1 : -1;
      }
      if (player.invincible <= 0 && hitBox(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) {
        player.takeDamage(1, game);
      }
    }
  }
  takeDamage(amount, game) {
    this.hp -= amount;
    if (this.hp <= 0) this._die(game);
    else { Sound.axeHit(); game.camera.shake(4, 2); }
  }
  _die(game) {
    this.dead = true; Sound.enemyDie(); game.camera.shake(6, 3);
    for (let i = 0; i < 14; i++) {
      game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#00AACC', randF(-5, 5), randF(-6, 2), 35));
    }
    if (Math.random() < 0.7) game.coins.push(new Coin(this.x + 10, this.y));
    if (Math.random() < 0.25) game.heartItems.push(new HeartItem(this.x + 8, this.y - 10, Math.random() < 0.4));
    game.player.score += 250;
  }
  draw(ctx, cam) {
    if (!this.alive) return;
    const a = this.dead ? Math.max(0, 1 - this.dt/40) : 1;
    ctx.globalAlpha = a;
    Sprites.drawShark(ctx, Math.floor(cam.wx(this.x)), Math.floor(cam.wy(this.y)), this.frame, this.dir);
    ctx.globalAlpha = 1;
  }
}

// =====================================================
// PULPO GIGANTE (enemigo marino con tinta)
// =====================================================
class Octopus {
  constructor(data) {
    this.w = 32; this.h = 36;
    this.x = data.x; this.y = data.y || 200;
    this.baseY = this.y;
    this.alive = true; this.hp = 3; this.dead = false;
    this.dt = 0; this.frame = 0; this.ft = 0;
    this.shotCd = randI(100, 180);
    this.t = Math.random() * Math.PI * 2;
  }
  update(dt, player, game) {
    if (this.dead) { this.dt++; if (this.dt > 40) this.alive = false; return; }
    this.t += 0.05;
    this.y = this.baseY + Math.sin(this.t) * 25;

    this.ft++;
    if (this.ft >= 7) { this.frame = (this.frame + 1) % 4; this.ft = 0; }

    this.shotCd--;
    if (this.shotCd <= 0 && player && !player.dead) {
      this.shotCd = randI(140, 220);
      const dir = player.x < this.x ? -1 : 1;
      game.fireballs.push(new Fireball(this.x + 8, this.y + 16, dir, dir * 4.0, 0, false));
      Sound.inkShoot();
    }

    if (player && !player.dead && player.invincible <= 0 && hitBox(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) {
      player.takeDamage(1, game);
    }
  }
  takeDamage(amount, game) {
    this.hp -= amount;
    if (this.hp <= 0) this._die(game);
    else { Sound.axeHit(); game.camera.shake(4, 2); }
  }
  _die(game) {
    this.dead = true; Sound.enemyDie(); game.camera.shake(6, 3);
    for (let i = 0; i < 16; i++) {
      game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#8A2BE2', randF(-6, 6), randF(-6, 2), 40));
    }
    game.coins.push(new Coin(this.x + 8, this.y));
    if (Math.random() < 0.3) game.heartItems.push(new HeartItem(this.x + 6, this.y - 10, true));
    game.player.score += 300;
  }
  draw(ctx, cam) {
    if (!this.alive) return;
    const a = this.dead ? Math.max(0, 1 - this.dt/40) : 1;
    ctx.globalAlpha = a;
    Sprites.drawOctopus(ctx, Math.floor(cam.wx(this.x)), Math.floor(cam.wy(this.y)), this.frame);
    ctx.globalAlpha = 1;
  }
}

// =====================================================
// AVIÓN DE ASALTO (enemigo aéreo veloz)
// =====================================================
class PlaneEnemy {
  constructor(data) {
    this.w = 42; this.h = 24;
    this.x = data.x; this.y = data.y || 140;
    this.startX = data.x;
    this.pL = data.x; this.pR = data.x + (data.patrolW || 340);
    this.speed = 4.2; this.vx = -this.speed; this.vy = 0;
    this.dir = -1; this.alive = true; this.hp = 3; this.dead = false;
    this.dt = 0; this.frame = 0; this.ft = 0;
    this.shotCd = randI(90, 160);
  }
  update(dt, player, game) {
    if (this.dead) { this.dt++; if (this.dt > 40) this.alive = false; return; }
    this.x += this.vx;
    if (this.x <= this.pL) { this.x = this.pL; this.vx = this.speed; this.dir = 1; }
    else if (this.x + this.w >= this.pR) { this.x = this.pR - this.w; this.vx = -this.speed; this.dir = -1; }

    this.ft++;
    if (this.ft >= 4) { this.frame = (this.frame + 1) % 4; this.ft = 0; }

    this.shotCd--;
    if (this.shotCd <= 0 && player && !player.dead) {
      this.shotCd = randI(120, 200);
      game.fireballs.push(new Fireball(this.x + (this.dir === 1 ? this.w : -8), this.y + 10, this.dir, this.dir * 5.2, 0, false));
      Sound.laser();
    }

    if (player && !player.dead && player.invincible <= 0 && hitBox(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) {
      player.takeDamage(1, game);
    }
  }
  takeDamage(amount, game) {
    this.hp -= amount;
    if (this.hp <= 0) this._die(game);
    else { Sound.axeHit(); game.camera.shake(4, 2); }
  }
  _die(game) {
    this.dead = true; Sound.explosion(); game.camera.shake(8, 4);
    for (let i = 0; i < 18; i++) {
      game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#FF5500', randF(-6, 6), randF(-7, 2), 45));
    }
    game.coins.push(new Coin(this.x + 12, this.y));
    if (Math.random() < 0.3) game.heartItems.push(new HeartItem(this.x + 10, this.y - 10, Math.random() < 0.5));
    game.player.score += 350;
  }
  draw(ctx, cam) {
    if (!this.alive) return;
    const a = this.dead ? Math.max(0, 1 - this.dt/40) : 1;
    ctx.globalAlpha = a;
    Sprites.drawPlaneEnemy(ctx, Math.floor(cam.wx(this.x)), Math.floor(cam.wy(this.y)), this.frame, this.dir);
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────────────────
// DATOS DE NIVELES
// ─────────────────────────────────────────────────────

// =====================================================
// SOLDADO (enemigo terrestre con disparo)
// =====================================================
class Soldier {
  constructor(data,platforms){
    this.w=22;this.h=38;this.x=data.x;this.y=this._findGround(data.x,platforms)-this.h;
    this.vx=-2.0;this.vy=0;this.dir=-1;this.pL=data.x;this.pR=data.x+(data.patrolW||140);
    this.alive=true;this.hp=2;this.dead=false;this.dt=0;this.frame=0;this.ft=0;this.onGround=false;
    this.speed=2.0+Math.random()*0.8;this.shotCd=randI(160,260);
  }
  _findGround(x,platforms){let best=9999;for(const p of platforms){if(!p.solid)continue;if(x+this.w>p.x&&x<p.x+p.w&&p.y>80)best=Math.min(best,p.y);}return best===9999?384:best;}
  update(dt,platforms,player,game){
    if(this.dead){this.dt++;if(this.dt>50)this.alive=false;return;}
    this.x+=this.vx;
    if(this.x<=this.pL){this.x=this.pL;this.vx=this.speed;this.dir=1;}
    else if(this.x+this.w>=this.pR){this.x=this.pR-this.w;this.vx=-this.speed;this.dir=-1;}
    if(this.onGround){
      const cx=this.dir===1?this.x+this.w+4:this.x-4,cy=this.y+this.h+10;
      let hasG=false;for(const p of platforms){if(!p.solid)continue;if(cx>=p.x&&cx<=p.x+p.w&&cy>=p.y&&cy<=p.y+p.h+12){hasG=true;break;}}
      if(!hasG){this.vx=-this.vx;this.dir=-this.dir;}
    }
    this.vy=clamp(this.vy+GRAVITY,-20,MAX_FALL);this.y+=this.vy;this.onGround=false;
    for(const p of platforms){if(!p.solid)continue;if(hitBox(this.x,this.y,this.w,this.h,p.x,p.y,p.w,p.h)){const oB=(this.y+this.h)-p.y,oT=(p.y+p.h)-this.y;if(oB<oT){this.y=p.y-this.h;this.vy=0;this.onGround=true;}}}
    this.ft++;if(this.ft>=7){this.frame=(this.frame+1)%4;this.ft=0;}
    this.shotCd--;
    if(this.shotCd<=0&&player&&!player.dead){
      this.shotCd=randI(170,280);
      game.fireballs.push(new Fireball(this.x+(this.dir===1?this.w+4:-4),this.y+this.h*0.4,this.dir,this.dir*4.5,0,false));
      Sound.fireball();
    }
    if(player&&!player.dead&&player.invincible<=0&&hitBox(this.x,this.y,this.w,this.h,player.x,player.y,player.w,player.h))player.takeDamage(1,game);
  }
  takeDamage(amount,game){this.hp-=amount;if(this.hp<=0)this._die(game);else{Sound.axeHit();game.camera.shake(3,2);}}
  _die(game){
    this.dead=true;Sound.enemyDie();game.camera.shake(5,3);
    const c=['#3A5A1A','#6B8C4A','#8B6914'];
    for(let i=0;i<10;i++)game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,c[i%3],randF(-4,4),randF(-7,-1),40));
    if(Math.random()<0.65)game.coins.push(new Coin(this.x+3,this.y));
    if(Math.random()<0.20)game.heartItems.push(new HeartItem(this.x+2,this.y-10,Math.random()<0.35));
    if(Math.random()<0.20)game.heartItems.push(new HeartItem(this.x+2,this.y-10,Math.random()<0.35));
    game.player.score+=150;
  }
  draw(ctx,cam){if(!this.alive)return;const a=this.dead?Math.max(0,1-this.dt/50):1;ctx.globalAlpha=a;Sprites.drawSoldier(ctx,Math.floor(cam.wx(this.x)),Math.floor(cam.wy(this.y)),this.frame,this.dir,this.dead);ctx.globalAlpha=1;}
}

// =====================================================
// ENEMIGO ACUATICO (pez / criatura del mar)
// =====================================================
class FishEnemy {
  constructor(data){
    this.x=data.x;this.y=data.y||200;this.startY=this.y;this.w=36;this.h=24;
    this.vx=-2.2;this.dir=-1;this.alive=true;this.hp=2;this.dead=false;this.dt=0;
    this.frame=0;this.ft=0;this.pL=data.x-(data.patrolW||200);this.pR=data.x+(data.patrolW||200);
    this.sinOff=Math.random()*Math.PI*2;this.speed=2.0+Math.random()*0.7;this.time=0;
  }
  update(dt,player,game){
    if(this.dead){this.dt++;if(this.dt>50)this.alive=false;return;}
    this.time++;this.x+=this.vx;
    this.y=this.startY+Math.sin(this.time*0.04+this.sinOff)*28;
    if(this.x<=this.pL){this.x=this.pL;this.vx=this.speed;this.dir=1;}
    else if(this.x+this.w>=this.pR){this.x=this.pR-this.w;this.vx=-this.speed;this.dir=-1;}
    if(player)this.dir=player.x>this.x+this.w/2?1:-1;
    this.ft++;if(this.ft>=10){this.frame=(this.frame+1)%2;this.ft=0;}
    if(player&&!player.dead&&player.invincible<=0&&hitBox(this.x,this.y,this.w,this.h,player.x,player.y,player.w,player.h))player.takeDamage(1,game);
  }
  takeDamage(amount,game){this.hp-=amount;if(this.hp<=0)this._die(game);else Sound.axeHit();}
  _die(game){
    this.dead=true;Sound.enemyDie();game.camera.shake(5,3);
    const c=['#00AACC','#0088AA','#00CCFF'];
    for(let i=0;i<10;i++)game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,c[i%3],randF(-5,5),randF(-7,-1),45,randI(3,6)));
    if(Math.random()<0.6)game.coins.push(new Coin(this.x+this.w/2-8,this.y));
    game.player.score+=150;
  }
  draw(ctx,cam){if(!this.alive)return;const a=this.dead?Math.max(0,1-this.dt/50):1;ctx.globalAlpha=a;Sprites.drawFish(ctx,Math.floor(cam.wx(this.x)),Math.floor(cam.wy(this.y)),this.frame,this.dir);ctx.globalAlpha=1;}
}

const mkP = (x,y,w,h,t) => ({x,y,w,h,type:t,solid:true});
const buildPlatform = mkP;

const LEVEL_DATA = [
  // ───────────────── NIVEL 1: LA ALDEA ─────────────────
  {
    name:'Nivel 1 – La Aldea', theme:'village', music:1,
    width:3200, height:480, groundY:384,
    bgTop:'#87CEEB', bgBot:'#B8DFF0',
    portalColor:'#00FF88',
    platforms:[
      buildPlatform(0,384,3200,96,'grass'),
      buildPlatform(180,304,128,32,'grass'),
      buildPlatform(420,240,96,32,'grass'),
      buildPlatform(640,304,128,32,'grass'),
      buildPlatform(880,240,96,32,'grass'),
      buildPlatform(1060,304,160,32,'grass'),
      buildPlatform(1300,240,128,32,'grass'),
      buildPlatform(1520,304,96,32,'grass'),
      buildPlatform(1720,240,128,32,'grass'),
      buildPlatform(1970,304,160,32,'grass'),
      buildPlatform(2200,240,96,32,'grass'),
      buildPlatform(2420,304,128,32,'grass'),
      buildPlatform(2660,240,96,32,'grass'),
      buildPlatform(2860,304,96,32,'grass'),
      buildPlatform(3000,208,160,32,'grass'),
    ],
    enemies:[
      {type:'zombie',x:300,  patrolW:130},
      {type:'zombie',x:700,  patrolW:110},
      {type:'zombie',x:1100, patrolW:140},
      {type:'zombie',x:1450, patrolW:100},
      {type:'zombie',x:1800, patrolW:130},
      {type:'zombie',x:2100, patrolW:110},
      {type:'zombie',x:2700, patrolW:90},
      {type:'zombie',x:2900, patrolW:80},
      {type:'dragon',x:900,  y:190, patrolW:200},
      {type:'dragon',x:1620, y:175, patrolW:185},
      {type:'dragon',x:2500, y:190, patrolW:200},
    ],
    coins:[
      {x:230,y:270},{x:280,y:270},{x:470,y:205},
      {x:700,y:350},{x:930,y:205},{x:1110,y:270},
      {x:1160,y:270},{x:1350,y:205},{x:1400,y:205},
      {x:1570,y:270},{x:1770,y:205},{x:1820,y:205},
      {x:2020,y:270},{x:2070,y:270},{x:2250,y:205},
      {x:2470,y:270},{x:2710,y:205},{x:2910,y:270},
      {x:3050,y:174},{x:3100,y:174},
    ],
    goalX:3070, goalY:336
  },

  // ───────────────── NIVEL 2: LA CUEVA ─────────────────
  {
    name:'Nivel 2 – La Cueva', theme:'cave', music:2,
    width:4800, height:480, groundY:384,
    bgTop:'#1A1A2E', bgBot:'#0D0D1C',
    portalColor:'#FF88FF',
    platforms:[
      buildPlatform(0,384,4800,96,'stone'),
      buildPlatform(0,0,4800,32,'stone'),
      buildPlatform(130,288,96,32,'stone'),
      buildPlatform(350,208,128,32,'stone'),
      buildPlatform(560,304,96,32,'stone'),
      buildPlatform(750,224,128,32,'stone'),
      buildPlatform(1000,304,128,32,'stone'),
      buildPlatform(1250,208,96,32,'stone'),
      buildPlatform(1450,304,128,32,'stone'),
      buildPlatform(1700,208,160,32,'stone'),
      buildPlatform(1960,304,96,32,'stone'),
      buildPlatform(2200,208,128,32,'stone'),
      buildPlatform(2450,288,128,32,'stone'),
      buildPlatform(2700,208,96,32,'stone'),
      buildPlatform(2960,304,128,32,'stone'),
      buildPlatform(3200,208,128,32,'stone'),
      buildPlatform(3460,304,160,32,'stone'),
      buildPlatform(3710,208,128,32,'stone'),
      buildPlatform(3960,304,96,32,'stone'),
      buildPlatform(4210,224,128,32,'stone'),
      buildPlatform(4460,304,128,32,'stone'),
      buildPlatform(4660,208,110,32,'stone'),
    ],
    enemies:[
      {type:'dragon',x:300,  y:155, patrolW:250},
      {type:'dragon',x:700,  y:140, patrolW:200},
      {type:'zombie',x:450,  patrolW:100},
      {type:'dragon',x:1100, y:155, patrolW:220},
      {type:'zombie',x:1200, patrolW:100},
      {type:'dragon',x:1600, y:145, patrolW:250},
      {type:'dragon',x:2000, y:160, patrolW:200},
      {type:'zombie',x:2100, patrolW:120},
      {type:'dragon',x:2600, y:140, patrolW:250},
      {type:'zombie',x:2800, patrolW:100},
      {type:'dragon',x:3200, y:155, patrolW:200},
      {type:'dragon',x:3710, y:145, patrolW:250},
      {type:'zombie',x:3900, patrolW:120},
      {type:'dragon',x:4210, y:160, patrolW:200},
      {type:'zombie',x:4400, patrolW:100},
    ],
    coins:[
      {x:180,y:255},{x:400,y:175},{x:610,y:271},
      {x:800,y:191},{x:1050,y:271},{x:1300,y:175},
      {x:1500,y:271},{x:1750,y:175},{x:1800,y:175},
      {x:2010,y:271},{x:2250,y:175},{x:2500,y:255},
      {x:2750,y:175},{x:3010,y:271},{x:3250,y:175},
      {x:3510,y:271},{x:3760,y:175},{x:4010,y:271},
      {x:4260,y:191},{x:4510,y:271},{x:4560,y:271},
      {x:4710,y:175},{x:4750,y:175},
    ],
    goalX:4720, goalY:336
  },

  // ───────────────── NIVEL 3: EL CASTILLO ──────────────
  {
    name:'Nivel 3 – El Castillo', theme:'castle', music:3,
    width:6400, height:480, groundY:384,
    bgTop:'#1A0A2E', bgBot:'#0A0515',
    portalColor:'#FF4400',
    hasBoss:true,
    platforms:[
      buildPlatform(0,384,6400,96,'brick'),
      buildPlatform(0,0,6400,32,'brick'),
      buildPlatform(130,288,128,32,'brick'),
      buildPlatform(380,208,96,32,'brick'),
      buildPlatform(580,288,128,32,'brick'),
      buildPlatform(840,208,96,32,'brick'),
      buildPlatform(1050,304,160,32,'brick'),
      buildPlatform(1300,208,128,32,'brick'),
      buildPlatform(1550,304,96,32,'brick'),
      buildPlatform(1760,208,128,32,'brick'),
      buildPlatform(2010,304,128,32,'brick'),
      buildPlatform(2260,208,96,32,'brick'),
      buildPlatform(2460,288,128,32,'brick'),
      buildPlatform(2710,208,128,32,'brick'),
      buildPlatform(2970,288,160,32,'brick'),
      buildPlatform(3220,208,96,32,'brick'),
      buildPlatform(3470,304,128,32,'brick'),
      buildPlatform(3720,208,128,32,'brick'),
      buildPlatform(3970,288,96,32,'brick'),
      buildPlatform(4220,208,128,32,'brick'),
      buildPlatform(4470,304,128,32,'brick'),
      buildPlatform(4720,208,96,32,'brick'),
      buildPlatform(4980,288,160,32,'brick'),
      buildPlatform(5250,208,128,32,'brick'),
      // Zona del jefe
      buildPlatform(5550,288,850,32,'brick'),
      buildPlatform(5500,384,900,96,'brick'),
    ],
    enemies:[
      {type:'zombie',x:250,  patrolW:100},
      {type:'dragon',x:480,  y:155, patrolW:200},
      {type:'zombie',x:700,  patrolW:120},
      {type:'dragon',x:900,  y:145, patrolW:180},
      {type:'zombie',x:1150, patrolW:100},
      {type:'dragon',x:1400, y:155, patrolW:200},
      {type:'zombie',x:1660, patrolW:120},
      {type:'dragon',x:1860, y:145, patrolW:180},
      {type:'zombie',x:2110, patrolW:100},
      {type:'dragon',x:2360, y:155, patrolW:200},
      {type:'zombie',x:2610, patrolW:120},
      {type:'dragon',x:2810, y:145, patrolW:180},
      {type:'zombie',x:3110, patrolW:100},
      {type:'dragon',x:3320, y:155, patrolW:200},
      {type:'zombie',x:3570, patrolW:120},
      {type:'dragon',x:3820, y:145, patrolW:180},
      {type:'zombie',x:4070, patrolW:100},
      {type:'dragon',x:4320, y:155, patrolW:200},
      {type:'zombie',x:4620, patrolW:120},
      {type:'dragon',x:4820, y:145, patrolW:180},
      {type:'zombie',x:5080, patrolW:100},
      {type:'boss',  x:5780, y:310},
    ],
    coins:[
      {x:180,y:255},{x:430,y:175},{x:630,y:255},
      {x:890,y:175},{x:1100,y:271},{x:1350,y:175},
      {x:1600,y:271},{x:1810,y:175},{x:1860,y:175},
      {x:2060,y:271},{x:2310,y:175},{x:2510,y:255},
      {x:2760,y:175},{x:3020,y:255},{x:3270,y:175},
      {x:3520,y:271},{x:3770,y:175},{x:4020,y:255},
      {x:4270,y:175},{x:4520,y:271},{x:4770,y:175},
      {x:5030,y:255},{x:5100,y:350},{x:5150,y:350},
      {x:5600,y:255},{x:5700,y:255},{x:5800,y:350},
    ],
    goalX:6250, goalY:240
  }
  ,
  // ── NIVEL 4: EL OCEANO ──
  {
    name:'Nivel 4 - El Oceano',theme:'ocean',music:1,
    width:4400,height:480,groundY:400,bgTop:'#006994',bgBot:'#002244',portalColor:'#00FFFF',
    platforms:[
      mkP(0,400,4400,80,'coral'),mkP(0,0,4400,28,'coral'),
      mkP(120,310,100,24,'coral'),mkP(340,230,110,24,'coral'),mkP(580,310,100,24,'coral'),
      mkP(820,230,120,24,'coral'),mkP(1060,310,100,24,'coral'),mkP(1300,230,110,24,'coral'),
      mkP(1540,310,120,24,'coral'),mkP(1780,230,100,24,'coral'),mkP(2020,310,110,24,'coral'),
      mkP(2260,230,120,24,'coral'),mkP(2500,310,100,24,'coral'),mkP(2740,230,110,24,'coral'),
      mkP(2980,310,120,24,'coral'),mkP(3220,230,100,24,'coral'),mkP(3460,310,110,24,'coral'),
      mkP(3700,230,120,24,'coral'),mkP(3940,310,100,24,'coral'),mkP(4150,230,200,24,'coral'),
    ],
    enemies:[
      {type:'fish',x:300,y:210,patrolW:200},{type:'fish',x:700,y:195,patrolW:180},
      {type:'dragon',x:500,y:180,patrolW:200},{type:'fish',x:1100,y:210,patrolW:200},
      {type:'fish',x:1500,y:195,patrolW:180},{type:'zombie',x:400,patrolW:100},
      {type:'fish',x:1900,y:210,patrolW:200},{type:'dragon',x:1700,y:180,patrolW:200},
      {type:'fish',x:2300,y:195,patrolW:180},{type:'fish',x:2700,y:210,patrolW:200},
      {type:'dragon',x:2500,y:175,patrolW:200},{type:'zombie',x:2200,patrolW:100},
      {type:'fish',x:3100,y:195,patrolW:200},{type:'fish',x:3500,y:210,patrolW:180},
      {type:'dragon',x:3700,y:175,patrolW:200},{type:'zombie',x:3300,patrolW:100},
    ],
    coins:[
      {x:170,y:280},{x:390,y:200},{x:630,y:280},{x:870,y:200},{x:1110,y:280},
      {x:1350,y:200},{x:1590,y:280},{x:1830,y:200},{x:2070,y:280},{x:2310,y:200},
      {x:2550,y:280},{x:2790,y:200},{x:3030,y:280},{x:3270,y:200},{x:3510,y:280},
      {x:3750,y:200},{x:3990,y:280},{x:4200,y:200},{x:4250,y:200},{x:4300,y:200},
    ],
    goalX:4200,goalY:354
  },
  // ── NIVEL 5: LAS NUBES ──
  {
    name:'Nivel 5 - Las Nubes',theme:'sky',music:2,
    width:4800,height:480,groundY:420,bgTop:'#1A4E88',bgBot:'#3B78B8',portalColor:'#00FFFF',
    platforms:[
      mkP(0,420,4800,60,'cloud'),mkP(0,0,4800,20,'cloud'),
      mkP(100,330,140,24,'cloud'),mkP(340,250,120,24,'cloud'),mkP(600,330,140,24,'cloud'),
      mkP(860,250,120,24,'cloud'),mkP(1100,330,140,24,'cloud'),mkP(1360,250,130,24,'cloud'),
      mkP(1620,330,140,24,'cloud'),mkP(1880,250,120,24,'cloud'),mkP(2140,330,140,24,'cloud'),
      mkP(2380,250,130,24,'cloud'),mkP(2640,330,140,24,'cloud'),mkP(2900,250,120,24,'cloud'),
      mkP(3160,330,140,24,'cloud'),mkP(3420,250,130,24,'cloud'),mkP(3680,330,140,24,'cloud'),
      mkP(3940,250,120,24,'cloud'),mkP(4200,330,140,24,'cloud'),mkP(4440,200,300,24,'cloud'),
    ],
    enemies:[
      {type:'dragon',x:250,y:180,patrolW:220},{type:'dragon',x:650,y:160,patrolW:200},
      {type:'zombie',x:450,patrolW:120},{type:'dragon',x:1050,y:180,patrolW:220},
      {type:'dragon',x:1450,y:160,patrolW:200},{type:'zombie',x:1250,patrolW:120},
      {type:'dragon',x:1850,y:175,patrolW:220},{type:'dragon',x:2250,y:160,patrolW:200},
      {type:'zombie',x:2050,patrolW:120},{type:'dragon',x:2650,y:180,patrolW:220},
      {type:'dragon',x:3050,y:160,patrolW:200},{type:'zombie',x:2850,patrolW:120},
      {type:'dragon',x:3450,y:175,patrolW:220},{type:'dragon',x:3850,y:160,patrolW:200},
      {type:'zombie',x:3650,patrolW:120},{type:'dragon',x:4250,y:170,patrolW:180},
    ],
    coins:[
      {x:150,y:300},{x:390,y:220},{x:650,y:300},{x:910,y:220},{x:1150,y:300},
      {x:1410,y:220},{x:1670,y:300},{x:1930,y:220},{x:2190,y:300},{x:2430,y:220},
      {x:2690,y:300},{x:2950,y:220},{x:3210,y:300},{x:3470,y:220},{x:3730,y:300},
      {x:3990,y:220},{x:4250,y:300},{x:4490,y:170},{x:4540,y:170},{x:4590,y:170},
    ],
    goalX:4520,goalY:370
  },
  // ── NIVEL 6: LOS AVIONES ──
  {
    name:'Nivel 6 - Los Aviones',theme:'airplane',music:3,
    width:5200,height:480,groundY:400,bgTop:'#3A6A9A',bgBot:'#1A3A6A',portalColor:'#FFD700',
    platforms:[
      mkP(0,400,5200,80,'metal'),mkP(0,0,5200,28,'metal'),
      mkP(100,310,200,28,'metal'),mkP(420,230,200,28,'metal'),mkP(760,310,200,28,'metal'),
      mkP(1100,230,200,28,'metal'),mkP(1440,310,200,28,'metal'),mkP(1780,230,200,28,'metal'),
      mkP(2120,310,200,28,'metal'),mkP(2460,230,200,28,'metal'),mkP(2800,310,200,28,'metal'),
      mkP(3140,230,200,28,'metal'),mkP(3480,310,200,28,'metal'),mkP(3820,230,200,28,'metal'),
      mkP(4160,310,200,28,'metal'),mkP(4500,230,200,28,'metal'),mkP(4840,180,320,28,'metal'),
    ],
    enemies:[
      {type:'soldier',x:200,patrolW:160},{type:'dragon',x:550,y:170,patrolW:220},
      {type:'soldier',x:900,patrolW:160},{type:'soldier',x:1200,patrolW:160},
      {type:'dragon',x:1550,y:165,patrolW:220},{type:'soldier',x:1880,patrolW:160},
      {type:'soldier',x:2200,patrolW:160},{type:'dragon',x:2550,y:170,patrolW:220},
      {type:'soldier',x:2900,patrolW:160},{type:'soldier',x:3200,patrolW:160},
      {type:'dragon',x:3550,y:165,patrolW:220},{type:'soldier',x:3900,patrolW:160},
      {type:'soldier',x:4250,patrolW:160},{type:'dragon',x:4600,y:160,patrolW:180},
      {type:'boss',x:4980,y:285},
    ],
    coins:[
      {x:150,y:280},{x:470,y:200},{x:810,y:280},{x:1150,y:200},{x:1490,y:280},
      {x:1830,y:200},{x:2170,y:280},{x:2510,y:200},{x:2850,y:280},{x:3190,y:200},
      {x:3530,y:280},{x:3870,y:200},{x:4210,y:280},{x:4550,y:200},
      {x:4890,y:155},{x:4940,y:155},{x:4990,y:155},{x:5040,y:155},
    ],
    goalX:5020,goalY:340
  },
  // ── NIVEL 7: LA JUNGLA ──
  {
    name:'Nivel 7 - La Jungla',theme:'jungle',music:1,
    width:5400,height:480,groundY:390,bgTop:'#1A4A10',bgBot:'#0A2005',portalColor:'#88FF44',
    platforms:[
      mkP(0,390,5400,90,'grass'),mkP(0,0,5400,24,'grass'),
      mkP(130,300,110,24,'grass'),mkP(360,220,100,24,'grass'),mkP(600,300,110,24,'grass'),
      mkP(840,220,100,24,'grass'),mkP(1080,300,120,24,'grass'),mkP(1340,220,100,24,'grass'),
      mkP(1580,300,110,24,'grass'),mkP(1820,220,100,24,'grass'),mkP(2060,300,120,24,'grass'),
      mkP(2320,220,100,24,'grass'),mkP(2560,300,110,24,'grass'),mkP(2800,220,100,24,'grass'),
      mkP(3040,300,120,24,'grass'),mkP(3300,220,100,24,'grass'),mkP(3540,300,110,24,'grass'),
      mkP(3780,220,100,24,'grass'),mkP(4020,300,120,24,'grass'),mkP(4280,220,100,24,'grass'),
      mkP(4520,300,110,24,'grass'),mkP(4800,220,100,24,'grass'),mkP(5080,180,280,24,'grass'),
    ],
    enemies:[
      {type:'zombie',x:250,patrolW:100},{type:'dragon',x:480,y:168,patrolW:200},
      {type:'zombie',x:720,patrolW:100},{type:'dragon',x:960,y:168,patrolW:200},
      {type:'zombie',x:1200,patrolW:100},{type:'dragon',x:1440,y:165,patrolW:200},
      {type:'zombie',x:1680,patrolW:100},{type:'dragon',x:1920,y:168,patrolW:200},
      {type:'zombie',x:2160,patrolW:100},{type:'dragon',x:2400,y:165,patrolW:200},
      {type:'zombie',x:2640,patrolW:100},{type:'dragon',x:2880,y:168,patrolW:200},
      {type:'zombie',x:3120,patrolW:100},{type:'dragon',x:3360,y:165,patrolW:200},
      {type:'zombie',x:3600,patrolW:100},{type:'dragon',x:3840,y:168,patrolW:200},
      {type:'zombie',x:4080,patrolW:100},{type:'dragon',x:4320,y:165,patrolW:200},
      {type:'zombie',x:4560,patrolW:100},{type:'dragon',x:4840,y:168,patrolW:180},
    ],
    coins:[
      {x:180,y:270},{x:410,y:190},{x:650,y:270},{x:890,y:190},{x:1130,y:270},
      {x:1390,y:190},{x:1630,y:270},{x:1870,y:190},{x:2110,y:270},{x:2370,y:190},
      {x:2610,y:270},{x:2850,y:190},{x:3090,y:270},{x:3350,y:190},{x:3590,y:270},
      {x:3830,y:190},{x:4070,y:270},{x:4330,y:190},{x:4570,y:270},{x:4850,y:190},
      {x:5130,y:155},{x:5180,y:155},{x:5230,y:155},
    ],
    goalX:5160,goalY:344
  },
  // ── NIVEL 8: EL DESIERTO ──
  {
    name:'Nivel 8 - El Desierto',theme:'desert',music:2,
    width:5600,height:480,groundY:400,bgTop:'#CC7700',bgBot:'#884400',portalColor:'#FF4400',
    platforms:[
      mkP(0,400,5600,80,'sand'),mkP(0,0,5600,24,'sand'),
      mkP(130,310,120,24,'sand'),mkP(380,230,110,24,'sand'),mkP(640,310,120,24,'sand'),
      mkP(900,230,110,24,'sand'),mkP(1160,310,120,24,'sand'),mkP(1420,230,110,24,'sand'),
      mkP(1680,310,120,24,'sand'),mkP(1940,230,110,24,'sand'),mkP(2200,310,120,24,'sand'),
      mkP(2460,230,110,24,'sand'),mkP(2720,310,120,24,'sand'),mkP(2980,230,110,24,'sand'),
      mkP(3240,310,120,24,'sand'),mkP(3500,230,110,24,'sand'),mkP(3760,310,120,24,'sand'),
      mkP(4020,230,110,24,'sand'),mkP(4280,310,120,24,'sand'),mkP(4540,230,110,24,'sand'),
      mkP(4800,310,120,24,'sand'),mkP(5100,200,460,24,'sand'),
    ],
    enemies:[
      {type:'soldier',x:250,patrolW:110},{type:'dragon',x:500,y:175,patrolW:210},
      {type:'soldier',x:760,patrolW:110},{type:'soldier',x:1060,patrolW:110},
      {type:'dragon',x:1310,y:175,patrolW:200},{type:'soldier',x:1570,patrolW:110},
      {type:'soldier',x:1830,patrolW:110},{type:'dragon',x:2080,y:178,patrolW:200},
      {type:'soldier',x:2340,patrolW:110},{type:'soldier',x:2600,patrolW:110},
      {type:'dragon',x:2850,y:175,patrolW:200},{type:'soldier',x:3110,patrolW:110},
      {type:'soldier',x:3370,patrolW:110},{type:'dragon',x:3620,y:178,patrolW:200},
      {type:'soldier',x:3880,patrolW:110},{type:'soldier',x:4140,patrolW:110},
      {type:'dragon',x:4390,y:175,patrolW:200},{type:'soldier',x:4650,patrolW:110},
      {type:'dragon',x:4900,y:170,patrolW:190},
    ],
    coins:[
      {x:180,y:280},{x:430,y:200},{x:690,y:280},{x:950,y:200},{x:1210,y:280},
      {x:1470,y:200},{x:1730,y:280},{x:1990,y:200},{x:2250,y:280},{x:2510,y:200},
      {x:2770,y:280},{x:3030,y:200},{x:3290,y:280},{x:3550,y:200},{x:3810,y:280},
      {x:4070,y:200},{x:4330,y:280},{x:4590,y:200},{x:4850,y:280},
      {x:5150,y:172},{x:5220,y:172},{x:5300,y:172},{x:5380,y:172},
    ],
    goalX:5310,goalY:354
  },
  // ── NIVEL 9: LA BASE MILITAR ──
  {
    name:'Nivel 9 - La Base Militar',theme:'military',music:3,
    width:5800,height:480,groundY:384,bgTop:'#1E3A1E',bgBot:'#0A1A0A',portalColor:'#FF0000',
    platforms:[
      mkP(0,384,5800,96,'metal'),mkP(0,0,5800,28,'metal'),
      mkP(130,288,160,28,'metal'),mkP(420,208,160,28,'metal'),mkP(720,288,160,28,'metal'),
      mkP(1020,208,160,28,'metal'),mkP(1320,288,160,28,'metal'),mkP(1620,208,160,28,'metal'),
      mkP(1920,288,160,28,'metal'),mkP(2220,208,160,28,'metal'),mkP(2520,288,160,28,'metal'),
      mkP(2820,208,160,28,'metal'),mkP(3120,288,160,28,'metal'),mkP(3420,208,160,28,'metal'),
      mkP(3720,288,160,28,'metal'),mkP(4020,208,160,28,'metal'),mkP(4320,288,160,28,'metal'),
      mkP(4620,208,160,28,'metal'),
      // Plataformas superiores intercaladas con huecos para lanzar bombas hacia abajo
      mkP(4920,180,110,28,'metal'),
      mkP(5090,180,100,28,'metal'),
      mkP(5250,180,100,28,'metal'),
      mkP(5410,180,100,28,'metal'),
      mkP(5570,180,100,28,'metal'),
      mkP(5720,180,80,28,'metal'),
    ],
    enemies:[
      {type:'soldier',x:300,patrolW:120},
      {type:'dragon',x:800,y:165,patrolW:200},
      {type:'soldier',x:1300,patrolW:120},
      {type:'dragon',x:1800,y:165,patrolW:200},
      {type:'soldier',x:2300,patrolW:120},
      {type:'dragon',x:2800,y:165,patrolW:200},
      {type:'soldier',x:3300,patrolW:120},
      {type:'dragon',x:3800,y:165,patrolW:200},
      {type:'soldier',x:4400,patrolW:120},
      {type:'soldier',x:4950,patrolW:100},
      // Boss centrado con rango amplio para salir hacia afuera
      {type:'boss',x:5380,y:285,pL:4980,pR:5720},
    ],
    coins:[
      {x:180,y:258},{x:470,y:178},{x:770,y:258},{x:1070,y:178},{x:1370,y:258},
      {x:1670,y:178},{x:1970,y:258},{x:2270,y:178},{x:2570,y:258},{x:2870,y:178},
      {x:3170,y:258},{x:3470,y:178},{x:3770,y:258},{x:4070,y:178},{x:4370,y:258},
      {x:4670,y:178},
      {x:4960,y:150},{x:5130,y:150},{x:5290,y:150},{x:5450,y:150},{x:5610,y:150},{x:5740,y:150},
    ],
    goalX:5750,goalY:340
  },
  // ── NIVEL 10: EL ESPACIO FINAL ──
  {
    name:'Nivel 10 - El Espacio Final',theme:'space2',music:2,
    width:6600,height:480,groundY:384,bgTop:'#000010',bgBot:'#000000',portalColor:'#FF00FF',
    platforms:[
      mkP(0,384,6600,96,'brick'),mkP(0,0,6600,28,'brick'),
      mkP(130,288,140,28,'brick'),mkP(400,208,140,28,'brick'),mkP(680,288,140,28,'brick'),
      mkP(960,208,140,28,'brick'),mkP(1240,288,140,28,'brick'),mkP(1520,208,140,28,'brick'),
      mkP(1800,288,140,28,'brick'),mkP(2080,208,140,28,'brick'),mkP(2360,288,140,28,'brick'),
      mkP(2640,208,140,28,'brick'),mkP(2920,288,140,28,'brick'),mkP(3200,208,140,28,'brick'),
      mkP(3480,288,140,28,'brick'),mkP(3760,208,140,28,'brick'),mkP(4040,288,140,28,'brick'),
      mkP(4320,208,140,28,'brick'),mkP(4600,288,140,28,'brick'),mkP(4880,208,140,28,'brick'),
      mkP(5160,288,140,28,'brick'),mkP(5440,208,140,28,'brick'),
      mkP(5660,384,940,96,'brick'),
      mkP(5700,288,100,28,'brick'),mkP(5860,288,100,28,'brick'),
      mkP(6020,288,100,28,'brick'),mkP(6180,288,100,28,'brick'),
      mkP(6340,288,100,28,'brick'),mkP(6500,288,100,28,'brick'),
    ],
    enemies:[
      {type:'soldier',x:250,patrolW:110},{type:'dragon',x:520,y:165,patrolW:200},
      {type:'fish',x:800,y:190,patrolW:180},{type:'soldier',x:1100,patrolW:110},
      {type:'dragon',x:1380,y:165,patrolW:200},{type:'fish',x:1660,y:185,patrolW:180},
      {type:'soldier',x:1960,patrolW:110},{type:'dragon',x:2240,y:165,patrolW:200},
      {type:'fish',x:2520,y:190,patrolW:180},{type:'soldier',x:2820,patrolW:110},
      {type:'dragon',x:3100,y:165,patrolW:200},{type:'fish',x:3380,y:185,patrolW:180},
      {type:'soldier',x:3680,patrolW:110},{type:'dragon',x:3960,y:165,patrolW:200},
      {type:'fish',x:4240,y:190,patrolW:180},{type:'soldier',x:4540,patrolW:110},
      {type:'dragon',x:4820,y:165,patrolW:200},{type:'soldier',x:5120,patrolW:110},
      {type:'dragon',x:5400,y:160,patrolW:190},{type:'boss',x:5930,y:300},
    ],
    coins:[
      {x:180,y:258},{x:450,y:178},{x:730,y:258},{x:1010,y:178},{x:1290,y:258},
      {x:1570,y:178},{x:1850,y:258},{x:2130,y:178},{x:2410,y:258},{x:2690,y:178},
      {x:2970,y:258},{x:3250,y:178},{x:3530,y:258},{x:3810,y:178},{x:4090,y:258},
      {x:4370,y:178},{x:4650,y:258},{x:4930,y:178},{x:5210,y:258},{x:5490,y:178},
      {x:5750,y:258},{x:5850,y:258},{x:5950,y:355},{x:6050,y:355},{x:6150,y:355},
    ],
    goalX:6400,goalY:340
  },
  // ── NIVEL 11: EL VOLCÁN ARDIENTE (Lava Mortal) ──
  {
    name:'Nivel 11 - El Volcán Ardiente',theme:'volcano',music:3,hasLava:true,
    width:5600,height:480,groundY:410,bgTop:'#3A0800',bgBot:'#801800',portalColor:'#FF2200',
    platforms:[
      mkP(0,410,5600,70,'lava'),mkP(0,0,5600,24,'lava'),
      mkP(120,320,130,24,'stone'),mkP(380,240,110,24,'stone'),mkP(620,320,130,24,'stone'),
      mkP(870,240,110,24,'stone'),mkP(1100,320,130,24,'stone'),mkP(1360,240,110,24,'stone'),
      mkP(1600,320,130,24,'stone'),mkP(1850,240,110,24,'stone'),mkP(2100,320,130,24,'stone'),
      mkP(2350,240,110,24,'stone'),mkP(2600,320,130,24,'stone'),mkP(2850,240,110,24,'stone'),
      mkP(3100,320,130,24,'stone'),mkP(3350,240,110,24,'stone'),mkP(3600,320,130,24,'stone'),
      mkP(3850,240,110,24,'stone'),mkP(4100,320,130,24,'stone'),mkP(4350,240,110,24,'stone'),
      mkP(4600,320,130,24,'stone'),mkP(4880,220,360,24,'stone'),
    ],
    enemies:[
      {type:'dragon',x:300,y:170,patrolW:220},{type:'soldier',x:630,patrolW:110},
      {type:'dragon',x:1000,y:170,patrolW:220},{type:'soldier',x:1370,patrolW:110},
      {type:'dragon',x:1750,y:170,patrolW:220},{type:'soldier',x:2110,patrolW:110},
      {type:'dragon',x:2500,y:170,patrolW:220},{type:'soldier',x:2860,patrolW:110},
      {type:'dragon',x:3250,y:170,patrolW:220},{type:'soldier',x:3610,patrolW:110},
      {type:'dragon',x:4000,y:170,patrolW:220},{type:'soldier',x:4360,patrolW:110},
      {type:'dragon',x:4700,y:165,patrolW:200},
    ],
    coins:[
      {x:170,y:270},{x:420,y:190},{x:670,y:270},{x:920,y:190},{x:1150,y:270},
      {x:1410,y:190},{x:1650,y:270},{x:1900,y:190},{x:2150,y:270},{x:2400,y:190},
      {x:2650,y:270},{x:2900,y:190},{x:3150,y:270},{x:3400,y:190},{x:3650,y:270},
      {x:3900,y:190},{x:4150,y:270},{x:4400,y:190},{x:4650,y:270},{x:4920,y:175},
      {x:4990,y:175},{x:5060,y:175},
    ],
    goalX:5040,goalY:344
  },
  // ── NIVEL 12: LA INVASIÓN ZOMBI ──
  {
    name:'Nivel 12 - La Invasión Zombi',theme:'jungle',music:1,
    width:5600,height:480,groundY:390,bgTop:'#2A1A3A',bgBot:'#110A1A',portalColor:'#9933FF',
    platforms:[
      mkP(0,390,5600,90,'grass'),mkP(0,0,5600,24,'grass'),
      mkP(140,300,120,24,'grass'),mkP(380,220,110,24,'grass'),mkP(620,300,120,24,'grass'),
      mkP(860,220,110,24,'grass'),mkP(1100,300,120,24,'grass'),mkP(1340,220,110,24,'grass'),
      mkP(1580,300,120,24,'grass'),mkP(1820,220,110,24,'grass'),mkP(2060,300,120,24,'grass'),
      mkP(2300,220,110,24,'grass'),mkP(2540,300,120,24,'grass'),mkP(2780,220,110,24,'grass'),
      mkP(3020,300,120,24,'grass'),mkP(3260,220,110,24,'grass'),mkP(3500,300,120,24,'grass'),
      mkP(3740,220,110,24,'grass'),mkP(3980,300,120,24,'grass'),mkP(4220,220,110,24,'grass'),
      mkP(4460,300,120,24,'grass'),mkP(4740,200,420,24,'grass'),
    ],
    enemies:[
      {type:'zombie',x:200,patrolW:80},{type:'zombie',x:320,patrolW:80},{type:'zombie',x:450,patrolW:80},
      {type:'zombie',x:680,patrolW:80},{type:'zombie',x:800,patrolW:80},{type:'dragon',x:1000,y:170,patrolW:180},
      {type:'zombie',x:1180,patrolW:80},{type:'zombie',x:1300,patrolW:80},{type:'zombie',x:1450,patrolW:80},
      {type:'zombie',x:1680,patrolW:80},{type:'zombie',x:1800,patrolW:80},{type:'dragon',x:2000,y:170,patrolW:180},
      {type:'zombie',x:2180,patrolW:80},{type:'zombie',x:2300,patrolW:80},{type:'zombie',x:2450,patrolW:80},
      {type:'zombie',x:2680,patrolW:80},{type:'zombie',x:2800,patrolW:80},{type:'dragon',x:3000,y:170,patrolW:180},
      {type:'zombie',x:3180,patrolW:80},{type:'zombie',x:3300,patrolW:80},{type:'zombie',x:3450,patrolW:80},
      {type:'zombie',x:3680,patrolW:80},{type:'zombie',x:3800,patrolW:80},{type:'dragon',x:4000,y:170,patrolW:180},
      {type:'zombie',x:4180,patrolW:80},{type:'zombie',x:4350,patrolW:80},{type:'zombie',x:4500,patrolW:80},
      {type:'boss',x:4950,y:300},
    ],
    coins:[
      {x:190,y:250},{x:430,y:170},{x:670,y:250},{x:910,y:170},{x:1150,y:250},
      {x:1390,y:170},{x:1630,y:250},{x:1870,y:170},{x:2110,y:250},{x:2350,y:170},
      {x:2590,y:250},{x:2830,y:170},{x:3070,y:250},{x:3310,y:170},{x:3550,y:250},
      {x:3790,y:170},{x:4030,y:250},{x:4270,y:170},{x:4510,y:250},{x:4800,y:155},
    ],
    goalX:5200,goalY:344
  },
  // ── NIVEL 13: EL ABISMO DE TIBURONES Y PULPOS ──
  {
    name:'Nivel 13 - El Abismo Submarino',theme:'ocean',music:2,
    width:5600,height:480,groundY:400,bgTop:'#041428',bgBot:'#020814',portalColor:'#00E5FF',
    platforms:[
      mkP(0,400,5600,80,'coral'),mkP(0,0,5600,24,'coral'),
      mkP(120,310,130,24,'coral'),mkP(370,230,120,24,'coral'),mkP(620,310,130,24,'coral'),
      mkP(870,230,120,24,'coral'),mkP(1120,310,130,24,'coral'),mkP(1370,230,120,24,'coral'),
      mkP(1620,310,130,24,'coral'),mkP(1870,230,120,24,'coral'),mkP(2120,310,130,24,'coral'),
      mkP(2370,230,120,24,'coral'),mkP(2620,310,130,24,'coral'),mkP(2870,230,120,24,'coral'),
      mkP(3120,310,130,24,'coral'),mkP(3370,230,120,24,'coral'),mkP(3620,310,130,24,'coral'),
      mkP(3870,230,120,24,'coral'),mkP(4120,310,130,24,'coral'),mkP(4370,230,120,24,'coral'),
      mkP(4620,310,130,24,'coral'),mkP(4880,200,380,24,'coral'),
    ],
    enemies:[
      {type:'shark',x:300,y:230,patrolW:240},{type:'octopus',x:650,y:190},
      {type:'fish',x:900,y:240,patrolW:180},{type:'shark',x:1200,y:230,patrolW:240},
      {type:'octopus',x:1550,y:190},{type:'fish',x:1800,y:240,patrolW:180},
      {type:'shark',x:2100,y:230,patrolW:240},{type:'octopus',x:2450,y:190},
      {type:'fish',x:2700,y:240,patrolW:180},{type:'shark',x:3000,y:230,patrolW:240},
      {type:'octopus',x:3350,y:190},{type:'fish',x:3600,y:240,patrolW:180},
      {type:'shark',x:3900,y:230,patrolW:240},{type:'octopus',x:4250,y:190},
      {type:'shark',x:4550,y:220,patrolW:240},
    ],
    coins:[
      {x:170,y:260},{x:420,y:180},{x:670,y:260},{x:920,y:180},{x:1170,y:260},
      {x:1420,y:180},{x:1670,y:260},{x:1920,y:180},{x:2170,y:260},{x:2420,y:180},
      {x:2670,y:260},{x:2920,y:180},{x:3170,y:260},{x:3420,y:180},{x:3670,y:260},
      {x:3920,y:180},{x:4170,y:260},{x:4420,y:180},{x:4670,y:260},{x:4950,y:155},
    ],
    goalX:5050,goalY:354
  },
  // ── NIVEL 14: EL ESCUADRÓN AÉREO ──
  {
    name:'Nivel 14 - El Escuadrón Aéreo',theme:'airplane',music:3,
    width:5600,height:480,groundY:420,bgTop:'#203050',bgBot:'#507090',portalColor:'#FFAA00',
    platforms:[
      mkP(0,420,5600,60,'metal'),mkP(0,0,5600,20,'metal'),
      mkP(120,330,130,24,'metal'),mkP(370,250,110,24,'metal'),mkP(620,330,130,24,'metal'),
      mkP(870,250,110,24,'metal'),mkP(1120,330,130,24,'metal'),mkP(1370,250,110,24,'metal'),
      mkP(1620,330,130,24,'metal'),mkP(1870,250,110,24,'metal'),mkP(2120,330,130,24,'metal'),
      mkP(2370,250,110,24,'metal'),mkP(2620,330,130,24,'metal'),mkP(2870,250,110,24,'metal'),
      mkP(3120,330,130,24,'metal'),mkP(3370,250,110,24,'metal'),mkP(3620,330,130,24,'metal'),
      mkP(3870,250,110,24,'metal'),mkP(4120,330,130,24,'metal'),mkP(4370,250,110,24,'metal'),
      mkP(4620,330,130,24,'metal'),mkP(4880,210,380,24,'metal'),
    ],
    enemies:[
      {type:'plane',x:300,y:150,patrolW:300},{type:'soldier',x:650,patrolW:100},
      {type:'plane',x:1050,y:150,patrolW:300},{type:'soldier',x:1400,patrolW:100},
      {type:'plane',x:1800,y:150,patrolW:300},{type:'soldier',x:2150,patrolW:100},
      {type:'plane',x:2550,y:150,patrolW:300},{type:'soldier',x:2900,patrolW:100},
      {type:'plane',x:3300,y:150,patrolW:300},{type:'soldier',x:3650,patrolW:100},
      {type:'plane',x:4050,y:150,patrolW:300},{type:'soldier',x:4400,patrolW:100},
      {type:'plane',x:4750,y:145,patrolW:260},
    ],
    coins:[
      {x:170,y:280},{x:420,y:200},{x:670,y:280},{x:920,y:200},{x:1170,y:280},
      {x:1420,y:200},{x:1670,y:280},{x:1920,y:200},{x:2170,y:280},{x:2420,y:200},
      {x:2670,y:280},{x:2920,y:200},{x:3170,y:280},{x:3420,y:200},{x:3670,y:280},
      {x:3920,y:200},{x:4170,y:280},{x:4420,y:200},{x:4670,y:280},{x:4950,y:165},
    ],
    goalX:5060,goalY:374
  },
  // ── NIVEL 15: LA CAVERNA GLACIAL ──
  {
    name:'Nivel 15 - La Caverna Glacial',theme:'cave',music:2,
    width:5600,height:480,groundY:390,bgTop:'#0D1B2A',bgBot:'#1B263B',portalColor:'#00FFFF',
    platforms:[
      mkP(0,390,5600,90,'ice'),mkP(0,0,5600,24,'ice'),
      mkP(130,300,120,24,'ice'),mkP(380,220,110,24,'ice'),mkP(630,300,120,24,'ice'),
      mkP(880,220,110,24,'ice'),mkP(1130,300,120,24,'ice'),mkP(1380,220,110,24,'ice'),
      mkP(1630,300,120,24,'ice'),mkP(1880,220,110,24,'ice'),mkP(2130,300,120,24,'ice'),
      mkP(2380,220,110,24,'ice'),mkP(2630,300,120,24,'ice'),mkP(2880,220,110,24,'ice'),
      mkP(3130,300,120,24,'ice'),mkP(3380,220,110,24,'ice'),mkP(3630,300,120,24,'ice'),
      mkP(3880,220,110,24,'ice'),mkP(4130,300,120,24,'ice'),mkP(4380,220,110,24,'ice'),
      mkP(4630,300,120,24,'ice'),mkP(4880,200,380,24,'ice'),
    ],
    enemies:[
      {type:'dragon',x:300,y:165,patrolW:220},{type:'zombie',x:650,patrolW:110},
      {type:'dragon',x:1050,y:165,patrolW:220},{type:'soldier',x:1400,patrolW:110},
      {type:'dragon',x:1800,y:165,patrolW:220},{type:'zombie',x:2150,patrolW:110},
      {type:'dragon',x:2550,y:165,patrolW:220},{type:'soldier',x:2900,patrolW:110},
      {type:'dragon',x:3300,y:165,patrolW:220},{type:'zombie',x:3650,patrolW:110},
      {type:'dragon',x:4050,y:165,patrolW:220},{type:'soldier',x:4400,patrolW:110},
      {type:'boss',x:4950,y:300},
    ],
    coins:[
      {x:180,y:250},{x:430,y:170},{x:680,y:250},{x:930,y:170},{x:1180,y:250},
      {x:1430,y:170},{x:1680,y:250},{x:1930,y:170},{x:2180,y:250},{x:2430,y:170},
      {x:2680,y:250},{x:2930,y:170},{x:3180,y:250},{x:3430,y:170},{x:3680,y:250},
      {x:3930,y:170},{x:4180,y:250},{x:4430,y:170},{x:4680,y:250},{x:4950,y:155},
    ],
    goalX:5150,goalY:344
  },
  // ── NIVEL 16: EL TEMPLO MALDITO ──
  {
    name:'Nivel 16 - El Templo Maldito',theme:'temple',music:1,
    width:5600,height:480,groundY:390,bgTop:'#1A150D',bgBot:'#2A2014',portalColor:'#FFD700',
    platforms:[
      mkP(0,390,5600,90,'temple'),mkP(0,0,5600,24,'temple'),
      mkP(120,300,130,24,'temple'),mkP(370,220,110,24,'temple'),mkP(620,300,130,24,'temple'),
      mkP(870,220,110,24,'temple'),mkP(1120,300,130,24,'temple'),mkP(1370,220,110,24,'temple'),
      mkP(1620,300,130,24,'temple'),mkP(1870,220,110,24,'temple'),mkP(2120,300,130,24,'temple'),
      mkP(2370,220,110,24,'temple'),mkP(2620,300,130,24,'temple'),mkP(2870,220,110,24,'temple'),
      mkP(3120,300,130,24,'temple'),mkP(3370,220,110,24,'temple'),mkP(3620,300,130,24,'temple'),
      mkP(3870,220,110,24,'temple'),mkP(4120,300,130,24,'temple'),mkP(4370,220,110,24,'temple'),
      mkP(4620,300,130,24,'temple'),mkP(4880,200,380,24,'temple'),
    ],
    enemies:[
      {type:'soldier',x:300,patrolW:110},{type:'dragon',x:650,y:165,patrolW:200},
      {type:'soldier',x:1050,patrolW:110},{type:'soldier',x:1400,patrolW:110},
      {type:'dragon',x:1800,y:165,patrolW:200},{type:'soldier',x:2150,patrolW:110},
      {type:'soldier',x:2550,patrolW:110},{type:'dragon',x:2900,y:165,patrolW:200},
      {type:'soldier',x:3300,patrolW:110},{type:'soldier',x:3650,patrolW:110},
      {type:'dragon',x:4050,y:165,patrolW:200},{type:'soldier',x:4400,patrolW:110},
      {type:'dragon',x:4750,y:160,patrolW:190},
    ],
    coins:[
      {x:170,y:250},{x:420,y:170},{x:670,y:250},{x:920,y:170},{x:1170,y:250},
      {x:1420,y:170},{x:1670,y:250},{x:1920,y:170},{x:2170,y:250},{x:2420,y:170},
      {x:2670,y:250},{x:2920,y:170},{x:3170,y:250},{x:3420,y:170},{x:3670,y:250},
      {x:3920,y:170},{x:4170,y:250},{x:4420,y:170},{x:4670,y:250},{x:4950,y:155},
    ],
    goalX:5060,goalY:344
  },
  // ── NIVEL 17: LA FÁBRICA CIBERNÉTICA ──
  {
    name:'Nivel 17 - La Fábrica Cibernética',theme:'military',music:3,
    width:5600,height:480,groundY:390,bgTop:'#0D1B1E',bgBot:'#1B2E33',portalColor:'#00FFCC',
    platforms:[
      mkP(0,390,5600,90,'metal'),mkP(0,0,5600,24,'metal'),
      mkP(130,300,120,24,'metal'),mkP(380,220,110,24,'metal'),mkP(630,300,120,24,'metal'),
      mkP(880,220,110,24,'metal'),mkP(1130,300,120,24,'metal'),mkP(1380,220,110,24,'metal'),
      mkP(1630,300,120,24,'metal'),mkP(1880,220,110,24,'metal'),mkP(2130,300,120,24,'metal'),
      mkP(2380,220,110,24,'metal'),mkP(2630,300,120,24,'metal'),mkP(2880,220,110,24,'metal'),
      mkP(3130,300,120,24,'metal'),mkP(3380,220,110,24,'metal'),mkP(3630,300,120,24,'metal'),
      mkP(3880,220,110,24,'metal'),mkP(4130,300,120,24,'metal'),mkP(4380,220,110,24,'metal'),
      mkP(4630,300,120,24,'metal'),mkP(4880,200,380,24,'metal'),
    ],
    enemies:[
      {type:'soldier',x:300,patrolW:110},{type:'plane',x:650,y:150,patrolW:260},
      {type:'soldier',x:1050,patrolW:110},{type:'soldier',x:1400,patrolW:110},
      {type:'plane',x:1800,y:150,patrolW:260},{type:'soldier',x:2150,patrolW:110},
      {type:'soldier',x:2550,patrolW:110},{type:'plane',x:2900,y:150,patrolW:260},
      {type:'soldier',x:3300,patrolW:110},{type:'soldier',x:3650,patrolW:110},
      {type:'plane',x:4050,y:150,patrolW:260},{type:'soldier',x:4400,patrolW:110},
      {type:'plane',x:4750,y:145,patrolW:220},
    ],
    coins:[
      {x:180,y:250},{x:430,y:170},{x:680,y:250},{x:930,y:170},{x:1180,y:250},
      {x:1430,y:170},{x:1680,y:250},{x:1930,y:170},{x:2180,y:250},{x:2430,y:170},
      {x:2680,y:250},{x:2930,y:170},{x:3180,y:250},{x:3430,y:170},{x:3680,y:250},
      {x:3930,y:170},{x:4180,y:250},{x:4430,y:170},{x:4680,y:250},{x:4950,y:155},
    ],
    goalX:5150,goalY:344
  },
  // ── NIVEL 18: LOS ACANTILADOS DE LA TORMENTA ──
  {
    name:'Nivel 18 - Los Acantilados de Tormenta',theme:'sky',music:3,
    width:5600,height:480,groundY:420,bgTop:'#152238',bgBot:'#2B3E5C',portalColor:'#99E5FF',
    platforms:[
      mkP(0,420,5600,60,'cloud'),mkP(0,0,5600,20,'cloud'),
      mkP(120,330,130,24,'cloud'),mkP(370,250,110,24,'cloud'),mkP(620,330,130,24,'cloud'),
      mkP(870,250,110,24,'cloud'),mkP(1120,330,130,24,'cloud'),mkP(1370,250,110,24,'cloud'),
      mkP(1620,330,130,24,'cloud'),mkP(1870,250,110,24,'cloud'),mkP(2120,330,130,24,'cloud'),
      mkP(2370,250,110,24,'cloud'),mkP(2620,330,130,24,'cloud'),mkP(2870,250,110,24,'cloud'),
      mkP(3120,330,130,24,'cloud'),mkP(3370,250,110,24,'cloud'),mkP(3620,330,130,24,'cloud'),
      mkP(3870,250,110,24,'cloud'),mkP(4120,330,130,24,'cloud'),mkP(4370,250,110,24,'cloud'),
      mkP(4620,330,130,24,'cloud'),mkP(4880,210,380,24,'cloud'),
    ],
    enemies:[
      {type:'dragon',x:300,y:165,patrolW:240},{type:'dragon',x:700,y:165,patrolW:240},
      {type:'plane',x:1100,y:150,patrolW:260},{type:'dragon',x:1500,y:165,patrolW:240},
      {type:'dragon',x:1900,y:165,patrolW:240},{type:'plane',x:2300,y:150,patrolW:260},
      {type:'dragon',x:2700,y:165,patrolW:240},{type:'dragon',x:3100,y:165,patrolW:240},
      {type:'plane',x:3500,y:150,patrolW:260},{type:'dragon',x:3900,y:165,patrolW:240},
      {type:'dragon',x:4300,y:165,patrolW:240},{type:'plane',x:4700,y:145,patrolW:240},
    ],
    coins:[
      {x:170,y:280},{x:420,y:200},{x:670,y:280},{x:920,y:200},{x:1170,y:280},
      {x:1420,y:200},{x:1670,y:280},{x:1920,y:200},{x:2170,y:280},{x:2420,y:200},
      {x:2670,y:280},{x:2920,y:200},{x:3170,y:280},{x:3420,y:200},{x:3670,y:280},
      {x:3920,y:200},{x:4170,y:280},{x:4420,y:200},{x:4670,y:280},{x:4950,y:165},
    ],
    goalX:5060,goalY:374
  },
  // ── NIVEL 19: EL NÚCLEO DE MAGMA Y DRAGONES GEMELOS ──
  {
    name:'Nivel 19 - El Núcleo de Magma',theme:'volcano',music:3,hasLava:true,
    width:5600,height:480,groundY:410,bgTop:'#450500',bgBot:'#901200',portalColor:'#FF4400',
    platforms:[
      mkP(0,410,5600,70,'lava'),mkP(0,0,5600,24,'lava'),
      mkP(120,320,130,24,'stone'),mkP(380,240,110,24,'stone'),mkP(620,320,130,24,'stone'),
      mkP(870,240,110,24,'stone'),mkP(1100,320,130,24,'stone'),mkP(1360,240,110,24,'stone'),
      mkP(1600,320,130,24,'stone'),mkP(1850,240,110,24,'stone'),mkP(2100,320,130,24,'stone'),
      mkP(2350,240,110,24,'stone'),mkP(2600,320,130,24,'stone'),mkP(2850,240,110,24,'stone'),
      mkP(3100,320,130,24,'stone'),mkP(3350,240,110,24,'stone'),mkP(3600,320,130,24,'stone'),
      mkP(3850,240,110,24,'stone'),mkP(4100,320,130,24,'stone'),mkP(4350,240,110,24,'stone'),
      mkP(4600,320,130,24,'stone'),mkP(4880,220,380,24,'stone'),
    ],
    enemies:[
      {type:'dragon',x:300,y:165,patrolW:220},{type:'soldier',x:650,patrolW:110},
      {type:'dragon',x:1050,y:165,patrolW:220},{type:'dragon',x:1400,y:165,patrolW:220},
      {type:'soldier',x:1800,patrolW:110},{type:'dragon',x:2150,y:165,patrolW:220},
      {type:'dragon',x:2550,y:165,patrolW:220},{type:'soldier',x:2900,patrolW:110},
      {type:'dragon',x:3300,y:165,patrolW:220},{type:'dragon',x:3650,y:165,patrolW:220},
      {type:'soldier',x:4050,patrolW:110},{type:'dragon',x:4400,y:165,patrolW:220},
      {type:'boss',x:4950,y:300},
    ],
    coins:[
      {x:170,y:270},{x:420,y:190},{x:670,y:270},{x:920,y:190},{x:1150,y:270},
      {x:1410,y:190},{x:1650,y:270},{x:1900,y:190},{x:2150,y:270},{x:2400,y:190},
      {x:2650,y:270},{x:2900,y:190},{x:3150,y:270},{x:3400,y:190},{x:3650,y:270},
      {x:3900,y:190},{x:4150,y:270},{x:4400,y:190},{x:4650,y:270},{x:4950,y:175},
    ],
    goalX:5150,goalY:344
  },
  // ── NIVEL 20: LA FORTALEZA DEL TITÁN CÓSMICO (Batalla Final) ──
  {
    name:'Nivel 20 - El Fin del Universo (Titán Cósmico)',theme:'space2',music:3,
    width:5600,height:480,groundY:390,bgTop:'#050010',bgBot:'#1A0033',portalColor:'#FFD700',
    platforms:[
      mkP(0,390,5600,90,'stone'),mkP(0,0,5600,24,'stone'),
      mkP(130,300,120,24,'stone'),mkP(380,220,110,24,'stone'),mkP(630,300,120,24,'stone'),
      mkP(880,220,110,24,'stone'),mkP(1130,300,120,24,'stone'),mkP(1380,220,110,24,'stone'),
      mkP(1630,300,120,24,'stone'),mkP(1880,220,110,24,'stone'),mkP(2130,300,120,24,'stone'),
      mkP(2380,220,110,24,'stone'),mkP(2630,300,120,24,'stone'),mkP(2880,220,110,24,'stone'),
      mkP(3130,300,120,24,'stone'),mkP(3380,220,110,24,'stone'),mkP(3630,300,120,24,'stone'),
      mkP(3880,220,110,24,'stone'),mkP(4130,300,120,24,'stone'),mkP(4380,220,110,24,'stone'),
      mkP(4630,300,120,24,'stone'),mkP(4880,200,420,24,'stone'),
    ],
    enemies:[
      {type:'plane',x:300,y:140,patrolW:280},{type:'dragon',x:650,y:165,patrolW:220},
      {type:'soldier',x:1050,patrolW:110},{type:'plane',x:1400,y:140,patrolW:280},
      {type:'dragon',x:1800,y:165,patrolW:220},{type:'soldier',x:2150,patrolW:110},
      {type:'plane',x:2550,y:140,patrolW:280},{type:'dragon',x:2900,y:165,patrolW:220},
      {type:'soldier',x:3300,patrolW:110},{type:'plane',x:3650,y:140,patrolW:280},
      {type:'dragon',x:4050,y:165,patrolW:220},{type:'soldier',x:4400,patrolW:110},
      {type:'boss',x:4950,y:300},
    ],
    coins:[
      {x:180,y:250},{x:430,y:170},{x:680,y:250},{x:930,y:170},{x:1180,y:250},
      {x:1430,y:170},{x:1680,y:250},{x:1930,y:170},{x:2180,y:250},{x:2430,y:170},
      {x:2680,y:250},{x:2930,y:170},{x:3180,y:250},{x:3430,y:170},{x:3680,y:250},
      {x:3930,y:170},{x:4180,y:250},{x:4430,y:170},{x:4680,y:250},{x:4950,y:155},
    ],
    goalX:5250,goalY:344
  }

];

// ─────────────────────────────────────────────────────
// MOTOR PRINCIPAL DEL JUEGO
// ─────────────────────────────────────────────────────
class Game {
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    canvas.width=CW; canvas.height=CH;
    this.ctx.imageSmoothingEnabled=false;

    this.state=GS.MENU;
    this.levelIdx=0;
    this.gameMode=0; // 0: Normal, 1: Infinito (Modo Niños)
    this.infiniteLives=false;
    this.player=null;
    this.platforms=[];
    this.enemies=[];
    this.coins=[];
    this.heartItems=[];
    this.fireballs=[];
    this.bombs=[];
    this.particles=[];
    this.camera=new Camera(CW,CH);
    this.level=LEVEL_DATA[0];

    this.tick=0;
    this.levelDoneTimer=0;
    this.gameOverTimer=0;
    this.victoryTimer=0;

    this.stars=this._genStars(130);
    this.clouds=this._genClouds(7);
    this.torchPositions=[];
    this.towerPositions=[];

    this._lastTime=0;
  }

  // ── Generadores de fondo ──
  _genStars(n){ return Array.from({length:n},()=>({x:Math.random()*CW,y:Math.random()*CH,s:Math.random()*1.8+0.5,t:Math.random()*Math.PI*2})); }
  _genClouds(n){ return Array.from({length:n},(_,i)=>({x:100+i*140,y:20+Math.random()*70,w:60+Math.random()*90})); }
  _genTorches(){ return Array.from({length:20},(_,i)=>150+i*240); }
  _genTowers(){ return Array.from({length:8}, (_,i)=>50+i*380); }

  // ── Cargar nivel ──
  loadLevel(idx){
    this.levelIdx = idx;
    const data=LEVEL_DATA[idx];
    this.level=data;
    this.platforms=data.platforms;
    this.camera=new Camera(data.width, data.height);

    // Jugador: preservar vidas, monedas y puntos al cambiar nivel
    const prevLives = this.player?this.player.lives:3;
    const prevCoins = this.player?this.player.coins:0;
    const prevScore = this.player?this.player.score:0;
    const spawnY    = data.groundY - 46;

    this.player=new Player(50, spawnY);
    this.player.infiniteLives = this.infiniteLives;
    if(this.infiniteLives){
      this.player.lives = 999;
      this.player.hp = this.player.maxHp;
    } else {
      this.player.lives = prevLives;
    }
    this.player.coins=prevCoins;
    this.player.score=prevScore;
    this.player.startX=50; this.player.startY=spawnY;
    this.player.invincible=60;

    this.enemies=data.enemies.map(e=>{
      if(e.type==='zombie') return new Zombie(e, this.platforms);
      if(e.type==='dragon') return new Dragon(e);
      if(e.type==='boss')   return new BossDragon(e);
      if(e.type==='soldier') return new Soldier(e, this.platforms);
      if(e.type==='fish')    return new FishEnemy(e);
      if(e.type==='shark')   return new Shark(e);
      if(e.type==='octopus') return new Octopus(e);
      if(e.type==='plane')   return new PlaneEnemy(e);
      return null;
    }).filter(Boolean);

    this.coins     = data.coins.map(c=>new Coin(c.x,c.y));
    // Generar corazones / tónicos distribuidos en plataformas elevadas
    this.heartItems = [];
    if(data.platforms && data.platforms.length > 4){
      const highPlats = data.platforms.filter(p => p.y < data.groundY - 80 && p.solid && p.w >= 80);
      for(let hi = 2; hi < highPlats.length; hi += 3){
        const hp = highPlats[hi];
        const isPot = (hi % 2 === 0);
        this.heartItems.push(new HeartItem(hp.x + hp.w/2 - 9, hp.y - 28, isPot));
      }
    }
    this.fireballs = [];
    this.bombs     = [];
    this.particles = [];

    this.clouds         = this._genClouds(8);
    this.torchPositions = this._genTorches();
    this.towerPositions = this._genTowers();

    this.state=GS.PLAYING;
    this.levelDoneTimer=0;
    this.tick=0;
    Sound.startBgMusic(data.music);
  }

  // ── Game Over ──
  triggerGameOver(){
    this.state=GS.GAME_OVER;
    this.gameOverTimer=0;
    Sound.stopBgMusic();
    Sound.gameOver();
  }

  // ── Loop principal ──
  update(ts){
    const dt=Math.min((ts-this._lastTime)/16.67,3);
    this._lastTime=ts;
    this.tick++;

    if(this.state===GS.PLAYING)    this._updateGame(dt);
    if(this.state===GS.LEVEL_DONE) this._updateLevelDone();
    if(this.state===GS.GAME_OVER)  this.gameOverTimer++;
    if(this.state===GS.VICTORY)    this.victoryTimer++;

    // Animar nubes siempre
    for(const c of this.clouds){ c.x+=0.18; if(c.x>(this.level?.width||CW)+200) c.x=-150; }
  }

  _updateGame(dt){
    const p=this.player, lv=this.level;

    p.update(Keys, this.platforms, this);
    this.camera.follow(p.x,p.y,p.w,p.h);
    this.camera.update();

    for(const e of this.enemies){
      if(e instanceof Zombie)          e.update(dt,this.platforms,p,this);
      else if(e instanceof Soldier)    e.update(dt,this.platforms,p,this);
      else if(e instanceof Dragon)     e.update(dt,p,this);
      else if(e instanceof FishEnemy)  e.update(dt,p,this);
      else if(e instanceof Shark)      e.update(dt,p,this);
      else if(e instanceof Octopus)    e.update(dt,p,this);
      else if(e instanceof PlaneEnemy) e.update(dt,p,this);
      else if(e instanceof BossDragon) e.update(dt,p,this);
    }
    this.enemies=this.enemies.filter(e=>e.alive);

    for(const c of this.coins)        c.update(p,this);
    this.coins=this.coins.filter(c=>c.alive);

    for(const h of this.heartItems)   h.update(p,this);
    this.heartItems=this.heartItems.filter(h=>h.alive);

    for(const f of this.fireballs) f.update(this.platforms,this);
    this.fireballs=this.fireballs.filter(f=>f.alive);

    for(const b of this.bombs) b.update(this.platforms,this);
    this.bombs=this.bombs.filter(b=>b.alive);

    for(const pt of this.particles) pt.update();
    this.particles=this.particles.filter(pt=>pt.alive);

    // Colisión hacha ↔ enemigos
    for(const ax of p.axes){
      if(!ax.alive) continue;
      for(const e of this.enemies){
        if(!e.alive||e.dead) continue;
        if(overlap(ax.x,ax.y,ax.w,ax.h, e.x,e.y,e.w,e.h)){
          e.takeDamage(1,this);
          Sound.axeHit();
          ax.bounces++;
          if(ax.bounces>=ax.maxBounces) ax.alive=false;
          break;
        }
      }
    }

    // Meta / portal
    const boss=this.enemies.find(e=>e instanceof BossDragon);
    const bossOk=!boss||boss.dead||!boss.alive;
    if(!p.dead && bossOk &&
       overlap(p.x,p.y,p.w,p.h, lv.goalX-12,lv.goalY-20,64,90)){
      this._levelComplete();
    }
  }

  _levelComplete(){
    this.state=GS.LEVEL_DONE;
    this.levelDoneTimer=0;
    Sound.stopBgMusic();
    Sound.levelComplete();
    // Explosión de partículas en la meta
    for(let i=0;i<35;i++){
      this.particles.push(new Particle(
        this.level.goalX+20, this.level.goalY+26,
        ['#FFD700','#FF4444','#44FF44','#4444FF','#FF44FF'][randI(0,4)],
        randF(-9,9), randF(-11,-2), 90, randI(4,9)
      ));
    }
  }

  _updateLevelDone(){
    this.levelDoneTimer++;
    // Seguir actualizando partículas
    for(const pt of this.particles) pt.update();
    this.particles=this.particles.filter(pt=>pt.alive);

    if(this.levelDoneTimer>165){
      this.levelIdx++;
      if(this.levelIdx>=LEVEL_DATA.length){
        this.state=GS.VICTORY;
        this.victoryTimer=0;
      } else {
        this.loadLevel(this.levelIdx);
      }
    }
  }

  // ── Dibujo ──
  draw(){
    const ctx=this.ctx;
    ctx.imageSmoothingEnabled=false;
    switch(this.state){
      case GS.MENU:       this._drawMenu(ctx);      break;
      case GS.PLAYING:    this._drawGame(ctx);      break;
      case GS.PAUSED:     this._drawGame(ctx); this._drawPause(ctx); break;
      case GS.LEVEL_DONE: this._drawGame(ctx); this._drawLevelDone(ctx); break;
      case GS.GAME_OVER:  this._drawGameOver(ctx);  break;
      case GS.VICTORY:    this._drawVictory(ctx);   break;
    }
  }

  // ── Fondo ──
  _drawBg(ctx){
    const lv=this.level, cam=this.camera, t=this.tick;

    // Gradiente de cielo
    const g=ctx.createLinearGradient(0,0,0,CH);
    g.addColorStop(0,lv.bgTop); g.addColorStop(1,lv.bgBot);
    ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);

    if(lv.theme==='village'){
      // Nubes
      ctx.fillStyle='rgba(255,255,255,0.82)';
      for(const c of this.clouds){
        const cx=((c.x-cam.x*0.28)%(lv.width+300))-100;
        this._cloud(ctx,cx,c.y,c.w);
      }
      // Colinas lejanas
      ctx.fillStyle='#5DAF5D';
      for(let i=0;i<9;i++){
        const hx=((i*520+30)-cam.x*0.45)%(lv.width+520)-130;
        this._hill(ctx,hx,CH-100,200+Math.sin(i)*30,75);
      }
      // Árboles
      for(let i=0;i<25;i++){
        const tx=((i*160+60)-cam.x*0.68)%(lv.width+200)-100;
        this._tree(ctx,tx,CH-128);
      }
    } else if(lv.theme==='cave'){
      // Estalactitas
      ctx.fillStyle='#1C2830';
      for(let i=0;i<32;i++){
        const sx=((i*155+20)-cam.x*0.82)%(lv.width+200)-100;
        ctx.beginPath();
        ctx.moveTo(sx,32); ctx.lineTo(sx+14,32+35+Math.sin(i*1.7)*18); ctx.lineTo(sx+28,32);
        ctx.fill();
      }
      // Estalagmitas
      ctx.fillStyle='#263238';
      for(let i=0;i<20;i++){
        const sx=((i*200+80)-cam.x*0.75)%(lv.width+200)-100;
        ctx.beginPath();
        ctx.moveTo(sx,384); ctx.lineTo(sx+10,384-22-Math.sin(i*2.1)*10); ctx.lineTo(sx+20,384);
        ctx.fill();
      }
      // Antorchas
      for(const tx of this.torchPositions){
        const sx=cam.sx2(tx);
        if(sx>-60 && sx<CW+60) Sprites.drawTorch(ctx,sx,CH-138,t);
      }
    } else if(lv.theme==='castle'){
      // Estrellas
      for(const s of this.stars){
        const a=0.45+Math.sin(t*0.05+s.t)*0.35;
        Sprites.drawStar(ctx,s.x,s.y,s.s,a);
      }
      // Torres de fondo (parallax)
      ctx.fillStyle='#1A0A2E';
      for(const tx of this.towerPositions){
        const sx=((tx)-cam.x*0.18)%(lv.width+400)-150;
        this._tower(ctx,sx,CH-185,38,155);
      }
      // Luna
      ctx.fillStyle='#EEEECC';
      ctx.beginPath();
      ctx.arc(CW-90+Math.sin(t*0.002)*5, 55, 30, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#CCCCAA';
      ctx.fillRect(CW-108,38,20,34); // sombra de luna (fase)
    }
  }

  _cloud(ctx,x,y,w){
    ctx.beginPath();
    ctx.arc(x+w*.5,y+10,w*.26,0,Math.PI*2);
    ctx.arc(x+w*.3,y+14,w*.21,0,Math.PI*2);
    ctx.arc(x+w*.7,y+14,w*.21,0,Math.PI*2);
    ctx.arc(x+w*.15,y+16,w*.15,0,Math.PI*2);
    ctx.arc(x+w*.85,y+16,w*.15,0,Math.PI*2);
    ctx.fill();
  }
  _hill(ctx,x,y,w,h){ ctx.beginPath(); ctx.arc(x+w/2,y,w/2,Math.PI,0); ctx.fill(); }
  _tree(ctx,x,y){
    ctx.fillStyle='#5D3A1A'; ctx.fillRect(x+9,y+22,7,26);
    ctx.fillStyle='#2D6A2D';
    ctx.beginPath(); ctx.moveTo(x+12,y-12); ctx.lineTo(x+2,y+26); ctx.lineTo(x+22,y+26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+12,y-26); ctx.lineTo(x+5,y+10); ctx.lineTo(x+19,y+10); ctx.fill();
    ctx.fillStyle='#388E3C';
    ctx.beginPath(); ctx.moveTo(x+12,y-38); ctx.lineTo(x+7,y-5); ctx.lineTo(x+17,y-5); ctx.fill();
  }
  _tower(ctx,x,y,w,h){
    ctx.fillStyle='#1A0A2E'; ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#260F3C';
    for(let i=0;i<3;i++) ctx.fillRect(x+i*(w/3),y-14,w/3-3,14);
    ctx.fillStyle='#FF0000'; ctx.globalAlpha=0.3;
    ctx.fillRect(x+w/2-2,y+10,4,4);
    ctx.globalAlpha=1;
  }

  // ── Plataformas ──

  _jungleTree(ctx,x,y,h){
    ctx.fillRect(x+h*.4,y-h,h*.2,h);
    ctx.beginPath();ctx.arc(x+h*.5,y-h,h*.5,Math.PI,0);ctx.fill();
    ctx.beginPath();ctx.arc(x+h*.5,y-h*0.7,h*.45,Math.PI,0);ctx.fill();
    ctx.beginPath();ctx.arc(x+h*.5,y-h*0.4,h*.4,Math.PI,0);ctx.fill();
  }
  _cactus(ctx,x,y){
    ctx.fillRect(x,y-50,8,50);
    ctx.fillRect(x-14,y-35,14,8);ctx.fillRect(x-14,y-43,8,16);
    ctx.fillRect(x+8,y-28,14,8);ctx.fillRect(x+14,y-36,8,16);
  }

  _drawPlatforms(ctx){
    for(const p of this.platforms){
      if(!p.solid) continue;
      const sx=Math.floor(this.camera.sx2(p.x));
      const sy=Math.floor(this.camera.sy2(p.y));
      Sprites.drawPlatform(ctx,sx,sy,p.w,p.h,p.type);
    }
  }

  // ── Escena del juego ──
  _drawGame(ctx){
    this._drawBg(ctx);
    this._drawPlatforms(ctx);

    // Portal de meta
    const gx=Math.floor(this.camera.sx2(this.level.goalX));
    const gy=Math.floor(this.camera.sy2(this.level.goalY));
    Sprites.drawPortal(ctx,gx,gy,this.level.portalColor,this.tick);

    for(const c  of this.coins)        c.draw(ctx,this.camera);
    for(const h  of this.heartItems)   h.draw(ctx,this.camera);
    for(const ax of this.player.axes)  ax.draw(ctx,this.camera);
    for(const b  of this.bombs)        b.draw(ctx,this.camera);
    for(const e  of this.enemies)      e.draw(ctx,this.camera);
    for(const f  of this.fireballs)    f.draw(ctx,this.camera);
    this.player.draw(ctx,this.camera);
    for(const pt of this.particles)    pt.draw(ctx,this.camera);

    this._drawHUD(ctx);

    // Nombre del nivel (primeros segundos)
    if(this.tick<200){
      const a=Math.min(1,(200-this.tick)/50);
      ctx.globalAlpha=a;
      ctx.font='bold 26px monospace'; ctx.textAlign='center';
      ctx.fillStyle='#000000AA';
      ctx.fillRect(0,CH/2-36,CW,50);
      ctx.fillStyle='#FFD700';
      ctx.fillText(this.level.name,CW/2,CH/2-5);
      ctx.globalAlpha=1;
    }
  }

  // ── HUD ──
  _drawHUD(ctx){
    const p=this.player;
    // Panel superior
    ctx.fillStyle='rgba(0,0,0,0.52)';
    ctx.fillRect(0,0,CW,38);
    ctx.strokeStyle='rgba(255,200,0,0.3)';
    ctx.lineWidth=1; ctx.strokeRect(0,0,CW,38);

    // Corazones / Vidas
    ctx.font='bold 10px monospace'; ctx.fillStyle='#FFFFFF'; ctx.textAlign='left';
    if(this.infiniteLives){
      ctx.fillStyle='#FFD700';
      ctx.fillText('VIDAS: ❤❤❤ (INFINITO ∞)', 6, 24);
    } else {
      ctx.fillText('VIDAS:', 6,24);
      for(let i=0;i<p.maxHp;i++) Sprites.drawHeart(ctx,52+i*20,10,i<p.hp);
    }

    // Monedas
    Sprites.drawCoin(ctx,120,8,Math.floor(this.tick/7)%8);
    ctx.fillStyle='#FFD700'; ctx.textAlign='left'; ctx.font='bold 11px monospace';
    ctx.fillText('x'+p.coins, 140, 24);

    // Bombas
    Sprites.drawBomb(ctx, 175, 10, 0, Math.floor(this.tick/10)%4);
    ctx.fillStyle='#FFAA00'; ctx.textAlign='left'; ctx.font='bold 11px monospace';
    ctx.fillText('x'+p.bombs+' (C)', 198, 24);
    if(p.bombs < p.maxBombs){
      ctx.fillStyle='rgba(255,170,0,0.3)'; ctx.fillRect(198, 28, 40, 3);
      ctx.fillStyle='#00FF88'; ctx.fillRect(198, 28, 40*(p.bombRegenTimer/160), 3);
    }

    // Puntos
    ctx.fillStyle='#FFFFFF'; ctx.textAlign='center';
    ctx.font='bold 10px monospace';
    ctx.fillText('PUNTOS: '+p.score.toString().padStart(6,'0'), CW/2+30, 24);

    // Nivel
    ctx.textAlign='right'; ctx.fillStyle='#AAAAFF';
    ctx.fillText('NIVEL '+(this.levelIdx+1)+'/'+LEVEL_DATA.length,CW-8,24);

    // Indicador de enfriamiento del hacha
    ctx.fillStyle='rgba(255,255,255,0.22)';
    ctx.fillRect(CW-62,26,54,5);
    const cdPct=1-p.axeCd/AXE_CD;
    ctx.fillStyle=cdPct>=1?'#00FF88':'#FFAA00';
    ctx.fillRect(CW-62,26,54*Math.min(1,cdPct),5);

    // Vidas extra
    ctx.font='11px monospace'; ctx.textAlign='left';
    if(this.infiniteLives){
      ctx.fillStyle='#FFD700';
      ctx.fillText('❤ MODO NIÑOS / INFINITO', 6, 36+12);
    } else {
      ctx.fillStyle='#FFAAAA';
      ctx.fillText('❤ x'+p.lives, 6, 36+12);
    }
  }

  // ── Menú principal ──
  _drawMenu(ctx){
    // Fondo estrellado
    const g=ctx.createLinearGradient(0,0,0,CH);
    g.addColorStop(0,'#0A0520'); g.addColorStop(1,'#1A0535');
    ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);
    for(const s of this.stars){
      const a=0.4+Math.sin(this.tick*0.05+s.t)*0.45;
      Sprites.drawStar(ctx,s.x,s.y,s.s,a);
    }

    // Marco decorativo
    ctx.strokeStyle='#660099'; ctx.lineWidth=4;
    ctx.strokeRect(12,12,CW-24,CH-24);
    ctx.strokeStyle='#9900FF'; ctx.lineWidth=1;
    ctx.strokeRect(16,16,CW-32,CH-32);

    // Ornamentos de esquina
    const corner=(x,y)=>{
      ctx.fillStyle='#FFD700';
      ctx.fillRect(x-6,y-6,12,4); ctx.fillRect(x-6,y-6,4,12);
      ctx.fillRect(x-6,y+2,12,4); ctx.fillRect(x+2,y-6,4,12);
    };
    corner(20,20); corner(CW-20,20); corner(20,CH-20); corner(CW-20,CH-20);

    const t=this.tick;

    // Título
    const wave=Math.sin(t*0.05)*6;
    ctx.font='bold 44px monospace'; ctx.textAlign='center';
    // Sombra
    ctx.fillStyle='#440022';
    ctx.fillText('⚔ DRAGON MARCE ⚔',CW/2+4,98+wave+4);
    // Gradiente dorado
    const tg=ctx.createLinearGradient(0,60,0,105);
    tg.addColorStop(0,'#FFD700'); tg.addColorStop(0.5,'#FF8C00'); tg.addColorStop(1,'#FFD700');
    ctx.fillStyle=tg;
    ctx.fillText('⚔ DRAGON MARCE ⚔',CW/2,98+wave);
    // Subtítulo
    ctx.font='bold 18px monospace';
    ctx.fillStyle='#CC66FF';
    ctx.fillText('Aventuras',CW/2,126+wave*.5);

    // ── SELECTOR DE MODO DE JUEGO ──
    const modeY = 160;
    const m0_sel = (this.gameMode === 0);
    const m1_sel = (this.gameMode === 1);

    // Opción 1: MODO NORMAL
    const b0_x = CW/2 - 270, b0_w = 255, b0_h = 58;
    ctx.fillStyle = m0_sel ? 'rgba(0, 150, 255, 0.28)' : 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(b0_x, modeY, b0_w, b0_h);
    ctx.strokeStyle = m0_sel ? '#00E5FF' : '#445577';
    ctx.lineWidth = m0_sel ? 3 : 1;
    ctx.strokeRect(b0_x, modeY, b0_w, b0_h);

    ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = m0_sel ? '#FFFFFF' : '#8899AA';
    ctx.fillText((m0_sel ? '▶ ' : '  ') + '🌟 MODO NORMAL', b0_x + 12, modeY + 24);
    ctx.font = '11px monospace'; ctx.fillStyle = m0_sel ? '#99EEFF' : '#667788';
    ctx.fillText('   3 Vidas • Desafío clásico', b0_x + 12, modeY + 44);

    // Opción 2: MODO VIDA INFINITA (Ideal para los más chicos)
    const b1_x = CW/2 + 15, b1_w = 255, b1_h = 58;
    ctx.fillStyle = m1_sel ? 'rgba(255, 170, 0, 0.32)' : 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(b1_x, modeY, b1_w, b1_h);
    ctx.strokeStyle = m1_sel ? '#FFD700' : '#445577';
    ctx.lineWidth = m1_sel ? 3 : 1;
    ctx.strokeRect(b1_x, modeY, b1_w, b1_h);

    ctx.font = 'bold 15px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = m1_sel ? '#FFD700' : '#8899AA';
    ctx.fillText((m1_sel ? '▶ ' : '  ') + '🛡️ VIDA INFINITA', b1_x + 12, modeY + 24);
    ctx.font = '11px monospace'; ctx.fillStyle = m1_sel ? '#FFE599' : '#667788';
    ctx.fillText('   Vidas ∞ • Ideal para niños ❤', b1_x + 12, modeY + 44);

    // Indicador de cómo cambiar de modo
    ctx.font = '11px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('Haz click en el modo o usa [ ← → ] / [ ↑ ↓ ] para elegir', CW/2, modeY + 76);

    // Botón / Pulso de "Comenzar"
    const blink = 0.6 + Math.sin(t * 0.12) * 0.4;
    ctx.globalAlpha = blink;
    ctx.fillStyle = this.gameMode === 1 ? '#FFD700' : '#00FF88';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('▶  PRESIONA ENTER O CLICK AQUÍ PARA COMENZAR  ◀', CW/2, 276);
    ctx.globalAlpha = 1;

    // Controles
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(20,318,CW-40,90);
    ctx.strokeStyle='#660099'; ctx.lineWidth=1; ctx.strokeRect(20,318,CW-40,90);
    ctx.font='bold 11px monospace'; ctx.fillStyle='#AAAAFF';
    ctx.fillText('CONTROLES',CW/2,334);
    ctx.fillStyle='#FFFFFF'; ctx.font='10px monospace';
    ctx.fillText('← → / A D : Mover       ↑ / W / ESPACIO : Saltar (Doble salto)',CW/2,352);
    ctx.fillText('Z / X : Lanzar hacha    C : Tirar Bomba 💣    F : Pantalla Completa    ESC : Pausa',CW/2,368);
    ctx.fillStyle='#FFFF88';
    ctx.fillText('¡Mata dragones, zombies y soldados, recoge monedas y llega al portal!',CW/2,388);

    // Showcase de personajes
    Sprites.drawPlayer(ctx,60,300,Math.floor(t/8)%4,1,'run');
    Sprites.drawZombie(ctx,CW-90,302,Math.floor(t/10)%4,-1,false);
  }

  // ── Pausa ──
  _drawPause(ctx){
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,CW,CH);
    ctx.font='bold 40px monospace'; ctx.textAlign='center';
    ctx.fillStyle='#FFD700';
    ctx.fillText('⏸ PAUSA',CW/2,CH/2-20);
    ctx.fillStyle='#FFFFFF'; ctx.font='16px monospace';
    ctx.fillText('Presiona ESC para continuar',CW/2,CH/2+25);
    ctx.fillStyle='#AAAAFF'; ctx.font='12px monospace';
    ctx.fillText('Monedas: '+this.player.coins+'    Puntos: '+this.player.score, CW/2, CH/2+60);
  }

  // ── Nivel completado ──
  _drawLevelDone(ctx){
    const t=this.levelDoneTimer;
    ctx.fillStyle=`rgba(0,0,0,${Math.min(0.75,t/55)})`; ctx.fillRect(0,0,CW,CH);
    if(t>28){
      ctx.globalAlpha=Math.min(1,(t-28)/35);
      ctx.font='bold 44px monospace'; ctx.textAlign='center';
      ctx.fillStyle='#FFD700';
      ctx.fillText('¡NIVEL COMPLETADO!',CW/2,CH/2-42);
      ctx.font='20px monospace'; ctx.fillStyle='#FFFFFF';
      ctx.fillText('Monedas: '+this.player.coins+'   Puntos: '+this.player.score,CW/2,CH/2+8);
      if(this.levelIdx+1<LEVEL_DATA.length){
        ctx.fillStyle='#00FF88'; ctx.font='15px monospace';
        ctx.fillText('Preparando Nivel '+(this.levelIdx+2)+'...',CW/2,CH/2+48);
      }
      ctx.globalAlpha=1;
    }
  }

  // ── Game Over ──
  _drawGameOver(ctx){
    const g=ctx.createLinearGradient(0,0,0,CH);
    g.addColorStop(0,'#3D0000'); g.addColorStop(1,'#1A0000');
    ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);
    // Efecto de lluvia de sangre
    ctx.fillStyle='#440000';
    for(let i=0;i<20;i++){
      const rx=(i*47+this.gameOverTimer*2)%CW;
      ctx.fillRect(rx,0,2,CH);
    }
    const w=Math.sin(this.gameOverTimer*0.1)*5;
    ctx.font='bold 52px monospace'; ctx.textAlign='center';
    ctx.fillStyle='#660000'; ctx.fillText('💀 GAME OVER 💀',CW/2+4,CH/2-34+w+4);
      ctx.fillStyle='#FF2222'; ctx.fillText('💀 GAME OVER 💀',CW/2,CH/2-34+w);
    ctx.font='20px monospace'; ctx.fillStyle='#FFAA00';
    ctx.fillText('Puntos finales: '+this.player.score,CW/2,CH/2+22);
    ctx.fillStyle='#FFD700';
    ctx.fillText('Monedas recolectadas: '+this.player.coins,CW/2,CH/2+50);
    const a=0.5+Math.sin(this.gameOverTimer*0.14)*0.5;
    ctx.globalAlpha=a; ctx.fillStyle='#FFFFFF'; ctx.font='13px monospace';
    ctx.fillText('Presiona ENTER o Click para volver al menú',CW/2,CH/2+98);
    ctx.globalAlpha=1;
  }

  // ── Victoria ──
  _drawVictory(ctx){
    const t=this.victoryTimer;
    const hue=(t*2.5)%360;
    const g=ctx.createLinearGradient(0,0,0,CH);
    g.addColorStop(0,`hsl(${hue},50%,8%)`); g.addColorStop(1,`hsl(${(hue+120)%360},50%,5%)`);
    ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH);

    // Estrellas de colores
    for(const s of this.stars){
      const a=0.7+Math.sin(t*0.1+s.t)*0.3;
      ctx.globalAlpha=a; ctx.fillStyle=`hsl(${(hue+s.x*0.5)%360},100%,80%)`;
      ctx.fillRect(s.x,s.y,s.s+1,s.s+1);
    }
    ctx.globalAlpha=1;

    // Fuegos artificiales automáticos
    if(t%18===0){
      const fx=randF(80,CW-80), fy=randF(40,200);
      for(let i=0;i<20;i++){
        const a=(i/20)*Math.PI*2;
        this.particles.push(new Particle(fx,fy,
          `hsl(${randI(0,360)},100%,60%)`,
          Math.cos(a)*randF(3,9),Math.sin(a)*randF(3,9),70,randI(3,7)
        ));
      }
    }
    for(const pt of this.particles){ pt.update(); pt.draw(ctx,{sx2:x=>x,sy2:y=>y}); }
    this.particles=this.particles.filter(pt=>pt.alive);

    // Textos
    const wave=Math.sin(t*0.08)*7;
    ctx.font='bold 40px monospace'; ctx.textAlign='center';
    ctx.fillStyle='#FFD700';
    ctx.fillText('🏆 ¡VICTORIA! 🏆',CW/2,114+wave);
    ctx.fillStyle='#00FF88'; ctx.font='bold 20px monospace';
    ctx.fillText('¡Derrotaste al Dragón Supremo!',CW/2,160+wave*.5);

    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(CW/2-200,175,400,110);
    ctx.font='18px monospace'; ctx.fillStyle='#FFFFFF';
    ctx.fillText('Puntuación final: '+this.player.score,CW/2,204);
    ctx.fillStyle='#FFD700';
    ctx.fillText('💰 Monedas: '+this.player.coins,CW/2,232);
    ctx.fillStyle='#FF6B6B';
    ctx.fillText('❤ Vidas restantes: '+this.player.lives,CW/2,260);

    if(t>70){
      const a=0.5+Math.sin(t*0.12)*0.5;
      ctx.globalAlpha=a; ctx.fillStyle='#00FF88'; ctx.font='13px monospace';
      ctx.fillText('Presiona ENTER o Click para jugar de nuevo',CW/2,355);
      ctx.globalAlpha=1;
    }
  }

  // ── Manejo de input externo ──
  onEnterOrClick(clientX, clientY){
    Sound.init(); Sound.resume();
    if(this.state===GS.MENU){
      if(clientX !== undefined && clientY !== undefined){
        const modeY = 160;
        const b0_x = CW/2 - 270, b0_w = 255, b0_h = 58;
        const b1_x = CW/2 + 15, b1_w = 255, b1_h = 58;
        // Si hace click en la caja de modo normal
        if(clientX >= b0_x && clientX <= b0_x + b0_w && clientY >= modeY && clientY <= modeY + b0_h){
          this.gameMode = 0;
          Sound.coin();
          return;
        }
        // Si hace click en la caja de modo infinito
        if(clientX >= b1_x && clientX <= b1_x + b1_w && clientY >= modeY && clientY <= modeY + b1_h){
          this.gameMode = 1;
          Sound.coin();
          return;
        }
      }
      this.infiniteLives = (this.gameMode === 1);
      this.levelIdx = 0;
      this.player = null;
      this.loadLevel(0);
    } else if(this.state===GS.GAME_OVER||this.state===GS.VICTORY){
      this.state=GS.MENU;
      Sound.stopBgMusic();
      this.tick=0; this.victoryTimer=0; this.gameOverTimer=0;
      this.particles=[];
    }
  }
  onEsc(){
    if(this.state===GS.PLAYING) this.state=GS.PAUSED;
    else if(this.state===GS.PAUSED) this.state=GS.PLAYING;
  }

  // ── Loop ──
  loop(ts){
    this.update(ts);
    this.draw();
    requestAnimationFrame(ts=>this.loop(ts));
  }
  start(){
    Sound.init(); Keys.init();
    requestAnimationFrame(ts=>{ this._lastTime=ts; this.loop(ts); });
  }
}

// ─────────────────────────────────────────────────────
// CONTROLES TÁCTILES / MÓVIL (Multitouch Ergonómico)
// ─────────────────────────────────────────────────────
function setupTouch(game){
  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;

    const press = () => {
      Sound.resume();
      Keys[key] = true;
      if(key === 'up') Keys._jump = true;
      if(key === 'attack') Keys._atk = true;
      if(key === 'bomb') Keys._bomb = true;
      el.classList.add('active');
    };

    const release = () => {
      Keys[key] = false;
      el.classList.remove('active');
    };

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      press();
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      release();
    }, { passive: false });

    el.addEventListener('touchcancel', e => {
      e.preventDefault();
      release();
    }, { passive: false });

    el.addEventListener('mousedown', e => {
      e.preventDefault();
      press();
    });

    el.addEventListener('mouseup', e => {
      e.preventDefault();
      release();
    });

    el.addEventListener('mouseleave', () => {
      release();
    });
  };

  bind('btnLeft', 'left');
  bind('btnRight', 'right');
  bind('btnJump', 'up');
  bind('btnAttack', 'attack');
  bind('btnBomb', 'bomb');

  // Botones utilitarios móviles
  const btnFs = document.getElementById('btnTouchFs');
  if(btnFs){
    btnFs.addEventListener('click', e => {
      e.preventDefault();
      toggleFullScreen();
    });
    btnFs.addEventListener('touchstart', e => {
      e.preventDefault();
      toggleFullScreen();
    }, { passive: false });
  }

  const btnMute = document.getElementById('btnTouchMute');
  if(btnMute){
    const toggleAudio = (e) => {
      e.preventDefault();
      Sound.toggleMute();
      btnMute.textContent = Sound.isMuted ? '🔇' : '🔊';
    };
    btnMute.addEventListener('click', toggleAudio);
    btnMute.addEventListener('touchstart', toggleAudio, { passive: false });
  }
}

// Función global de pantalla completa con soporte total para navegadores
function toggleFullScreen() {
  const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  if (!isFS) {
    const elem = document.getElementById('wrapper') || document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(()=>{});
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    document.body.classList.add('fullscreen-active');
  } else {
    if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
    document.body.classList.remove('fullscreen-active');
  }
}
window.toggleFullScreen = toggleFullScreen;

function syncFullscreenClass() {
  const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  if (isFS) {
    document.body.classList.add('fullscreen-active');
  } else {
    document.body.classList.remove('fullscreen-active');
  }
}

document.addEventListener('fullscreenchange', syncFullscreenClass);
document.addEventListener('webkitfullscreenchange', syncFullscreenClass);
document.addEventListener('mozfullscreenchange', syncFullscreenClass);
document.addEventListener('MSFullscreenChange', syncFullscreenClass);

// ─────────────────────────────────────────────────────
// ENTRADA DEL PROGRAMA
// ─────────────────────────────────────────────────────
window.addEventListener('load', ()=>{
  const canvas=document.getElementById('gameCanvas');
  const game=new Game(canvas);

  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    game.onEnterOrClick(cx, cy);
  });

  document.addEventListener('keydown', e => {
    Sound.resume();
    if(game.state === GS.MENU){
      if(e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'KeyA' || e.code === 'KeyW'){
        game.gameMode = 0;
        Sound.coin();
      } else if(e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'KeyD' || e.code === 'KeyS'){
        game.gameMode = 1;
        Sound.coin();
      }
    }
    if(e.code==='Enter'||e.code==='NumpadEnter') game.onEnterOrClick();
    if(e.code==='Escape') game.onEsc();
    if(e.code==='KeyM') Sound.toggleMute();
    if(e.code==='KeyF') {
      e.preventDefault();
      toggleFullScreen();
    }
  });

  const btnFullscreen = document.getElementById('btnFullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      Sound.resume();
      toggleFullScreen();
    });
  }

  setupTouch(game);
  game.start();

  // Reanudar audio después de cualquier interacción del usuario
  document.addEventListener('pointerdown',()=>Sound.resume(),{once:true});
});
