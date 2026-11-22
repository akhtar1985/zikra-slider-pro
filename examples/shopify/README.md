# Zikra Slider Pro on Shopify

Two files turn any Online Store 2.0 theme (Dawn and newer) into a
merchant-editable slider section:

| File | Where it goes | Purpose |
| --- | --- | --- |
| [`zikra-slider-bootstrap.liquid`](zikra-slider-bootstrap.liquid) | `snippets/` | Loads the pinned CDN files once and initializes every slider, re-initializing in the theme editor |
| [`zikra-slider.liquid`](zikra-slider.liquid) | `sections/` | The slider section itself: slides as blocks, settings for layout, controls and autoplay |

Both are pinned to `zikra-slider-pro@1.3.3`. When you upgrade, change the
three URLs in the bootstrap snippet together.

Direct CDN links (open, copy, paste into the theme editor):

- Section: https://cdn.jsdelivr.net/npm/zikra-slider-pro@1.3.3/examples/shopify/zikra-slider.liquid
- Bootstrap snippet: https://cdn.jsdelivr.net/npm/zikra-slider-pro@1.3.3/examples/shopify/zikra-slider-bootstrap.liquid
- This guide: https://cdn.jsdelivr.net/npm/zikra-slider-pro@1.3.3/examples/shopify/README.md

## Install (theme editor)

1. **Online Store → Themes → your theme → ⋯ → Edit code.**
2. Open `layout/theme.liquid` and add this line right before `</head>`:

   ```liquid
   {% render 'zikra-slider-bootstrap' %}
   ```

3. Under **Snippets**, choose **Add a new snippet**, name it
   `zikra-slider-bootstrap`, and paste
   [`zikra-slider-bootstrap.liquid`](zikra-slider-bootstrap.liquid).
4. Under **Sections**, choose **Add a new section**, name it
   `zikra-slider`, and paste [`zikra-slider.liquid`](zikra-slider.liquid).
5. **Save.** Then go to **Online Store → Customize**, **Add section →
   Zikra Slider**, and add slides as blocks.

If you prefer the Shopify CLI: `shopify theme dev` gives you a live preview
of the same files without touching the published theme.

## How it behaves

- **Merchant settings** — slides per view, gap, loop, centering, image shape
  (natural / 16:9 / 1:1 / 3:4), speed, section padding, accent color, arrows,
  bullets, autoplay and delay.
- **Slides are blocks** — image, heading, text, button label and link. Blocks
  spread across all breakpoints; use the section's *Slides per view* setting
  instead of duplicating sections.
- **Theme editor** — sections initialize on `shopify:section:load` and are
  destroyed on `shopify:section:unload`, so changing settings never stacks
  engines or duplicates arrows.
- **Multiple sliders per page** — the bootstrap scans every
  `[data-zikra-slider]`, so you can add several sections.
- **No-JS / blocked CDN** — slides render as a scrollable, one-per-view
  fallback; the markup never collapses.
- **Accessibility stays on** — slide labels, live region, inert off-screen
  slides, keyboard and reduced-motion handling are engine defaults; the
  section adds nothing that opts out.

The section prints its engine options as a JSON `data-zikra-options`
attribute, so the markup stays declarative and no inline JavaScript is
stored per section.

## Customizing

Restyle through the theme: the `{% style %}` block in the section scopes
everything to `#shopify-section-<id>`, and the engine's CSS variables
(`--zs-accent`, `--zs-gap`, `--zs-radius`, …) work as usual. To change the
markup, edit the section file — the bootstrap only needs the
`data-zikra-slider` attribute and the optional `data-zikra-options` JSON.
