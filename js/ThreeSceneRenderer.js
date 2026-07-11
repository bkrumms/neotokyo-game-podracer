class ThreeSceneRenderer {
    constructor(containerId) {
        this.ready = false;
        this.visible = false;
        this.bikeModel = null;
        this.bikePivot = null;
        this.clock = new THREE.Clock();
        this.objectPool = [];
        this.activeSprites = new Map();
        this.textures = {};

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(800, 600);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x0a1018);

        const canvas = this.renderer.domElement;
        canvas.setAttribute('data-three', 'true');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '1';
        document.getElementById(containerId).appendChild(canvas);

        // Scene
        this.scene = new THREE.Scene();
        // Deep blue night fog — keep near/far so gameplay readability is unchanged
        this.scene.fog = new THREE.Fog(0x0a1018, 50, 90);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 260);
        this.camera.position.set(0, 2.5, 8);
        this.camera.lookAt(0, 0.3, -20);
        this.cameraTargetX = 0;

        // Lighting — cyberpunk night: cool dim blue ambient, cyan key, magenta fill
        const ambient = new THREE.AmbientLight(0x223a55, 0.7);
        this.scene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xaee9ff, 1.0);
        keyLight.position.set(3, 5, 5);
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xff5599, 0.45);
        fillLight.position.set(-3, 3, -2);
        this.scene.add(fillLight);

        this.engineLight = new THREE.PointLight(0x00e5ff, 0.5, 8);
        this.engineLight.position.set(0, 0.5, 2);
        this.scene.add(this.engineLight);

        // Dedicated cool white-cyan key light hovering above/behind the bike so the
        // player silhouette always pops against the dark road. Follows bikePivot.
        this.bikeLight = new THREE.PointLight(0xbfffff, 0.8, 6);
        this.bikeLight.position.set(0, 3, 2);
        this.scene.add(this.bikeLight);

        // Streaming-city bookkeeping
        this.buildings = [];
        this.banners = [];
        this.speedStreaks = [];
        this.corridorLength = 130;   // world-Z span buildings recycle over
        this.streamScale = 0.1;      // world units per unit of state.distance (matches obstacles)
        this._shakeFrames = 0;
        this._damageLevel = 0;
        this.finishLineMesh = null;
        this.streetLights = [];

        // Build the scene
        this._buildRoad();
        this._buildGround();
        this._buildCity();
        this._buildSky();
        this._loadTextures();
        this._buildBillboards();
        this._buildBanners();
        this._buildSpeedStreaks();
        this._buildStreetLights();
        this._buildFinishLine();
        this._initObjectPool();
        this._loadBike();

        this._syncCanvasSize();

        // Hidden by default — only visible during race
        this.setVisible(false);
    }

    _buildRoad() {
        // Create a road texture via canvas
        const texCanvas = document.createElement('canvas');
        texCanvas.width = 512;
        texCanvas.height = 512;
        const ctx = texCanvas.getContext('2d');

        // Base wet asphalt — very dark blue-gray
        ctx.fillStyle = '#0d1119';
        ctx.fillRect(0, 0, 512, 512);

        // Faint vertical neon reflection smears (wet-road feel)
        const smears = [
            { x: 120, c: 'rgba(0,229,255,0.05)' },
            { x: 300, c: 'rgba(255,46,136,0.05)' },
            { x: 400, c: 'rgba(157,76,255,0.04)' }
        ];
        for (const s of smears) {
            const g = ctx.createLinearGradient(s.x - 30, 0, s.x + 30, 0);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(0.5, s.c);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(s.x - 30, 0, 60, 512);
        }

        // Subtle panel lines
        ctx.strokeStyle = '#0a0e15';
        ctx.lineWidth = 1;
        for (let y = 0; y < 512; y += 64) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }

        // Glowing cyan lane-divider light strips (soft glow halo + bright dashed core)
        const drawGlowStrip = (x, coreColor, glowColor, dashed) => {
            // Soft glow halo
            const g = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(0.5, glowColor);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - 12, 0, 24, 512);
            // Bright core
            ctx.strokeStyle = coreColor;
            ctx.lineWidth = 3;
            if (dashed) ctx.setLineDash([24, 20]); else ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 512);
            ctx.stroke();
            ctx.setLineDash([]);
        };

        // Cyan lane dividers at 1/3 and 2/3 (dashed)
        drawGlowStrip(171, '#8ff7ff', 'rgba(0,229,255,0.35)', true);
        drawGlowStrip(341, '#8ff7ff', 'rgba(0,229,255,0.35)', true);

        // Pink/magenta edge light strips instead of orange hazard stripes
        drawGlowStrip(10, '#ff9ac4', 'rgba(255,46,136,0.5)', false);
        drawGlowStrip(502, '#ff9ac4', 'rgba(255,46,136,0.5)', false);

        const roadTex = new THREE.CanvasTexture(texCanvas);
        roadTex.wrapS = THREE.RepeatWrapping;
        roadTex.wrapT = THREE.RepeatWrapping;
        roadTex.repeat.set(1, 15);
        this.roadTexture = roadTex;

        const roadGeo = new THREE.PlaneGeometry(12, 120);
        const roadMat = new THREE.MeshStandardMaterial({
            map: roadTex,
            roughness: 0.35,
            metalness: 0.6
        });
        this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
        this.roadMesh.rotation.x = -Math.PI / 2;
        this.roadMesh.position.set(0, 0, -50);
        this.scene.add(this.roadMesh);
    }

    _buildGround() {
        // Sidewalk / ground on both sides of the road so buildings sit on a street
        // instead of floating. Static, featureless dark concrete a shade off the
        // road so the road edge stays readable. Slightly below y=0 to avoid
        // z-fighting with the road and the building bases.
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x0a0e14, roughness: 0.85, metalness: 0.15
        });
        this.groundMaterial = groundMat;

        // Covers the full streaming corridor length with margin.
        const spanZ = this.corridorLength + 60;
        const width = 19; // from road edge (x=6) out to x=25
        const geo = new THREE.PlaneGeometry(width, spanZ);
        const centerZ = -50;
        const centerX = 6 + width / 2; // 6..25

        this.groundLeft = new THREE.Mesh(geo, groundMat);
        this.groundLeft.rotation.x = -Math.PI / 2;
        this.groundLeft.position.set(-centerX, -0.02, centerZ);
        this.scene.add(this.groundLeft);

        this.groundRight = new THREE.Mesh(geo, groundMat);
        this.groundRight.rotation.x = -Math.PI / 2;
        this.groundRight.position.set(centerX, -0.02, centerZ);
        this.scene.add(this.groundRight);
    }

    _makeFacadeTexture(variant) {
        // Build one facade canvas texture. `variant` (0..2) shifts the base tint,
        // window density and neon-strip colors so buildings don't all match.
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 256;
        const ctx = c.getContext('2d');

        const bases = ['#0b1220', '#0a1018', '#101526'];
        ctx.fillStyle = bases[variant % bases.length];
        ctx.fillRect(0, 0, 128, 256);

        // Faint vertical facade seams
        ctx.strokeStyle = '#060b14';
        ctx.lineWidth = 2;
        for (let x = 0; x < 128; x += 42) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 256);
            ctx.stroke();
        }

        // Window grid — mostly cyan/teal/white, some pink/purple/amber, many dark
        const winColors = [
            '#00e5ff', '#00ffcc', '#bfeaff', '#bfeaff',
            '#ff2e88', '#9d4cff', '#ffb347'
        ];
        // The bottom band of the canvas maps to the building's ground floor
        // (CanvasTexture flipY puts canvas-bottom at the base). Reserve a thin
        // strip for occasional lit shopfronts; keep the window grid above it.
        const storefrontTop = 236; // windows stop here; band is y 236..256 (thin)
        const litChance = [0.42, 0.34, 0.5][variant % 3]; // per-variant density
        for (let wy = 8; wy < storefrontTop; wy += 12) {
            for (let wx = 8; wx < 120; wx += 12) {
                const r = Math.random();
                if (r < litChance) {
                    let ci;
                    if (r < litChance * 0.28) ci = 4 + Math.floor(Math.random() * 3);
                    else ci = Math.floor(Math.random() * 4);
                    ctx.fillStyle = winColors[ci];
                    // Dimmer so self-glow stays moody, not blown out
                    ctx.globalAlpha = 0.30 + Math.random() * 0.30;
                    ctx.fillRect(wx, wy, 7, 6);
                    ctx.globalAlpha = 1;
                } else {
                    ctx.fillStyle = '#08101c';
                    ctx.fillRect(wx, wy, 7, 6);
                }
            }
        }

        // One vertical neon sign strip (glow halo + katakana-like glyph bars)
        const neon = [
            { glow: 'rgba(255,46,136,0.4)', core: '#ff9ac4' },
            { glow: 'rgba(0,229,255,0.4)', core: '#8ff7ff' },
            { glow: 'rgba(157,76,255,0.35)', core: '#d4b0ff' }
        ][variant % 3];
        const sx = 24 + variant * 30;
        const g = ctx.createLinearGradient(sx - 8, 0, sx + 8, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, neon.glow);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sx - 8, 0, 16, 256);
        ctx.fillStyle = neon.core;
        for (let gy = 6; gy < storefrontTop; gy += 22) {
            const w = 3 + Math.floor(Math.random() * 4);
            ctx.fillRect(sx - w / 2, gy, w, 4);
            if (Math.random() > 0.5) ctx.fillRect(sx - 1, gy + 6, 2, 8);
        }

        // Ground-floor band — mostly a dark plinth with only a few lit shopfronts,
        // so it reads as "some shops open at night", not a marquee. Desaturated:
        // mostly dim warm-white / pale-cyan, with rare pink/amber accents.
        const bandTop = storefrontTop;
        const bandH = 256 - bandTop;
        // dark plinth base
        ctx.fillStyle = '#05080e';
        ctx.fillRect(0, bandTop, 128, bandH);
        // Muted shop palette (mostly the first two — pale/warm, dim)
        const shopColors = [
            '#8fa6b0', '#9fb0b8', '#b8c4c0', '#8fb0bf', // dim warm-white / pale cyan
            '#c06a86', '#c0925a'                          // rare pink / amber accent
        ];
        const wy = bandTop + 5;
        const shopH = bandH - 10; // short windows
        for (let wx = 4; wx < 124; wx += 10) {
            // ~30% of frontage lit -> 70% dark gaps between shopfronts
            if (Math.random() > 0.30) continue;
            const ci = Math.random() < 0.2
                ? 4 + Math.floor(Math.random() * 2) // occasional pink/amber
                : Math.floor(Math.random() * 4);    // mostly pale/warm
            ctx.fillStyle = shopColors[ci];
            ctx.globalAlpha = 0.35 + Math.random() * 0.25; // dim
            ctx.fillRect(wx, wy, 6, shopH);
            ctx.globalAlpha = 1;
        }

        const tex = new THREE.CanvasTexture(c);
        return tex;
    }

    _buildCity() {
        // Three shared facade texture variants + a very dark top material.
        this.facadeTextures = [
            this._makeFacadeTexture(0),
            this._makeFacadeTexture(1),
            this._makeFacadeTexture(2)
        ];
        // Use the facade art as its own emissive map so lit windows and the
        // ground-floor storefronts self-glow against the dark night — cheap, no
        // extra textures or per-frame work.
        this.facadeMaterials = this.facadeTextures.map(t =>
            new THREE.MeshStandardMaterial({
                map: t, roughness: 0.6, metalness: 0.35,
                emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25
            })
        );
        this.buildingTopMaterial = new THREE.MeshStandardMaterial({
            color: 0x05080f, roughness: 0.9, metalness: 0.1
        });
        // Shared unit box geometry — buildings are scaled instances of it.
        this.buildingGeo = new THREE.BoxGeometry(1, 1, 1);

        const perSide = 12;
        const spacing = this.corridorLength / perSide; // even distribution along Z

        const makeBuilding = (side, i) => {
            const h = 6 + Math.random() * 19;      // 6..25
            const w = 4 + Math.random() * 6;        // width along Z (street frontage)
            const depth = 5 + Math.random() * 8;    // depth away from road
            const variant = Math.floor(Math.random() * 3);

            // Per-face materials: box face order is +x,-x,+y,-y,+z,-z
            const facade = this.facadeMaterials[variant];
            const top = this.buildingTopMaterial;
            const mats = [facade, facade, top, top, facade, facade];
            const mesh = new THREE.Mesh(this.buildingGeo, mats);
            mesh.scale.set(depth, h, w);

            // Place so the road-facing FACE sits just past the sidewalk edge
            // (road edge x=6). Front face lands at ±6.5..9 for a tight street;
            // center is that plus half the depth. Base at y=0 (box center = h/2).
            const faceEdge = 6.5;
            const frontFace = side * (faceEdge + Math.random() * 2.5); // ±6.5..9
            const x = frontFace + side * (depth / 2);
            mesh.position.set(x, h / 2, 0); // z set every frame by recycling

            mesh.userData = {
                side, w, h, depth, variant,
                slotZ: i * spacing + (side < 0 ? spacing / 2 : 0) // offset sides so they interleave
            };
            this.scene.add(mesh);
            this.buildings.push(mesh);
            return mesh;
        };

        for (let i = 0; i < perSide; i++) {
            makeBuilding(-1, i);
            makeBuilding(1, i);
        }
    }

    _buildBillboards() {
        // Mount NeoTokyo community art + generated street ads on building faces.
        // Planes stream + recycle in lockstep with their building via a shared slotZ.
        const loader = new THREE.TextureLoader();
        const load = (file) => loader.load('assets/billboards/' + file);

        // key: file, native aspect (w/h) used to keep art undistorted
        const art = {
            samurai:     { tex: load('billboard_samurai.png'),  agr: 434 / 512 },
            bank:        { tex: load('billboard_bank.png'),      agr: 512 / 364 },
            biker:       { tex: load('billboard_biker.png'),     agr: 512 / 372 },
            pillscape:   { tex: load('billboard_pillscape.png'), agr: 512 / 372 },
            wanted1:     { tex: load('poster_wanted1.jpg'),      agr: 2 / 3 },
            wanted2:     { tex: load('poster_wanted2.jpg'),      agr: 2 / 3 },
            featured1:   { tex: load('poster_featured1.jpg'),    agr: 2 / 3 },
            featured2:   { tex: load('poster_featured2.jpg'),    agr: 2 / 3 },
            neural:      { tex: load('ad_neural_link.jpg'),      agr: 16 / 9 },
            ramen:       { tex: load('ad_synth_ramen.jpg'),      agr: 16 / 9 },
            voidcredit:  { tex: load('ad_void_credit.jpg'),      agr: 16 / 9 },
            swoopleague: { tex: load('ad_swoop_league.jpg'),     agr: 16 / 9 },
            citizen1:    { tex: load('poster_citizen1.png'),     agr: 1 },
            citizen2:    { tex: load('poster_citizen2.png'),     agr: 1 },
            citizen3:    { tex: load('poster_citizen3.png'),     agr: 1 }
        };
        this.billboardArt = art;

        // Mix of big facade ads, mid posters, and low street postings
        const recipe = [
            { art: 'samurai',     size: 10,  high: true,  flicker: false },
            { art: 'ramen',       size: 5.5, high: false, flicker: true  },
            { art: 'wanted1',     size: 4.2, high: false, flicker: false },
            { art: 'swoopleague', size: 5.8, high: false, flicker: false },
            { art: 'bank',        size: 5.5, high: false, flicker: true  },
            { art: 'featured1',   size: 4.0, high: false, flicker: false },
            { art: 'neural',      size: 5.5, high: false, flicker: true  },
            { art: 'wanted2',     size: 4.2, high: false, flicker: false },
            { art: 'biker',       size: 6,   high: false, flicker: false },
            { art: 'voidcredit',  size: 5.2, high: false, flicker: true  },
            { art: 'featured2',   size: 4.0, high: false, flicker: false },
            { art: 'pillscape',   size: 6,   high: false, flicker: true  },
            { art: 'citizen1',    size: 2.2, high: false, flicker: false, low: true },
            { art: 'citizen2',    size: 2.2, high: false, flicker: false, low: true },
            { art: 'citizen3',    size: 2.2, high: false, flicker: false, low: true }
        ];

        // Own scene objects (not parented to non-uniform boxes, which would shear).
        this.billboards = [];
        let ri = 0;
        for (let bi = 0; bi < this.buildings.length && ri < recipe.length * 2; bi += 1) {
            if (bi % 2 !== 0) continue;
            const b = this.buildings[bi];
            const r = recipe[ri % recipe.length];
            ri++;

            const info = art[r.art];
            if (!info) continue;
            const h = r.size;
            const w = r.size * info.agr;

            const mat = new THREE.MeshBasicMaterial({
                map: info.tex, transparent: true, fog: false, side: THREE.DoubleSide
            });
            const geo = new THREE.PlaneGeometry(w, h);
            const plane = new THREE.Mesh(geo, mat);

            const side = b.userData.side;
            const bh = b.userData.h, bd = b.userData.depth;

            let worldY;
            if (r.high) worldY = Math.min(bh - h / 2 - 0.5, bh * 0.8);
            else if (r.low) worldY = 2.5 + Math.random() * 1.5;
            else worldY = bh * 0.45;
            worldY = Math.max(h / 2 + 0.3, worldY);

            const faceX = b.position.x - side * (bd / 2 + 0.05);
            plane.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
            plane.userData = {
                slotZ: b.userData.slotZ,
                x: faceX,
                y: worldY,
                zJitter: (Math.random() - 0.5) * (b.userData.w * 0.4)
            };

            if (r.flicker) {
                this._flickerPlanes = this._flickerPlanes || [];
                this._flickerPlanes.push({ mat, phase: Math.random() * Math.PI * 2, base: 1.0 });
            }

            this.scene.add(plane);
            this.billboards.push(plane);
        }
    }

    _buildBanners() {
        // Overhead gantry banners spanning across the road (street-crossing signage).
        const loader = new THREE.TextureLoader();
        const files = ['banner_balcony.png', 'banner_codebreaker.png'];
        // banners are 512x128 -> aspect 4:1
        const spanW = 11;              // spans the road width + a small margin
        const spanH = spanW * (128 / 512);

        // Recycled Z slots — first slot pushed deep so none sits on the player at
        // spawn (slotZ near 0 would stream in right on top of the rider).
        const slots = [
            this.corridorLength * 0.5,
            this.corridorLength * 0.72,
            this.corridorLength * 0.9
        ];
        for (let i = 0; i < slots.length; i++) {
            const tex = loader.load('assets/billboards/' + files[i % files.length]);
            const mat = new THREE.MeshBasicMaterial({
                map: tex, transparent: true, fog: false, side: THREE.DoubleSide,
                opacity: 0.75,
                color: 0xbfc6d2   // multiply the art a touch darker so it doesn't wash out the HUD
            });
            const geo = new THREE.PlaneGeometry(spanW, spanH);
            const mesh = new THREE.Mesh(geo, mat);
            // High overhead, only a gentle tilt so it reads as flat gantry signage
            // rather than billboarding down into the player's view / HUD.
            mesh.position.set(0, 9 + (i % 2) * 0.8, 0);
            mesh.rotation.x = -0.12;
            mesh.userData = { slotZ: slots[i] };
            this.scene.add(mesh);
            this.banners.push(mesh);
        }
    }

    _buildSpeedStreaks() {
        // Thin elongated additive planes streaming past at the corridor edges.
        // Near-invisible at base speed; brighten/stretch toward MAX.
        const geo = new THREE.PlaneGeometry(0.06, 4);
        this.streakGeo = geo;
        const count = 14;
        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: (i % 3 === 0) ? 0xffffff : 0x00e5ff,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            const side = (i % 2 === 0) ? -1 : 1;
            mesh.userData = {
                side,
                x: side * (4 + Math.random() * 3),
                y: 0.5 + Math.random() * 3.5,
                phase: Math.random(),          // 0..1 position along its run
                speed: 0.6 + Math.random() * 0.6
            };
            mesh.visible = false;
            this.scene.add(mesh);
            this.speedStreaks.push(mesh);
        }
    }

    _buildSky() {
        // Simple gradient sky backdrop
        const skyCanvas = document.createElement('canvas');
        skyCanvas.width = 512;
        skyCanvas.height = 256;
        const ctx = skyCanvas.getContext('2d');

        // Deep-teal night gradient
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, '#050a12');
        grad.addColorStop(0.45, '#0a1420');
        grad.addColorStop(0.8, '#0d2233');
        grad.addColorStop(1, '#123043');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 256);

        // Stars (upper sky only)
        for (let i = 0; i < 260; i++) {
            const sx = Math.random() * 512;
            const sy = Math.random() * 160;
            const b = 0.3 + Math.random() * 0.7;
            ctx.fillStyle = `rgba(200,235,255,${b})`;
            const size = Math.random() > 0.92 ? 2 : 1;
            ctx.fillRect(sx, sy, size, size);
        }

        // Teal searchlight beams angled up into the sky
        const beams = [
            { x: 110, angle: -0.28 },
            { x: 300, angle: 0.18 },
            { x: 430, angle: -0.12 }
        ];
        for (const beam of beams) {
            ctx.save();
            ctx.translate(beam.x, 256);
            ctx.rotate(beam.angle);
            const bg = ctx.createLinearGradient(0, 0, 0, -240);
            bg.addColorStop(0, 'rgba(0,255,204,0.22)');
            bg.addColorStop(1, 'rgba(0,255,204,0)');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(6, 0);
            ctx.lineTo(34, -240);
            ctx.lineTo(-34, -240);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Subtle haze at the horizon
        const haze = ctx.createLinearGradient(0, 150, 0, 256);
        haze.addColorStop(0, 'rgba(0,180,200,0)');
        haze.addColorStop(1, 'rgba(0,190,210,0.18)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 150, 512, 106);

        // Dense city skyline silhouette at the bottom with tiny lit windows
        const winDot = ['#00e5ff', '#ff2e88', '#ffb347', '#00ffcc'];
        let x = 0;
        while (x < 512) {
            const w = 18 + Math.random() * 26;
            const h = 40 + Math.random() * 90;
            const top = 256 - h;
            ctx.fillStyle = '#060d16';
            ctx.fillRect(x, top, w, h);
            // Antenna
            if (Math.random() > 0.7) {
                ctx.fillRect(x + w / 2 - 1, top - 12, 2, 12);
            }
            // Tiny lit windows
            for (let wy = top + 6; wy < 254; wy += 8) {
                for (let wx = x + 4; wx < x + w - 4; wx += 7) {
                    if (Math.random() > 0.72) {
                        ctx.fillStyle = winDot[Math.floor(Math.random() * winDot.length)];
                        ctx.globalAlpha = 0.6 + Math.random() * 0.4;
                        ctx.fillRect(wx, wy, 2, 3);
                        ctx.globalAlpha = 1;
                    }
                }
            }
            x += w + 2;
        }

        // Distant painted backdrop (real art) — furthest plane, darkened a touch
        // so it reads as background behind the 3D buildings. fog:false so it pops.
        const bgLoader = new THREE.TextureLoader();
        const bgTex = bgLoader.load('assets/billboards/backdrop_cityscape.png');
        const bgMat = new THREE.MeshBasicMaterial({
            map: bgTex,
            fog: false,
            color: 0x8a97ad,   // multiply-darken the painting slightly
            depthWrite: false
        });
        // 1024x732 -> keep aspect; make it wide enough to fill the far view.
        const bgW = 260, bgH = bgW * (732 / 1024);
        const bgGeo = new THREE.PlaneGeometry(bgW, bgH);
        this.backdropMesh = new THREE.Mesh(bgGeo, bgMat);
        this.backdropMesh.position.set(0, bgH * 0.32, -180);
        this.scene.add(this.backdropMesh);

        // Procedural starfield / skyline, layered just in front of the backdrop
        // to add depth and twinkle without hiding the painting.
        const skyTex = new THREE.CanvasTexture(skyCanvas);
        const skyGeo = new THREE.PlaneGeometry(240, 70);
        const skyMat = new THREE.MeshBasicMaterial({
            map: skyTex, fog: false, transparent: true, opacity: 0.7, depthWrite: false
        });
        this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
        this.skyMesh.position.set(0, 24, -150);
        this.scene.add(this.skyMesh);
    }

    _loadTextures() {
        const loader = new THREE.TextureLoader();
        // Keep loading the existing KOTOR PNG textures as fallbacks so nothing
        // breaks if a NeoTokyo sprite key is missing.
        const spriteNames = [
            'ring_kotor', 'obstacle_junk1', 'obstacle_junk2',
            'obstacle_engine', 'obstacle_parked',
            'obstacle_speedjunk1', 'obstacle_speedjunk2', 'obstacle_speedjunk3'
        ];
        for (const name of spriteNames) {
            this.textures[name] = loader.load(`assets/${name}.png`);
        }

        // NeoTokyo procedural sprites from a teammate's global (transparent canvases)
        const neoKeys = [
            'boost_pad', 'barricade', 'parked_vehicle', 'vendor_cart',
            'drone', 'security_gate', 'debris'
        ];
        const neo = window.neoTokyoSprites;
        if (neo) {
            for (const key of neoKeys) {
                const img = neo[key];
                if (img) {
                    const t = new THREE.CanvasTexture(img);
                    t.needsUpdate = true;
                    this.textures[key] = t;
                }
            }
        }
    }

    _buildStreetLights() {
        // Neon lamp posts along both sidewalks — sells "street at night"
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.5, 6);
        const poleMat = new THREE.MeshStandardMaterial({
            color: 0x1a2230, roughness: 0.7, metalness: 0.4
        });
        const lampGeo = new THREE.SphereGeometry(0.22, 8, 8);
        const count = 8;
        const spacing = this.corridorLength / count;

        for (let i = 0; i < count; i++) {
            for (const side of [-1, 1]) {
                const group = new THREE.Group();
                const pole = new THREE.Mesh(poleGeo, poleMat);
                pole.position.y = 2.25;
                group.add(pole);

                const lampMat = new THREE.MeshBasicMaterial({
                    color: side < 0 ? 0x00e5ff : 0xff2e88
                });
                const lamp = new THREE.Mesh(lampGeo, lampMat);
                lamp.position.set(side * 0.35, 4.3, 0);
                group.add(lamp);

                const light = new THREE.PointLight(
                    side < 0 ? 0x00e5ff : 0xff2e88, 0.35, 10
                );
                light.position.set(side * 0.35, 4.2, 0);
                group.add(light);

                group.position.set(side * 5.8, 0, 0);
                group.userData = {
                    slotZ: i * spacing + (side < 0 ? spacing * 0.25 : spacing * 0.75)
                };
                this.scene.add(group);
                this.streetLights.push(group);
            }
        }
    }

    _buildFinishLine() {
        // Overhead finish gantry + glowing FINISH strip across the road
        const group = new THREE.Group();

        // Posts
        const postGeo = new THREE.BoxGeometry(0.3, 7, 0.3);
        const postMat = new THREE.MeshStandardMaterial({
            color: 0x1a2030, metalness: 0.5, roughness: 0.4,
            emissive: 0x00e5ff, emissiveIntensity: 0.15
        });
        const left = new THREE.Mesh(postGeo, postMat);
        left.position.set(-5.5, 3.5, 0);
        const right = new THREE.Mesh(postGeo, postMat.clone());
        right.position.set(5.5, 3.5, 0);
        group.add(left, right);

        // Cross bar
        const barGeo = new THREE.BoxGeometry(11.5, 0.35, 0.35);
        const bar = new THREE.Mesh(barGeo, postMat.clone());
        bar.position.set(0, 6.8, 0);
        group.add(bar);

        // FINISH banner plane
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 96;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#050a12';
        ctx.fillRect(0, 0, 512, 96);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 6;
        ctx.strokeRect(4, 4, 504, 88);
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 52px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 18;
        ctx.fillText('FINISH', 256, 48);
        ctx.fillStyle = '#ff2e88';
        ctx.font = '14px monospace';
        ctx.shadowColor = '#ff2e88';
        ctx.fillText('NEOTOKYO STREET CIRCUIT', 256, 78);

        const tex = new THREE.CanvasTexture(c);
        const bannerMat = new THREE.MeshBasicMaterial({
            map: tex, transparent: true, side: THREE.DoubleSide, fog: false
        });
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.8), bannerMat);
        banner.position.set(0, 5.6, 0.2);
        group.add(banner);

        // Road checkered strip
        const stripC = document.createElement('canvas');
        stripC.width = 128;
        stripC.height = 32;
        const sctx = stripC.getContext('2d');
        for (let i = 0; i < 8; i++) {
            sctx.fillStyle = i % 2 === 0 ? '#e8f6ff' : '#0a1018';
            sctx.fillRect(i * 16, 0, 16, 32);
        }
        const stripTex = new THREE.CanvasTexture(stripC);
        const strip = new THREE.Mesh(
            new THREE.PlaneGeometry(11, 1.2),
            new THREE.MeshBasicMaterial({
                map: stripTex, transparent: true, opacity: 0.9, side: THREE.DoubleSide
            })
        );
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(0, 0.04, 0);
        group.add(strip);

        group.visible = false;
        this.scene.add(group);
        this.finishLineMesh = group;
    }

    _initObjectPool() {
        for (let i = 0; i < 40; i++) {
            const geo = new THREE.PlaneGeometry(3, 2);
            const mat = new THREE.MeshBasicMaterial({
                transparent: true,
                alphaTest: 0.15,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.visible = false;
            this.scene.add(mesh);
            this.objectPool.push(mesh);
        }
    }

    resetRace() {
        this._shakeFrames = 0;
        this._damageLevel = 0;
        this.camera.position.set(0, 2.5, 8);
        this.cameraTargetX = 0;
        if (this.bikePivot) {
            this.bikePivot.position.set(0, 0.4, 0);
            this.bikePivot.rotation.set(0, Math.PI, 0);
        }
        if (this.finishLineMesh) this.finishLineMesh.visible = false;
    }

    _loadBike() {
        const loader = new THREE.GLTFLoader();
        loader.load('assets/swoop_bike.glb', (gltf) => {
            this.bikeModel = gltf.scene;

            // Reskin materials toward a sleek NeoTokyo machine: gunmetal/navy base
            // with a subtle cyan emissive tint. Guard for materials lacking props.
            this.bikeModel.traverse((child) => {
                if (!child.isMesh || !child.material) return;
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                for (const mat of mats) {
                    if (mat.color && mat.color.isColor) {
                        // Darken toward gunmetal/navy, preserving some hue variation
                        mat.color.multiplyScalar(0.55);
                        mat.color.lerp(new THREE.Color(0x1a2634), 0.4);
                    }
                    if (mat.emissive && mat.emissive.isColor) {
                        mat.emissive.setHex(0x00e5ff);
                        if (mat.emissiveIntensity !== undefined) {
                            // Raised so the bike self-glows and reads against the dark road
                            mat.emissiveIntensity = 0.4;
                        }
                    }
                    if (mat.metalness !== undefined) mat.metalness = Math.min(1, (mat.metalness || 0) + 0.3);
                    if (mat.roughness !== undefined) mat.roughness = Math.max(0, (mat.roughness !== undefined ? mat.roughness : 0.5) - 0.2);
                    mat.needsUpdate = true;
                }
            });

            const box = new THREE.Box3().setFromObject(this.bikeModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3.5 / maxDim;
            this.bikeModel.scale.setScalar(scale);
            this.bikeModel.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

            this.bikePivot = new THREE.Group();
            this.bikePivot.add(this.bikeModel);
            this.bikePivot.position.set(0, 0.4, 0);
            // Rotate so front faces -Z (forward into the screen)
            this.bikePivot.rotation.y = Math.PI;
            this.scene.add(this.bikePivot);

            this.ready = true;
            if (window._gameLog) {
                window._gameLog.push(`[ThreeScene] Bike loaded, scale: ${scale.toFixed(4)}`);
            }
        });
    }

    _syncCanvasSize() {
        const container = this.renderer.domElement.parentElement;
        const sync = () => {
            // Match Phaser's canvas sizing
            const phaserCanvas = container.querySelector('canvas:not([style*="z-index: 1"])');
            if (phaserCanvas && phaserCanvas.style.width) {
                this.renderer.domElement.style.width = phaserCanvas.style.width;
                this.renderer.domElement.style.height = phaserCanvas.style.height;
            }
        };
        // Check periodically since Phaser canvas may resize
        setInterval(sync, 500);
        sync();
    }

    _getLaneX(lane) {
        return (lane - 1) * 3.0;
    }

    update(state) {
        if (!this.visible) return;

        const elapsed = this.clock.getElapsedTime();
        const {
            distance, currentLane, currentSpeed, activeObjects,
            strikes = 0, trackLength = 14000
        } = state;

        this._damageLevel = strikes;

        // Scroll road texture
        const scrollSpeed = 0.008;
        this.roadTexture.offset.y = distance * scrollSpeed;

        // Stream the 3D city, lights, banners and speed streaks
        this._updateCity(distance);
        this._updateStreaks(distance, currentSpeed, elapsed);
        this._updateFinishLine(distance, trackLength);

        // Subtle flicker on select billboards
        if (this._flickerPlanes) {
            for (const f of this._flickerPlanes) {
                f.mat.opacity = f.base - 0.25 * Math.max(0, Math.sin(elapsed * 8 + f.phase)) * (Math.random() > 0.85 ? 1 : 0.4);
            }
        }

        // Update bike position
        if (this.bikePivot) {
            const targetX = this._getLaneX(currentLane);
            this.bikePivot.position.x += (targetX - this.bikePivot.position.x) * 0.12;

            // Hover bob — rougher when damaged
            const damageShake = this._damageLevel * 0.03;
            this.bikePivot.position.y = 0.4 + Math.sin(elapsed * 3.0) * 0.04
                + Math.sin(elapsed * 17) * damageShake;

            // Bank on lane changes
            const dx = targetX - this.bikePivot.position.x;
            this.bikePivot.rotation.z = dx * 0.3 + Math.sin(elapsed * 11) * damageShake * 0.5;

            // Speed pitch
            const speedRatio = Math.min((currentSpeed - 220) / 560, 1);
            this.bikePivot.rotation.x = speedRatio * 0.08;

            // Engine glow — cyan healthy, shifts pink when damaged
            this.engineLight.position.set(this.bikePivot.position.x, 0.5, 2);
            this.engineLight.intensity = 0.3 + speedRatio * 1.5;
            if (this._damageLevel >= 2) {
                this.engineLight.color.setHex(0xff2e55);
            } else if (this._damageLevel === 1) {
                this.engineLight.color.setHex(0xff9ac4);
            } else {
                this.engineLight.color.setHex(0x00e5ff);
            }

            if (this.bikeLight) {
                this.bikeLight.position.set(this.bikePivot.position.x, 3, 2.2);
            }
        }

        // Camera follow + optional hit shake
        if (this.bikePivot) {
            this.cameraTargetX += (this.bikePivot.position.x - this.cameraTargetX) * 0.08;
            let camX = this.cameraTargetX;
            let camY = 2.5;
            if (this._shakeFrames > 0) {
                this._shakeFrames--;
                camX += (Math.random() - 0.5) * 0.35;
                camY += (Math.random() - 0.5) * 0.2;
            }
            this.camera.position.x = camX;
            this.camera.position.y = camY;
            this.camera.lookAt(this.cameraTargetX, 0.3, -20);

            const speedRatio = Math.min((currentSpeed - 220) / 560, 1);
            this.camera.fov = 60 + speedRatio * 12;
            this.camera.updateProjectionMatrix();
        }

        this._updateObjects(activeObjects, distance);

        this.renderer.render(this.scene, this.camera);
    }

    _updateFinishLine(distance, trackLength) {
        if (!this.finishLineMesh) return;
        const rel = trackLength - distance;
        // Show when within draw range (streamScale 0.1)
        if (rel < 900 && rel > -80) {
            this.finishLineMesh.visible = true;
            this.finishLineMesh.position.z = -rel * this.streamScale;
        } else {
            this.finishLineMesh.visible = false;
        }
    }

    _updateObjects(activeObjects, distance) {
        this.activeSprites.forEach((mesh) => {
            mesh.visible = false;
            mesh.rotation.set(0, 0, 0);
        });
        this.activeSprites.clear();

        if (!activeObjects) return;

        let poolIdx = 0;
        for (const obj of activeObjects) {
            if (poolIdx >= this.objectPool.length) break;

            const relZ = obj.distance - distance;
            if (relZ < -5 || relZ > 800) continue;

            const mesh = this.objectPool[poolIdx++];
            const texKey = obj.spriteKey || 'obstacle_junk1';
            let tex = this.textures[texKey];
            if (!tex) {
                tex = this.textures['barricade'] || this.textures['obstacle_junk1'];
                if (!tex) {
                    for (const k in this.textures) {
                        if (this.textures[k]) { tex = this.textures[k]; break; }
                    }
                }
            }
            if (!tex) continue;

            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
            mesh.material.opacity = 1;

            const worldZ = -relZ * 0.1;
            const laneX = this._getLaneX(obj.lane);

            // Boost pads lie flat on the road (KOTOR accel-pad feel)
            if (obj.type === 'boost' || texKey === 'boost_pad') {
                mesh.position.set(laneX, 0.06, worldZ);
                mesh.rotation.set(-Math.PI / 2, 0, 0);
                const pulse = 0.95 + Math.sin(this.clock.getElapsedTime() * 6 + worldZ) * 0.12;
                mesh.scale.set(1.8 * pulse, 2.4 * pulse, 1);
                mesh.material.opacity = 0.85 + Math.sin(this.clock.getElapsedTime() * 8) * 0.1;
            } else if (texKey === 'drone') {
                mesh.position.set(laneX, 2.0 + Math.sin(this.clock.getElapsedTime() * 2.5 + worldZ) * 0.15, worldZ);
                mesh.scale.set(1.2, 1.0, 1);
                mesh.lookAt(this.camera.position);
            } else if (texKey === 'security_gate') {
                mesh.position.set(laneX, 1.4, worldZ);
                mesh.scale.set(1.6, 1.3, 1);
                mesh.lookAt(this.camera.position);
            } else {
                mesh.position.set(laneX, 1.15, worldZ);
                mesh.scale.set(1.3, 1.1, 1);
                mesh.lookAt(this.camera.position);
            }

            mesh.visible = !obj.hit;
            this.activeSprites.set(poolIdx, mesh);
        }
    }

    _streamZ(slotZ, distance) {
        // Map a fixed corridor slot to a streaming Z that flows toward the camera
        // and wraps, keyed off state.distance. near≈8 lets it pass just behind cam.
        const near = 8;
        const L = this.corridorLength;
        let p = (slotZ - distance * this.streamScale) % L;
        if (p < 0) p += L;
        return near - p;
    }

    _updateCity(distance) {
        for (const b of this.buildings) {
            b.position.z = this._streamZ(b.userData.slotZ, distance);
        }
        if (this.billboards) {
            for (const bb of this.billboards) {
                const u = bb.userData;
                bb.position.set(u.x, u.y, this._streamZ(u.slotZ, distance) + u.zJitter);
            }
        }
        for (const banner of this.banners) {
            banner.position.z = this._streamZ(banner.userData.slotZ, distance);
        }
        if (this.streetLights) {
            for (const light of this.streetLights) {
                light.position.z = this._streamZ(light.userData.slotZ, distance);
            }
        }
    }

    _updateStreaks(distance, currentSpeed, elapsed) {
        // Speed-scaled motion blur streaks. Base speed 200 -> ~invisible;
        // MAX 700 -> bright, long, fast.
        const speedRatio = Math.min(Math.max((currentSpeed - 200) / 500, 0), 1);
        if (speedRatio <= 0.02) {
            for (const s of this.speedStreaks) s.visible = false;
            return;
        }
        const runLen = 22; // world-Z length of a streak's travel near the camera
        for (const s of this.speedStreaks) {
            const u = s.userData;
            // advance phase with distance so streaks fly by; fold into [0,1)
            let p = (u.phase + distance * 0.02 * u.speed) % 1;
            if (p < 0) p += 1;
            const z = 9 - p * runLen; // from just behind camera to ~ -13
            s.position.set(u.x, u.y, z);
            // Stretch the long axis and brighten with speed.
            s.scale.set(1, 1 + speedRatio * 6, 1);
            // Tilt the streak so its long axis rakes toward Z (motion direction)
            // while staying angled enough to catch the camera (not dead edge-on).
            s.rotation.set(Math.PI / 2.6, 0, 0);
            // Fade in with speed and toward the far end of the run (near-cam brightest)
            const runFade = 0.4 + 0.6 * p;
            s.material.opacity = (0.03 + speedRatio * 0.5) * runFade *
                (0.7 + 0.3 * Math.sin(elapsed * 20 + u.phase * 10));
            s.visible = true;
        }
    }

    playBoostEffect() {
        // Brief cyan flash — tint ambient cyan and pulse the engine light
        const ambient = this.scene.children.find(c => c.isAmbientLight);
        if (ambient) {
            const origIntensity = ambient.intensity;
            const origColor = ambient.color.getHex();
            ambient.color.setHex(0x00e5ff);
            ambient.intensity = 1.4;
            setTimeout(() => {
                ambient.intensity = origIntensity;
                ambient.color.setHex(origColor);
            }, 100);
        }
        if (this.engineLight) {
            const origEngine = this.engineLight.intensity;
            this.engineLight.intensity = origEngine + 2.0;
            setTimeout(() => { this.engineLight.intensity = origEngine; }, 120);
        }
    }

    playHitEffect(strikes) {
        this._shakeFrames = 12 + (strikes || 1) * 4;
        this._damageLevel = strikes || this._damageLevel;
        // Red flash on fill light
        const fills = this.scene.children.filter(c => c.isDirectionalLight);
        if (fills[1]) {
            const orig = fills[1].color.getHex();
            fills[1].color.setHex(0xff2e55);
            setTimeout(() => { fills[1].color.setHex(orig); }, 150);
        }
    }

    playCrashEffect() {
        this._shakeFrames = 40;
        if (this.engineLight) {
            this.engineLight.color.setHex(0xff2e55);
            this.engineLight.intensity = 3.0;
        }
    }

    setVisible(visible) {
        this.visible = visible;
        this.renderer.domElement.style.display = visible ? 'block' : 'none';
    }

    dispose() {
        this.setVisible(false);
    }
}
