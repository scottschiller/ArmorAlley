/**
 * To be used with `gulp-cli` - e.g., running `gulp` will use this file for the build process.
 * https://www.npmjs.com/package/gulp-cli
 * For more details, see src/README.md.
 *
 * Setup:
 *  npm install
 *  npx gulp
 *
 */

// npmjs.com/package/[name] unless otherwise specified
const { src, dest, series } = require('gulp');
const rename = require('gulp-rename');
const terser = require('gulp-terser');
const { rollup } = require('rollup');
const cleanCSS = require('gulp-clean-css');
const concat = require('gulp-concat');
const htmlmin = require('gulp-htmlmin');
const imageInliner = require('postcss-image-inliner');
const postcss = require('gulp-postcss');

// spritesheet bits
// https://www.npmjs.com/package/gulp.spritesmith#spritesmithparams
var buffer = require('vinyl-buffer');
var merge = require('merge-stream');
var spritesmith = require('gulp.spritesmith');

// for spritesheet JSON
var map = require('map-stream');

// post-build cleanup for JSON
var clean = require('gulp-clean');

var fs = require('fs');

// common paths / patterns
const srcRoot = 'src';
const distRoot = 'dist';
const imageRoot = 'assets/image';

function root(path) {
  return `${srcRoot}/${path}`;
}

function dist(path) {
  return `${distRoot}/${path}`;
}

const cssPath = 'css';
const htmlPath = 'html';
const jsPath = 'js';
const libPath = 'lib';
const spriteSheetPath = 'spritesheet';

const distPaths = {
  css: dist(cssPath),
  html: dist(htmlPath),
  js: dist(jsPath),
  lib: dist(`${jsPath}/${libPath}`),
  spriteSheet: dist(spriteSheetPath)
};

const spriteSheet = {
  glob: `${imageRoot}/*.png`,
  png: 'spritesheet.png',
  json: 'spritesheet.json',
  js: 'spritesheet_config.js',
  webp: 'spritesheet.webp'
};

const headerFile = root('aa_header.txt');

const css = (file) => root(`${cssPath}/${file}.css`);
const js = (file) => root(`${jsPath}/${file}.js`);
const html = (file) => root(`${htmlPath}/${file}.html`);
const distCSS = (file) => `${distRoot}/css/${file}.css`;
const distJS = (file) => `${distRoot}/js/${file}.js`;

// note: these have path + extensions added.
const bootFile = js('aa-boot');
const bootBundleFile = distJS('aa-boot_bundle');

const mainJSFile = js('aa');
const bundleFile = distJS('aa');

const imageInlinerOpts = {
  assetPaths: [imageRoot],
  maxFileSize: 2048
};

async function bundleJS() {
  const bundle = await rollup({ input: mainJSFile });
  return bundle.write({ file: bundleFile });
}

async function bundleBootFile() {
  const bundle = await rollup({ input: bootFile });
  return bundle.write({ file: bootBundleFile });
}

function minifyBootBundle() {
  return src(bootBundleFile)
    .pipe(
      terser({
        // https://github.com/terser/terser#minify-options
        compress: true,
        ecma: '2016'
      })
    )
    .pipe(dest(distPaths.js));
}

function minifyJS() {
  return src(bundleFile)
    .pipe(
      terser({
        // https://github.com/terser/terser#minify-options
        compress: true,
        ecma: '2016'
      })
    )
    .pipe(dest(distPaths.js));
}

function concatJS() {
  return src([
    headerFile,
    // hackish: append the spritesheet config to the main AA JS bundle
    `${distPaths.spriteSheet}/${spriteSheet.js}`,
    bundleFile
  ])
    .pipe(concat(bundleFile))
    .pipe(dest('.'));
}

function prependCSS() {
  const aaCSS = distCSS('aa');
  return src([headerFile, aaCSS]).pipe(concat(aaCSS)).pipe(dest('.'));
}

function minifyLibs() {
  // only lazy-loaded libraries need to be in dist/
  // PeerJS is fetched on-the-fly, but SM2 and snowstorm are bundled.
  return src(root(`${jsPath}/${libPath}/peerjs*.js`))
    .pipe(terser())
    .pipe(dest(distPaths.lib));
}

