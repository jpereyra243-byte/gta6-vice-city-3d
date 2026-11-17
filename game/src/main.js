// Main Game Controller
// Initializes renderer, city, player, traffic, wanted police system, combat, HUD and loop

import * as THREE from '../vendor/three.module.min.js';
import { InputManager } from './input.js';
import { sound } from './audio.js';
import { CityBuilder } from './city.js';
import { Player } from './player.js';
import { Vehicle } from './vehicle.js';
import { TrafficPedManager } from './traffic.js';
import { WantedSystem } from './wanted.js';
import { MissionManager } from './missions.js';
import { CombatManager } from './combat.js';
import { HUD } from './hud.js';

export class Game {
  constructor() {
    this.container = document.body;
    this.renderer = null;
    this.scene = null;
    this.camera = null;

    this.input = new InputManager();
    this.city = null;
    this.player = null;
    this.vehicles = [];
    this.traffic = null;
    this.wanted = null;
    this.missions = null;
    this.combat = null;
    this.hud = null;

    this.lastTime = performance.now();
    this.isRunning = false;
  }

  init() {
    // WebGL Renderer with shadows and sRGB tone mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf69d7a); // Miami sunset peach

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Build World
    this.city = new CityBuilder(this.scene);
    this.city.build();

    // Player
    this.player = new Player(this.scene, this.camera);

    // Player's starter sports car (Vice pink)
    this.starterCar = new Vehicle(this.scene, {
      type: 'sport',
      color: 0xff1493,
      maxSpeed: 38,
      acceleration: 24
    });
    this.starterCar.mesh.position.set(15, 0, 15);
    this.vehicles.push(this.starterCar);

    // Traffic & Pedestrians
    this.traffic = new TrafficPedManager(this.scene, this.city);
    this.traffic.init();

    // Wanted System
    this.wanted = new WantedSystem(this.scene, this.city);

    // Combat Manager
    this.combat = new CombatManager(this.scene, this.city);

    // Missions
    this.missions = new MissionManager(this.scene, this.player, this.wanted);

    // HUD
    this.hud = new HUD(this);

    // Click to lock cursor & activate audio
    window.addEventListener('click', () => {
      sound.init();
      sound.resume();
      this.input.requestLock(this.renderer.domElement);
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Keys for car enter/exit, weapon switch, radio
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF') {
        this.toggleEnterVehicle();
      }
      if (e.code === 'KeyR') {
        const station = sound.cycleRadio();
        this.hud.showRadioBanner(station);
      }
      if (e.code === 'KeyH') {
        sound.playHorn();
      }
    });

    this.isRunning = true;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  toggleEnterVehicle() {
    if (this.player.inVehicle) {
      this.player.exitVehicle();
    } else {
      // Find closest vehicle
      const allVehicles = [this.starterCar, ...this.traffic.trafficCars, ...this.wanted.policeUnits];
      let closest = null;
      let minDist = 5.0;

      for (let v of allVehicles) {
        const d = this.player.mesh.position.distanceTo(v.mesh.position);
        if (d < minDist) {
          minDist = d;
          closest = v;
        }
      }

      if (closest) {
        this.player.enterVehicle(closest);
      }
    }
  }

  animate(now) {
    requestAnimationFrame(this.animate);
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Shooting
    if (this.input.wasPressed('Mouse0') && !this.player.inVehicle) {
      if (this.player.shoot()) {
        const origin = this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        const forward = new THREE.Vector3(-Math.sin(this.player.camYaw), 0, -Math.cos(this.player.camYaw));
        this.combat.spawnBullet(origin, forward, 'player');
      }
    }

    // Update Player & Car
    if (this.player.inVehicle) {
      const carInput = {
        forward: this.input.isDown('KeyW'),
        backward: this.input.isDown('KeyS'),
        left: this.input.isDown('KeyA'),
        right: this.input.isDown('KeyD'),
        handbrake: this.input.isDown('Space')
      };
      this.player.inVehicle.update(dt, carInput, this.city);
      sound.updateEngine(
        Math.abs(this.player.inVehicle.speed) / this.player.inVehicle.maxSpeed,
        carInput.forward
      );
    }
    this.player.update(dt, this.input, this.city);

    // Update Subsystems
    this.traffic.update(dt, this.player.mesh.position);
    this.wanted.update(dt, this.player.mesh.position, this.player.inVehicle);
    this.missions.update(dt, this.player.mesh.position, !!this.player.inVehicle);
    this.combat.update(dt, this.traffic.pedestrians, this.wanted.policeUnits, this.wanted);

    // Update HUD & Minimap
    this.hud.update(this.player, this.wanted, this.missions, this.traffic, this.wanted);

    // Render 3D Frame
    this.renderer.render(this.scene, this.camera);

    this.input.resetDelta();
  }
}
