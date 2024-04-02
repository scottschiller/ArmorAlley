/**
 * To be used with `gulp-cli` - e.g., running `gulp` will use this file for the build process.
 * https://www.npmjs.com/package/gulp-cli
 * For more details, see src/README.md.
 *
 * ADDITIONAL REQUIREMENTS
 * `ffmpeg` with `libmp3lame` and `libvorbis` are required for encoding audio.
 *
 * Setup:
 *  `npm install`
 *
 * Default build, full game (audio + image sprite + assets, placed into `dist/`):
 *  `npx gulp`
 *
 * Faster build, once audio sprite has been generated:
 *  `npx gulp build`
 *
 * The audio "sprite" (single file with many sounds) can take some time to run.
 * Once this task has run, a `build` or default task will include the new sprite + config.
 *  `npx gulp audio`
 *
 * Audio and image "sprites" have configuration / definition JS files, which are built and stored in src/config.
 * These config modules are loaded by the game JS and rolled up into the bundle at build time.
 */

function aa(callback) {
  const logo = [
    '                           ▄██▀',
    '                          ▄█▀',
    '          ▄████▄▄▄▄▄▄▄▄▄ █▀▄▄▄▄▄▄▄▄▄▄▄',
    '                      ▄█████▄▄▄▄  ▀▀▀',
    '      ▄         ▄████████████████▄',
    '      ██       ▀████████████████████▄',
    '      ▀███    ▄██████████████████████',
    '       ████▄▄███████████████████████▀',
    '      ████████▀▀▀▀▀▀▀▀████▀█▀▀▀▀█▀',
    '       ██▀              ██▘▘ ██▘▘',
    ''
  ];
  const label = 'A R M O R  A L L E Y :: R E M A S T E R E D';
  // in living color.
  console.log('\x1b[0m', '');
  console.log('\x1b[32m', logo.join('\n'));
  console.log('\x1b[33m', label);
  // reset color
  console.log('\x1b[0m', '');
  callback();
}

// npmjs.com/package/[name] unless otherwise specified
const { src, dest, series, task } = require('gulp');
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
const { pipeline } = require('stream');
var spritesmith = require('gulp.spritesmith');

var imageResize = require('gulp-image-resize');

// for spritesheet JSON
var map = require('map-stream');

// post-build cleanup for JSON
var clean = require('gulp-clean');

// path replacement
replace = require('gulp-replace');

// audio
var audiosprite = require('gulp-audiosprite');
var ffmpeg = require('gulp-fluent-ffmpeg');

// floppy disk-specific build
var gzip = require('gulp-gzip');

// common paths / patterns
const srcRoot = 'src';
const distRoot = 'dist';
const imageRoot = 'assets/image';

const floppyRoot = `${distRoot}/floppy-version`;

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
const imagePath = 'image';

const distPaths = {
  config: 'src/config',
  css: dist(cssPath),
  html: dist(htmlPath),
  js: dist(jsPath),
  lib: dist(`${jsPath}/${libPath}`),
  spriteSheet: dist(imagePath)
};

const audioSpriteModule = 'audioSpriteConfig';
const imageSpriteModule = 'imageSpriteConfig';

const audioSpriteSheet = {
  js: `${audioSpriteModule}.js`
};

// "audio sprite" file name on disk
const asName = 'aa-spritesheet';

const spriteSheet = {
  glob: [`${imageRoot}/*.png`, `!${imageRoot}/unused/*.*`],
  png: `${asName}.png`,
  json: `${asName}.json`,
  js: `${imageSpriteModule}.js`,
  webp: `${asName}.webp`
};

const standaloneFiles = [
  'assets/audio/wav/ipanema-elevator.wav',
  'assets/audio/wav/danger_zone_midi_doom_style.wav'
];

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

const rollupOpts = {
  onwarn: function (message) {
    // silence / ignore "circular dependency" warnings. :X
    if (/circular dependency/i.test(message)) return;
    console.error(message);
  }
};

async function bundleJS() {
  const bundle = await rollup({ ...rollupOpts, input: mainJSFile });
  return bundle.write({ file: bundleFile });
}

