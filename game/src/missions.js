// Story & Mission System: Vice City Underworld
// Multi-stage storyline, waypoint markers, objective triggers, mission rewards

import * as THREE from '../vendor/three.module.min.js';
import { sound } from './audio.js';

export class MissionManager {
  constructor(scene, player, wantedSystem) {
    this.scene = scene;
    this.player = player;
    this.wanted = wantedSystem;

    this.currentMissionIndex = 0;
    this.currentStepIndex = 0;
    this.activeMarker = null;
    this.objectiveText = '';
    this.dialogText = '';
    this.dialogSpeaker = '';
    this.dialogTimer = 0;

    this.missions = [
      {
        id: 'mission_1',
        title: 'VICE CITIZEN: ARRIVAL',
        reward: 1000,
        dialog: [
          { speaker: 'LUCAS (BOSS)', text: 'Welcome to Vice City, kid. First step: grab the pink sports car down the boulevard.' }
        ],
        steps: [
          { text: 'Get into the sports car parked on Ocean Drive.', target: new THREE.Vector3(15, 0, 15), radius: 5.0, type: 'vehicle' },
          { text: 'Deliver the sports car to the warehouse on Bay Avenue.', target: new THREE.Vector3(-60, 0, 60), radius: 6.0, type: 'dropoff' }
        ]
      },
      {
        id: 'mission_2',
        title: 'PAYBACK COURIER',
        reward: 2500,
        dialog: [
          { speaker: 'VERONICA', text: 'The syndicate is tracking our drop. Take out their scouts at Central Plaza!' }
        ],
        steps: [
          { text: 'Drive to Central Plaza fountain.', target: new THREE.Vector3(0, 0, 0), radius: 8.0, type: 'goto' },
          { text: 'Eliminate syndicate scouts and survive the heat!', target: new THREE.Vector3(0, 0, 0), radius: 10.0, type: 'combat' }
        ]
      },
      {
        id: 'mission_3',
        title: 'HIGH ROLLER HEIST',
        reward: 5000,
        dialog: [
          { speaker: 'LUCAS (BOSS)', text: 'The vault car is escorted by federal units. Lose the cops and deliver the loot to the safehouse!' }
        ],
        steps: [
          { text: 'Steal the armored vehicle at Star Marina.', target: new THREE.Vector3(80, 0, -80), radius: 6.0, type: 'steal' },
          { text: 'Lose the 4-star police pursuit!', target: null, radius: 0, type: 'evade' },
          { text: 'Park in the underground hideout.', target: new THREE.Vector3(-100, 0, -100), radius: 6.0, type: 'finish' }
        ]
      }
    ];

    this._createMarkerMesh();
    this.startCurrentStep();
  }

  _createMarkerMesh() {
    this.markerGroup = new THREE.Group();

    // Floating pulsing yellow/magenta cylinder
    const cylGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.4, 16);
    const cylMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.8 });
    this.markerMesh = new THREE.Mesh(cylGeo, cylMat);
    this.markerGroup.add(this.markerMesh);

    // Vertical light beam
    const beamGeo = new THREE.CylinderGeometry(0.2, 0.2, 20, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.35 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 10;
    this.markerGroup.add(beam);

    this.scene.add(this.markerGroup);
  }

  startCurrentStep() {
    const mission = this.missions[this.currentMissionIndex];
    if (!mission) {
      this.objectiveText = 'ALL MISSIONS COMPLETE - FREE ROAM VICE CITY';
      this.markerGroup.visible = false;
      return;
    }

    const step = mission.steps[this.currentStepIndex];
    if (!step) {
      this.completeMission();
      return;
    }

    this.objectiveText = `${mission.title}: ${step.text}`;

    if (this.currentStepIndex === 0 && mission.dialog.length > 0) {
      this.showDialog(mission.dialog[0].speaker, mission.dialog[0].text);
    }

    if (step.target) {
      this.markerGroup.position.copy(step.target);
      this.markerGroup.visible = true;
    } else {
      this.markerGroup.visible = false;
    }
  }

  showDialog(speaker, text) {
    this.dialogSpeaker = speaker;
    this.dialogText = text;
    this.dialogTimer = 7.0; // 7 seconds display
  }

  update(dt, playerPos, isDriving) {
    if (this.dialogTimer > 0) {
      this.dialogTimer -= dt;
    }

    const mission = this.missions[this.currentMissionIndex];
    if (!mission) return;

    const step = mission.steps[this.currentStepIndex];
    if (!step) return;

    // Marker animation
    if (this.markerGroup.visible) {
      this.markerMesh.rotation.y += dt * 2;
      this.markerMesh.position.y = 0.5 + Math.sin(Date.now() * 0.004) * 0.3;
    }

    // Step verification
    if (step.type === 'vehicle') {
      if (isDriving) {
        this.nextStep();
      }
    } else if (step.type === 'evade') {
      if (this.wanted.wantedLevel === 0) {
        this.nextStep();
      }
    } else if (step.target) {
      const dist = playerPos.distanceTo(step.target);
      if (dist < step.radius) {
        if (step.type === 'combat') {
          this.wanted.addCrime(40); // 3-star pursuit
          this.showDialog('POLICE RADIO', 'All units, 10-99 shots fired at Central Plaza! Suspect is heavily armed!');
          this.nextStep();
        } else {
          this.nextStep();
        }
      }
    }
  }

  nextStep() {
    this.currentStepIndex++;
    sound.playMissionJingle(true);
    this.startCurrentStep();
  }

  completeMission() {
    const mission = this.missions[this.currentMissionIndex];
    if (mission) {
      this.player.money += mission.reward;
      this.player.cashEarned += mission.reward;
      this.showDialog('MISSION PASSED', `Earned $${mission.reward.toLocaleString()}!`);
    }

    this.currentMissionIndex++;
    this.currentStepIndex = 0;
    this.startCurrentStep();
  }
}
