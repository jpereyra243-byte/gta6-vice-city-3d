// Vehicle class: Sports cars, Sedans, Muscle cars, Police cruisers
// Arcade driving physics: acceleration, steering, braking, drifting, smoke particles, sirens

import * as THREE from '../vendor/three.module.min.js';
import { sound } from './audio.js';

export class Vehicle {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.type = options.type || 'sport'; // 'sport', 'sedan', 'muscle', 'police'
    this.color = options.color || (this.type === 'police' ? 0x111111 : 0xff2a55);
    this.mesh = new THREE.Group();

    // Physics state
    this.position = this.mesh.position;
    this.rotation = this.mesh.rotation;
    this.velocity = new THREE.Vector3();
    this.speed = 0;
    this.steerAngle = 0;
    this.maxSpeed = options.maxSpeed || (this.type === 'sport' ? 38 : this.type === 'police' ? 36 : 28);
    this.acceleration = options.acceleration || 22;
    this.reverseMaxSpeed = 12;
    this.braking = 32;
    this.friction = 3.5;
    this.steerSpeed = 2.4;
    this.isDrifting = false;

    // Siren state
    this.isPolice = this.type === 'police';
    this.sirenActive = false;
    this.sirenLightTimer = 0;
    this.sirenRedMesh = null;
    this.sirenBlueMesh = null;
    this.sirenLight = null;

    // Headlights
    this.headlights = [];

    // Wheels for steering animation
    this.frontWheels = [];
    this.rearWheels = [];

