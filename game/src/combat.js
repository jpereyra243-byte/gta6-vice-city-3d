// Projectile & combat effects manager
// Bullet tracers, impact sparks, hit detection against pedestrians & police

import * as THREE from '../vendor/three.module.min.js';
import { sound } from './audio.js';

export class CombatManager {
  constructor(scene, cityBuilder) {
    this.scene = scene;
    this.city = cityBuilder;
    this.bullets = [];
    this.sparks = [];

    this.bulletMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    this.bulletGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
  }

  spawnBullet(origin, direction, owner = 'player') {
    const mesh = new THREE.Mesh(this.bulletGeo, this.bulletMat);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    this.bullets.push({
      mesh: mesh,
      origin: origin.clone(),
      dir: direction.clone().normalize(),
      speed: 120,
      life: 0.8,
      owner: owner
    });

    this.scene.add(mesh);
  }

  createImpactSparks(position) {
    for (let i = 0; i < 6; i++) {
      const pGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const pMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 1,
        (Math.random() - 0.5) * 8
      );

      this.sparks.push({ mesh: pMesh, vel: vel, life: 0.3 });
      this.scene.add(pMesh);
    }
  }

  update(dt, pedestrians, policeUnits, wantedSystem) {
    // Bullets update
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      const step = b.dir.clone().multiplyScalar(b.speed * dt);
      b.mesh.position.add(step);

      // Check collision with city buildings
      if (this.city.checkCollision(b.mesh.position.x, b.mesh.position.z, 0.2)) {
        this.createImpactSparks(b.mesh.position);
        sound.playImpact();
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
        continue;
      }

      // Check hit on pedestrians
      let hitPed = false;
      if (pedestrians) {
        for (let p = 0; p < pedestrians.length; p++) {
          const ped = pedestrians[p];
          if (!ped.isAlive) continue;
          if (b.mesh.position.distanceTo(ped.position) < 1.2) {
            ped.isAlive = false;
            ped.rotation.x = Math.PI / 2; // knocked down
            ped.position.y = 0.2;
            this.createImpactSparks(b.mesh.position);
            wantedSystem.addCrime(15); // Shooting pedestrians increases wanted level!
            hitPed = true;
            break;
          }
        }
      }

      if (hitPed) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
      }
    }

    // Sparks update
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.vel.y -= 20 * dt; // gravity
      s.mesh.position.addScaledVector(s.vel, dt);

      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.sparks.splice(i, 1);
      }
    }
  }
}