async function bundleBootFile() {
  const bundle = await rollup({ ...rollupOpts, input: bootFile });
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

function headerJS() {
  return src([headerFile, bundleFile]).pipe(concat(bundleFile)).pipe(dest('.'));
}

function headerCSS() {
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
      /**
       * Remap production / bundled CSS asset references, accordingly.
       * Given this trivial string match, “What could possibly go wrong?” ;)
       */
      .pipe(replace('assets/', 'dist/'))
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

function minifyImages(callback) {
  // webP-specific version
  return import('gulp-imagemin').then((imageminModule) => {
    return import('imagemin-webp').then((webpModule) => {
      const imagemin = imageminModule.default;
      const imageminWebp = webpModule.default;
      pipeline(
        src(`${distPaths.spriteSheet}/${spriteSheet.png}`),
        imagemin(
          [
            // https://www.npmjs.com/package/imagemin-webp
            imageminWebp({ lossless: 9 })
          ],
          { silent: true }
        ),
        rename(spriteSheet.webp),
        dest(distPaths.spriteSheet),
        // battlefield sprite which compresses well
        src(
          `assets/image/battlefield/standalone/deviantart-Dirt-Explosion-774442026.png`
        ),
        // https://www.npmjs.com/package/gulp-image-resize
        imageResize({ percentage: 50, imageMagick: true }),
        imagemin(
          [
            // https://www.npmjs.com/package/imagemin-webp
            imageminWebp({ quality: 50 })
          ],
          { silent: true }
        ),
        rename('deviantart-Dirt-Explosion-774442026.webp'),
        dest('dist/image/battlefield/standalone'),
        callback
      );
    });
  });
}

function buildSpriteSheetConfig() {
  /**
   * Reduce spritesmith JSON to per-sprite data: [x,y,w,h]
   * and export to a config/ path for inclusion in the main JS bundle.
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

        const output = [
          `// Note: this file was generated by the build process. See README.md in src/ for details.\n`,
          // nit: swap double for single quotes, and DIY newlines + indentation.
          `const ${imageSpriteModule} = ${JSON.stringify(parsedJSON)};`
            .replace(/\"/g, "'")
            .replace(/'\//g, "\n  '/")
            .replace(/:/g, ': ')
            .replace(/};/g, '\n};'),
          '',
          `export { ${imageSpriteModule} };`
        ].join('\n');

        file.contents = Buffer.from(output);
        done(null, file);
      })
    )
    .pipe(dest(distPaths.config));
}

function buildAudioSpriteConfig() {
  /**
   * audiosprite howler JSON -> JS
   * Export to a config/ path for inclusion in the main JS bundle.
   */
  return src(`${dist('audio')}/${asName}.json`)
    .pipe(rename(audioSpriteSheet.js))
    .pipe(
      map((file, done) => {
        const json = JSON.parse(file.contents.toString());

        // modify to taste: drop urls + src, assign only base file name.
        delete json.urls;
        delete json.src;
        json.spriteFileName = asName;

        const output = [
          `// Note: this file was generated by the build process. See README.md in src/ for details.\n`,
          // nit: pretty print w/2 spaces, and swap double for single quotes.
          `const ${audioSpriteModule} = ${JSON.stringify(json, null, 2)};`.replace(
            /\"/g,
            "'"
          ),
          '',
          `export { ${audioSpriteModule} };`
        ].join('\n');

        file.contents = Buffer.from(output);
        done(null, file);
      })
    )
    .pipe(dest(distPaths.config));
}

function copyStaticResources() {
  // all the regular images, icons, manifest.json and so forth.
  // note: some assets may not always be included. ;)
  const bnb = { allowEmpty: true };

  return merge([
    src('assets/font/**/*').pipe(dest('dist/font')),
    // copy all image subdirectories, ignoring .png files inside image/ itself which are bundled into a spritesheet.
    // UI/ images are largely (but not entirely) redundant as anything < 2 KB is base64-encoded in CSS.
    src(['assets/image/**/*', '!assets/image/*.png']).pipe(dest('dist/image')),
    src('assets/manifest.json').pipe(dest('dist')),
    src('assets/audio/mp3/bnb/*.*', bnb).pipe(dest('dist/audio/mp3/bnb')),
    src('assets/audio/ogg/bnb/*.*', bnb).pipe(dest('dist/audio/ogg/bnb')),
    src('assets/video/aa_*.*').pipe(dest('dist/video')),
    src('assets/video/bnb/*.*', bnb).pipe(dest('dist/video/bnb'))
  ]);
}

const asConfigMP3 = {
  format: 'howler',
  export: 'mp3',
  output: asName,
  gap: 0.01,
  vbr: 9,
  channels: 2,
  // undocumented - consistent gap between samples
  ignorerounding: true,
  // less-noisy output
  log: 'notice'
};

const audioSpriteFiles = ['assets/audio/wav/*.wav'].concat(
  standaloneFiles.map((fn) => `!${fn}`)
);

function createAudioSpriteMP3() {
  return src(audioSpriteFiles)
    .pipe(audiosprite(asConfigMP3))
    .pipe(dest(dist('audio')));
}

function createAudioSpriteOGG() {
  return src(audioSpriteFiles)
    .pipe(
      audiosprite({
        ...asConfigMP3,
        export: 'ogg',
        // OGG doesn't do VBR, but can match MP3 quality at lower bitrate.
        bitrate: 64
      })
    )
    .pipe(dest(dist('audio')));
}

function hearThatFloppy(callback) {
  pipeline(
    // lo-fi OGG sprite for floppy version
    src(audioSpriteFiles),
    audiosprite({
      ...asConfigMP3,
      export: 'ogg',
      // OGG doesn't do VBR, but can match MP3 quality at lower bitrate.
      bitrate: 32,
      samplerate: 22050
    }),
    dest(`${floppyRoot}/${dist('audio')}`),
    callback
  );
}

function encodeStandaloneFiles() {
  return merge([encodeStandaloneMP3(), encodeStandaloneOgg()]);
}

function encodeStandaloneMP3() {
  return src(standaloneFiles)
    .pipe(
      ffmpeg('mp3', function (cmd) {
        return cmd
          .audioBitrate('128k')
          .audioChannels(2)
          .audioCodec('libmp3lame');
      })
    )
    .pipe(dest(dist('audio/mp3')));
}

function encodeStandaloneOgg() {
  return src(standaloneFiles)
    .pipe(
      ffmpeg('ogg', function (cmd) {
        return cmd
          .audioBitrate('128k')
          .audioChannels(2)
          .audioCodec('libvorbis');
      })
    )
    .pipe(dest(dist('audio/ogg')));
}

function cleanAudioDist() {
  // delete previously-built audio assets
  return src('dist/audio', { allowEmpty: true, read: false }).pipe(clean());
}

function cleanAudioTemp() {
  // delete temporary audio JS / JSON, post-build
  return src('dist/audio/*.json', { allowEmpty: true, read: false }).pipe(
    clean()
  );
}

function cleanDist() {
  // delete dist/ path, with a few exceptions.
  return src(['dist/*', '!dist/audio', '!dist/README.md'], {
    read: false
  }).pipe(clean());
}

function cleanup() {
  // delete temporary spritesheet files, and PNGs which have been webP-encoded.
  // TODO: refactor. :P
  return src(
    [
      `${distPaths.spriteSheet}/${asName}*.js*`,
      'dist/image/aa-spritesheet.png',
      'dist/image/battlefield/standalone/deviantart-Dirt-Explosion-774442026.png'
    ],
    { read: false }
  ).pipe(clean());
}

function minifyCode() {
  return merge(
    minifyBootBundle(),
    minifyJS(),
    minifyLibs(),
    minifyCSS(),
    minifyHTML()
  );
}

function copyFiles() {
  return merge(headerCSS(), headerJS(), copyStaticResources());
}

function cleanThatFloppy() {
  return src(floppyRoot, { allowEmpty: true, read: false }).pipe(clean());
}

function copyThatFloppy() {
  // copy select assets into a separate build path
  return merge([
    // gotta have a favicon.ico, of course...
    src('assets/image/app-icons/favicon.ico').pipe(dest(floppyRoot)),
    src('index.html').pipe(dest(floppyRoot)),
    // note: ignore all dot-files, e.g., .DS_Store and friends
    src([
      'dist/**/*',
      '!**/.*',
      '!**/*.json',
      '!**/*.md',
      '!dist/audio/**/*',
      '!dist/video/**/*',
      `!dist/image/unused/**/*`,
      `!dist/image/unused`
    ]).pipe(dest(`${floppyRoot}/dist`))
  ]);
}

function tidyThatFloppyCopy() {
  const floppyDist = `${floppyRoot}/dist`;
  const globs = [
    // drop all fonts
    `${floppyDist}/font/**/*.*`,

    // empty directories
    `${floppyDist}/font/CheddarGothicStencil`,
    `${floppyDist}/font/JetBrainsMono`,
    `${floppyDist}/font/war-wound`,

    // except woff2 for sysfont
    `!${floppyDist}/font/sysfont/*.woff2`,

    // drop non-gzip things
    `${floppyDist}/css/**/*.css`,
    `${floppyDist}/html/**/*.html`,

    // all JS (but not gzip versions)
    `${floppyDist}/js/*.js`,

    // and exclude aa-boot_bundle
    `!${floppyDist}/js/aa-boot_bundle.js`,

    // no network, for now
    `${floppyDist}/js/lib`,

    // pare down images
    `${floppyDist}/image/app-icons`,
    `${floppyDist}/image/app-images`,
    `${floppyDist}/image/bnb`,
    `${floppyDist}/image/snow`,

    // all except select UI
    `${floppyDist}/image/UI/**/*`,
    // drop snow for now, too.
    `!${floppyDist}/image/UI/armor-alley-wordmark-white.webp`,

    // nor audio or video
    `${floppyDist}/audio`,
    `${floppyDist}/video`
  ];

  return src(globs, { allowEmpty: true, read: false }).pipe(clean());
}

function gzipThatFloppy() {
  const gzipOptions = {
    level: 9
  };
  return merge([
    // index.html -> aa.html.gz (a new index.html "boot loader" will be created)
    src(`index.html`).pipe(gzip(gzipOptions)).pipe(dest(floppyRoot)),

    // CSS
    src(`${floppyRoot}/${distCSS('*')}`)
      .pipe(gzip(gzipOptions))
      .pipe(dest(`${floppyRoot}/${distPaths.css}`)),

    // HTML
    src(`${floppyRoot}/${distPaths.html}/*.html`)
      .pipe(gzip(gzipOptions))
      .pipe(dest(`${floppyRoot}/${distPaths.html}`)),

    // JS (excluding aa-boot_bundle)
    src([
      `${floppyRoot}/${distJS('*')}`,
      `!${floppyRoot}/${distJS('aa-boot_bundle')}`
    ])
      .pipe(gzip(gzipOptions))
      .pipe(dest(`${floppyRoot}/${distPaths.js}`))
  ]);
}

function bootThatFloppy() {
  // floppy boot -> index.html "boot loader"
  // this will fetch the actual game at index.html.gz
  return src('src/floppy/index-floppy.html')
    .pipe(rename('index.html'))
    .pipe(dest(floppyRoot));
}

function lastFloppyCleanup() {
  return src(`${floppyRoot}/${dist('audio/*.json')}`, {
    allowEmpty: true,
    read: false
  }).pipe(clean());
}

const buildTasks = [
  bundleBootFile,
  buildSpriteSheet,
  buildSpriteSheetConfig,
  bundleJS,
  minifyCode,
  minifyImages,
  copyFiles,
  cleanup
];

const audioTasks = [
  cleanAudioDist,
  createAudioSpriteMP3,
  createAudioSpriteOGG,
  buildAudioSpriteConfig,
  encodeStandaloneFiles,
  cleanAudioTemp
];

const floppyTasks = [
  // https://www.npmjs.com/package/gulp-gzip
  aa,
  cleanThatFloppy,
  copyThatFloppy,
  gzipThatFloppy,
  tidyThatFloppyCopy,
  hearThatFloppy,
  bootThatFloppy,
  lastFloppyCleanup
];

/**
 * `npx gulp build-floppy`
 * 💾 Special case: floppy disk-specific build.
 * This builds a version of the game intended for loading from 3.5" or 5.25" FDD media.
 * This references the stock build, so run `build` at least once before this task.
 * ---
 */
task('build-floppy', series(...floppyTasks));

/**
 * `npx gulp audio`
 * Builds the audio sprite + config JS module.
 * ---
 * Run default build task to roll these changes into the full bundle.
 * This applies only when source audio files have changed, or need re-encoding.
 */
task('audio', series(aa, ...audioTasks));

/**
 * `npx gulp build`
 * Builds the game, without generating or re-building the audio sprite portion.
 * ---
 * This is handy for regular development and build testing.
 * Once built, the audio sprite only needs rebuilding if the audio assets change.
 */
task('build', series(aa, cleanDist, ...buildTasks));

/**
 * `npx gulp`
 * Default task: full build of audio sprites, and game assets into dist/
 * ---
 * This task builds the audio and image sprites, then builds the game including dynamically-built sprite configurations.
 * For a faster build, use `npx gulp build` once the audio sprite has been generated at least once.
 * The audio task can be run separately, via `npx gulp audio`.
 * The floppy build is also separate, and not included here.
 */
exports.default = series(aa, cleanDist, ...audioTasks, ...buildTasks);
