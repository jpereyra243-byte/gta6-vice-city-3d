// Heads-Up Display (HUD) & Minimap Radar
// Vice City Miami neon aesthetic: radar blips, health/armor bars, wanted stars, weapon, speedometer

export class HUD {
  constructor(game) {
    this.game = game;
    this.radarCanvas = null;
    this.radarCtx = null;
    this.container = null;
    this._createUI();
  }

  _createUI() {
    this.container = document.createElement('div');
    this.container.id = 'hud-overlay';
    this.container.innerHTML = `
      <style>
        #hud-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          font-family: 'Arial Black', Impact, sans-serif;
          user-select: none;
          overflow: hidden;
        }

        /* Top Right: Money, Wanted Level, Weapon */
        .hud-top-right {
          position: absolute;
          top: 24px;
          right: 32px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .hud-money {
          font-size: 38px;
          color: #55ff55;
          text-shadow: 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 10px rgba(85,255,85,0.7);
          letter-spacing: 2px;
        }

        .hud-weapon {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.65);
          padding: 6px 14px;
          border-radius: 8px;
          border: 2px solid #ff007f;
          box-shadow: 0 0 15px rgba(255,0,127,0.4);
        }

        .hud-weapon-name {
          font-size: 16px;
          color: #00ffff;
          text-transform: uppercase;
        }

        .hud-weapon-ammo {
          font-size: 22px;
          color: #ffffff;
        }

        .hud-wanted-stars {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .star {
          font-size: 32px;
          color: rgba(255, 255, 255, 0.2);
          text-shadow: 1px 1px 3px #000;
          transition: color 0.2s;
        }

        .star.active {
          color: #ffcc00;
          text-shadow: 0 0 12px #ffbb00, 2px 2px 0 #000;
          animation: starPulse 0.6s infinite alternate;
        }

        @keyframes starPulse {
          from { transform: scale(1.0); }
          to { transform: scale(1.15); }
        }

        /* Bottom Left: Minimap Radar & Health/Armor */
        .hud-bottom-left {
          position: absolute;
          bottom: 24px;
          left: 28px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }

        .radar-frame {
          width: 170px;
          height: 170px;
          border-radius: 50%;
          border: 4px solid #00f0ff;
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.6), inset 0 0 15px rgba(0, 0, 0, 0.8);
          background: rgba(10, 20, 30, 0.85);
          position: relative;
          overflow: hidden;
        }

        #radar-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .bars-container {
          width: 170px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .bar-bg {
          width: 100%;
          height: 12px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .bar-health {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #d32f2f, #ff5252);
          transition: width 0.15s ease-out;
        }

        .bar-armor {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #1976d2, #448aff);
          transition: width 0.15s ease-out;
        }

        /* Bottom Right: Speedometer (when driving) */
        .hud-speedometer {
          position: absolute;
          bottom: 28px;
          right: 32px;
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid #00f0ff;
          border-radius: 12px;
          padding: 8px 18px;
          display: none;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 0 15px rgba(0,240,255,0.4);
        }

        .speed-val {
          font-size: 40px;
          color: #ffffff;
          line-height: 1;
        }

        .speed-unit {
          font-size: 14px;
          color: #ff007f;
          letter-spacing: 1px;
        }

        /* Top Center: Mission Objective Alert */
        .hud-objective {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          border-left: 5px solid #ffd700;
          border-right: 5px solid #ffd700;
          padding: 10px 24px;
          border-radius: 6px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.6);
          text-align: center;
        }

        .objective-title {
          font-size: 13px;
          color: #ffd700;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .objective-desc {
          font-size: 18px;
          color: #ffffff;
          margin-top: 3px;
        }

        /* Story Subtitles Dialog */
        .hud-dialog {
          position: absolute;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          border-top: 3px solid #ff007f;
          padding: 12px 28px;
          border-radius: 8px;
          max-width: 600px;
          text-align: center;
          display: none;
        }

        .dialog-speaker {
          color: #ff007f;
          font-size: 15px;
          letter-spacing: 1px;
        }

        .dialog-content {
          color: #ffffff;
          font-size: 17px;
          font-weight: normal;
          margin-top: 4px;
          font-family: 'Segoe UI', Tahoma, sans-serif;
        }

        /* Center Crosshair */
        .crosshair {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid #000;
          border-radius: 50%;
        }

        /* Radio station alert banner */
        .radio-banner {
          position: absolute;
          top: 90px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(18, 18, 28, 0.9);
          border: 2px solid #00f0ff;
          padding: 6px 20px;
          border-radius: 20px;
          color: #00f0ff;
          font-size: 14px;
          display: none;
          letter-spacing: 2px;
          box-shadow: 0 0 12px rgba(0,240,255,0.5);
        }
      </style>

      <div class="hud-top-right">
        <div class="hud-money" id="hud-money">$0002500</div>
        <div class="hud-weapon">
          <span class="hud-weapon-name" id="hud-weapon-name">PISTOL 9MM</span>
          <span class="hud-weapon-ammo" id="hud-weapon-ammo">120</span>
        </div>
        <div class="hud-wanted-stars" id="hud-stars">
          <span class="star">★</span>
          <span class="star">★</span>
          <span class="star">★</span>
          <span class="star">★</span>
          <span class="star">★</span>
        </div>
      </div>

      <div class="hud-objective" id="hud-objective">
        <div class="objective-title">CURRENT MISSION OBJECTIVE</div>
        <div class="objective-desc" id="hud-objective-desc">Steal the sports car on Ocean Drive</div>
      </div>

      <div class="radio-banner" id="hud-radio">RADIO: VICE WAVE 98.5</div>

      <div class="hud-dialog" id="hud-dialog">
        <div class="dialog-speaker" id="dialog-speaker">LUCAS (BOSS)</div>
        <div class="dialog-content" id="dialog-content">Meet me at the waterfront warehouse.</div>
      </div>

      <div class="hud-bottom-left">
        <div class="radar-frame">
          <canvas id="radar-canvas" width="170" height="170"></canvas>
        </div>
        <div class="bars-container">
          <div class="bar-bg"><div class="bar-health" id="bar-health"></div></div>
          <div class="bar-bg"><div class="bar-armor" id="bar-armor"></div></div>
        </div>
      </div>

      <div class="hud-speedometer" id="hud-speedometer">
        <div class="speed-val" id="speed-val">0</div>
        <div class="speed-unit">MPH</div>
      </div>

      <div class="crosshair" id="crosshair"></div>
    `;

    document.body.appendChild(this.container);
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas.getContext('2d');
  }

