# Theming and white-labeling

The CCX UI reads every colour it draws from a CSS custom property. To re-brand
the UI you publish a small stylesheet that restates the properties you want to
change, and point `FE_EXTERNAL_CSS_URL` at it. No application changes are
needed, and a complete brand theme is typically 30–50 lines of CSS.

```yaml
ccx:
  services:
    uiapp:
      env:
        FE_EXTERNAL_CSS_URL: "https://example.com/branding/acme.css"
        FE_REACT_APP_LOGO_URL: "https://example.com/branding/logo.svg"
        FE_REACT_APP_FAVICON_URL: "https://example.com/branding/favicon.png"
```

## How the stylesheet is loaded

The URL is loaded as an ordinary `<link rel="stylesheet">` and appended last in
the document head when the application starts. Two consequences are worth
knowing:

- **Your file needs no CORS headers.** It is linked, not fetched, so any static
  host (S3, a CDN, your own web server) works as-is.
- **You never need `!important`.** The application's own styles live in CSS
  cascade layers; your stylesheet does not. Unlayered author styles win over
  layered ones regardless of selector specificity, so a plain declaration in
  your file always takes effect.

If CCX is served over HTTPS, the stylesheet must also be served over HTTPS —
browsers block mixed content and the file will silently fail to load.

## The supported surface: theme tokens

These custom properties are the supported customisation surface. Everything in
the UI derives its colour from them.

| Token | Light default | Dark default | Controls |
|---|---|---|---|
| `--background` | `#ffffff` | `#171717` | Page background |
| `--foreground` | `#171717` | `#fafafa` | Default text colour |
| `--card` | `#ffffff` | `#262626` | Card and panel background |
| `--card-foreground` | `#171717` | `#fafafa` | Text on cards |
| `--popover` | `#ffffff` | `#262626` | Dropdown and popover background |
| `--popover-foreground` | `#171717` | `#fafafa` | Text in dropdowns and popovers |
| `--primary` | `#2b00ad` | `#7c3aed` | Primary buttons, links, active states |
| `--primary-foreground` | `#fafafa` | `#fafafa` | Text on primary surfaces |
| `--secondary` | `#f5f5f5` | `#3a3a3a` | Secondary buttons |
| `--secondary-foreground` | `#262626` | `#fafafa` | Text on secondary surfaces |
| `--muted` | `#f5f5f5` | `#3a3a3a` | Muted surfaces |
| `--muted-foreground` | `#636363` | `#a3a3a3` | Secondary and helper text |
| `--accent` | `#f5f5f5` | `#3a3a3a` | Hover and highlight surfaces |
| `--accent-foreground` | `#262626` | `#fafafa` | Text on hover/highlight surfaces |
| `--destructive` | `#e5484d` | `#e5484d` | Delete actions and error states |
| `--destructive-foreground` | `#fafafa` | `#fafafa` | Text on destructive surfaces |
| `--success` | `#2b9a3f` | inherits light | Success states |
| `--success-foreground` | `#fafafa` | inherits light | Text on success surfaces |
| `--warning` | `#e5a000` | inherits light | Warning states |
| `--warning-foreground` | `#262626` | inherits light | Text on warning surfaces |
| `--border` | `#e5e5e5` | `#404040` | Borders and dividers |
| `--input` | `#e5e5e5` | `#404040` | Form control borders |
| `--ring` | `#2b00ad` | `#7c3aed` | Keyboard focus ring |
| `--radius` | `0.5rem` | inherits light | Corner radius (not a colour) |
| `--sidebar-background` | `#1a0055` | `#1a0044` | Navigation sidebar background |
| `--sidebar-foreground` | `#f0f0f0` | `#f0f0f0` | Navigation sidebar text |
| `--sidebar-accent` | `#2b00ad` | `#3a0088` | Active navigation item |
| `--sidebar-accent-foreground` | `#fafafa` | `#fafafa` | Text on the active navigation item |
| `--sidebar-border` | `#2a0078` | `#2d0066` | Sidebar dividers |

Defaults are shown as hex for readability. The shipped theme declares them in
`oklch()` with a hex fallback; your overrides may use any CSS colour syntax.

