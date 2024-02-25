/**
 * To be used with `gulp-cli` - e.g., running `gulp` will use this file for the build process.
 * https://www.npmjs.com/package/gulp-cli
 * For more details, see src/README.md.
 *
 * Setup:
 *  npm install
 *  gulp
 *
 * NOTE: fsevents@1.2.13 may be required to fix `"ReferenceError: primordials is not defined" in Node.js` error.
 * https://stackoverflow.com/questions/55921442/how-to-fix-referenceerror-primordials-is-not-defined-in-node-js/58394828#58394828
 * This "patch" works as of 05/2023, but introduces security warnings of its own.
 * This section applies to package.json.
 *
 * "overrides": {
 *  "graceful-fs": "^4.2.11"
 * }
 */

// npmjs.com/package/[name] unless otherwise specified
const { src, dest, series } = require('gulp');
const rename = require('gulp-rename');
const terser = require('gulp-terser');
const { rollup } = require('rollup');
const cleanCSS = require('gulp-clean-css');
const concat = require('gulp-concat');
const header = require('gulp-header');
const htmlmin = require('gulp-htmlmin');
const imageInliner = require('postcss-image-inliner');
const postcss = require('gulp-postcss');

const imageInlinerOpts = {
  assetPaths: ['assets/image'],
  maxFileSize: 2048
};

var fs = require('fs');

// common paths / patterns
const srcRoot = 'src';
const distRoot = 'dist';

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

const distPaths = {
  css: dist(cssPath),
  html: dist(htmlPath),
  js: dist(jsPath),
  lib: dist(`${jsPath}/${libPath}`)
};

const headerFile = 'src/aa_header.txt';

const css = (file) => root(`${cssPath}/${file}.css`);
const js = (file) => root(`${jsPath}/${file}.js`);
const html = (file) => root(`${htmlPath}/${file}.html`);

const distFile = (file) => `${distRoot}/${file}.js`;

// note: these have path + extensions added via js() / css().
const bootFile = js('aa-boot');
const bootBundleFile = distFile('js/aa-boot_bundle');

const mainJSFile = js('aa');
const bundleFile = distFile('js/aa');

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
  return src(bundleFile)
    .pipe(concat(bundleFile))
    .pipe(header(fs.readFileSync(headerFile, 'utf8')))
    .pipe(dest('.'));
}

function minifyHTML() {
  return src(html('*'))
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(dest(distPaths.html));
}

function minifyLibs() {
  return src(root(`${jsPath}/${libPath}/*`))
  .pipe(terser({
    // https://github.com/terser/terser#minify-options
    compress: true,
    ecma: '2016'
  })
  .pipe(dest(distPaths.lib)));
}

function minifyCSS() {
  return (
    src(css('*'))
      .pipe(postcss([imageInliner(imageInlinerOpts)]))
      // https://github.com/clean-css/clean-css#constructor-options
      .pipe(cleanCSS({ level: 2 }))
      .pipe(header(fs.readFileSync(headerFile, 'utf8')))
      .pipe(dest(distPaths.css))
  );
}

exports.default = series(
  bundleBootFile,
  minifyBootBundle,
  bundleJS,
  minifyJS,
  concatJS,
  minifyLibs,
  minifyCSS,
  minifyHTML
);
