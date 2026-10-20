# ProjectA

ProjectA is a camera store. This is its homepage and Cameras mega menu, built 1:1 from the Figma design and extended to tablet and phone.

**Figma file:** [Designer Skills Test Edit v2](https://www.figma.com/design/JuiXss5zgDMKGeqL5GE8kp/Designer-Skills-Test-Edit-v2?node-id=0-1&t=5H1m5mcf2N7EvIFU-1)

> **Disclaimer:** Images and content are AI-generated, but everything else is manually designed.

## What's included

- **Homepage**, matched to the Figma frame at 1728px: hero, categories, popular products, SEO section, trade-in band, featured products and footer.
- **Mega menu** for Cameras. It opens on hover with a mouse, and on click or Enter from the keyboard.
- **Sticky navigation.** Once the hero header scrolls away, it pins to the top as a white bar with dark links. Hover and open states use #C2471A, which passes contrast on white.
- **Desktop sizes** from 1025px to 2560px. The content stays at 1512px wide on large screens, and the mega menu drops its product cards as space runs out.
- **Tablet and phone** layouts below 1025px, with a slide-in menu built from the mega menu's parts. These aren't in the Figma file.
- **Fluid type.** Every font size scales between a 375px and a 1728px screen.
- **Motion.** The hero photo racks into focus, then slowly pushes in and follows the cursor on desktop. The headline types out. Sections reveal on scroll, and buttons, tabs and the bag give feedback when used.
- **Intro popup** for the design assessment team, shown once per browser session. The "Project notes" button in the corner reopens it.

## Motion and accessibility

The page respects the visitor's reduced-motion setting. If your device has animations turned off (on Windows: Settings → Accessibility → Visual effects → Animation effects), the page loads complete and static.

To see the motion anyway, add `?motion=on` to the URL, or use "Turn animations on" in the intro popup.

## Run it locally

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Leave the framework preset as **Other**, with no build command and the output directory left empty.
4. Deploy. Vercel serves `index.html` from the repository root.

## Files

| Path | What it is |
|---|---|
| `index.html` | Page markup, including the mega menu, mobile menu, intro popup and toast |
| `styles.css` | Design tokens (Figma variables), layout, responsive rules and motion |
| `main.js` | Hero intro and typing, scroll reveals, parallax, menus, tabs, carousel and button feedback |
| `assets/` | Images and icons exported from the Figma file. Photos are re-saved as JPEG at the same size. |
| `favicon.svg` | Placeholder site icon |

Fonts are Instrument Serif and Inter, loaded from Google Fonts.