  update(player, wanted, mission, traffic, police) {
    // Money
    const mEl = document.getElementById('hud-money');
    if (mEl) {
      mEl.textContent = `$${player.money.toString().padStart(7, '0')}`;
    }

    // Weapon & Ammo
    const wName = document.getElementById('hud-weapon-name');
    const wAmmo = document.getElementById('hud-weapon-ammo');
    if (wName) wName.textContent = player.currentWeapon;
    if (wAmmo) wAmmo.textContent = player.ammo.toString();

    // Health & Armor bars
    const hBar = document.getElementById('bar-health');
    const aBar = document.getElementById('bar-armor');
    if (hBar) hBar.style.width = `${Math.max(0, Math.min(100, player.health))}%`;
    if (aBar) aBar.style.width = `${Math.max(0, Math.min(100, player.armor))}%`;

    // Wanted stars
    const starsContainer = document.getElementById('hud-stars');
    if (starsContainer) {
      const starSpans = starsContainer.querySelectorAll('.star');
      for (let i = 0; i < 5; i++) {
        if (i < wanted.wantedLevel) {
          starSpans[i].classList.add('active');
        } else {
          starSpans[i].classList.remove('active');
        }
      }
    }

    // Objective
    const objDesc = document.getElementById('hud-objective-desc');
    if (objDesc && mission) {
      objDesc.textContent = mission.objectiveText;
    }

    // Story Dialog
    const dialogBox = document.getElementById('hud-dialog');
    const dSpeaker = document.getElementById('dialog-speaker');
    const dContent = document.getElementById('dialog-content');
    if (dialogBox && mission) {
      if (mission.dialogTimer > 0) {
        dialogBox.style.display = 'block';
        if (dSpeaker) dSpeaker.textContent = mission.dialogSpeaker;
        if (dContent) dContent.textContent = mission.dialogText;
      } else {
        dialogBox.style.display = 'none';
      }
    }

    // Speedometer
    const speedBox = document.getElementById('hud-speedometer');
    const speedVal = document.getElementById('speed-val');
    if (speedBox && speedVal) {
      if (player.inVehicle) {
        speedBox.style.display = 'flex';
        const mph = Math.floor(Math.abs(player.inVehicle.speed) * 2.2);
        speedVal.textContent = mph.toString();
      } else {
        speedBox.style.display = 'none';
      }
    }

    // Render Minimap Radar
    this._renderRadar(player, mission, traffic, police);
  }