`--success`, `--warning` and `--radius` are not redefined for dark mode — the
light value carries over. Override them in `:root` if you want them changed
everywhere, or in `:root.dark` as well if dark mode needs a different value.

## Light and dark mode

Users choose light, dark, or "follow system" from the user menu, so **both modes
will be seen**. CCX signals dark mode with a `dark` class on the `<html>`
element.

Put values that are the same in both modes in `:root`, and dark-mode overrides
in `:root.dark`. Note the selector: `:root.dark` outranks both the application's
own `.dark` block and your own `:root` block, so it reliably wins in both
directions. A bare `.dark` selector does not.

## Template

Copy this, replace the values, and delete the properties you do not need.
Anything you omit keeps its CCX default.

```css
/* ============================================================
   ACME white-label theme for CCX
   Loaded at runtime via FE_EXTERNAL_CSS_URL.
   ============================================================ */

/* --- Values shared by light and dark mode ----------------- */
:root {
  --primary:                   #fd822c;
  --primary-foreground:        #ffffff;
  --ring:                      #fd822c;

  --sidebar-background:        #31323d;
  --sidebar-foreground:        #f0f0f0;
  --sidebar-accent:            #fd822c;
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border:            #43444f;
}

/* --- Light mode only -------------------------------------- */
:root:not(.dark) {
  --accent:                    #fff1e6;
  --accent-foreground:         #31323d;
}

/* --- Dark mode only --------------------------------------- */
:root.dark {
  --primary:                   #fd9a52;
  --primary-foreground:        #1a1a1a;
  --ring:                      #fd9a52;

  --sidebar-background:        #25262e;
  --sidebar-border:            #3a3b45;

  --accent:                    #3a2c22;
  --accent-foreground:         #ffd9bd;
}
```

## What is not supported

The token list above is the contract. The following will break without notice
and are not covered by support:

- **Targeting class names.** Class names in the CCX UI are internal
  implementation detail. They change whenever a component is refactored, and
  they are not stable across releases.
- **Selectors that depend on the DOM structure** — element, descendant, or
  positional selectors such as `nav li:last-child`.
- **Layout properties.** Restrict your stylesheet to colours, and to `--radius`
  if needed. Setting `display`, `position`, `width`, `margin`, `padding`,
  `overflow` or similar will break the responsive layout, and the result is not
  supportable.
- **`!important`.** It is never necessary (see *How the stylesheet is loaded*),
  and it makes problems harder to diagnose.

## Migrating a stylesheet written for the previous CCX UI

Stylesheets written for the previous CCX UI do not apply to the current one.
They typically target Ant Design class names (`.ant-btn`, `.ant-spin`,
`.ant-breadcrumb`) or hashed CSS-module class names
(`[class*='AppHeader_']`, `[class*='UserMenu_']`). The current UI is built on a
different component library and emits none of those class names, so such a file
loads successfully but has no visible effect.

Converting one is usually straightforward: take the colours out of the old file
and restate them as the tokens above. A typical old stylesheet of 60–80 lines
becomes 30–40 lines of tokens, and it gains dark-mode support in the process.
If you have an existing stylesheet you would like converted, send it to
Severalnines support and we will produce the token version for you.

## Logo and favicon

The logo and favicon are set separately, and are not part of the stylesheet:

- `FE_REACT_APP_LOGO_URL` — shown at the top of the navigation sidebar and on
  the login, registration and password-reset pages. An SVG scales best.
- `FE_REACT_APP_FAVICON_URL` — the browser tab icon.

Both are described in [Frontend customization](Frontend.md).

## Operational notes

- **Cache-busting.** Browsers and CDNs cache the stylesheet. When you change it,
  publish under a new filename or add a version query string
  (`acme.css?v=3`) and update `FE_EXTERNAL_CSS_URL`, otherwise users may keep
  the previous version for some time.
- **Check contrast.** Each `*-foreground` token must remain readable against its
  matching background. Aim for a contrast ratio of at least 4.5:1 for text.
- **Test both modes** before rolling out, by switching light and dark from the
  user menu.
- **Availability.** If the URL is unreachable the UI still loads and renders
  with the default CCX theme, so an outage on your asset host degrades branding
  rather than breaking the application.
