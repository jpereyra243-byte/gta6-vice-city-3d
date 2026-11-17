// Procedural city generator: Vice City / Miami style
// Roads grid, intersections, textured buildings, neon signs, palm trees, streetlights, props

import * as THREE from '../vendor/three.module.min.js';

export class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.roads = [];
    this.spawnPoints = [];
    this.streetlights = [];
    this.citySize = 360; // 360m x 360m
    this.blockSize = 60; // 60m blocks
    this.roadWidth = 14;
    this.sidewalkWidth = 4;
  }

  build() {
    this._createSkyAndAtmosphere();
    this._createOcean();
    this._createGroundGrid();
    this._createSkyscrapers();
    this._createPalmTrees();
    this._createStreetLamps();
    this._createProps();
  }

  _createSkyAndAtmosphere() {
    // Hemispheric ambient lighting (Vice City warm pink/cyan hue)
    const hemiLight = new THREE.HemisphereLight(0xffb088, 0x112244, 0.7);
    this.scene.add(hemiLight);

    // Warm Miami sun
    const sunLight = new THREE.DirectionalLight(0xffdfba, 1.2);
    sunLight.position.set(120, 180, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    sunLight.shadow.camera.left = -180;
    sunLight.shadow.camera.right = 180;
    sunLight.shadow.camera.top = 180;
    sunLight.shadow.camera.bottom = -180;
    this.scene.add(sunLight);

    // Purple/orange horizon fog for Miami atmosphere
    this.scene.fog = new THREE.FogExp2(0xd68b75, 0.0035);
  }

  _createOcean() {
    const oceanGeo = new THREE.PlaneGeometry(1200, 1200);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0a4d68,
      roughness: 0.1,
      metalness: 0.8
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1.2;
    this.scene.add(ocean);
  }

  _createGroundGrid() {
    // Main city island
    const half = this.citySize / 2;
    const islandGeo = new THREE.BoxGeometry(this.citySize + 40, 2, this.citySize + 40);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x223322, roughness: 0.9 });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -1;
    this.scene.add(island);

    // Roads and sidewalk grid
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1f2428, roughness: 0.7 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5d061 });
    const crosswalkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Pavement blocks
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.8 });

    const numBlocks = Math.floor(this.citySize / this.blockSize);
    const startOffset = -half + this.blockSize / 2;

    for (let i = 0; i < numBlocks; i++) {
      for (let j = 0; j < numBlocks; j++) {
        const cx = startOffset + i * this.blockSize;
        const cz = startOffset + j * this.blockSize;

        // Sidewalk block
        const bW = this.blockSize - this.roadWidth;
        const bD = this.blockSize - this.roadWidth;
        const swGeo = new THREE.BoxGeometry(bW, 0.3, bD);
        const swMesh = new THREE.Mesh(swGeo, sidewalkMat);
        swMesh.position.set(cx, 0.15, cz);
        swMesh.receiveShadow = true;
        this.scene.add(swMesh);

        // Store spawn points on sidewalks
        this.spawnPoints.push(new THREE.Vector3(cx + (Math.random() - 0.5) * (bW - 4), 0.3, cz + (Math.random() - 0.5) * (bD - 4)));
      }
    }

    // Asphalt ground under all blocks
    const cityAsphaltGeo = new THREE.PlaneGeometry(this.citySize, this.citySize);
    const cityAsphalt = new THREE.Mesh(cityAsphaltGeo, roadMat);
    cityAsphalt.rotation.x = -Math.PI / 2;
    cityAsphalt.position.y = 0.01;
    cityAsphalt.receiveShadow = true;
    this.scene.add(cityAsphalt);

    // Yellow road stripes
    for (let i = 0; i <= numBlocks; i++) {
      const coord = -half + i * this.blockSize;
      if (coord > -half && coord < half) {
        // Horizontal road line
        const hLineGeo = new THREE.PlaneGeometry(this.citySize, 0.3);
        const hLine = new THREE.Mesh(hLineGeo, lineMat);
        hLine.rotation.x = -Math.PI / 2;
        hLine.position.set(0, 0.02, coord);
        this.scene.add(hLine);

        // Vertical road line
        const vLineGeo = new THREE.PlaneGeometry(0.3, this.citySize);
        const vLine = new THREE.Mesh(vLineGeo, lineMat);
        vLine.rotation.x = -Math.PI / 2;
        vLine.position.set(coord, 0.02, 0);
        this.scene.add(vLine);

        // Save road coordinates for traffic navigation
        this.roads.push({ type: 'x', z: coord });
        this.roads.push({ type: 'z', x: coord });
      }
    }
  }

  _createSkyscrapers() {
    const numBlocks = Math.floor(this.citySize / this.blockSize);
    const startOffset = -this.citySize / 2 + this.blockSize / 2;

    const buildingColors = [
      0x4a6572, 0x344955, 0x232f34, 0xf9aa33, 0xff7597,
      0x5c6bc0, 0x26a69a, 0x7e57c2, 0x00bcd4, 0xec407a
    ];

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffeeaa,
      emissive: 0xffaa44,
      emissiveIntensity: 0.4,
      roughness: 0.2
    });

    for (let i = 0; i < numBlocks; i++) {
      for (let j = 0; j < numBlocks; j++) {
        const cx = startOffset + i * this.blockSize;
        const cz = startOffset + j * this.blockSize;

        // Skip central plaza block for open arena / mission hub
        if (i === 2 && j === 2) {
          this._createCentralPark(cx, cz);
          continue;
        }

        // Subdivide block into 2 to 4 buildings
        const subBuildings = Math.random() > 0.3 ? 2 : 1;
        for (let s = 0; s < subBuildings; s++) {
          const w = subBuildings === 2 ? 18 : 34;
          const d = subBuildings === 2 ? 34 : 34;
          const ox = subBuildings === 2 ? (s === 0 ? -10 : 10) : 0;
          const oz = 0;

          const height = 25 + Math.random() * 75;
          const col = buildingColors[Math.floor(Math.random() * buildingColors.length)];

          const bGeo = new THREE.BoxGeometry(w, height, d);
          const bMat = new THREE.MeshStandardMaterial({
            color: col,
            roughness: 0.4,
            metalness: 0.3
          });
          const building = new THREE.Mesh(bGeo, bMat);
          const bx = cx + ox;
          const bz = cz + oz;
          const by = height / 2 + 0.3;
          building.position.set(bx, by, bz);
          building.castShadow = true;
          building.receiveShadow = true;
          this.scene.add(building);

          // Add collider bounding box
          this.colliders.push({
            minX: bx - w / 2 - 0.5,
            maxX: bx + w / 2 + 0.5,
            minZ: bz - d / 2 - 0.5,
            maxZ: bz + d / 2 + 0.5,
            height: height
          });

          // Neon rooftop sign or facade glow (Miami Vice style)
          if (Math.random() > 0.4) {
            this._createNeonSign(bx, height + 2, bz);
          }
        }
      }
    }
  }

  _createCentralPark(cx, cz) {
    // Palm garden plaza with fountain
    const plazaGeo = new THREE.CylinderGeometry(18, 18, 0.4, 24);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.6 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(cx, 0.4, cz);
    this.scene.add(plaza);

    // Central fountain
    const poolGeo = new THREE.CylinderGeometry(7, 7, 0.8, 16);
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x00bcd4, roughness: 0.1, metalness: 0.5 });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(cx, 0.6, cz);
    this.scene.add(pool);

    this.colliders.push({
      minX: cx - 7,
      maxX: cx + 7,
      minZ: cz - 7,
      maxZ: cz + 7,
      height: 2
    });
  }

  _createNeonSign(x, y, z) {
    const neonColors = [0xff007f, 0x00f0ff, 0x39ff14, 0xffe600, 0xbf00ff];
    const color = neonColors[Math.floor(Math.random() * neonColors.length)];

    const signGeo = new THREE.BoxGeometry(10, 2.5, 0.6);
    const signMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.5,
      roughness: 0.1
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x, y, z);
    this.scene.add(sign);

    // Neon pointlight for soft glow
    const pLight = new THREE.PointLight(color, 1.2, 25);
    pLight.position.set(x, y + 1, z);
    this.scene.add(pLight);
  }

  _createPalmTrees() {
    const numTrees = 70;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5 });

    for (let i = 0; i < numTrees; i++) {
      const x = (Math.random() - 0.5) * (this.citySize - 30);
      const z = (Math.random() - 0.5) * (this.citySize - 30);

      // Check not inside a building collider
      const insideBuilding = this.colliders.some(c => x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ);
      if (insideBuilding) continue;

      const tree = new THREE.Group();
      // Curved trunk
      const trunkGeo = new THREE.CylinderGeometry(0.25, 0.45, 6, 6);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 3;
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      tree.add(trunk);

      // Palm fronds
      for (let f = 0; f < 6; f++) {
        const frondGeo = new THREE.ConeGeometry(1.8, 4, 4);
        const frond = new THREE.Mesh(frondGeo, leavesMat);
        frond.position.set(0, 6, 0);
        frond.rotation.z = Math.PI / 3;
        frond.rotation.y = (f * Math.PI) / 3;
        tree.add(frond);
      }

      tree.position.set(x, 0, z);
      this.scene.add(tree);
    }
  }

  _createStreetLamps() {
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x212121, metalness: 0.8 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });

    const step = 45;
    for (let x = -this.citySize / 2 + 10; x < this.citySize / 2; x += step) {
      for (let z = -this.citySize / 2 + 10; z < this.citySize / 2; z += step) {
        const lamp = new THREE.Group();
        const postGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.5, 6);
        const post = new THREE.Mesh(postGeo, lampMat);
        post.position.y = 3.25;
        lamp.add(post);

        const bulbGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const bulb = new THREE.Mesh(bulbGeo, glowMat);
        bulb.position.set(0.6, 6.4, 0);
        lamp.add(bulb);

        lamp.position.set(x, 0, z);
        this.scene.add(lamp);

        this.streetlights.push(lamp);
      }
    }
  }

  _createProps() {
    // Fire hydrants, trash bins, benches
    const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 });
    const binMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.6 });

    for (let i = 0; i < 40; i++) {
      const rx = (Math.random() - 0.5) * (this.citySize - 40);
      const rz = (Math.random() - 0.5) * (this.citySize - 40);
      const inside = this.colliders.some(c => rx >= c.minX && rx <= c.maxX && rz >= c.minZ && rz <= c.maxZ);
      if (inside) continue;

      if (i % 2 === 0) {
        const hydGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.9, 8);
        const hydrant = new THREE.Mesh(hydGeo, hydrantMat);
        hydrant.position.set(rx, 0.45, rz);
        this.scene.add(hydrant);
      } else {
        const binGeo = new THREE.BoxGeometry(0.7, 1.1, 0.7);
        const bin = new THREE.Mesh(binGeo, binMat);
        bin.position.set(rx, 0.55, rz);
        this.scene.add(bin);
      }
    }
  }

  checkCollision(x, z, radius = 0.5) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (
        x + radius > c.minX &&
        x - radius < c.maxX &&
        z + radius > c.minZ &&
        z - radius < c.maxZ
      ) {
        return true;
      }
    }
    // Perimeter bounds
    const bound = this.citySize / 2 - 2;
    if (Math.abs(x) > bound || Math.abs(z) > bound) {
      return true;
    }
    return false;
  }
}
