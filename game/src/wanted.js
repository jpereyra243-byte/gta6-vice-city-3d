// Police Wanted System (1 to 5 Stars)
// Dispatches police cruisers, sirens, pursuits and roadblocks

import * as THREE from '../vendor/three.module.min.js';
import { Vehicle } from './vehicle.js';
import { sound } from './audio.js';

export class WantedSystem {
  constructor(scene, cityBuilder) {
    this.scene = scene;
    this.city = cityBuilder;
    this.wantedLevel = 0; // 0 to 5
    this.crimeScore = 0;
    this.policeUnits = [];
    this.maxPolice = 5;
    this.lastSpawnTime = 0;
  }

  addCrime(amount) {
    this.crimeScore += amount;
    const oldLevel = this.wantedLevel;

    if (this.crimeScore > 100) this.wantedLevel = 5;
    else if (this.crimeScore > 65) this.wantedLevel = 4;
    else if (this.crimeScore > 35) this.wantedLevel = 3;
    else if (this.crimeScore > 15) this.wantedLevel = 2;
    else if (this.crimeScore > 5) this.wantedLevel = 1;
    else this.wantedLevel = 0;

    if (this.wantedLevel > 0 && oldLevel === 0) {
      sound.setSiren(true);
    } else if (this.wantedLevel === 0) {
      sound.setSiren(false);
    }
  }

  clearWanted() {
    this.wantedLevel = 0;
    this.crimeScore = 0;
    sound.setSiren(false);
    this.policeUnits.forEach(p => {
      this.scene.remove(p.mesh);
    });
    this.policeUnits = [];
  }

  update(dt, playerPos, playerVehicle) {
    if (this.wantedLevel === 0) {
      if (this.policeUnits.length > 0) {
        this.clearWanted();
      }
      return;
    }

    const targetPos = playerVehicle ? playerVehicle.mesh.position : playerPos;

    // Maintain police fleet based on star level
    const desiredPoliceCount = Math.min(this.wantedLevel * 2, this.maxPolice);
    if (this.policeUnits.length < desiredPoliceCount && Date.now() - this.lastSpawnTime > 3000) {
      this._spawnPoliceCruiser(targetPos);
      this.lastSpawnTime = Date.now();
    }

    // AI chase behavior
    for (let i = 0; i < this.policeUnits.length; i++) {
      const cop = this.policeUnits[i];
      const toPlayer = new THREE.Vector3().subVectors(targetPos, cop.mesh.position);
      const dist = toPlayer.length();

      // Desired angle to player
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      let angleDiff = targetAngle - cop.mesh.rotation.y;

      // Normalize angle to -PI..PI
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      let steerInput = 0;
      if (angleDiff > 0.1) steerInput = -1;
      else if (angleDiff < -0.1) steerInput = 1;

      const aiInput = {
        forward: dist > 8,
        backward: dist < 4,
        left: steerInput > 0,
        right: steerInput < 0,
        handbrake: false
      };

      cop.update(dt, aiInput, this.city);
      cop.setSiren(true);

      // Ramming / collision sound
      if (dist < 4.5 && Math.random() < 0.05) {
        sound.playCarCrash();
      }
    }
  }

  _spawnPoliceCruiser(nearPos) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 30;
    const spawnX = nearPos.x + Math.sin(angle) * dist;
    const spawnZ = nearPos.z + Math.cos(angle) * dist;

    const cop = new Vehicle(this.scene, {
      type: 'police',
      color: 0x0d1b2a,
      maxSpeed: 34,
      acceleration: 24
    });

    cop.mesh.position.set(spawnX, 0, spawnZ);
    cop.mesh.rotation.y = Math.atan2(nearPos.x - spawnX, nearPos.z - spawnZ);
    cop.setSiren(true);

    this.policeUnits.push(cop);
  }
}