  _renderRadar(player, mission, traffic, police) {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = 170;
    const h = 170;
    const cx = w / 2;
    const cy = h / 2;
    const zoom = 1.1; // Radar scale

    ctx.clearRect(0, 0, w, h);

    // Radar background
    ctx.fillStyle = '#0a141e';
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.fill();

    // Radar grid concentric rings
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();

    const pPos = player.inVehicle ? player.inVehicle.mesh.position : player.position;
    const pRot = player.inVehicle ? player.inVehicle.mesh.rotation.y : player.rotation.y;

    // Helper to project world coords relative to player
    const project = (wx, wz) => {
      const dx = wx - pPos.x;
      const dz = wz - pPos.z;
      // Rotate by player heading so radar is oriented forward
      const rx = dx * Math.cos(pRot) - dz * Math.sin(pRot);
      const rz = dx * Math.sin(pRot) + dz * Math.cos(pRot);
      return {
        x: cx + rx * zoom,
        y: cy - rz * zoom
      };
    };

    // Draw City Block outlines on radar
    ctx.fillStyle = '#1e2d3d';
    const citySize = 360;
    const blockSize = 60;
    const half = citySize / 2;
    for (let x = -half; x < half; x += blockSize) {
      for (let z = -half; z < half; z += blockSize) {
        const p1 = project(x + 7, z + 7);
        const p2 = project(x + blockSize - 7, z + blockSize - 7);
        const sizeX = (blockSize - 14) * zoom;
        const sizeZ = (blockSize - 14) * zoom;

        // Clip to radar circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, cx - 4, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillRect(p1.x, p1.y, sizeX, sizeZ);
        ctx.restore();
      }
    }

    // Draw Mission Objective Blip (Yellow Diamond)
    if (mission && mission.markerGroup && mission.markerGroup.visible) {
      const mPos = mission.markerGroup.position;
      const pt = project(mPos.x, mPos.z);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y - 7);
      ctx.lineTo(pt.x + 7, pt.y);
      ctx.lineTo(pt.x, pt.y + 7);
      ctx.lineTo(pt.x - 7, pt.y);
      ctx.closePath();
      ctx.fill();
    }

    // Draw Traffic Cars (Grey blips)
    if (traffic && traffic.trafficCars) {
      ctx.fillStyle = '#90caf9';
      traffic.trafficCars.forEach(car => {
        const pt = project(car.mesh.position.x, car.mesh.position.z);
        const dist = Math.hypot(pt.x - cx, pt.y - cy);
        if (dist < cx - 4) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Police Cars (Flashing Red & Blue blips)
    if (police && police.policeUnits) {
      const flashRed = Math.floor(Date.now() / 200) % 2 === 0;
      ctx.fillStyle = flashRed ? '#ff1744' : '#2979ff';
      police.policeUnits.forEach(cop => {
        const pt = project(cop.mesh.position.x, cop.mesh.position.z);
        const dist = Math.hypot(pt.x - cx, pt.y - cy);
        if (dist < cx - 4) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Center: Player blip (Pink / Cyan arrowhead)
    ctx.fillStyle = '#00f0ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx - 6, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  showRadioBanner(stationName) {
    const el = document.getElementById('hud-radio');
    if (!el) return;
    el.textContent = `RADIO: ${stationName}`;
    el.style.display = 'block';
    setTimeout(() => {
      el.style.display = 'none';
    }, 2800);
  }
}
