# Validation

Reviewed November 3, 2026, in the in-app Chromium browser on the user's Mac.

- TypeScript and Vite production build pass.
- The three GLBs have valid headers, embedded geometry, no remote texture dependencies, and unique selectable group names.
- Optimized GLB meshes: headphones 28, switch 7, emblem 3. Native Blender files retain separate editable objects.
- All three examples load and open their assemblies. Framing adjusts as parts separate.
- Headphone part buttons select the component and announce its description to assistive technology; finish changes retain the copper/electronics colors.
- Keyboard rotation and Home reset verified. The separation slider can reach zero while remaining visible in Explore mode.
- Desktop layout and 390 × 844 phone viewport reviewed. The phone layout fits the full assembly without horizontal page overflow and exposes touch-sized part controls.
- Forced reduced-motion test changed the assembly directly to separation 1.000, with frame count moving from 3 to 5.
- Idle rendering check: the frame count stayed at 1388 across separate observations after a recording completed.
- A deliberately unavailable GLB displayed the poster and an explicit error state; restoring a valid model restored the interactive scene. The failure did not hide native heading/content.
- Lifecycle disposal covers geometry, materials, model textures, environment/shadow render targets, controls, event listeners, observers, and animation frames.
- Native browser PNG exports reviewed; the MP4 motion preview was decoded and a representative exploded frame inspected.

The production JS is approximately 234 KB gzipped, including React and Three.js. Model download is approximately 2 MB for headphones, 349 KB for the switch, and 294 KB for the emblem. The current preview uses a capped pixel ratio and static rendering when idle. This was tested on the local browser, not on a physical low-end phone or every browser/GPU combination.

Vite's expected warning about retaining the source `use client` directive does not affect the browser build. No component publication or external deployment was performed.

Clean presentation revision: filler paragraphs and finish captions removed; native controls keep accessible names. Desktop, tablet and a fixed 390px mobile frame reviewed. TypeScript/Vite build passes. The native models and their detailed geometry are unchanged.
