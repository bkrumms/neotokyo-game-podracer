class ResultScene extends Phaser.Scene {
    constructor() {
        super('ResultScene');
    }

    init(data) {
        this.raceData = data;
    }

    create() {
        const cx = 400;
        const { success, time, boosts, strikes, finalSpeed } = this.raceData;

        // Cityscape backdrop, scaled to cover 800x600
        const bg = this.add.image(cx, 300, 'cityscape_bg');
        const coverScale = Math.max(800 / bg.width, 600 / bg.height);
        bg.setScale(coverScale);

        // Darker overlay than the menu so the glass card reads clearly
        this.add.rectangle(cx, 300, 800, 600, 0x050a12, 0.75);

        const accent = success ? 0x00e5ff : 0xff2e55;

        // Glass card panel
        const cardW = 520, cardH = 470, cardY = 300;
        const card = this.add.graphics();
        card.fillStyle(0x0a0f1a, 0.7);
        card.fillRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 18);
        card.lineStyle(1, accent, 0.9);
        card.strokeRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 18);

        // Soft glow behind the card edge
        const cardGlow = this.add.graphics();
        cardGlow.lineStyle(6, accent, 0.12);
        cardGlow.strokeRoundedRect(cx - cardW / 2 - 3, cardY - cardH / 2 - 3, cardW + 6, cardH + 6, 20);

        if (success) {
            this.createSuccessScreen(cx, time, boosts, strikes, finalSpeed);
        } else {
            this.createCrashScreen(cx, time, boosts, strikes);
        }

        // Retry button — pill style
        const btnY = 465;
        const retryBg = this.add.graphics();
        retryBg.fillStyle(0x00e5ff, 0.15);
        retryBg.fillRoundedRect(cx - 100, btnY - 22, 200, 44, 22);
        retryBg.lineStyle(2, 0x00e5ff, 1);
        retryBg.strokeRoundedRect(cx - 100, btnY - 22, 200, 44, 22);
        const retryHit = this.add.rectangle(cx, btnY, 200, 44, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        const retryText = this.add.text(cx, btnY, '[ RETRY ]', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '16px',
            color: '#00e5ff'
        }).setOrigin(0.5);

        retryHit.on('pointerover', () => {
            retryBg.clear();
            retryBg.fillStyle(0x00e5ff, 0.35);
            retryBg.fillRoundedRect(cx - 100, btnY - 22, 200, 44, 22);
            retryBg.lineStyle(2, 0x00e5ff, 1);
            retryBg.strokeRoundedRect(cx - 100, btnY - 22, 200, 44, 22);
            retryText.setColor('#e8f6ff');
        });
        retryHit.on('pointerout', () => {
            retryBg.clear();
            retryBg.fillStyle(0x00e5ff, 0.15);
            retryBg.fillRoundedRect(cx - 100, btnY - 22, 200, 44, 22);
            retryBg.lineStyle(2, 0x00e5ff, 1);
            retryBg.strokeRoundedRect(cx - 100, btnY - 22, 200, 44, 22);
            retryText.setColor('#00e5ff');
        });
        retryHit.on('pointerdown', () => {
            this.scene.start('RaceScene');
        });

        // Menu button — smaller pill, muted
        const menuY = btnY + 52;
        const menuBg = this.add.graphics();
        menuBg.fillStyle(0x0a1420, 0.5);
        menuBg.fillRoundedRect(cx - 100, menuY - 17, 200, 34, 17);
        menuBg.lineStyle(1, 0x2a4a5a, 1);
        menuBg.strokeRoundedRect(cx - 100, menuY - 17, 200, 34, 17);
        const menuHit = this.add.rectangle(cx, menuY, 200, 34, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        const menuText = this.add.text(cx, menuY, 'MAIN MENU', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#5a7a8a'
        }).setOrigin(0.5);

        menuHit.on('pointerover', () => {
            menuBg.clear();
            menuBg.fillStyle(0x2a4a5a, 0.8);
            menuBg.fillRoundedRect(cx - 100, menuY - 17, 200, 34, 17);
            menuBg.lineStyle(1, 0x2a4a5a, 1);
            menuBg.strokeRoundedRect(cx - 100, menuY - 17, 200, 34, 17);
            menuText.setColor('#e8f6ff');
        });
        menuHit.on('pointerout', () => {
            menuBg.clear();
            menuBg.fillStyle(0x0a1420, 0.5);
            menuBg.fillRoundedRect(cx - 100, menuY - 17, 200, 34, 17);
            menuBg.lineStyle(1, 0x2a4a5a, 1);
            menuBg.strokeRoundedRect(cx - 100, menuY - 17, 200, 34, 17);
            menuText.setColor('#5a7a8a');
        });
        menuHit.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        // Fade in
        this.cameras.main.fadeIn(500);
    }

    createSuccessScreen(cx, time, boosts, strikes, finalSpeed) {
        // Title
        this.add.text(cx, 108, 'FINISH LINE', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '26px',
            color: '#aef4ff',
            fontStyle: 'bold',
            stroke: '#00e5ff',
            strokeThickness: 2
        }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 14, true, true);

        // Time (main result), front and center
        this.add.text(cx, 148, 'FINAL TIME', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#5a7a8a'
        }).setOrigin(0.5);

        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 100);
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

        this.add.text(cx, 188, timeStr, {
            fontFamily: 'Orbitron, monospace',
            fontSize: '42px',
            color: '#00ffcc',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Pulsing glow behind the time
        const glow = this.add.rectangle(cx, 188, 320, 60, 0x00e5ff, 0.05);
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.05, to: 0.12 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Rating badge
        const rating = this.calculateRating(time, boosts, strikes);
        const badge = this.add.graphics();
        badge.fillStyle(0xff2e88, 0.12);
        badge.fillRoundedRect(cx - 110, 226, 220, 34, 17);
        badge.lineStyle(1, 0xff2e88, 0.8);
        badge.strokeRoundedRect(cx - 110, 226, 220, 34, 17);
        this.add.text(cx, 243, rating, {
            fontFamily: 'Orbitron, monospace',
            fontSize: '18px',
            color: '#ff2e88',
            fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, '#ff2e88', 10, true, true);

        // Clean stat rows: label left (muted), value right (bright)
        const rowStartY = 300;
        const rowGap = 40;
        const rows = [
            { label: 'BOOSTS HIT', value: boosts.toString(), color: '#e8f6ff' },
            {
                label: 'STRIKES',
                value: `${strikes}/3`,
                color: strikes === 0 ? '#00ffcc' : strikes < 3 ? '#9d4cff' : '#ff2e55'
            },
            { label: 'TOP SPEED', value: Math.floor(finalSpeed).toString(), color: '#e8f6ff' }
        ];

        rows.forEach((row, i) => {
            const rowY = rowStartY + i * rowGap;
            this.add.text(cx - 190, rowY, row.label, {
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#5a7a8a'
            }).setOrigin(0, 0.5);
            this.add.text(cx + 190, rowY, row.value, {
                fontFamily: 'Orbitron, monospace',
                fontSize: '18px',
                color: row.color
            }).setOrigin(1, 0.5);
            if (i < rows.length - 1) {
                this.add.rectangle(cx, rowY + rowGap / 2, 420, 1, 0x1a2a35, 0.8);
            }
        });
    }

    createCrashScreen(cx, time, boosts, strikes) {
        // Title
        const title = this.add.text(cx, 118, 'CRASHED', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '34px',
            color: '#ff2e55',
            fontStyle: 'bold',
            stroke: '#330011',
            strokeThickness: 3
        }).setOrigin(0.5).setShadow(0, 0, '#ff2e55', 16, true, true);

        this.add.text(cx, 156, 'BIKE DESTROYED', {
            fontFamily: 'monospace',
            fontSize: '15px',
            color: '#ff2e88'
        }).setOrigin(0.5);

        // Time front and center, same treatment as the success screen
        this.add.text(cx, 196, 'DISTANCE BEFORE CRASH', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#5a7a8a'
        }).setOrigin(0.5);

        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        const ms = Math.floor((time % 1) * 100);
        this.add.text(cx, 232, `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`, {
            fontFamily: 'Orbitron, monospace',
            fontSize: '36px',
            color: '#e8f6ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Clean stat rows, same layout language as the success screen
        const rowStartY = 300;
        const rowGap = 40;
        const rows = [
            { label: 'BOOSTS COLLECTED', value: boosts.toString(), color: '#e8f6ff' },
            { label: 'STRIKES', value: `${strikes}/3`, color: '#ff2e55' }
        ];

        rows.forEach((row, i) => {
            const rowY = rowStartY + i * rowGap;
            this.add.text(cx - 190, rowY, row.label, {
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#5a7a8a'
            }).setOrigin(0, 0.5);
            this.add.text(cx + 190, rowY, row.value, {
                fontFamily: 'Orbitron, monospace',
                fontSize: '18px',
                color: row.color
            }).setOrigin(1, 0.5);
            if (i < rows.length - 1) {
                this.add.rectangle(cx, rowY + rowGap / 2, 420, 1, 0x1a2a35, 0.8);
            }
        });

        // Flicker effect on title
        this.tweens.add({
            targets: title,
            alpha: { from: 1, to: 0.6 },
            duration: 100,
            yoyo: true,
            repeat: 3,
            delay: 500
        });
    }

    calculateRating(time, boosts, strikes) {
        // Tuned for ~35–70s runs depending on boost mastery
        if (strikes === 0 && time < 38) return '>>> S RANK <<<';
        if (strikes === 0 && time < 48) return '>> A RANK <<';
        if (strikes <= 1 && time < 55) return '> B RANK <';
        if (strikes <= 2 && time < 68) return 'C RANK';
        return 'D RANK';
    }

    update() {
        // No-op: the cityscape backdrop is static, no scrolling elements remain.
    }
}
