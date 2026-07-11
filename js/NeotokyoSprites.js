// NeotokyoSprites.js
// Procedurally-drawn cyberpunk-anime obstacle/prop sprites for NeoTokyo Swoop.
// Builds window.neoTokyoSprites = { boost_pad, barricade, parked_vehicle, vendor_cart, drone, security_gate, debris, player_bike }
// Each value is a transparent, off-DOM HTMLCanvasElement drawn with the 2D canvas API only.
// Sprites are viewed straight-on (billboard), as encountered by the player on the road.

(function () {
    'use strict';

    var PALETTE = {
        bodyDark: '#0d1420',
        bodyMid: '#1a2436',
        bodyLight: '#2a3548',
        cyan: '#00e5ff',
        teal: '#00ffcc',
        pink: '#ff2e88',
        purple: '#9d4cff',
        amber: '#ffb347',
        danger: '#ff2e55'
    };

    function makeCanvas(w, h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    // Draws a soft radial glow halo behind a bright element.
    function glowCircle(ctx, x, y, r, color, alpha) {
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, hexToRgba(color, alpha != null ? alpha : 0.55));
        g.addColorStop(0.5, hexToRgba(color, (alpha != null ? alpha : 0.55) * 0.35));
        g.addColorStop(1, hexToRgba(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function hexToRgba(hex, alpha) {
        var v = hex.replace('#', '');
        var r = parseInt(v.substring(0, 2), 16);
        var g = parseInt(v.substring(2, 4), 16);
        var b = parseInt(v.substring(4, 6), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    // Strokes a path twice: a wide soft glow pass, then a crisp bright core pass.
    function neonStroke(ctx, drawPathFn, color, coreWidth, glowWidth, glowAlpha) {
        ctx.save();
        ctx.strokeStyle = hexToRgba(color, glowAlpha != null ? glowAlpha : 0.35);
        ctx.lineWidth = glowWidth != null ? glowWidth : coreWidth * 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawPathFn(ctx);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = coreWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = coreWidth * 2.5;
        drawPathFn(ctx);
        ctx.stroke();
        ctx.restore();
    }

    function bodyGradient(ctx, x0, y0, x1, y1) {
        var g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, PALETTE.bodyLight);
        g.addColorStop(1, PALETTE.bodyDark);
        return g;
    }

    // ---------------------------------------------------------------
    // boost_pad — glowing road accel strip (KOTOR-style pad, NeoTokyo neon)
    // Drawn top-down so it can be laid flat on the street mesh.
    // ---------------------------------------------------------------
    function buildBoostPad() {
        var W = 256, H = 320;
        var c = makeCanvas(W, H);
        var ctx = c.getContext('2d');
        var cx = W / 2;

        // Soft outer glow
        var outer = ctx.createRadialGradient(cx, H / 2, 10, cx, H / 2, 140);
        outer.addColorStop(0, hexToRgba(PALETTE.cyan, 0.45));
        outer.addColorStop(0.55, hexToRgba(PALETTE.teal, 0.18));
        outer.addColorStop(1, hexToRgba(PALETTE.cyan, 0));
        ctx.fillStyle = outer;
        ctx.fillRect(0, 0, W, H);

        // Dark pad plate
        var padX = 28, padY = 24, padW = W - 56, padH = H - 48;
        ctx.save();
        ctx.fillStyle = hexToRgba(PALETTE.bodyDark, 0.85);
        roundRectPath(ctx, padX, padY, padW, padH, 18);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(PALETTE.cyan, 0.9);
        ctx.lineWidth = 4;
        ctx.shadowColor = PALETTE.cyan;
        ctx.shadowBlur = 16;
        roundRectPath(ctx, padX, padY, padW, padH, 18);
        ctx.stroke();
        ctx.restore();

        // Inner neon border
        ctx.save();
        ctx.strokeStyle = hexToRgba(PALETTE.teal, 0.75);
        ctx.lineWidth = 2;
        roundRectPath(ctx, padX + 10, padY + 10, padW - 20, padH - 20, 12);
        ctx.stroke();
        ctx.restore();

        // Forward chevrons (point "up" the track = top of texture)
        for (var i = 0; i < 5; i++) {
            var cyChev = padY + 36 + i * 48;
            var alpha = 0.45 + (i / 5) * 0.5;
            ctx.save();
            ctx.strokeStyle = hexToRgba(PALETTE.cyan, alpha);
            ctx.lineWidth = 10;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.shadowColor = PALETTE.cyan;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.moveTo(cx - 52, cyChev + 18);
            ctx.lineTo(cx, cyChev - 10);
            ctx.lineTo(cx + 52, cyChev + 18);
            ctx.stroke();
            ctx.strokeStyle = hexToRgba('#ffffff', alpha * 0.7);
            ctx.lineWidth = 3;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(cx - 52, cyChev + 18);
            ctx.lineTo(cx, cyChev - 10);
            ctx.lineTo(cx + 52, cyChev + 18);
            ctx.stroke();
            ctx.restore();
        }

        // Side energy rails
        neonStroke(ctx, function (ctx) {
            ctx.beginPath();
            ctx.moveTo(padX + 6, padY + 16);
            ctx.lineTo(padX + 6, padY + padH - 16);
        }, PALETTE.teal, 3, 12, 0.35);
        neonStroke(ctx, function (ctx) {
            ctx.beginPath();
            ctx.moveTo(padX + padW - 6, padY + 16);
            ctx.lineTo(padX + padW - 6, padY + padH - 16);
        }, PALETTE.teal, 3, 12, 0.35);

        function roundRectPath(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }

        return c;
    }

    // ---------------------------------------------------------------
    // barricade — 256x160 low concrete/polymer road barricade
    // ---------------------------------------------------------------
    function buildBarricade() {
        var W = 256, H = 160;
        var c = makeCanvas(W, H);
        var ctx = c.getContext('2d');

        var bx = 24, by = 46, bw = 208, bh = 78;

        // Ground contact shadow
        var shadow = ctx.createRadialGradient(W / 2, by + bh + 6, 4, W / 2, by + bh + 6, 120);
        shadow.addColorStop(0, 'rgba(0,0,0,0.5)');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadow;
        ctx.fillRect(0, by + bh - 10, W, 40);

        // Main angular block body
        ctx.save();
        ctx.fillStyle = bodyGradient(ctx, bx, by, bx, by + bh);
        ctx.beginPath();
        ctx.moveTo(bx + 10, by);
        ctx.lineTo(bx + bw - 10, by);
        ctx.lineTo(bx + bw, by + 18);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx, by + 18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyLight;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Top bevel highlight
        ctx.save();
        ctx.fillStyle = hexToRgba('#ffffff', 0.05);
        ctx.beginPath();
        ctx.moveTo(bx + 10, by);
        ctx.lineTo(bx + bw - 10, by);
        ctx.lineTo(bx + bw, by + 18);
        ctx.lineTo(bx, by + 18);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Hazard chevrons (pink, glowing) across the front face
        var chevY = by + 30, chevH = 34;
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx + 6, by + 20, bw - 12, bh - 26);
        ctx.clip();
        for (var i = -1; i < 7; i++) {
            var chevX = bx + i * 34;
            ctx.save();
            ctx.strokeStyle = hexToRgba(PALETTE.pink, 0.3);
            ctx.lineWidth = 20;
            ctx.lineCap = 'square';
            ctx.beginPath();
            ctx.moveTo(chevX, chevY - 20);
            ctx.lineTo(chevX + 17, chevY + chevH / 2);
            ctx.lineTo(chevX, chevY + chevH + 20);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.strokeStyle = PALETTE.pink;
            ctx.lineWidth = 9;
            ctx.lineCap = 'square';
            ctx.shadowColor = PALETTE.pink;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(chevX, chevY - 20);
            ctx.lineTo(chevX + 17, chevY + chevH / 2);
            ctx.lineTo(chevX, chevY + chevH + 20);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();

        // Dark frame edges to keep silhouette crisp over the chevrons
        ctx.save();
        ctx.strokeStyle = PALETTE.bodyDark;
        ctx.lineWidth = 10;
        ctx.strokeRect(bx - 2, by + 18, bw + 4, bh - 18);
        ctx.restore();

        // Re-stroke outer edge on top so it stays clean
        ctx.save();
        ctx.strokeStyle = PALETTE.bodyLight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + 10, by);
        ctx.lineTo(bx + bw - 10, by);
        ctx.lineTo(bx + bw, by + 18);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx, by + 18);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Warning lights on top
        function warnLight(lx) {
            glowCircle(ctx, lx, by - 4, 18, PALETTE.danger, 0.6);
            ctx.save();
            ctx.fillStyle = PALETTE.bodyDark;
            ctx.beginPath();
            ctx.arc(lx, by - 2, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PALETTE.danger;
            ctx.shadowColor = PALETTE.danger;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(lx, by - 2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        warnLight(bx + 26);
        warnLight(bx + bw - 26);

        return c;
    }

    // ---------------------------------------------------------------
    // parked_vehicle — 256x200 rear view of a parked hovercar
    // ---------------------------------------------------------------
    function buildParkedVehicle() {
        var W = 256, H = 200;
        var c = makeCanvas(W, H);
        var ctx = c.getContext('2d');

        var cx = W / 2;
        var bodyTop = 70, bodyBottom = 150;
        var bodyLeft = 46, bodyRight = 210;

        // Cyan hover underglow beneath the car
        glowCircle(ctx, cx, bodyBottom + 14, 90, PALETTE.cyan, 0.4);
        ctx.save();
        ctx.fillStyle = hexToRgba(PALETTE.cyan, 0.35);
        ctx.beginPath();
        ctx.ellipse(cx, bodyBottom + 10, 78, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Rounded-wedge body silhouette (rear view: wider at bottom, tapering up)
        ctx.save();
        ctx.fillStyle = bodyGradient(ctx, cx, bodyTop, cx, bodyBottom);
        roundedTrapezoid(ctx, bodyLeft, bodyTop, bodyRight, bodyBottom, 22, 14);
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyLight;
        ctx.lineWidth = 2;
        roundedTrapezoid(ctx, bodyLeft, bodyTop, bodyRight, bodyBottom, 22, 14);
        ctx.stroke();
        ctx.restore();

        function roundedTrapezoid(ctx, x0, y0, x1, y1, topInset, r) {
            var tlX = x0 + topInset, trX = x1 - topInset;
            ctx.beginPath();
            ctx.moveTo(tlX + r, y0);
            ctx.lineTo(trX - r, y0);
            ctx.quadraticCurveTo(trX, y0, trX + (x1 - trX) * 0.4, y0 + (y1 - y0) * 0.25);
            ctx.lineTo(x1 - r, y1 - 20);
            ctx.quadraticCurveTo(x1, y1 - 20, x1, y1 - 20 + r);
            ctx.lineTo(x1, y1 - r);
            ctx.quadraticCurveTo(x1, y1, x1 - r, y1);
            ctx.lineTo(x0 + r, y1);
            ctx.quadraticCurveTo(x0, y1, x0, y1 - r);
            ctx.lineTo(x0, y1 - 20 + r);
            ctx.quadraticCurveTo(x0, y1 - 20, x0 + (tlX - x0) * 0.6, y0 + (y1 - y0) * 0.25);
            ctx.lineTo(tlX - (x1 - trX) * 0, y0 + (y1 - y0) * 0.25);
            ctx.quadraticCurveTo(tlX, y0, tlX + r, y0);
            ctx.closePath();
        }

        // Dark window band across upper body
        ctx.save();
        ctx.fillStyle = hexToRgba('#000814', 0.75);
        roundedTrapezoid(ctx, bodyLeft + 16, bodyTop + 6, bodyRight - 16, bodyTop + 34, 8, 8);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(PALETTE.cyan, 0.4);
        ctx.lineWidth = 1.5;
        roundedTrapezoid(ctx, bodyLeft + 16, bodyTop + 6, bodyRight - 16, bodyTop + 34, 8, 8);
        ctx.stroke();
        ctx.restore();

        // Center spine crease
        ctx.save();
        ctx.strokeStyle = hexToRgba('#000000', 0.35);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, bodyTop + 36);
        ctx.lineTo(cx, bodyBottom - 22);
        ctx.stroke();
        ctx.restore();

        // Glowing pink/red tail-light bar across the back
        var tlY = bodyBottom - 34, tlH = 16;
        ctx.save();
        ctx.fillStyle = hexToRgba(PALETTE.pink, 0.3);
        ctx.fillRect(bodyLeft + 10, tlY - 8, bodyRight - bodyLeft - 20, tlH + 16);
        ctx.restore();

        var tlGrad = ctx.createLinearGradient(bodyLeft + 18, 0, bodyRight - 18, 0);
        tlGrad.addColorStop(0, PALETTE.pink);
        tlGrad.addColorStop(0.5, PALETTE.danger);
        tlGrad.addColorStop(1, PALETTE.pink);
        ctx.save();
        ctx.fillStyle = tlGrad;
        ctx.shadowColor = PALETTE.pink;
        ctx.shadowBlur = 16;
        roundRect(ctx, bodyLeft + 18, tlY, bodyRight - bodyLeft - 36, tlH, 6);
        ctx.fill();
        ctx.restore();

        // Bright core line on tail-light
        ctx.save();
        ctx.strokeStyle = hexToRgba('#ffffff', 0.7);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bodyLeft + 24, tlY + tlH / 2);
        ctx.lineTo(bodyRight - 24, tlY + tlH / 2);
        ctx.stroke();
        ctx.restore();

        // Small side marker lights
        glowCircle(ctx, bodyLeft + 6, bodyBottom - 20, 10, PALETTE.purple, 0.5);
        glowCircle(ctx, bodyRight - 6, bodyBottom - 20, 10, PALETTE.purple, 0.5);

        function roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }

        return c;
    }

    // ---------------------------------------------------------------
    // vendor_cart — 256x200 neon street-food cart
    // ---------------------------------------------------------------
    function buildVendorCart() {
        var W = 256, H = 200;
        var c = makeCanvas(W, H);
        var ctx = c.getContext('2d');

        var cartX = 30, cartY = 110, cartW = 196, cartH = 66;

        // Ground shadow
        var shadow = ctx.createRadialGradient(W / 2, cartY + cartH + 6, 4, W / 2, cartY + cartH + 6, 110);
        shadow.addColorStop(0, 'rgba(0,0,0,0.5)');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadow;
        ctx.fillRect(0, cartY + cartH - 8, W, 36);

        // Warm lantern glow spilling from serving window (drawn before the box so it feels like it emits)
        glowCircle(ctx, W / 2, cartY + 24, 70, PALETTE.amber, 0.35);

        // Cart box body
        ctx.save();
        ctx.fillStyle = bodyGradient(ctx, cartX, cartY, cartX, cartY + cartH);
        ctx.beginPath();
        ctx.moveTo(cartX, cartY + 10);
        ctx.lineTo(cartX + 10, cartY);
        ctx.lineTo(cartX + cartW - 10, cartY);
        ctx.lineTo(cartX + cartW, cartY + 10);
        ctx.lineTo(cartX + cartW, cartY + cartH);
        ctx.lineTo(cartX, cartY + cartH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyLight;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Serving window opening (warm interior)
        var winX = cartX + 24, winY = cartY + 8, winW = cartW - 48, winH = 30;
        ctx.save();
        var winGrad = ctx.createLinearGradient(0, winY, 0, winY + winH);
        winGrad.addColorStop(0, hexToRgba(PALETTE.amber, 0.85));
        winGrad.addColorStop(1, hexToRgba('#ff7a1a', 0.6));
        ctx.fillStyle = winGrad;
        ctx.shadowColor = PALETTE.amber;
        ctx.shadowBlur = 18;
        ctx.fillRect(winX, winY, winW, winH);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = PALETTE.bodyDark;
        ctx.lineWidth = 4;
        ctx.strokeRect(winX, winY, winW, winH);
        ctx.restore();

        // Small cyan accent trim along the counter edge
        neonStroke(ctx, function (ctx) {
            ctx.beginPath();
            ctx.moveTo(cartX + 4, cartY + cartH - 6);
            ctx.lineTo(cartX + cartW - 4, cartY + cartH - 6);
        }, PALETTE.cyan, 2, 8, 0.3);

        // Cyan accent corner struts
        glowCircle(ctx, cartX + 8, cartY + cartH - 6, 8, PALETTE.cyan, 0.5);
        glowCircle(ctx, cartX + cartW - 8, cartY + cartH - 6, 8, PALETTE.cyan, 0.5);

        // Support legs
        ctx.save();
        ctx.fillStyle = PALETTE.bodyDark;
        ctx.fillRect(cartX + 14, cartY + cartH - 2, 8, 18);
        ctx.fillRect(cartX + cartW - 22, cartY + cartH - 2, 8, 18);
        ctx.restore();

        // Sign post + glowing sign panel on top
        var postX = W / 2;
        ctx.save();
        ctx.strokeStyle = PALETTE.bodyDark;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(postX, cartY);
        ctx.lineTo(postX, cartY - 34);
        ctx.stroke();
        ctx.restore();

        var signW = 108, signH = 46, signX = postX - signW / 2, signY = cartY - 34 - signH;

        // Sign glow halo
        ctx.save();
        var signGlow = ctx.createRadialGradient(postX, signY + signH / 2, 4, postX, signY + signH / 2, 90);
        signGlow.addColorStop(0, hexToRgba(PALETTE.purple, 0.4));
        signGlow.addColorStop(1, hexToRgba(PALETTE.purple, 0));
        ctx.fillStyle = signGlow;
        ctx.fillRect(signX - 40, signY - 30, signW + 80, signH + 60);
        ctx.restore();

        // Sign panel body
        ctx.save();
        ctx.fillStyle = PALETTE.bodyDark;
        ctx.strokeStyle = PALETTE.purple;
        ctx.lineWidth = 2;
        ctx.shadowColor = PALETTE.purple;
        ctx.shadowBlur = 12;
        roundRectPath(ctx, signX, signY, signW, signH, 6);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Katakana-like glowing glyph bars on the sign (simple geometric strokes, pink + purple)
        var glyphColors = [PALETTE.pink, PALETTE.purple, PALETTE.pink];
        for (var gi = 0; gi < 3; gi++) {
            var gx = signX + 14 + gi * 30;
            ctx.save();
            ctx.strokeStyle = glyphColors[gi];
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.shadowColor = glyphColors[gi];
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(gx, signY + 10);
            ctx.lineTo(gx, signY + signH - 10);
            ctx.moveTo(gx - 8, signY + 16);
            ctx.lineTo(gx + 8, signY + 16);
            ctx.moveTo(gx - 8, signY + signH - 16);
            ctx.lineTo(gx + 8, signY + signH - 16);
            ctx.stroke();
            ctx.restore();
        }

        function roundRectPath(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }

        return c;
    }

    // ---------------------------------------------------------------
    // drone — 256x160 patrol drone
    // ---------------------------------------------------------------
    function buildDrone() {
        var W = 256, H = 160;
        var c = makeCanvas(W, H);
        var ctx = c.getContext('2d');

        var cx = W / 2, cy = H / 2 - 4;

        // Rotor pods with faint purple glow discs (drawn first, behind body)
        function rotorPod(px, py) {
            glowCircle(ctx, px, py, 30, PALETTE.purple, 0.35);
            ctx.save();
            ctx.strokeStyle = hexToRgba(PALETTE.purple, 0.5);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(px, py, 22, 8, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            ctx.save();
            ctx.fillStyle = PALETTE.bodyDark;
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = PALETTE.purple;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }
        rotorPod(cx - 88, cy - 6);
        rotorPod(cx + 88, cy - 6);

        // Struts connecting pods to body
        ctx.save();
        ctx.strokeStyle = PALETTE.bodyMid;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx - 88, cy - 6);
        ctx.lineTo(cx - 34, cy + 4);
        ctx.moveTo(cx + 88, cy - 6);
        ctx.lineTo(cx + 34, cy + 4);
        ctx.stroke();
        ctx.restore();

        // Angular dark body (diamond/hex hybrid)
        ctx.save();
        ctx.fillStyle = bodyGradient(ctx, cx, cy - 40, cx, cy + 40);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 42);
        ctx.lineTo(cx + 38, cy - 14);
        ctx.lineTo(cx + 34, cy + 30);
        ctx.lineTo(cx, cy + 44);
        ctx.lineTo(cx - 34, cy + 30);
        ctx.lineTo(cx - 38, cy - 14);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyLight;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Panel line details
        ctx.save();
        ctx.strokeStyle = hexToRgba('#000000', 0.3);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 24, cy - 6);
        ctx.lineTo(cx - 34, cy - 14);
        ctx.moveTo(cx + 24, cy - 6);
        ctx.lineTo(cx + 34, cy - 14);
        ctx.stroke();
        ctx.restore();

        // Single large sensor eye, strong glow (red-pink = alert patrol unit)
        glowCircle(ctx, cx, cy - 2, 46, PALETTE.danger, 0.5);
        ctx.save();
        ctx.fillStyle = PALETTE.bodyDark;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        var eyeGrad = ctx.createRadialGradient(cx, cy - 2, 2, cx, cy - 2, 18);
        eyeGrad.addColorStop(0, '#ffffff');
        eyeGrad.addColorStop(0.25, PALETTE.danger);
        eyeGrad.addColorStop(1, hexToRgba(PALETTE.danger, 0.7));
        ctx.save();
        ctx.fillStyle = eyeGrad;
        ctx.shadowColor = PALETTE.danger;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Eye ring accent
        ctx.save();
        ctx.strokeStyle = hexToRgba(PALETTE.cyan, 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Thin blinking-light accents along lower body
        var lights = [
            { x: cx - 16, y: cy + 26, color: PALETTE.cyan },
            { x: cx + 16, y: cy + 26, color: PALETTE.purple }
        ];
        lights.forEach(function (l) {
            glowCircle(ctx, l.x, l.y, 8, l.color, 0.6);
            ctx.save();
            ctx.fillStyle = l.color;
            ctx.shadowColor = l.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(l.x, l.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        return c;
    }

    // ---------------------------------------------------------------
    // security_gate — 256x140 sliding security barrier
    // ---------------------------------------------------------------
    function buildSecurityGate() {
        var W = 256, H = 140;
        var c = makeCanvas(W, H);
        var ctx = c.getContext('2d');

        var postW = 26, postH = 108, postY = 20;
        var leftPostX = 20, rightPostX = W - 20 - postW;

        function post(px) {
            ctx.save();
            ctx.fillStyle = bodyGradient(ctx, px, postY, px, postY + postH);
            ctx.beginPath();
            ctx.moveTo(px + 4, postY);
            ctx.lineTo(px + postW - 4, postY);
            ctx.lineTo(px + postW, postY + 10);
            ctx.lineTo(px + postW, postY + postH);
            ctx.lineTo(px, postY + postH);
            ctx.lineTo(px, postY + 10);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = PALETTE.bodyLight;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // vertical cyan accent stripe
            ctx.save();
            ctx.strokeStyle = hexToRgba(PALETTE.cyan, 0.7);
            ctx.lineWidth = 2;
            ctx.shadowColor = PALETTE.cyan;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(px + postW / 2, postY + 14);
            ctx.lineTo(px + postW / 2, postY + postH - 10);
            ctx.stroke();
            ctx.restore();

            // warning light atop post
            glowCircle(ctx, px + postW / 2, postY - 2, 14, PALETTE.danger, 0.6);
            ctx.save();
            ctx.fillStyle = PALETTE.danger;
            ctx.shadowColor = PALETTE.danger;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(px + postW / 2, postY - 2, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        post(leftPostX);
        post(rightPostX);

        // Horizontal dark bar connecting posts (top structural bar)
        var barY = postY + 16, barH = 12;
        ctx.save();
        ctx.fillStyle = bodyGradient(ctx, 0, barY, 0, barY + barH);
        ctx.fillRect(leftPostX + postW - 4, barY, rightPostX - leftPostX - postW + 8, barH);
        ctx.strokeStyle = PALETTE.bodyLight;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(leftPostX + postW - 4, barY, rightPostX - leftPostX - postW + 8, barH);
        ctx.restore();

        // Laser lines spanning between posts (bright red-pink, glowing, blocking passage)
        var laserYs = [postY + 44, postY + 62, postY + 80];
        laserYs.forEach(function (ly, i) {
            neonStroke(ctx, function (ctx) {
                ctx.beginPath();
                ctx.moveTo(leftPostX + postW - 2, ly);
                ctx.lineTo(rightPostX + 2, ly);
            }, i === 1 ? PALETTE.danger : PALETTE.pink, 2, 14, 0.3);
        });

        // Small emitter nodes where lasers meet posts
        laserYs.forEach(function (ly) {
            glowCircle(ctx, leftPostX + postW - 2, ly, 7, PALETTE.pink, 0.7);
            glowCircle(ctx, rightPostX + 2, ly, 7, PALETTE.pink, 0.7);
        });

        return c;
    }

    // ---------------------------------------------------------------
    // debris — 256x140 scattered street junk pile
    // ---------------------------------------------------------------
    function buildDebris() {
        var W = 256, H = 140;
        var c = makeCanvas(W, H);
        var ctx = c.getContext('2d');

        var baseY = 118;

        // Ground shadow
        var shadow = ctx.createRadialGradient(W / 2, baseY + 4, 4, W / 2, baseY + 4, 130);
        shadow.addColorStop(0, 'rgba(0,0,0,0.5)');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadow;
        ctx.fillRect(0, baseY - 6, W, 30);

        function crate(x, y, w, h, rot) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.fillStyle = bodyGradient(ctx, 0, -h, 0, 0);
            ctx.fillRect(-w / 2, -h, w, h);
            ctx.strokeStyle = PALETTE.bodyLight;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w / 2, -h, w, h);
            // plank lines
            ctx.strokeStyle = hexToRgba('#000000', 0.35);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-w / 2, -h / 2);
            ctx.lineTo(w / 2, -h / 2);
            ctx.stroke();
            ctx.restore();
        }

        function scrapPanel(x, y, w, h, rot) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.fillStyle = PALETTE.bodyMid;
            ctx.beginPath();
            ctx.moveTo(-w / 2, 0);
            ctx.lineTo(w / 2 - 6, -h * 0.2);
            ctx.lineTo(w / 2, -h);
            ctx.lineTo(-w / 2 + 8, -h * 0.85);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = PALETTE.bodyLight;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }

        // Back scrap panel leaning
        scrapPanel(70, baseY, 46, 70, -0.15);
        // Main crates
        crate(150, baseY, 62, 46, 0.02);
        crate(196, baseY, 40, 34, -0.08);
        crate(40, baseY, 38, 30, 0.06);

        // Small loose bits
        ctx.save();
        ctx.fillStyle = PALETTE.bodyDark;
        ctx.beginPath();
        ctx.ellipse(112, baseY - 4, 14, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Faint neon reflections/sparks (cyan) so it fits the neon-lit scene
        function spark(x, y, r) {
            glowCircle(ctx, x, y, r, PALETTE.cyan, 0.35);
            ctx.save();
            ctx.fillStyle = hexToRgba(PALETTE.cyan, 0.8);
            ctx.shadowColor = PALETTE.cyan;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x, y, 1.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        spark(158, baseY - 30, 10);
        spark(50, baseY - 16, 7);

        // Thin cyan reflection streak on a scrap edge
        ctx.save();
        ctx.strokeStyle = hexToRgba(PALETTE.cyan, 0.5);
        ctx.lineWidth = 1.5;
        ctx.shadowColor = PALETTE.cyan;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(178, baseY - 40);
        ctx.lineTo(190, baseY - 8);
        ctx.stroke();
        ctx.restore();

        return c;
    }

    // ---------------------------------------------------------------
    // player_bike — 256x220 hero asset: player's hoverbike, rear 3/4 view
    // ---------------------------------------------------------------
    function buildPlayerBike() {
        var W = 256, H = 220;
        var c = makeCanvas(W, H);
        var ctx = c.getContext('2d');

        var cx = W / 2 + 6;
        var groundY = 190;

        // Cyan hover underglow ellipse beneath the bike
        glowCircle(ctx, cx - 4, groundY, 100, PALETTE.cyan, 0.4);
        ctx.save();
        ctx.fillStyle = hexToRgba(PALETTE.cyan, 0.3);
        ctx.beginPath();
        ctx.ellipse(cx - 4, groundY, 84, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ---- Long low wedge body silhouette (rear 3/4 view) ----
        // Body runs from a raised seat/tail section (upper area, offset toward
        // the viewer's right to suggest the 3/4 angle) down into a long low
        // wedge toward the front/left.
        function bodyPath(ctx) {
            ctx.beginPath();
            ctx.moveTo(cx + 30, 58);                 // top of tail/seat hump
            ctx.quadraticCurveTo(cx + 54, 66, cx + 56, 92);   // tail curves down-right
            ctx.lineTo(cx + 50, 132);                 // rear body side
            ctx.quadraticCurveTo(cx + 46, 150, cx + 30, 156); // flares for rear wheel arch
            ctx.lineTo(cx + 10, 158);
            ctx.quadraticCurveTo(cx - 40, 160, cx - 78, 148); // long low wedge toward front
            ctx.quadraticCurveTo(cx - 100, 140, cx - 104, 126); // front nose taper
            ctx.quadraticCurveTo(cx - 98, 116, cx - 78, 114); // underside of nose
            ctx.quadraticCurveTo(cx - 40, 108, cx - 6, 104); // low mid-body line
            ctx.quadraticCurveTo(cx + 4, 96, cx + 4, 80);    // rise into seat base
            ctx.quadraticCurveTo(cx + 8, 62, cx + 30, 58);   // back up to tail top
            ctx.closePath();
        }

        ctx.save();
        ctx.fillStyle = bodyGradient(ctx, cx, 58, cx, 158);
        bodyPath(ctx);
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyLight;
        ctx.lineWidth = 2;
        bodyPath(ctx);
        ctx.stroke();
        ctx.restore();

        // Raised seat pad on top of the tail section
        ctx.save();
        ctx.fillStyle = PALETTE.bodyDark;
        ctx.beginPath();
        ctx.moveTo(cx + 12, 64);
        ctx.quadraticCurveTo(cx + 30, 54, cx + 46, 66);
        ctx.quadraticCurveTo(cx + 50, 76, cx + 40, 82);
        ctx.lineTo(cx + 14, 84);
        ctx.quadraticCurveTo(cx + 6, 74, cx + 12, 64);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = hexToRgba(PALETTE.teal, 0.5);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // Rear wheel arch (dark, partially hidden under bodywork, rear 3/4 view)
        ctx.save();
        ctx.fillStyle = PALETTE.bodyDark;
        ctx.beginPath();
        ctx.arc(cx + 24, 158, 30, Math.PI * 0.05, Math.PI * 0.95);
        ctx.fill();
        ctx.restore();
        glowCircle(ctx, cx + 24, 168, 26, PALETTE.cyan, 0.25);

        // Rear tire hint (dark ring)
        ctx.save();
        ctx.strokeStyle = PALETTE.bodyMid;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(cx + 24, 160, 22, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
        ctx.restore();

        // ---- Thin teal accent lines tracing the body edges ----
        neonStroke(ctx, function (ctx) {
            ctx.beginPath();
            ctx.moveTo(cx - 96, 122);
            ctx.quadraticCurveTo(cx - 40, 112, cx, 100);
            ctx.quadraticCurveTo(cx + 20, 92, cx + 34, 70);
        }, PALETTE.teal, 1.5, 6, 0.3);

        neonStroke(ctx, function (ctx) {
            ctx.beginPath();
            ctx.moveTo(cx - 74, 146);
            ctx.quadraticCurveTo(cx - 20, 152, cx + 14, 150);
            ctx.quadraticCurveTo(cx + 34, 146, cx + 44, 128);
        }, PALETTE.teal, 1.5, 6, 0.3);

        // Windscreen / cockpit hint near the nose, dark with a thin cyan edge
        ctx.save();
        ctx.fillStyle = hexToRgba('#000814', 0.7);
        ctx.beginPath();
        ctx.moveTo(cx - 60, 108);
        ctx.quadraticCurveTo(cx - 44, 96, cx - 24, 100);
        ctx.quadraticCurveTo(cx - 30, 112, cx - 50, 116);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = hexToRgba(PALETTE.cyan, 0.45);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // ---- Twin engine exhaust glows at the rear, white-hot cores ----
        function exhaust(ex, ey, r) {
            // outer soft halo
            glowCircle(ctx, ex, ey, r * 2.6, PALETTE.cyan, 0.5);
            // mid glow ring
            var midGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, r * 1.4);
            midGrad.addColorStop(0, hexToRgba('#ffffff', 0.9));
            midGrad.addColorStop(0.35, hexToRgba(PALETTE.cyan, 0.85));
            midGrad.addColorStop(1, hexToRgba(PALETTE.cyan, 0));
            ctx.save();
            ctx.fillStyle = midGrad;
            ctx.beginPath();
            ctx.arc(ex, ey, r * 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // dark housing ring
            ctx.save();
            ctx.strokeStyle = PALETTE.bodyDark;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(ex, ey, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            // white-hot core
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = PALETTE.cyan;
            ctx.shadowBlur = r * 1.8;
            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        exhaust(cx + 40, 118, 11);
        exhaust(cx + 48, 140, 9);

        // ---- Small hot-pink taillight accent ----
        glowCircle(ctx, cx + 12, 150, 10, PALETTE.pink, 0.55);
        ctx.save();
        ctx.fillStyle = PALETTE.pink;
        ctx.shadowColor = PALETTE.pink;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(cx + 12, 150, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Panel highlight along the spine for readability at speed
        ctx.save();
        ctx.strokeStyle = hexToRgba('#ffffff', 0.08);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 70, 116);
        ctx.quadraticCurveTo(cx - 20, 108, cx + 10, 96);
        ctx.stroke();
        ctx.restore();

        return c;
    }

    window.neoTokyoSprites = {
        boost_pad: buildBoostPad(),
        barricade: buildBarricade(),
        parked_vehicle: buildParkedVehicle(),
        vendor_cart: buildVendorCart(),
        drone: buildDrone(),
        security_gate: buildSecurityGate(),
        debris: buildDebris(),
        player_bike: buildPlayerBike()
    };
})();
