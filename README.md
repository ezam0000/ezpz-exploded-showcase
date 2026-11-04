# EZPZ Exploded Showcase

An interactive product hero with original 3D assets, a controlled exploded view, native typography, finish changes, and geometry-derived soft shadows.

Free, MIT-licensed source and original Blender assets. The 21st.dev installer edition includes all three examples.

## Install from 21st.dev

```sh
npx @21st-dev/cli add @ezam0000/ezpz-exploded-showcase
```

The installer edition in `registry/` is a self-contained component with scoped styles and three example configurations. It imports React and Three.js only. The default demo lets you switch between all three products; the additional demos show the Switch and Emblem separately.

```tsx
import { ExplodedShowcase, showcaseProducts } from './components/ui/ezpz-exploded-showcase';

export default function Hero() {
  return <ExplodedShowcase product={showcaseProducts[0]} />;
}
```

Adjust the import path to your project's configured component directory. TypeScript projects should install `@types/three` as a development dependency. The example models and posters use public GitHub URLs pinned to the original asset commit. For self-hosting, copy `public/models` and `public/posters` into your app and replace the URLs in `showcaseProducts`. The modular `src/` edition below uses local URLs by default.

## Open locally

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Open the localhost address printed by Vite. Choose Headphones, Switch, or Emblem. Drag the object, choose Explore, adjust Separation, and select a part. Arrow keys rotate the focused scene; Home restores the camera. Reset view does the same with a pointer. The scene stays still when idle.

## Use in your app

Install React 19+ and Three.js 0.182.x, then copy:

- `src/components/ezpz-exploded-showcase.tsx`
- `src/components/ezpz-exploded-showcase.css`
- `src/components/contact-shadow.ts`
- `src/catalog.ts`
- `public/models/` and `public/posters/`

```tsx
import { ExplodedShowcase } from './components/ezpz-exploded-showcase';
import { products } from './catalog';

export default function ProductHero() {
  return <ExplodedShowcase key={products[0].id} product={products[0]} />;
}
```

For Next.js, use the component in a client boundary and install `@types/three` for TypeScript. Keep the CSS import, and ensure the model/poster URLs resolve from your application root. Use a unique React key when changing products. Keep the product configuration stable between renders.

## Customize

Edit `src/catalog.ts`. Every example uses the same component.

| Setting | Purpose |
| --- | --- |
| `title` | Real editable headline text, outside the 3D canvas |
| `background`, `ink`, `accent` | Background, typography, controls, selection tint |
| `finishes` | Named color choices for materials whose names start with `Finish` |
| `model`, `poster` | GLB model and fallback image URLs |
| `camera`, `target` | Initial camera direction and focal point |
| `size`, `assembledSize` | Exploded and assembled framing sizes |
| `explodeTarget` | Smooth change of focal point while opening |
| `ground` | Floor height in glTF/Three.js coordinates |
| `parts` | Named GLB groups, descriptions, and separation offsets |

`offset: [x, y, z]` uses **Three.js coordinates: Y is up**. A Blender Z translation becomes a Three.js Y translation. Offsets are relative to each group's original local position. The supplied GLBs have identity parent transforms, so the offsets behave like world-space translations.

```tsx
const myProduct = {
  ...products[0],
  id: 'my-headphones',
  title: ['Built for', 'closer listening.'] as [string, string],
  background: '#e6e2d9',
  finishes: [{ name: 'Satin', color: '#b6b9b8' }],
};
```

Additional props: `initialSeparation` (0–1), `reducedMotion` (force immediate state changes), `className`, `style`, `onPartChange`, `onReady`, and optional `controlsRef`. The imperative controls expose `separation(value)`, `finish(index)`, `rotate(radians)`, and `reset()`. These power the review recording; normal use needs no imperative API.

Use the CSS or `style={{fontFamily: 'Your licensed font'}}` to change native typography. The supplied website uses the viewer's installed Arial/Helvetica/sans-serif stack; no commercial font file is bundled.

## Replace the model

Use a GLB with separate, named groups for the pieces you want to move. A single flattened mesh cannot be taken apart automatically. Keep part groups under an unscaled root and ensure mesh transforms are applied. Match each group name to a `parts[].id`, then tune its offset and the camera framing. The loader reports missing part names in the browser console.

Name recolorable materials with a `Finish` prefix. Other materials retain their authored colors. For example, the headphone's copper coil and green electronics remain unchanged when switching the shell finish. For larger custom models, reduce polygon counts and texture sizes before exporting.

## Edit in Blender

`blender/headphones.blend`, `blender/switch.blend`, and `blender/emblem.blend` preserve the separate modeled objects. The GLBs merge meshes per part and material to reduce draw calls while preserving interactive part groups.

`blender/build_models.py` rebuilds all three original models:

```sh
blender --background --python blender/build_models.py
```

The script uses a locally installed Arial Bold on macOS when available, or Blender's built-in font otherwise. Set `EZPZ_FONT` to a font file you are licensed to use to reproduce your own lettering. Existing exported wordmarks are geometry. Fonts are not distributed in this package.

These are visual product concepts, not manufacturing CAD or electrical schematics.

## Behavior and fallbacks

- Pointer dragging and keyboard rotation; independent buttons for part inspection.
- Touch users can scroll vertically over the scene; horizontal drags rotate it.
- System reduced-motion preference is respected; `reducedMotion` also disables interpolation.
- One-shot rendering when idle, offscreen/hidden-tab suspension, and a capped device pixel ratio.
- Loading or WebGL/model failure displays a supplied poster. A failure exposes Try again; unavailable 3D controls are disabled.
- No autoplay, audio, account, tracking, or remote image services.
- Asset requests go only to the model/poster URLs you configure.
- Semantic content renders without WebGL. The included demo is client-rendered Vite; in an SSR host, native text/poster markup can render on the server and 3D initializes after hydration.

## Review exports

`previews/EZPZ-Exploded-Showcase.mp4` is a native browser-rendered motion preview with native Canvas 2D titles. It demonstrates opening, rotation, a finish change, and reassembly. Desktop/mobile screenshots show the actual interface.

For local export controls, append `?review` to the dev URL. Save view writes the active 3D canvas as PNG. Record preview writes an approximately 12-second WebM with native titles. These controls and the fixed-path export endpoint are local development conveniences; they are not part of the reusable component or production server.

## Validate

```sh
npm run build
npm run verify
```

The model check verifies valid self-contained GLBs and unique selectable group names. See `VALIDATION.md` for the completed browser checks. MIT terms cover our code and original model assets. React and Three.js retain their respective MIT licenses.

## Clean presentation revision

The default artwork contains only the main headline and functional controls. Promotional descriptions and visible finish captions have been removed. Finish swatches keep accessible names and tooltips. Part descriptions are announced to assistive technology on selection, without adding a visible paragraph. There are no decorative separators, arrows, section numbers, badges, credits, or added headers/footers. The separation track and keyboard focus indicators remain functional controls. Original model detail is retained: cushion seams, driver rings, vents, fasteners, PCB components, switch spring and contacts, and the three-layer wordmark.
