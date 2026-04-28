const path = require("path");
const fs = require("fs");

/** Vendored shell UI + shared providers under comDash/src/shared-ui (webpack aliases below). */
const sharedUiSrc = path.join(__dirname, "src", "shared-ui");

/** Pin MUI packages to comDash/node_modules (guards against nested installs in shared-ui or crmQ). */
function aliasMuiPackages(config) {
  const nm = path.join(__dirname, "node_modules");
  const pairs = [
    ["@mui/material", path.join(nm, "@mui", "material")],
    ["@mui/system", path.join(nm, "@mui", "system")],
    ["@mui/lab", path.join(nm, "@mui", "lab")],
    ["@mui/utils", path.join(nm, "@mui", "utils")],
    ["@mui/x-data-grid", path.join(nm, "@mui", "x-data-grid")],
    ["@mui/x-date-pickers", path.join(nm, "@mui", "x-date-pickers")],
    ["@emotion/react", path.join(nm, "@emotion", "react")],
    ["@emotion/styled", path.join(nm, "@emotion", "styled")],
  ];
  for (const [name, dir] of pairs) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      config.resolve.alias[name] = dir;
    }
  }
}

/** Bridge overrides for vendored layout components (Iconify/SimpleBar shims). */
function aliasSharedUiBridgeComponents(config) {
  const bridge = path.join(__dirname, "src", "shared-ui-bridge");
  const icon = (...parts) => path.join(bridge, "icons", ...parts);
  Object.assign(config.resolve.alias, {
    "components/base/IconifyIcon": path.join(bridge, "IconifyIcon.jsx"),
    "components/base/SimpleBar": path.join(bridge, "SimpleBar.jsx"),
    "components/icons/CheckBoxBlankIcon": icon("CheckBoxBlankIcon.jsx"),
    "components/icons/CheckBoxCheckedIcon": icon("CheckBoxCheckedIcon.jsx"),
    "components/icons/CheckBoxIndeterminateIcon": icon("CheckBoxIndeterminateIcon.jsx"),
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  productionBrowserSourceMaps: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/m/erp",
        destination: "/m/crmq/iframe/app",
        permanent: false,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["@iconify/react"],
  },
  /** Monorepo sibling (avoids Windows npm symlink EPERM on file:../crmQ). Docker copies ../crmQ beside comDash. */
  webpack: (config) => {
    /** Ensure sibling packages (crmQ, etc.) resolve their bare imports from comDash/node_modules. */
    const comDashNodeModules = path.join(__dirname, "node_modules");
    if (!config.resolve.modules) {
      config.resolve.modules = ["node_modules"];
    }
    if (!config.resolve.modules.includes(comDashNodeModules)) {
      config.resolve.modules.unshift(comDashNodeModules);
    }

    config.resolve.alias["@cityq/crmq"] = path.resolve(
      __dirname,
      "../crmQ/src",
    );

    config.resolve.alias["@crm-api"] = path.resolve(__dirname, "../crmQ/pages/api");
    /** Resolve shared-ui bare imports (providers/, theme/, …) from src/shared-ui — same webpack context, same node_modules. */
    const sharedUiComponentsRoot = path.join(sharedUiSrc, "components");
    /**
     * Do not alias `components` as a single folder: webpack matches that prefix before
     * more specific keys like `components/base/IconifyIcon`, so shared-ui bridge overrides never applied.
     */
    const sharedUiComponentSubdirs = [
      "base",
      "common",
      "docs",
      "icons",
      "loading",
      "pagination",
      "pickers",
      "scroll-spy",
      "sections",
      "settings-panel",
      "snackbar",
      "styled",
    ];
    const themeRoot = path.join(sharedUiSrc, "theme");
    const themeStylesDir = path.join(themeRoot, "styles");
    /**
     * Do not alias `theme` as a single folder: it wins over `theme/styles/reactDatepicker`
     * and `theme/styles/swiper`, so CssBaseline always loads the real files (and optional
     * react-datepicker / swiper CSS deps). Split like `components` + per-style modules.
     */
    const themeAliases = {
      "theme/colors": path.join(themeRoot, "colors"),
      "theme/components": path.join(themeRoot, "components"),
      "theme/palettes": path.join(themeRoot, "palettes"),
      "theme/mixins": path.join(themeRoot, "mixins.js"),
      "theme/primaryColorOverride": path.join(themeRoot, "primaryColorOverride.js"),
      "theme/RTLMode": path.join(themeRoot, "RTLMode.jsx"),
      "theme/shadows": path.join(themeRoot, "shadows.js"),
      "theme/theme": path.join(themeRoot, "theme.js"),
      "theme/typography": path.join(themeRoot, "typography.js"),
      "theme/sxConfig": path.join(themeRoot, "sxConfig.js"),
    };
    if (fs.existsSync(themeStylesDir)) {
      for (const f of fs.readdirSync(themeStylesDir)) {
        if (!/\.(js|jsx)$/i.test(f)) continue;
        const base = f.replace(/\.(js|jsx)$/i, "");
        if (base === "swiper") continue;
        themeAliases[`theme/styles/${base}`] = path.join(themeStylesDir, f);
      }
    }

    const sharedUiAliases = {
      /** Theme bundle mock data (`data/*` imports in src/shared-ui). */
      "@secrets": path.join(__dirname, "src", "secrets.js"),
      "@crm-api": path.resolve(__dirname, "../crmQ/pages/api"),
      data: path.join(sharedUiSrc, "data"),
      providers: path.join(sharedUiSrc, "providers"),
      layouts: path.join(sharedUiSrc, "layouts"),
      lib: path.join(sharedUiSrc, "lib"),
      hooks: path.join(sharedUiSrc, "hooks"),
      reducers: path.join(sharedUiSrc, "reducers"),
      locales: path.join(sharedUiSrc, "locales"),
      routes: path.join(sharedUiSrc, "routes"),
      helpers: path.join(sharedUiSrc, "helpers"),
      docs: path.join(sharedUiSrc, "docs"),
      config: path.join(sharedUiSrc, "config.js"),
    };
    for (const sub of sharedUiComponentSubdirs) {
      sharedUiAliases[`components/${sub}`] = path.join(sharedUiComponentsRoot, sub);
    }
    Object.assign(config.resolve.alias, sharedUiAliases, themeAliases);

    /**
     * crmQ copies of the CRM dashboard must win over the generic `components/sections` → shared-ui
     * mapping (and `data` → shared-ui) so pasted template-style bare imports resolve into crmQ.
     */
    const crmqSrc = path.resolve(__dirname, "../crmQ/src");
    Object.assign(config.resolve.alias, {
      "components/sections/dashboards/crm": path.join(
        crmqSrc,
        "components/sections/dashboards/crm",
      ),
      "data/crm/dashboard": path.join(crmqSrc, "data/crm/dashboard.js"),
      /** crmQ email module uses bare imports that live outside crmQ/src. */
      "data/email": path.resolve(__dirname, "../crmQ/data/email"),
      "components/email": path.resolve(__dirname, "../crmQ/components/email"),
      /** crmQ sometimes imports from `src/...` (treat as crmQ/src in this monorepo build). */
      "src/layouts/email-layout": path.join(crmqSrc, "layouts/email-layout"),
      "src/layouts/email-layout/EmailSidebar": path.join(
        crmqSrc,
        "layouts/email-layout/EmailSidebar.jsx",
      ),
    });

    /** hrQ — HR module sibling package */
    config.resolve.alias["@cityq/hrq"] = path.resolve(__dirname, "../hrQ/src/index.js");
    const hrqSrc = path.resolve(__dirname, "../hrQ/src");
    Object.assign(config.resolve.alias, {
      "components/sections/dashboards/hrm": path.join(
        hrqSrc,
        "components/sections/dashboards/hrm",
      ),
      "data/hrm/dashboard": path.join(hrqSrc, "data/hrm/dashboard.js"),
    });

    /** purQ — Purchasing module sibling package */
    config.resolve.alias["@cityq/purq"] = path.resolve(__dirname, "../purQ/src/index.js");

    aliasMuiPackages(config);
    aliasSharedUiBridgeComponents(config);

    const emptyThemeStyle = path.resolve(
      __dirname,
      "src/shared-ui-shim/emptyThemeStyle.js",
    );
    /** Swiper theme hook — optional package not bundled in comDash. */
    config.resolve.alias["theme/styles/swiper"] = emptyThemeStyle;
    /** react-datepicker is a dependency; real `theme/styles/reactDatepicker` is used (imports package CSS). */

    return config;
  },
};

module.exports = nextConfig;
