class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        window._gameLog = [];
        window._gameLog.push('[PreloadScene] preload() called');

        this.buildLoadingScreen();

        // KOTOR 2 swoop racing assets
        this.load.image('hoverbike', 'assets/hoverbike_kotor.png');
        this.load.image('obstacle_junk1', 'assets/obstacle_junk1.png');
        this.load.image('obstacle_junk2', 'assets/obstacle_junk2.png');
        this.load.image('obstacle_engine', 'assets/obstacle_engine.png');
        this.load.image('obstacle_parked', 'assets/obstacle_parked.png');
        this.load.image('obstacle_speedjunk1', 'assets/obstacle_speedjunk1.png');
        this.load.image('obstacle_speedjunk2', 'assets/obstacle_speedjunk2.png');
        this.load.image('obstacle_speedjunk3', 'assets/obstacle_speedjunk3.png');
        this.load.image('ring_kotor', 'assets/ring_kotor.png');
        this.load.image('cityscape_bg', 'assets/billboards/backdrop_cityscape.png');

        this.load.on('loaderror', (file) => {
            window._gameLog.push(`[PreloadScene] LOAD ERROR: ${file.key} - ${file.url}`);
        });

        this.load.on('progress', (value) => {
            if (this.progressBarFill) {
                this.progressBarFill.width = this.progressBarMaxWidth * value;
            }
        });

        this.load.on('complete', () => {
            if (this.loadingLabel) {
                this.loadingLabel.setText('READY');
            }
        });
    }

    buildLoadingScreen() {
        const cx = 400, cy = 300;

        this.add.rectangle(cx, cy, 800, 600, 0x050a12);

        this.add.text(cx, cy - 70, 'NEOTOKYO', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '36px',
            color: '#00e5ff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 14, true, true);

        this.add.text(cx, cy - 38, 'SWOOP', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '18px',
            color: '#ff2e88'
        }).setOrigin(0.5);

        // Progress bar track
        this.progressBarMaxWidth = 320;
        const barH = 4;
        this.add.rectangle(cx, cy + 10, this.progressBarMaxWidth, barH, 0x0f2530);

        // Progress bar fill, glow via a soft rectangle behind it
        const glow = this.add.rectangle(cx, cy + 10, this.progressBarMaxWidth, barH, 0x00e5ff, 0.25);
        glow.setBlendMode(Phaser.BlendModes.ADD);

        this.progressBarFill = this.add.rectangle(
            cx - this.progressBarMaxWidth / 2, cy + 10, 0, barH, 0x00e5ff
        ).setOrigin(0, 0.5);

        this.loadingLabel = this.add.text(cx, cy + 30, 'INITIALIZING...', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#5a7a8a'
        }).setOrigin(0.5);
    }

    create() {
        window._gameLog.push('[PreloadScene] create() called');
        const tex = this.textures.exists('hoverbike');
        window._gameLog.push(`[PreloadScene] hoverbike texture exists: ${tex}`);

        this.generateBoostPad();
        this.generateObstacles();
        this.generateSkyline();
        this.generateParticle();
        this.generateRoad();

        // Position Phaser canvas absolutely so Three.js can render behind it
        const phaserCanvas = this.sys.game.canvas;
        phaserCanvas.style.position = 'absolute';
        phaserCanvas.style.top = '0';
        phaserCanvas.style.left = '0';
        phaserCanvas.style.zIndex = '10';

        // Initialize Three.js 3D scene renderer (hidden by default)
        window.sceneRenderer = new ThreeSceneRenderer('game-container');
        window._gameLog.push('[PreloadScene] ThreeSceneRenderer created');

        // Make sure the Orbitron font is ready before Phaser text renders with it,
        // but don't block the menu forever if the font fails to load.
        const fontReady = document.fonts && document.fonts.load
            ? document.fonts.load('700 32px Orbitron').catch(() => {})
            : Promise.resolve();
        const fontTimeout = new Promise((resolve) => setTimeout(resolve, 1500));

        Promise.race([fontReady, fontTimeout]).then(() => {
            this.scene.start('MenuScene');
        });
    }

    generateRoad() {
        // Simple flat road tile for the menu background (not used in race)
        const g = this.make.graphics({ add: false });
        const w = 400, h = 64;
        g.fillStyle(0x1a1a24);
        g.fillRect(0, 0, w, h);
        g.lineStyle(1, 0x222233, 0.3);
        for (let y = 0; y < h; y += 8) {
            g.lineBetween(0, y, w, y);
        }
        const laneW = w / 3;
        g.lineStyle(2, 0x3a3a4a, 0.6);
        for (let i = 1; i < 3; i++) {
            const x = laneW * i;
            for (let y = 0; y < h; y += 16) {
                g.lineBetween(x, y, x, y + 8);
            }
        }
        g.lineStyle(2, 0x00e5ff, 0.8);
        g.lineBetween(0, 0, 0, h);
        g.lineBetween(w - 1, 0, w - 1, h);
        g.generateTexture('road', w, h);
        g.destroy();

        // Building strips for menu background
        const gl = this.make.graphics({ add: false });
        this.drawBuildingStrip(gl, 120, 600);
        gl.generateTexture('building_left', 120, 600);
        gl.destroy();

        const gr = this.make.graphics({ add: false });
        this.drawBuildingStrip(gr, 120, 600);
        gr.generateTexture('building_right', 120, 600);
        gr.destroy();
    }

    drawBuildingStrip(g, w, h) {
        g.fillStyle(0x0d0d1a);
        g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 40) {
            for (let x = 8; x < w - 8; x += 20) {
                const lit = Math.random() > 0.4;
                if (lit) {
                    const colors = [0x00e5ff, 0xff6600, 0xff0066, 0xffcc00, 0x00ff88];
                    g.fillStyle(colors[Math.floor(Math.random() * colors.length)], 0.15 + Math.random() * 0.3);
                } else {
                    g.fillStyle(0x1a1a2e, 0.5);
                }
                g.fillRect(x, y + 4, 12, 16);
            }
            g.lineStyle(1, 0x1a1a2e, 0.5);
            g.lineBetween(0, y, w, y);
        }
        const signColors = [0x00e5ff, 0xff0066, 0xff6600, 0x00ff88];
        for (let i = 0; i < 4; i++) {
            const sy = 60 + i * 140 + Math.random() * 40;
            const color = signColors[i % signColors.length];
            g.fillStyle(color, 0.6);
            g.fillRoundedRect(10, sy, w - 20, 20, 3);
            g.fillStyle(color, 0.1);
            g.fillRoundedRect(5, sy - 5, w - 10, 30, 5);
        }
    }

    generateBoostPad() {
        const g = this.make.graphics({ add: false });
        const w = 100, h = 16;

        // Glow base
        g.fillStyle(0xff8800, 0.15);
        g.fillRect(0, 0, w, h);

        // Main strip
        g.fillStyle(0xff6600, 0.6);
        g.fillRect(4, 2, w - 8, h - 4);

        // Chevron arrows pointing forward
        g.fillStyle(0xffaa33, 0.9);
        for (let i = 0; i < 4; i++) {
            const ax = 14 + i * 24;
            g.fillTriangle(ax, 3, ax - 7, h - 3, ax + 7, h - 3);
        }

        // Bright border
        g.lineStyle(1, 0xffaa33, 0.8);
        g.strokeRect(2, 1, w - 4, h - 2);

        g.generateTexture('boostpad', w, h);
        g.destroy();
    }

    generateObstacles() {
        this.generateBarricade();
        this.generateParkedVehicle();
        this.generateVendorCart();
        this.generateDrone();
        this.generateSecurityGate();
    }

    generateBarricade() {
        const g = this.make.graphics({ add: false });
        const w = 80, h = 40;

        // 3D-ish barricade seen from behind/above
        // Front face
        g.fillStyle(0x4a4a4a);
        g.fillRect(4, 10, w - 8, 20);

        // Warning stripes
        for (let x = 4; x < w - 8; x += 16) {
            g.fillStyle(0xff6600);
            g.fillRect(x, 10, 8, 20);
            g.fillStyle(0xffaa00);
            g.fillRect(x + 8, 10, 8, 20);
        }

        // Top surface (perspective)
        g.fillStyle(0x666666);
        g.fillTriangle(4, 10, w - 4, 10, w - 10, 2);
        g.fillTriangle(4, 10, 10, 2, w - 10, 2);

        // Warning lights
        g.fillStyle(0xff0000);
        g.fillCircle(12, 6, 3);
        g.fillCircle(w - 12, 6, 3);

        // Base shadow
        g.fillStyle(0x000000, 0.3);
        g.fillRect(2, 30, w - 4, 6);

        g.lineStyle(1, 0xff4444, 0.5);
        g.strokeRect(4, 10, w - 8, 20);

        g.generateTexture('barricade', w, h);
        g.destroy();
    }

    generateParkedVehicle() {
        const g = this.make.graphics({ add: false });
        const w = 64, h = 44;
        const cx = w / 2;

        // Shadow
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(cx, h - 4, 56, 10);

        // Body - rear view of a parked vehicle
        g.fillStyle(0x2a2a3e);
        g.fillRect(8, 10, w - 16, 24);

        // Roof (top surface perspective)
        g.fillStyle(0x3a3a5e);
        g.fillTriangle(8, 10, w - 8, 10, cx, 2);

        // Tail lights
        g.fillStyle(0xff2222, 0.9);
        g.fillRect(10, 28, 10, 5);
        g.fillRect(w - 20, 28, 10, 5);
        g.fillStyle(0xff6666, 0.5);
        g.fillRect(10, 26, 10, 3);
        g.fillRect(w - 20, 26, 10, 3);

        // Rear window
        g.fillStyle(0x111122, 0.8);
        g.fillRect(16, 12, w - 32, 10);

        g.lineStyle(1, 0x4a4a6e, 0.4);
        g.strokeRect(8, 10, w - 16, 24);

        g.generateTexture('parked_vehicle', w, h);
        g.destroy();
    }

    generateVendorCart() {
        const g = this.make.graphics({ add: false });
        const w = 70, h = 48;

        // Shadow
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(w / 2, h - 3, 60, 8);

        // Cart body
        g.fillStyle(0x5a3a2a);
        g.fillRect(8, 14, w - 16, 24);

        // Canopy (angled toward viewer)
        g.fillStyle(0xff4466);
        g.fillTriangle(2, 14, w - 2, 14, 8, 2);
        g.fillTriangle(w - 2, 14, w - 8, 2, 8, 2);
        g.fillStyle(0xff6688, 0.7);
        g.fillTriangle(6, 8, w - 6, 8, 8, 2);
        g.fillTriangle(w - 6, 8, w - 8, 2, 8, 2);

        // Items on cart
        g.fillStyle(0xffcc00);
        g.fillCircle(22, 26, 5);
        g.fillCircle(35, 24, 6);
        g.fillCircle(48, 26, 5);

        // Wheels
        g.fillStyle(0x333333);
        g.fillEllipse(14, h - 6, 8, 6);
        g.fillEllipse(w - 14, h - 6, 8, 6);

        g.generateTexture('vendor_cart', w, h);
        g.destroy();
    }

    generateDrone() {
        const g = this.make.graphics({ add: false });
        const w = 48, h = 36;
        const cx = w / 2, cy = h / 2;

        // Rotor blur (below body for depth)
        g.fillStyle(0x4444aa, 0.25);
        g.fillEllipse(cx - 14, cy + 2, 18, 10);
        g.fillEllipse(cx + 14, cy + 2, 18, 10);

        // Body - angular drone
        g.fillStyle(0x333355);
        g.fillTriangle(cx, cy - 10, cx - 16, cy + 4, cx + 16, cy + 4);
        g.fillRect(cx - 12, cy, 24, 8);

        // Central sensor eye
        g.fillStyle(0xff0044, 0.9);
        g.fillCircle(cx, cy, 5);
        g.fillStyle(0xff4488);
        g.fillCircle(cx, cy, 2);

        // Scan glow
        g.fillStyle(0xff0044, 0.1);
        g.fillCircle(cx, cy, 18);

        g.generateTexture('drone', w, h);
        g.destroy();
    }

    generateSecurityGate() {
        const g = this.make.graphics({ add: false });
        const w = 100, h = 30;

        // Posts (with height - seen from perspective)
        g.fillStyle(0x666688);
        g.fillRect(0, 0, 10, h);
        g.fillRect(w - 10, 0, 10, h);

        // Top caps
        g.fillStyle(0x8888aa);
        g.fillRect(0, 0, 10, 4);
        g.fillRect(w - 10, 0, 10, 4);

        // Barrier bar
        g.fillStyle(0x555577);
        g.fillRect(10, 10, w - 20, 10);

        // Warning lights
        g.fillStyle(0xff0000, 0.9);
        g.fillCircle(5, 6, 4);
        g.fillCircle(w - 5, 6, 4);
        // Light glow
        g.fillStyle(0xff0000, 0.15);
        g.fillCircle(5, 6, 8);
        g.fillCircle(w - 5, 6, 8);

        // Laser lines
        g.lineStyle(2, 0xff0044, 0.8);
        g.lineBetween(10, 15, w - 10, 15);
        g.lineStyle(1, 0xff0044, 0.2);
        g.lineBetween(10, 12, w - 10, 12);
        g.lineBetween(10, 18, w - 10, 18);

        g.generateTexture('security_gate', w, h);
        g.destroy();
    }

    generateSkyline() {
        const g = this.make.graphics({ add: false });
        const w = 800, h = 200;

        // KOTOR 2 style sky — hazy amber/brown industrial sky
        for (let y = 0; y < h; y++) {
            const t = y / h;
            const r = Math.floor(15 + t * 30);
            const gv = Math.floor(12 + t * 22);
            const b = Math.floor(10 + t * 15);
            g.fillStyle((r << 16) | (gv << 8) | b);
            g.fillRect(0, y, w, 1);
        }

        // Industrial structures silhouette — cranes, towers, hangars
        const structColors = [0x121008, 0x1a150e, 0x0e0c08];

        // Far layer — large industrial shapes
        for (let x = 0; x < w; x += 35 + Math.random() * 25) {
            const bh = 30 + Math.random() * 90;
            g.fillStyle(structColors[0]);
            g.fillRect(x, h - bh, 28 + Math.random() * 18, bh);
            // Antenna/crane on top of some
            if (Math.random() > 0.6) {
                g.fillRect(x + 10, h - bh - 20 - Math.random() * 30, 3, 20 + Math.random() * 30);
            }
        }

        // Mid layer — hangars and platform structures
        for (let x = 0; x < w; x += 50 + Math.random() * 40) {
            const bh = 20 + Math.random() * 50;
            g.fillStyle(structColors[1]);
            g.fillRect(x, h - bh, 30 + Math.random() * 25, bh);
            // Small amber lights on structures
            for (let wy = h - bh + 6; wy < h - 6; wy += 10) {
                for (let wx = x + 4; wx < x + 40; wx += 9) {
                    if (Math.random() > 0.6) {
                        g.fillStyle(0xff8800, 0.15 + Math.random() * 0.2);
                        g.fillRect(wx, wy, 2, 3);
                    }
                }
            }
        }

        // Distant track infrastructure — arches/gates
        for (let i = 0; i < 3; i++) {
            const gx = 150 + i * 250 + Math.random() * 50;
            g.fillStyle(0x181410, 0.8);
            g.fillRect(gx, h - 60, 6, 60);
            g.fillRect(gx + 40, h - 60, 6, 60);
            g.fillRect(gx, h - 60, 46, 6);
        }

        // Haze at horizon
        g.fillStyle(0x2a2018, 0.3);
        g.fillRect(0, h - 15, w, 15);

        g.generateTexture('skyline', w, h);
        g.destroy();
    }

    generateParticle() {
        const g = this.make.graphics({ add: false });
        g.fillStyle(0xffffff);
        g.fillCircle(4, 4, 4);
        g.generateTexture('particle', 8, 8);
        g.destroy();
    }
}