function minifyCSS() {
  return (
    src(css('*'))
      .pipe(postcss([imageInliner(imageInlinerOpts)]))
      // https://github.com/clean-css/clean-css#constructor-options
      .pipe(cleanCSS({ level: 2 }))
      .pipe(dest(distPaths.css))
  );
}

function minifyHTML() {
  return src(html('*'))
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(dest(distPaths.html));
}

function buildSpriteSheet() {
  // Battlefield sprites
  var spriteData = src(spriteSheet.glob).pipe(
    spritesmith({
      imgName: spriteSheet.png,
      cssName: spriteSheet.json,
      padding: 2
      // https://github.com/twolfson/gulp.spritesmith?tab=readme-ov-file#algorithms
      // algorithm: 'left-right'
    })
  );

  var imgStream = spriteData.img.pipe(dest(distPaths.spriteSheet));
  var cssStream = spriteData.css.pipe(dest(distPaths.spriteSheet));

  // Return a merged stream to handle both `end` events
  return merge(imgStream, cssStream);
}

function minifySpriteSheet(callback) {
  // webP-specific version
  return import('gulp-imagemin').then((imageminModule) => {
    return import('imagemin-webp').then((webpModule) => {
      const imagemin = imageminModule.default;
      const imageminWebp = webpModule.default;
      const { pipeline } = require('stream');

      pipeline(
        src(`${distPaths.spriteSheet}/${spriteSheet.png}`),
        imagemin([
          // https://www.npmjs.com/package/imagemin-webp
          imageminWebp({ lossless: 9 })
        ]),
        rename(spriteSheet.webp),
        dest(distPaths.spriteSheet),
        callback
      );
    });
  });
}

function minifyImages(callback) {
  // PNG-specific version
  // https://stackoverflow.com/questions/75165366/how-can-i-prevent-a-gulp-task-with-a-dynamic-import-from-being-asynchronous
  const { pipeline } = require('stream');
  return import('gulp-imagemin')
    .then((module) => {
      const imagemin = module.default;
      // 03/2024: leaving default optipng settings - minimal gains with higher optimizationLevel.
      // const { optipng } = module;
      pipeline(
        src(`${distPaths.spriteSheet}/${spriteSheet.png}`),
        imagemin(),
        /*
          imagemin([
            // https://github.com/imagemin/imagemin-optipng
            optipng({optimizationLevel: 7}),
          ]),
        */
        dest(distPaths.spriteSheet),
        callback
      );
    })
    .catch(callback);
}

function buildSpriteSheetConfig() {
  /**
   * Reduce spritesmith JSON to per-sprite data: [x,y,w,h]
   * Export to a temporary file, and concat with JS bundle.
   * TODO: This could be tidier.
   */
  return src(`${distPaths.spriteSheet}/${spriteSheet.json}`)
    .pipe(rename(spriteSheet.js))
    .pipe(
      map((file, done) => {
        var json = JSON.parse(file.contents.toString());

        const parsedJSON = {};

        Object.keys(json).forEach((key) => {
          let src = json[key]['source_image'];

          // e.g., `assets/image/whatever.png` -> `image/whatever.png`
          src = src.substring(src.indexOf(imageRoot) + imageRoot.length);

          const data = json[key];

          parsedJSON[src] = [data.x, data.y, data.width, data.height];
        });

        // object to expose to AA JS bundle
        const name = 'aaSpriteSheetConfig';

        const output = [
          `window.${name} = `,
          `${JSON.stringify(parsedJSON)};`
        ].join('\n');

        file.contents = Buffer.from(output);
        done(null, file);
      })
    )
    .pipe(dest(distPaths.spriteSheet));
}

function cleanup() {
  // delete temporary spritesheet JS + JSON
  return src(`${distPaths.spriteSheet}/spritesheet*.js*`, { read: false }).pipe(
    clean()
  );
}

exports.default = series(
  bundleBootFile,
  minifyBootBundle,
  buildSpriteSheet,
  buildSpriteSheetConfig,
  bundleJS,
  minifyJS,
  concatJS,
  minifyLibs,
  minifyCSS,
  prependCSS,
  minifyHTML,
  minifyImages,
  minifySpriteSheet,
  cleanup
);
