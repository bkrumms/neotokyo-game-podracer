# Neotokyo Swoop

KOTOR-style swoop bike racing through the neon streets of **Neotokyo**.

Hit boost pads. Dodge street hazards. Three hull hits and you crash. Fastest time wins.

## Play

### Online (GitHub Pages)

If Pages is enabled on this repo, open:

`https://<your-username>.github.io/neotokyo-game-podracer/`

No install required — just the link.

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
| — | Bike auto-throttles forward |

## Stack

- Phaser 3 — HUD, input, race logic  
- Three.js — 3D street, swoop model, city  
- Vanilla JS — no build step  
