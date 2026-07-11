class RaceScene extends Phaser.Scene {
    constructor() {
        super('RaceScene');
    }

    create() {
        // ---- Game constants (KOTOR swoop pacing) ----
        this.BASE_SPEED = 220;
        this.MAX_SPEED = 780;
        this.BOOST_INCREMENT = 48;
        this.OBSTACLE_PENALTY = 140;
        this.SPEED_DECAY = 12;          // units/sec — boosts matter
        this.MAX_STRIKES = 3;
        this.TRACK_LENGTH = 14000;
        this.DRAW_DISTANCE = 900;
        this.LANE_COOLDOWN = 110;       // ms between shifts

        // ---- State ----
        this.currentSpeed = this.BASE_SPEED;
        this.distance = 0;
        this.elapsedTime = 0;
        this.strikes = 0;
        this.boostsHit = 0;
        this.currentLane = 1;
        this.isRacing = true;
        this.invincible = false;
        this.canShift = true;
        this.boostFlashTimer = 0;

        // ---- Audio ----
        this.sfx = {
            boost: null,
            cheer: null,
            boo: null
        };
        this._initAudio();

        // ---- Generate track data ----
        this.trackData = this.generateTrack();
        this.activeObjects = [];

        // ---- HUD (Phaser overlay) ----
        this.createHUD();

        // ---- Input ----
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            A: Phaser.Input.Keyboard.KeyCodes.A,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });

        // ---- Show 3D scene ----
        if (window.sceneRenderer) {
            window.sceneRenderer.setVisible(true);
            window.sceneRenderer.resetRace();
        }
    }

    _initAudio() {
        try {
            this.sfx.boost = new Audio('assets/audio/mgs_accelpad.wav');
            this.sfx.cheer = new Audio('assets/audio/cs_swoopcheer.wav');
            this.sfx.boo = new Audio('assets/audio/cs_swoopboo.wav');
            [this.sfx.boost, this.sfx.cheer, this.sfx.boo].forEach((a) => {
                if (a) a.volume = 0.45;
            });
        } catch (e) {
            // Audio optional
        }
    }

    _playSfx(key) {
        const a = this.sfx[key];
        if (!a) return;
        try {
            a.currentTime = 0;
            a.play().catch(() => {});
        } catch (e) { /* ignore */ }
    }

    // ---- Track generation (hand-tuned street patterns) ----
    // Occupancy is lane-exclusive within a distance window so obstacles
    // never spawn on top of boost pads (and shifters don't share a wave with pads).

    generateTrack() {
        const events = [];
        const spacing = 300;
        const totalSlots = Math.floor(this.TRACK_LENGTH / spacing);
        // round distance to bucket size for conflict checks
        const BUCKET = 50;
        // lane occupancy: Map<"bucket_lane", type>
        const occ = new Map();

        const key = (dist, lane) => `${Math.round(dist / BUCKET)}_${lane}`;

        const canPlace = (dist, lane) => !occ.has(key(dist, lane));

        const claim = (dist, lane, type) => {
            occ.set(key(dist, lane), type);
            // Soft buffer: claim nearby buckets in same lane so pads/obstacles
            // don't stack almost on top of each other along Z.
            occ.set(key(dist + BUCKET * 0.5, lane), type);
            occ.set(key(dist - BUCKET * 0.5, lane), type);
        };

        const pushBoost = (dist, lane) => {
            if (lane < 0 || lane > 2 || !canPlace(dist, lane)) return false;
            events.push({ distance: dist, lane, type: 'boost', spriteKey: 'boost_pad' });
            claim(dist, lane, 'boost');
            return true;
        };

        const pushStatic = (dist, lane, progress) => {
            if (lane < 0 || lane > 2 || !canPlace(dist, lane)) return false;
            events.push({
                distance: dist,
                lane,
                type: 'obstacle_static',
                spriteKey: this._pickObstacle(progress)
            });
            claim(dist, lane, 'obstacle');
            return true;
        };

        // Shifting hazards sweep between start/target lanes — reserve both lanes
        // at that distance so nothing shares the wave (no pad under a drone path).
        const pushShift = (dist, lane, progress) => {
            const targetLane = (lane + Phaser.Math.Between(1, 2)) % 3;
            if (!canPlace(dist, lane) || !canPlace(dist, targetLane)) return false;

            // Slow, readable lane sweeps (was ~1.2–2.6 Hz — way too fast)
            // Range: ~0.28–0.55 full cycles/sec, slight ramp late-track
            const shiftSpeed = 0.28 + Math.random() * 0.22 + progress * 0.08;

            events.push({
                distance: dist,
                lane,
                type: 'obstacle_shift',
                spriteKey: Phaser.Math.Between(0, 1) === 0 ? 'drone' : 'security_gate',
                targetLane,
                shiftSpeed
            });
            claim(dist, lane, 'shift');
            claim(dist, targetLane, 'shift');
            return true;
        };

        // Opening stretch — pure boosts so the player learns the loop
        for (let i = 2; i < 5; i++) {
            pushBoost(i * spacing, i % 3);
        }

        for (let i = 5; i < totalSlots - 2; i++) {
            const dist = i * spacing;
            const progress = i / totalSlots;
            const lane = Phaser.Math.Between(0, 2);
            const rand = Math.random();

            // Periodic triple-lane choice: one clear boost lane, two hazards
            if (i % 11 === 0) {
                const boostLane = Phaser.Math.Between(0, 2);
                pushBoost(dist, boostLane);
                for (let l = 0; l < 3; l++) {
                    if (l === boostLane) continue;
                    pushStatic(dist, l, progress);
                }
                continue;
            }

            // Shifting threat — no boosts on the same distance wave
            if (rand < 0.12 + progress * 0.08) {
                if (pushShift(dist, lane, progress)) {
                    // Reward boost well AFTER the hazard wave, free lane
                    const freeLanes = [0, 1, 2].filter(
                        (l) => canPlace(dist + spacing * 0.55, l)
                    );
                    if (freeLanes.length && Math.random() < 0.5) {
                        pushBoost(
                            dist + spacing * 0.55,
                            freeLanes[Phaser.Math.Between(0, freeLanes.length - 1)]
                        );
                    }
                }
                continue;
            }

            // Boost alone
            if (rand < 0.42) {
                pushBoost(dist, lane);
                continue;
            }

            // Static obstacle + optional offset boost (different lane AND distance)
            if (rand < 0.72) {
                if (pushStatic(dist, lane, progress) && Math.random() < 0.5) {
                    const other = (lane + Phaser.Math.Between(1, 2)) % 3;
                    pushBoost(dist + spacing * 0.5, other);
                }
                continue;
            }

            // Boost + obstacle same distance, different lanes only
            if (pushBoost(dist, lane)) {
                const other = (lane + Phaser.Math.Between(1, 2)) % 3;
                pushStatic(dist, other, progress);
            }
        }

        // Finish approach: clear boosts into the line
        for (let i = 0; i < 3; i++) {
            pushBoost(this.TRACK_LENGTH - 700 + i * 200, i % 3);
        }

        events.sort((a, b) => a.distance - b.distance);
        return events;
    }

    _pickObstacle(progress) {
        const early = ['barricade', 'debris', 'vendor_cart'];
        const late = ['barricade', 'parked_vehicle', 'vendor_cart', 'debris', 'security_gate'];
        const pool = progress > 0.45 ? late : early;
        return pool[Phaser.Math.Between(0, pool.length - 1)];
    }

    // ---- HUD ----

    createHUD() {
        const hudStyle = { fontFamily: 'Orbitron, monospace', fontSize: '16px', color: '#00e5ff' };
        const labelStyle = { fontFamily: 'Orbitron, monospace', fontSize: '11px', color: '#4a6a7a' };

        const drawPanel = (x, y, w, h) => {
            const g = this.add.graphics();
            g.fillStyle(0x050a12, 0.55);
            g.lineStyle(1, 0x1a3a4a, 1);
            g.fillRoundedRect(x, y, w, h, 6);
            g.strokeRoundedRect(x, y, w, h, 6);
            return g;
        };

        // Top-left: SPEED + TIME
        drawPanel(8, 8, 155, 100);
        // Top-right: STRIKES
        drawPanel(640, 8, 152, 72);
        // Right: progress
        drawPanel(740, 100, 52, 280);
        // Bottom-left: boosts
        drawPanel(8, 553, 130, 38);

        // Speed
        this.add.text(15, 14, 'SPEED', labelStyle);
        this.speedText = this.add.text(15, 30, String(this.BASE_SPEED), {
            ...hudStyle, fontSize: '26px', fontStyle: 'bold'
        });
        this.speedText.setShadow(0, 0, '#00e5ff', 8, true, true);
        this.add.text(115, 44, 'km/h', { ...labelStyle, fontSize: '10px' });

        // Timer
        this.add.text(15, 68, 'TIME', labelStyle);
        this.timerText = this.add.text(15, 84, '00:00.00', {
            ...hudStyle, fontSize: '18px', color: '#e8f6ff'
        });
        this.timerText.setShadow(0, 0, '#00e5ff', 4, true, true);

        // Strikes (hull integrity)
        this.add.text(652, 14, 'HULL', labelStyle);
        this.strikeIcons = [];
        for (let i = 0; i < this.MAX_STRIKES; i++) {
            const icon = this.add.rectangle(668 + i * 36, 48, 26, 18, 0x0d2a24)
                .setStrokeStyle(1, 0x00ffcc);
            this.strikeIcons.push(icon);
        }

        // Track progress (vertical)
        this.add.text(748, 108, 'TRACK', { ...labelStyle, fontSize: '9px' });
        this.progressBg = this.add.rectangle(766, 260, 14, 220, 0x0d1420)
            .setStrokeStyle(1, 0x1a3a4a);
        this.progressFill = this.add.rectangle(766, 370, 10, 0, 0x00e5ff);
        this.progressMarker = this.add.triangle(752, 370, 0, 0, 8, 4, 0, 8, 0xff2e88);
        this.add.text(766, 385, 'FIN', {
            fontFamily: 'Orbitron, monospace', fontSize: '9px', color: '#ff2e88'
        }).setOrigin(0.5);

        // Boost counter
        this.add.text(15, 562, 'BOOSTS', labelStyle);
        this.boostCountText = this.add.text(85, 560, '0', {
            ...hudStyle, fontSize: '18px', color: '#00ffcc'
        });
        this.boostCountText.setShadow(0, 0, '#00ffcc', 6, true, true);

        // Lane hint
        this.add.text(400, 582, '← → / A D  SHIFT LANES', {
            fontFamily: 'monospace', fontSize: '11px', color: '#3a5a6a'
        }).setOrigin(0.5).setDepth(50);

        // Hit flash overlay
        this.hitFlash = this.add.rectangle(400, 300, 800, 600, 0xff2e55, 0).setDepth(100);

        // Boost edge vignette
        this.boostVignette = this.add.rectangle(400, 300, 800, 600, 0x00e5ff, 0)
            .setDepth(99)
            .setBlendMode(Phaser.BlendModes.ADD);
    }

    // ---- Main update loop ----

    update(time, delta) {
        if (!this.isRacing) return;
        const dt = delta / 1000;

        // Soft speed decay toward base (boosts are the real gas)
        if (this.currentSpeed > this.BASE_SPEED) {
            this.currentSpeed = Math.max(
                this.BASE_SPEED,
                this.currentSpeed - this.SPEED_DECAY * dt
            );
        }

        this.distance += this.currentSpeed * dt;
        this.elapsedTime += dt;
        if (this.boostFlashTimer > 0) this.boostFlashTimer -= dt;

        this.handleInput(dt);
        this.updateTrackObjects(dt);
        this.checkCollisions();
        this.updateHUD();

        if (window.sceneRenderer) {
            window.sceneRenderer.update({
                distance: this.distance,
                currentLane: this.currentLane,
                currentSpeed: this.currentSpeed,
                activeObjects: this.activeObjects,
                isRacing: this.isRacing,
                elapsedTime: this.elapsedTime,
                strikes: this.strikes,
                trackLength: this.TRACK_LENGTH,
                boostFlash: this.boostFlashTimer > 0
            });
        }

        if (this.distance >= this.TRACK_LENGTH) {
            this.finishRace();
        }
    }

    // ---- Input ----

    handleInput(dt) {
        if (!this.canShift) return;

        const left =
            Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
            Phaser.Input.Keyboard.JustDown(this.keys.A);
        const right =
            Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
            Phaser.Input.Keyboard.JustDown(this.keys.D);

        if (left && this.currentLane > 0) {
            this.currentLane--;
            this.canShift = false;
            this.time.delayedCall(this.LANE_COOLDOWN, () => { this.canShift = true; });
        } else if (right && this.currentLane < 2) {
            this.currentLane++;
            this.canShift = false;
            this.time.delayedCall(this.LANE_COOLDOWN, () => { this.canShift = true; });
        }
    }

    // ---- Track objects (data only; rendering in Three.js) ----

    updateTrackObjects(dt) {
        while (this.trackData.length > 0) {
            const next = this.trackData[0];
            const relZ = next.distance - this.distance;
            if (relZ > this.DRAW_DISTANCE) break;

            this.activeObjects.push({
                distance: next.distance,
                lane: next.lane,
                type: next.type,
                spriteKey: next.spriteKey,
                shifting: next.type === 'obstacle_shift',
                startLane: next.lane,
                targetLane: next.targetLane || next.lane,
                shiftSpeed: next.shiftSpeed || 0,
                shiftProgress: 0,
                hit: false
            });

            this.trackData.shift();
        }

        for (let i = this.activeObjects.length - 1; i >= 0; i--) {
            const obj = this.activeObjects[i];
            const relZ = obj.distance - this.distance;

            if (relZ < -50) {
                this.activeObjects.splice(i, 1);
                continue;
            }

            if (obj.shifting && !obj.hit) {
                obj.shiftProgress += dt * obj.shiftSpeed;
                const t = (Math.sin(obj.shiftProgress * Math.PI * 2) + 1) / 2;
                obj.lane = Phaser.Math.Linear(obj.startLane, obj.targetLane, t);
            }
        }
    }

    // ---- Collisions ----

    checkCollisions() {
        for (const obj of this.activeObjects) {
            if (obj.hit) continue;
            const relZ = obj.distance - this.distance;

            // Boost pads: slightly longer hit window (you drive through them)
            const zWindow = obj.type === 'boost' ? 28 : 18;
            if (relZ < zWindow && relZ > -zWindow) {
                const playerLaneNorm = (this.currentLane - 1) * 0.55;
                const objLaneNorm = (obj.lane - 1) * 0.55;
                const laneDiff = Math.abs(playerLaneNorm - objLaneNorm);
                const laneTol = obj.type === 'boost' ? 0.42 : 0.32;

                if (laneDiff < laneTol) {
                    obj.hit = true;
                    if (obj.type === 'boost') {
                        this.hitBoostPad(obj);
                    } else if (!this.invincible) {
                        this.hitObstacle(obj);
                    }
                }
            }
        }
    }

    hitBoostPad(obj) {
        this.boostsHit++;
        this.currentSpeed = Math.min(this.currentSpeed + this.BOOST_INCREMENT, this.MAX_SPEED);
        this.boostFlashTimer = 0.25;

        this.tweens.add({
            targets: this.speedText,
            scaleX: 1.25, scaleY: 1.25,
            duration: 90, yoyo: true
        });

        this.speedText.setColor('#00ffcc');
        this.time.delayedCall(120, () => {
            if (this.speedText) this.speedText.setColor('#00e5ff');
        });

        this.boostVignette.setAlpha(0.12);
        this.tweens.add({ targets: this.boostVignette, alpha: 0, duration: 280 });

        this._playSfx('boost');

        if (window.sceneRenderer) {
            window.sceneRenderer.playBoostEffect();
        }
    }

    hitObstacle(obj) {
        this.strikes++;
        this.currentSpeed = Math.max(this.currentSpeed - this.OBSTACLE_PENALTY, this.BASE_SPEED * 0.45);

        if (this.strikes <= this.MAX_STRIKES) {
            this.strikeIcons[this.strikes - 1].setFillStyle(0xff2e55);
            this.strikeIcons[this.strikes - 1].setStrokeStyle(1, 0xff2e55);
        }

        this.hitFlash.setAlpha(0.35);
        this.tweens.add({ targets: this.hitFlash, alpha: 0, duration: 320 });

        // Brief invincibility so one obstacle doesn't multi-hit
        this.invincible = true;
        this.time.delayedCall(700, () => { this.invincible = false; });

        // Camera + bike feedback
        this.cameras.main.shake(180, 0.012);

        if (window.sceneRenderer) {
            window.sceneRenderer.playHitEffect(this.strikes);
        }

        if (this.strikes >= this.MAX_STRIKES) {
            this.crashRace();
        }
    }

    // ---- HUD update ----

    updateHUD() {
        this.speedText.setText(Math.floor(this.currentSpeed).toString());

        const mins = Math.floor(this.elapsedTime / 60);
        const secs = Math.floor(this.elapsedTime % 60);
        const ms = Math.floor((this.elapsedTime % 1) * 100);
        this.timerText.setText(
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
        );

        const progress = Math.min(this.distance / this.TRACK_LENGTH, 1);
        const barHeight = 220 * progress;
        this.progressFill.setSize(10, barHeight);
        this.progressFill.setPosition(766, 370 - barHeight / 2);
        this.progressMarker.setPosition(752, 370 - barHeight);

        this.boostCountText.setText(this.boostsHit.toString());

        // Speed color intensity near max
        if (this.currentSpeed > this.MAX_SPEED * 0.85) {
            this.speedText.setColor('#ff2e88');
        } else if (this.boostFlashTimer <= 0) {
            this.speedText.setColor('#00e5ff');
        }
    }

    // ---- Race end ----

    finishRace() {
        this.isRacing = false;
        this._playSfx('cheer');
        if (window.sceneRenderer) window.sceneRenderer.setVisible(false);
        this.scene.start('ResultScene', {
            success: true,
            time: this.elapsedTime,
            boosts: this.boostsHit,
            strikes: this.strikes,
            finalSpeed: this.currentSpeed
        });
    }

    crashRace() {
        this.isRacing = false;
        this._playSfx('boo');

        this.hitFlash.setFillStyle(0xff2e55);
        this.hitFlash.setAlpha(0.5);
        this.tweens.add({ targets: this.hitFlash, alpha: 0, duration: 1000 });
        this.cameras.main.shake(600, 0.02);

        if (window.sceneRenderer) {
            window.sceneRenderer.playCrashEffect();
        }

        this.time.delayedCall(1400, () => {
            if (window.sceneRenderer) window.sceneRenderer.setVisible(false);
            this.scene.start('ResultScene', {
                success: false,
                time: this.elapsedTime,
                boosts: this.boostsHit,
                strikes: this.strikes,
                finalSpeed: 0
            });
        });
    }
}
