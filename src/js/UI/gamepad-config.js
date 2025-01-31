/**
 * 🎮 Gamepad helper bits: configuration and mapping
 */

// control and button mappings
const gpConfig = {};

// button-to-label mapping
const gpMap = {};

// tl;dr, some UA sniffing is sometimes required. Here be dragons.
let overrides = {
  firefox: !!navigator.userAgent.match(/firefox/i)
};

function parseConfig(config) {
  // given a gamepad configuration, apply any applicable overrides
  // and return a parsed object.

  // pass-thru if no overrides defined
  if (!config.overrides) return config;

  // local copy
  let parsedConfig = {
    ...config
  };

  // drop overrides from the copy
  delete parsedConfig.overrides;

  // check for browser-specific overrides to apply
  Object.keys(overrides).forEach((browser) => {
    // e.g., we're using firefox and an override exists for it
    if (overrides[browser] && config.overrides[browser]) {
      parsedConfig = Object.assign(parsedConfig, config.overrides[browser]);
    }
  });

  return parsedConfig;
}

function mapGamePad(config, key) {
  // gamepad config is label-to-button for legibility, e.g., 'start': 'btn13'
  // ...this creates the inverse.
  const map = {};

  Object.keys(config.buttons).forEach((k) => {
    map[config.buttons[k]] = k;
  });

  gpMap[key] = map;
}

function configGamePad(config) {
  // firstly, apply any browser-specific config overrides
  let cfg = parseConfig(config);

  let key;

  if (cfg.vendor && cfg.product) {
    key = `${cfg.vendor}/${cfg.product}`;
  } else {
    // as noted, Safari may not provide vendor + product.
    // try for label / ID, in that case.
    key = cfg.label;
  }

  gpConfig[key] = cfg;

  // apply mapping e.g., 'start': 'btn13' etc.
  mapGamePad(cfg, key);
}

export { gpConfig, gpMap, configGamePad };
