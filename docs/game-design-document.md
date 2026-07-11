# NeoTokyo Swoop — Game Design Document

## Overview

**Title:** NeoTokyo Swoop  
**Genre:** Time trial lane-racer (swoop bike)  
**Platform:** Web browser (desktop)  
**Target Audience:** NeoTokyo web3 community  
**Inspiration:** Knights of the Old Republic swoop racing minigame  
**Setting:** Night street circuit *inside* NeoTokyo (community aesthetic, not generic cyberpunk)

---

## Concept

You pilot a swoop bike down a neon street in NeoTokyo. The bike drives itself forward. You only shift lanes. Hit boost pads to climb speed, dodge street hazards that shred your hull, and cross the finish as fast as you can.

---

## Core Loop (KOTOR-style)

| Action | Effect |
|---|---|
| Auto-throttle | Bike always moves forward |
| Lane shift (←→ / A D) | Move between 3 lanes |
| Boost pad | +speed (stacks toward max); soft decay without pads |
| Obstacle hit | −speed, +1 hull damage, brief invuln |
| 3 hull hits | Crash — run over |
| Finish line | Time recorded, rank grade |

### Win / Lose
- **Win:** Reach the end of the street circuit
- **Lose:** Hull integrity depleted (3 strikes)
- **Optimal play:** Max boosts, zero hits, lowest time

---

## Track — Street Circuit

- Perspective: third-person chase cam down the road
- Setting: wet asphalt, neon facades, NeoTokyo billboards/posters, overhead banners, street lights
- Length: ~14k distance units (~35–70s depending on boost mastery)
- Opening stretch is boost-heavy so the loop is readable on first try

### Obstacles
- Static: barricades, parked hovercars, vendor carts, debris, laser gates
- Shifting: patrol drones and security barriers that move between lanes

### Boost pads
- Flat glowing accel strips on the road (cyan/teal NeoTokyo palette)
- Primary skill expression: path that chains pads while avoiding hull damage

---

## UI

**Race HUD:** speed, timer, hull (3 pips), track progress, boost count  
**Menu:** title, bike preview, start + countdown  
**Results:** final time / crash, rank, boosts, strikes, retry / menu  

---

## Tech Stack

- **Phaser 3** — scenes, input, HUD, race logic  
- **Three.js** — 3D street, bike GLB, streaming city, pads/obstacles  
- **Static assets** — community billboards, procedural obstacle sprites, swoop model  
- **server.py** — local static + debug log endpoint  

---

## Scope

| Feature | Status |
|---|---|
| Single street circuit | Yes |
| Lane-shift swoop control | Yes |
| Boost pads + speed decay | Yes |
| Static + shifting obstacles | Yes |
| Hull damage / crash | Yes |
| Timer + ranks + retry | Yes |
| Audio (boost / cheer / boo) | Yes |
| Multiple tracks | Future |
| Leaderboard | Future |
| Mobile | Future |
| Bike upgrades | Future |
