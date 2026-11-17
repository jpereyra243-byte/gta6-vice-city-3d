// Pedestrians & Traffic AI
// Roaming Miami citizens, dynamic traffic vehicles on grid roads

import * as THREE from '../vendor/three.module.min.js';
import { Vehicle } from './vehicle.js';

export class TrafficPedManager {
  constructor(scene, cityBuilder) {
    this.scene = scene;
    this.city = cityBuilder;
    this.trafficCars = [];
    this.pedestrians = [];
  }

  init() {
    this._spawnTraffic();
    this._spawnPedestrians();
  }

  _spawnTraffic() {
    const numTraffic = 14;
    const carColors = [0xd32f2f, 0x1976d2, 0x388e3c, 0xfbc02d, 0x7b1fa2, 0xe64a19, 0xffffff, 0x212121];

    for (let i = 0; i < numTraffic; i++) {
      const isEastWest = i % 2 === 0;
      const roadCoord = (Math.floor(Math.random() * 5) - 2) * this.city.blockSize;

      const car = new Vehicle(this.scene, {
        type: Math.random() > 0.5 ? 'sport' : 'sedan',
        color: carColors[Math.floor(Math.random() * carColors.length)],
        maxSpeed: 14 + Math.random() * 6
      });

      if (isEastWest) {
        car.mesh.position.set((Math.random() - 0.5) * 300, 0, roadCoord + 2.5);
        car.mesh.rotation.y = Math.PI / 2;
        car.dir = new THREE.Vector3(1, 0, 0);
      } else {
        car.mesh.position.set(roadCoord + 2.5, 0, (Math.random() - 0.5) * 300);
        car.mesh.rotation.y = 0;
        car.dir = new THREE.Vector3(0, 0, 1);
      }

      car.speed = 12 + Math.random() * 4;
      this.trafficCars.push(car);
    }
  }

  _spawnPedestrians() {
    const numPeds = 24;
    const pedColors = [0xff7043, 0x26a69a, 0xab47bc, 0xffca28, 0x42a5f5, 0xec407a];

    for (let i = 0; i < numPeds; i++) {
      const ped = new THREE.Group();
      const col = pedColors[i % pedColors.length];

      // Body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.7, 0.3),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 })
      );
      body.position.y = 1.35;
      ped.add(body);

      // Head
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.35, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.7 })
      );
      head.position.y = 1.9;
      ped.add(head);

      // Legs
      const lLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.7, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      lLeg.position.set(-0.14, 0.55, 0);
      ped.add(lLeg);

      const rLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.7, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      rLeg.position.set(0.14, 0.55, 0);
      ped.add(rLeg);

      // Random position on sidewalk
      const spawn = this.city.spawnPoints[Math.floor(Math.random() * this.city.spawnPoints.length)];
      if (spawn) {
        ped.position.set(spawn.x + (Math.random() - 0.5) * 10, 0, spawn.z + (Math.random() - 0.5) * 10);
      } else {
        ped.position.set((Math.random() - 0.5) * 160, 0, (Math.random() - 0.5) * 160);
      }

      ped.walkDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      ped.walkTimer = 2 + Math.random() * 4;
      ped.walkSpeed = 1.6 + Math.random() * 1.2;
      ped.lLeg = lLeg;
      ped.rLeg = rLeg;
      ped.isAlive = true;

      this.scene.add(ped);
      this.pedestrians.push(ped);
    }
  }

  update(dt, playerPos) {
    // Traffic AI movement
    this.trafficCars.forEach(car => {
      if (car.isPlayerControlled) return;

      const fwd = new THREE.Vector3(Math.sin(car.mesh.rotation.y), 0, Math.cos(car.mesh.rotation.y));
      car.mesh.position.addScaledVector(fwd, car.speed * dt);

      // Wrap around city boundary
      const limit = this.city.citySize / 2 - 5;
      if (car.mesh.position.x > limit) car.mesh.position.x = -limit;
      if (car.mesh.position.x < -limit) car.mesh.position.x = limit;
      if (car.mesh.position.z > limit) car.mesh.position.z = -limit;
      if (car.mesh.position.z < -limit) car.mesh.position.z = limit;
    });

    // Pedestrian roaming AI
    const time = Date.now() * 0.005;
    this.pedestrians.forEach(ped => {
      if (!ped.isAlive) return;

      ped.walkTimer -= dt;
      if (ped.walkTimer <= 0) {
        ped.walkDir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        ped.walkTimer = 3 + Math.random() * 5;
      }

      const nextX = ped.position.x + ped.walkDir.x * ped.walkSpeed * dt;
      const nextZ = ped.position.z + ped.walkDir.z * ped.walkSpeed * dt;

      // Avoid walls
      if (!this.city.checkCollision(nextX, nextZ, 0.4)) {
        ped.position.x = nextX;
        ped.position.z = nextZ;
      } else {
        ped.walkDir.negate();
      }

      ped.rotation.y = Math.atan2(ped.walkDir.x, ped.walkDir.z);

      // Leg swing
      const swing = Math.sin(time * ped.walkSpeed * 4) * 0.5;
      ped.lLeg.rotation.x = swing;
      ped.rLeg.rotation.x = -swing;
    });
  }
}
