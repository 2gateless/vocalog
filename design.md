---
version: alpha
name: Voltagent-Inspired-design-analysis
description: An inspired interpretation of Voltagent's design language — a developer-focused AI agent engineering platform whose surface is an unrelenting near-black canvas broken only by a single electric-green brand accent, code-editor mockups inside the hero, and a precise grid of dark feature cards that read like a documentation site dressed as marketing.

colors:
  primary: "#00d992"
  primary-soft: "#2fd6a1"
  primary-deep: "#10b981"
  on-primary: "#101010"
  ink: "#f2f2f2"
  ink-strong: "#ffffff"
  body: "#bdbdbd"
  mute: "#8b949e"
  hairline: "#3d3a39"
  hairline-soft: "#b8b3b0"
  canvas: "#101010"
  canvas-soft: "#1a1a1a"
  canvas-text-soft: "#f5f6f7"

typography:
  display-xl:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif
    fontSize: 60px
    fontWeight: 400
    lineHeight: 60px
    letterSpacing: -0.65px
  display-lg:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif
    fontSize: 36px
    fontWeight: 400
    lineHeight: 40px
    letterSpacing: -0.9px
  display-md:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif
    fontSize: 24px
    fontWeight: 700
    lineHeight: 32px
    letterSpacing: -0.6px
  display-sm:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
  eyebrow-mono:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 2.52px
  eyebrow-uppercase:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: 0.45px
  body-lg:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
  body-md:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 26px
  body-md-strong:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
  body-sm:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  body-sm-strong:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 23px
  caption:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  caption-strong:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
  code:
    fontFamily: SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
  code-strong:
    fontFamily: SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 13px
    fontWeight: 550
    lineHeight: 16px
  button-md:
    fontFamily: Inter, system-ui, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px
  4xl: 40px
  5xl: 48px
  6xl: 64px

components:
  nav-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    padding: "{spacing.md} {spacing.3xl}"
  nav-link:
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md} {spacing.lg}"
  button-outline-on-dark:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md} {spacing.lg}"
  button-ghost-green:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary-soft}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md} {spacing.lg}"
  button-pill-tag:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xs} {spacing.md}"
  text-input:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md} {spacing.lg}"
  card-feature:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.2xl}"
  card-feature-emphasized:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  code-mockup:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  code-inline-chip:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.canvas-text-soft}"
    typography: "{typography.code}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxs} {spacing.sm}"
  hero-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    padding: "{spacing.5xl} {spacing.3xl}"
  content-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    padding: "{spacing.5xl} {spacing.3xl}"
  green-divider-band:
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.primary}"
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
    padding: "{spacing.4xl} {spacing.3xl}"

  # ─── Examples (illustrative) — auto-derived; resolve any TO_FILL markers below ───
  ex-pricing-tier:
    description: "Default Pricing tier card. Re-uses feature-card chrome with brand canvas-soft surface."
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.md}"
    padding: "{spacing.2xl}"
  ex-pricing-tier-featured:
    description: "Featured/highlighted tier — polarity-flipped surface (dark fill + light text in light mode, light fill + dark text in dark mode)."
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.2xl}"
  ex-product-selector:
    description: "What's Included summary card — re-purposed for SaaS / B2B verticals (NOT a literal product gallery)."
    backgroundColor: "{colors.canvas-soft}"
    rounded: "{rounded.md}"
    padding: "{spacing.2xl}"
  ex-cart-drawer:
    description: "Subscription summary — re-purposed for SaaS / B2B (line items per add-on, not literal cart)."
    backgroundColor: "{colors.canvas}"
    rounded:
