class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        this.input.enabled = true;
        const cx = 400;
        const cy = 300;

        // Cityscape backdrop
        this.bg = this.add.image(cx, cy, 'cityscape_bg');
        const coverScale = Math.max(800 / this.bg.width, 600 / this.bg.height);
        this.bg.setScale(coverScale);

        this.tweens.add({
            targets: this.bg,
            scale: coverScale * 1.05,
            duration: 20000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Vertical gradient overlay
        const overlay = this.add.graphics();
        overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.75, 0.75, 0.35, 0.35);
        overlay.fillRect(0, 0, 800, 300);
        overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.35, 0.35, 0.75, 0.75);
        overlay.fillRect(0, 300, 800, 300);

        // Accent lines
        const lineTop = this.add.rectangle(cx, 96, 800, 1, 0x00e5ff, 0.35);
        const lineBottom = this.add.rectangle(cx, 486, 800, 1, 0xff2e88, 0.35);
        this.tweens.add({
            targets: lineTop,
            alpha: { from: 0.15, to: 0.5 },
            duration: 2400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: lineBottom,
            alpha: { from: 0.15, to: 0.5 },
            duration: 2400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 400
        });

        // Title block
        const titleBacking = this.add.graphics();
        titleBacking.fillStyle(0x000000, 0.4);
        titleBacking.fillRoundedRect(cx - 240, 48, 480, 130, 16);

        const title = this.add.text(cx, 76, 'NeoTokyo', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '48px',
            color: '#aef4ff',
            fontStyle: 'bold',
            stroke: '#00e5ff',
            strokeThickness: 3
        }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 16, true, true);

        this.tweens.add({
            targets: title,
            alpha: { from: 0.85, to: 1 },
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.add.text(cx, 124, 'S W O O P', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '28px',
            color: '#ff2e88',
            stroke: '#330018',
            strokeThickness: 2
        }).setOrigin(0.5).setShadow(0, 0, '#ff2e88', 12, true, true);

        this.add.text(cx, 156, '「ネオトーキョー・スウープ」  ·  STREET CIRCUIT', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#00ffcc'
        }).setOrigin(0.5).setAlpha(0.75);

        // Hoverbike preview
        let bikeImage;
        if (window.neoTokyoSprites && window.neoTokyoSprites.player_bike) {
            if (!this.textures.exists('player_bike')) {
                this.textures.addCanvas('player_bike', window.neoTokyoSprites.player_bike);
            }
            bikeImage = this.add.image(cx, 310, 'player_bike').setScale(0.95).setAlpha(0.92);
        } else {
            bikeImage = this.add.image(cx, 305, 'hoverbike').setScale(2.2).setAlpha(0.92);
        }

        this.tweens.add({
            targets: bikeImage,
            y: bikeImage.y - 5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Start button
        const btnY = 458;
        const btnBg = this.add.rectangle(cx, btnY, 240, 50, 0x00e5ff, 0.15)
            .setStrokeStyle(2, 0x00e5ff)
            .setInteractive({ useHandCursor: true });

        const btnText = this.add.text(cx, btnY, '[ START RACE ]', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '18px',
            color: '#00e5ff'
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(0x00e5ff, 0.35);
            btnText.setColor('#ffffff');
        });
        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0x00e5ff, 0.15);
            btnText.setColor('#00e5ff');
        });
        btnBg.on('pointerdown', () => this.startCountdown());

        this.tweens.add({
            targets: btnBg,
            alpha: { from: 0.8, to: 1 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Controls hint
        const hintStrip = this.add.rectangle(cx, 555, 800, 50, 0x050a12, 0.8);
        hintStrip.setStrokeStyle(1, 0x0f2530, 0.8);

        this.add.text(cx, 542, '← →  or  A D   to shift lanes  ·  hold the line', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#8fb5c4'
        }).setOrigin(0.5);

        this.add.text(cx, 562, 'Hit boost pads · dodge street hazards · 3 hull hits = crash', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#6a8a9a'
        }).setOrigin(0.5);
    }

    startCountdown() {
        this.input.enabled = false;

        this.tweens.add({
            targets: this.children.list,
            alpha: 0,
            duration: 300
        });

        const counts = ['3', '2', '1', 'GO'];
        counts.forEach((text, i) => {
            this.time.delayedCall(400 + i * 700, () => {
                const countText = this.add.text(400, 280, text, {
                    fontFamily: 'Orbitron, monospace',
                    fontSize: text === 'GO' ? '64px' : '72px',
                    color: text === 'GO' ? '#ff2e88' : '#00e5ff',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 6
                }).setOrigin(0.5).setAlpha(0).setShadow(
                    0, 0, text === 'GO' ? '#ff2e88' : '#00e5ff', 20, true, true
                );

                this.tweens.add({
                    targets: countText,
                    alpha: { from: 0, to: 1 },
                    scale: { from: 2, to: 1 },
                    duration: 300,
                    ease: 'Power2'
                });

                this.tweens.add({
                    targets: countText,
                    alpha: 0,
                    delay: 400,
                    duration: 200
                });
            });
        });

        this.time.delayedCall(400 + 4 * 700, () => {
            this.scene.start('RaceScene');
        });
    }
}
