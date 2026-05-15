# ORB design system

ORB uses a dark ambient background, a glowing spherical core, cyan/violet/magenta/orange gradients, soft bloom, restrained glass depth and minimal chrome.

States are rendered by `frontend-next/components/orb-core/orb-sphere.tsx`: idle, listening, thinking, speaking, interrupted, reconnecting, offline, permission denied, private mode, safeguarding cautious, child present, emotional safety and reduced motion.

Animations are CSS-only and GPU-safe. Reduced motion removes looping animation and keeps the sphere as a static gradient with subtle opacity changes.

