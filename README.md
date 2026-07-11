# NeoTokyo Swoop

KOTOR-style swoop bike racing through the neon streets of **NeoTokyo**.

Hit boost pads. Dodge street hazards. Three hull hits and you crash. Fastest time wins.

## Play

### Online (GitHub Pages)

**Play here (no install):**  
https://bkrumms.github.io/neotokyo-game-podracer/

Share that link — friends open it in a browser and race. No server setup.

### Locally

```bash
python server.py
```

Then open [http://localhost:8080](http://localhost:8080).

You can also serve the folder with any static file server (or open via a simple HTTP server). The optional `/log` endpoint in `server.py` is only for local debugging.

## Controls

| Input | Action |
|---|---|
| ← → or A D | Shift lanes |
| Tap left / right half of screen | Shift lanes (mobile / touch) |
| — | Bike auto-throttles forward |

## Stack

- Phaser 3 — HUD, input, race logic  
- Three.js — 3D street, swoop model, city  
- Vanilla JS — no build step  
