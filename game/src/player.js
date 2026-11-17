// Third-person on-foot character controller
// Movement, sprint, jump, car entering/exit, combat stance, animations

import * as THREE from '../vendor/three.module.min.js';
import { sound } from './audio.js';

export class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.mesh = new THREE.Group();

    // Stats
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 100;
    this.money = 2500;
    this.cashEarned = 0;

    // Movement state
    this.position = this.mesh.position;
    this.rotation = this.mesh.rotation;
    this.velocity = new THREE.Vector3();
    this.speed = 0;
    this.walkSpeed = 6.0;
    this.sprintSpeed = 11.5;
    this.isGrounded = true;
    this.isSprinting = false;
    this.inVehicle = null;

    // Camera control
    this.camYaw = 0;
    this.camPitch = 0.2;
    this.camDistance = 4.2;

    // Weapon & Combat
    this.hasWeapon = true;
    this.currentWeapon = 'Pistol 9mm';
    this.ammo = 120;
    this.isAiming = false;
    this.muzzleFlashTimer = 0;

    this._buildCharacterMesh();
    this.scene.add(this.mesh);

    // Initial position on safe sidewalk
    this.mesh.position.set(0, 0, 10);
  }

  _buildCharacterMesh() {
    // Vice City style: floral Hawaiian shirt, jeans, white sneakers
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x00bcd4, roughness: 0.5 }); // Teal Hawaiian
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x283593, roughness: 0.7 }); // Blue jeans
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.8 });  // Tanned skin
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });  // White sneakers
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });  // Dark brown hair

    // Torso (Shirt)
    const torsoGeo = new THREE.BoxGeometry(0.65, 0.75, 0.35);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    this.mesh.add(torso);

    // Head
    const headGeo = new THREE.BoxGeometry(0.35, 0.4, 0.35);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.95;
    head.castShadow = true;
    this.mesh.add(head);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.38, 0.15, 0.38);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 2.12;
    this.mesh.add(hair);

    // Sunglasses (Aviator style)
    const shadesMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.1), shadesMat);
    shades.position.set(0, 1.98, 0.17);
    this.mesh.add(shades);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    this.leftArm = new THREE.Mesh(armGeo, shirtMat);
    this.leftArm.position.set(-0.42, 1.35, 0);
    this.leftArm.castShadow = true;
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, shirtMat);
    this.rightArm.position.set(0.42, 1.35, 0);
    this.rightArm.castShadow = true;
    this.mesh.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.16, 0.55, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.16, 0.55, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.26, 0.18, 0.35);
    const lShoe = new THREE.Mesh(shoeGeo, shoeMat);
    lShoe.position.set(-0.16, 0.1, 0.04);
    this.mesh.add(lShoe);
    const rShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rShoe.position.set(0.16, 0.1, 0.04);
    this.mesh.add(rShoe);

    // Pistol in right hand
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });
    this.gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.3), gunMat);
    this.gunMesh.position.set(0.45, 1.1, 0.2);
    this.mesh.add(this.gunMesh);

    // Muzzle flash point light & sprite
    this.muzzleLight = new THREE.PointLight(0xffaa22, 0, 12);
    this.muzzleLight.position.set(0.45, 1.1, 0.45);
    this.mesh.add(this.muzzleLight);
  }

  update(dt, input, cityColliders) {
    if (this.inVehicle) {
      // Attached to vehicle position
      this.mesh.position.copy(this.inVehicle.mesh.position);
      this.mesh.visible = false;
      this.updateVehicleCamera(dt, input);
      return;
    }

    this.mesh.visible = true;

    // Mouse camera look
    if (input) {
      const sensitivity = 0.0022;
      this.camYaw -= input.mouse.dx * sensitivity;
      this.camPitch += input.mouse.dy * sensitivity;
      this.camPitch = Math.max(-0.4, Math.min(1.2, this.camPitch));
    }

    // On-foot movement direction relative to camera yaw
    let moveX = 0;
    let moveZ = 0;

    if (input) {
      if (input.isDown('KeyW')) moveZ += 1;
      if (input.isDown('KeyS')) moveZ -= 1;
      if (input.isDown('KeyA')) moveX += 1;
      if (input.isDown('KeyD')) moveX -= 1;
      this.isSprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    }

    const currentSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
    const isMoving = Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01;

    if (isMoving) {
      const forward = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
      const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));

      const dir = new THREE.Vector3()
        .addScaledVector(forward, moveZ)
        .addScaledVector(right, -moveX)
        .normalize();

      const moveStep = dir.multiplyScalar(currentSpeed * dt);
      const nextX = this.mesh.position.x + moveStep.x;
      const nextZ = this.mesh.position.z + moveStep.z;

      // Obstacle collision
      if (!cityColliders || !cityColliders.checkCollision(nextX, nextZ, 0.6)) {
        this.mesh.position.x = nextX;
        this.mesh.position.z = nextZ;
      }

      // Smooth rotate mesh to facing direction
      const targetAngle = Math.atan2(moveStep.x, moveStep.z);
      this.mesh.rotation.y = targetAngle;

      // Leg swing animation
      const walkCycle = Date.now() * 0.01 * (this.isSprinting ? 1.6 : 1.0);
      this.leftLeg.rotation.x = Math.sin(walkCycle) * 0.7;
      this.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.7;
      this.leftArm.rotation.x = -Math.sin(walkCycle) * 0.6;
      this.rightArm.rotation.x = Math.sin(walkCycle) * 0.6;
    } else {
      // Idle pose
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }

    // Aiming & shooting update
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleLight.intensity = 0;
      }
    }

    // Update 3rd person follow camera
    this.updateFollowCamera();
  }

  updateFollowCamera() {
    const target = this.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    const offset = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDistance,
      Math.sin(this.camPitch) * this.camDistance + 0.5,
      Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDistance
    );

    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
  }

  updateVehicleCamera(dt, input) {
    if (!this.inVehicle) return;
    const vPos = this.inVehicle.mesh.position;
    const vRot = this.inVehicle.mesh.rotation.y;

    // Follow vehicle from behind
    const carDist = 7.5;
    const carHeight = 2.8;

    const behind = new THREE.Vector3(
      -Math.sin(vRot) * carDist,
      carHeight,
      -Math.cos(vRot) * carDist
    );

    const targetPos = vPos.clone().add(behind);
    this.camera.position.lerp(targetPos, 0.1);
    this.camera.lookAt(vPos.clone().add(new THREE.Vector3(0, 1.2, 0)));
  }

  shoot() {
    if (this.ammo <= 0) return false;
    this.ammo--;
    this.muzzleLight.intensity = 3.5;
    this.muzzleFlashTimer = 0.08;
    sound.playGunshot();
    return true;
  }

  enterVehicle(vehicle) {
    this.inVehicle = vehicle;
    sound.startEngine();
  }

  exitVehicle() {
    if (!this.inVehicle) return;
    const vPos = this.inVehicle.mesh.position;
    const vRot = this.inVehicle.mesh.rotation.y;
    // Step out to driver side
    const driverSide = new THREE.Vector3(Math.cos(vRot) * 2.2, 0, -Math.sin(vRot) * 2.2);
    this.mesh.position.copy(vPos).add(driverSide);
    this.mesh.position.y = 0;
    this.mesh.visible = true;
    sound.stopEngine();
    this.inVehicle = null;
  }

  takeDamage(amount) {
    if (this.armor > 0) {
      this.armor -= amount;
      if (this.armor < 0) {
        this.health += this.armor;
        this.armor = 0;
      }
    } else {
      this.health -= amount;
    }
    sound.playImpact();
    if (this.health <= 0) {
      this.health = 100;
      this.mesh.position.set(0, 0, 10);
    }
  }
}
