# Design and provenance

Research on November 3, 2026 found Product Rail Gallery, Team Lanyard Rail, Sushi Conveyor Menu, Glassmorphism Folder Cards, Liquid Glass Navbar, and Liquid Glass Logo Reveal at the top of 21st.dev's daily listing.

Source: https://21st.dev/community/components/popular/today

The concept responds to the popularity of direct manipulation and convincing material behavior. Its own interaction is an exploded product assembly that reveals construction. No source code, product imagery, or meshes were copied from those components.

All three product models were authored procedurally in Blender. The application uses React, Three.js, Three.js OrbitControls/GLTFLoader/RoomEnvironment, and an original contact-shadow rendering pass. All lettering comes from real fonts: native HTML for the interface, converted native text for model wordmarks, and Canvas 2D for motion-preview titles. Generative AI image/video tools were not used.

The headphone has independently modeled cushions, diaphragm/coil assemblies, controller boards, sculpted shells, yokes, and a headband. The switch and emblem demonstrate different part counts and separation directions using the same component.

Polish decisions: soften the floor shadows, preserve the materials' contrast, recenter and reframe as parts separate, keep details in selectable content rather than floating annotations, and render only when something changes. Desktop and mobile compositions use the same assets and native text.

Files under `previews` are review exports. This package has not been posted to 21st.dev and requires the user's review before any publication.