    this._buildCarMesh();
    this.scene.add(this.mesh);
  }

  _buildCarMesh() {
    // Body Dimensions
    const length = 4.4;
    const width = 2.0;
    const height = 1.0;

    // Main Chassis
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.2,
      metalness: 0.8
    });
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.1,
      metalness: 0.9
    });
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });

    const chassisGeo = new THREE.BoxGeometry(width, 0.6, length);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    this.mesh.add(chassis);

    // Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(width * 0.85, 0.55, length * 0.5);
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.0, -0.2);
    cabin.castShadow = true;
    this.mesh.add(cabin);

    // Bumpers
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.35, 0.3), bumperMat);
    frontBumper.position.set(0, 0.45, length / 2 + 0.1);
    this.mesh.add(frontBumper);

    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.35, 0.3), bumperMat);
    rearBumper.position.set(0, 0.45, -length / 2 - 0.1);
    this.mesh.add(rearBumper);

    // Headlights & Taillights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });

    const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), hlMat);
    hlLeft.position.set(-0.7, 0.6, length / 2 + 0.15);
    this.mesh.add(hlLeft);

    const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), hlMat);
    hlRight.position.set(0.7, 0.6, length / 2 + 0.15);
    this.mesh.add(hlRight);

    const tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tlMat);
    tlLeft.position.set(-0.7, 0.6, -length / 2 - 0.15);
    this.mesh.add(tlLeft);

    const tlRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tlMat);
    tlRight.position.set(0.7, 0.6, -length / 2 - 0.15);
    this.mesh.add(tlRight);

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.2 });

    const createWheel = (x, z) => {
      const wGroup = new THREE.Group();
      const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
      const tire = new THREE.Mesh(tireGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wGroup.add(tire);

      const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.36, 12);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      wGroup.position.set(x, 0.42, z);
      this.mesh.add(wGroup);
      return wGroup;
    };

    this.frontWheels.push(createWheel(-width / 2 - 0.05, length / 3));
    this.frontWheels.push(createWheel(width / 2 + 0.05, length / 3));
    this.rearWheels.push(createWheel(-width / 2 - 0.05, -length / 3));
    this.rearWheels.push(createWheel(width / 2 + 0.05, -length / 3));

    // Police specific: Lightbar & Livery
    if (this.isPolice) {
      const barGeo = new THREE.BoxGeometry(width * 0.6, 0.18, 0.35);
      const barBase = new THREE.Mesh(barGeo, bumperMat);
      barBase.position.set(0, 1.35, -0.2);
      this.mesh.add(barBase);

      this.sirenRedMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.3), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
      this.sirenRedMesh.position.set(-0.4, 1.4, -0.2);
      this.mesh.add(this.sirenRedMesh);

      this.sirenBlueMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.3), new THREE.MeshBasicMaterial({ color: 0x0044ff }));
      this.sirenBlueMesh.position.set(0.4, 1.4, -0.2);
      this.mesh.add(this.sirenBlueMesh);

      // Flashing pointlight
      this.sirenLight = new THREE.PointLight(0x0044ff, 0, 20);
      this.sirenLight.position.set(0, 2.0, -0.2);
      this.mesh.add(this.sirenLight);
    }
  }

  update(dt, input, cityColliders) {
    let throttle = 0;
    let steer = 0;
    let handbrake = false;

    if (input) {
      if (input.forward) throttle += 1;
      if (input.backward) throttle -= 1;
      if (input.left) steer += 1;
      if (input.right) steer -= 1;
      if (input.handbrake) handbrake = true;
    }

    // Steering interpolation
    const targetSteer = steer * 0.55;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(dt * 8, 1);

    // Front wheels rotation
    this.frontWheels.forEach(w => {
      w.rotation.y = this.steerAngle;
    });

    // Speed physics
    if (throttle > 0) {
      this.speed += this.acceleration * dt;
      if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    } else if (throttle < 0) {
      if (this.speed > 0.5) {
        this.speed -= this.braking * dt;
      } else {
        this.speed -= this.acceleration * 0.6 * dt;
        if (this.speed < -this.reverseMaxSpeed) this.speed = -this.reverseMaxSpeed;
      }
    } else {
      // Natural rolling friction
      if (this.speed > 0) {
        this.speed -= this.friction * dt;
        if (this.speed < 0) this.speed = 0;
      } else if (this.speed < 0) {
        this.speed += this.friction * dt;
        if (this.speed > 0) this.speed = 0;
      }
    }

    if (handbrake) {
      this.speed *= Math.max(0, 1 - dt * 4);
      if (Math.abs(this.speed) > 10 && Math.abs(steer) > 0.2) {
        if (!this.isDrifting) {
          this.isDrifting = true;
          sound.playTireSqueal();
        }
      }
    } else {
      this.isDrifting = false;
    }

    // Yaw rotation based on speed and steering
    if (Math.abs(this.speed) > 0.1) {
      const turnMultiplier = this.speed >= 0 ? 1 : -1;
      const turnRate = this.steerAngle * (this.speed / this.maxSpeed) * 1.8 * turnMultiplier;
      this.mesh.rotation.y += turnRate * dt;
    }

    // Move forward in facing direction
    const forward = new THREE.Vector3(
      Math.sin(this.mesh.rotation.y),
      0,
      Math.cos(this.mesh.rotation.y)
    );

    const oldX = this.mesh.position.x;
    const oldZ = this.mesh.position.z;

    const moveStep = forward.clone().multiplyScalar(this.speed * dt);
    const newX = oldX + moveStep.x;
    const newZ = oldZ + moveStep.z;

    // Collision check against city buildings
    if (cityColliders && cityColliders.checkCollision(newX, newZ, 1.4)) {
      this.speed = -this.speed * 0.3; // bounce back
      sound.playCarCrash();
    } else {
      this.mesh.position.x = newX;
      this.mesh.position.z = newZ;
    }

    // Wheel spin visual
    const wheelSpin = (this.speed * dt) / 0.42;
    this.frontWheels.concat(this.rearWheels).forEach(w => {
      w.children.forEach(part => {
        part.rotation.x += wheelSpin;
      });
    });

    // Update Siren flashing if police
    if (this.isPolice && this.sirenActive) {
      this.sirenLightTimer += dt * 8;
      const flash = Math.sin(this.sirenLightTimer) > 0;
      if (this.sirenLight) {
        this.sirenLight.intensity = flash ? 3.5 : 0;
        this.sirenLight.color.setHex(flash ? 0x0044ff : 0xff0022);
      }
    }
  }

  setSiren(state) {
    this.sirenActive = state;
    if (!state && this.sirenLight) {
      this.sirenLight.intensity = 0;
    }
  }
}
