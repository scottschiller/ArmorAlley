/**
 * ARMOR ALLEY: GULP BUILD/COMPILE SCRIPT
 * --------------------------------------
 *
 * DISTRIBUTABLE BUILD VS. SOURCE / DEVELOPMENT VERSIONS
 * The game is designed to load via HTTP without the build step,
 * but the distributable version will load faster online.
 *
 * This is the process I use to compile the game for the official
 * play.armor-alley.net site.
 *
 * The build step "compiles" optimized assets into `dist/`.
 * Regardless of build version, the game loads from the root directory
 * where /index.html is found.
 *
 * By default, the game will load the "source" / development files.
 * This is OK, but uncompressed sound and image assets will be used.
 *
 * With the built `dist`/ version, assets are concatenated, minified,
 * and compressed. Image and audio "sprites" are used, instead of
 * many separate .png and .wav files that will take more bandwidth.
 *
 * (You may need to `npm i http-server` or similar HTTP daemon.)
 * `npx http-server`
 *
 * Browse to http://localhost:8080/?prod=1 to test the production build.
 * You will need to run `npx gulp` to compile the `dist/` build.
 * By default, the game will load the dev/source version.
 *
 * GENERAL USAGE
 * Use via `npx gulp`, or install `gulp-cli` and run `gulp`.
 *
 * Initial setup:
 *  `npm install`
 *
 * https://www.npmjs.com/package/gulp-cli
 * For more details, see src/README.md.
 *
 * ADDITIONAL REQUIREMENTS
 * `ffmpeg` with `libmp3lame` and `libopus` are required for encoding audio.
 * `imagemagick` is required for generating the image spritesheet.
 *
 * Default task, "compiled" game in `dist/` path:
 *  `gulp` (with `gulp-cli`), or `npx gulp`
 *
 * Faster build, excluding audio sprites (handy for code changes):
 *  `gulp build`
 *
 * AUDIO ENCODING
 * MP3 + Opus "audio sprite" files take some time to encode.
 * This is included in the default task, but not "build."
 * Once this task has run, `build` will include the new sprite + config.
 * This can be run if you only want to update the audio sprites.
 *
 * "BNB" AUDIO ENCODING
 * This applies only if you are doing a full build of the game into dist/.
 * If you have the extra theme .wav files in `assets/audio/wav/bnb`
 * and want to encode MP3 + Opus versions, run `gulp build-bnb`.
 *
 * Audio and image sprites have some related configuration / mapping,
 * generated in `src/config` and rolled up in the build process.
 */

function aa(callback) {
  /**
   * Shenanigans: AA "logo" in living (ANSI) color.
   * Parse out and style the logo for display in terminals.
   */
  let start = headerFileContents.indexOf('╭');
  let end = headerFileContents.indexOf('╯');
  let header = headerFileContents.substring(start, end + 1);

  // white, green
  let w = '\x1b[0m';
  let g = '\x1b[32m';

  // the last wheel on the chopper.
  let chopperWheel = '██▘▘';
  let chopperEnd = header.lastIndexOf(chopperWheel) + chopperWheel.length;

  let top = header.substring(0, chopperEnd);
  let bottom = header.substring(chopperEnd);

  // top border, run until end of line
  top = top.replace('╭', `${w}╭`);

  // middle
  top = top.replace(/│/g, `${w}│${g}`);

  // rest of logo is in white.
  top += w;

  let logo = top + bottom;

  console.log('\x1b[32m', logo);

  // reset color
  console.log('\x1b[0m', '');

  callback();
}

const fs = require('fs');

const headerFileName = 'aa_header.txt';
const headerFileContents = fs.readFileSync(`src/${headerFileName}`, 'utf8');

// npmjs.com/package/[name] unless otherwise specified
const { src, dest, series, task } = require('gulp');
const rename = require('gulp-rename');
const terser = require('gulp-terser');
const { rollup } = require('rollup');
const lightningcss = require('gulp-lightningcss');
const concat = require('gulp-concat');
const htmlmin = require('gulp-htmlmin');
const minifyInline = require('gulp-minify-inline');
const imageInliner = require('postcss-image-inliner');
const postcss = require('gulp-postcss');
const cliProgress = require('cli-progress');

// spritesheet bits
// https://www.npmjs.com/package/gulp.spritesmith#spritesmithparams
var merge = require('merge-stream');
const { pipeline } = require('stream');
var spritesmith = require('gulp.spritesmith');

var imageResize = require('gulp-image-resize');

// for spritesheet JSON
var map = require('map-stream');

const { deleteSync } = require('del');

async function clean(paths) {
  deleteSync(paths);
}

// path replacement
replace = require('gulp-replace');

// audio
var audiosprite = require('gulp-audiosprite');
var ffmpeg = require('gulp-fluent-ffmpeg');

// floppy disk-specific build
var gzip = require('gulp-gzip');

// common paths / patterns
let srcRoot = 'src';
const srcRoot360 = 'src-360k';
const distRootPath = 'dist';
let distRoot = distRootPath;

const floppyTypes = {
  _360: 'floppy-360k',
  _1200: 'floppy-1200k'
};

let isFloppy;

let floppyRoot = `${distRoot}/${floppyTypes._1200}`;

const lightningOptions = {
  minify: true,
  sourceMap: false
};

function asset(path) {
  return `/${assetPath}/${path}`;
}

function root(path) {
  return `${srcRoot}/${path}`;
}

function dist(path) {
  return `${distRoot}/${path}`;
}

// root path for binary assets: images, etc.
const assetPath = 'assets';

const audioPath = 'audio';
const cssPath = 'css';
const fontPath = 'font';
const htmlPath = 'html';
const imagePath = 'image';
const jsPath = 'js';
const libPath = 'lib';
const videoPath = 'video';

// special case: extra-reduced font subset for 360K floppy
const cheddarGothic360K = 'CheddarGothicStencil-subset-floppy-360k.woff2';

const imageRoot = `${assetPath}/${imagePath}`;

function updateDistPaths() {
  dp = {
    audio: dist(audioPath),
    config: `${srcRoot}/config`,
    css: dist(cssPath),
    font: dist(fontPath),
    html: dist(htmlPath),
    image: dist(imagePath),
    js: dist(jsPath),
    lib: dist(`${jsPath}/${libPath}`),
    video: dist(videoPath)
  };
}

let dp;
updateDistPaths();

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
  `${assetPath}/${audioPath}/wav/ipanema-elevator.wav`,
  `${assetPath}/${audioPath}/wav/danger_zone_midi_doom_style.wav`
];

const bnbRoot = `${assetPath}/${audioPath}/wav/bnb`;

// higher bitrate for certain musical elements
const bnbAudioFilesHQ = [
  `${bnbRoot}/i_got_you_babe.wav`,
  `${bnbRoot}/theme.wav`
];

// all sounds, minus HQ (musical) ones
const bnbAudioFiles = [`${bnbRoot}/*.wav`].concat(
  bnbAudioFilesHQ.map((f) => `!${f}`)
);

const headerFile = () => root(headerFileName);
const css = (file) => root(`${cssPath}/${file}.css`);
const js = (file) => root(`${jsPath}/${file}.js`);
const html = (file) => root(`${htmlPath}/${file}.html`);
const distCSS = (file) => `${distRoot}/${cssPath}/${file}.css`;
const distJS = (file) => `${distRoot}/${jsPath}/${file}.js`;

// note: these have path + extensions added.
const bootFile = () => js('aa-boot');
const bootBundleFile = () => distJS('aa-boot_bundle');

const mainJSFile = () => js('aa');
const bundleFile = () => distJS('aa');

function binarySrc() {
  /**
   * Gulp 5+ defaults to UTF-8 encoding for streams,
   * which will corrupt binaries. Hence, this method.
   */
  return src(...arguments, { encoding: false });
}

const htmlminOpts = {
  collapseWhitespace: true,
  // needed to retain spacing in some modals
  conservativeCollapse: true,
  minifyCSS: true,
  minifyJS: true,
  removeComments: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true
};

const imageInlinerOpts = {
  assetPaths: [imageRoot],
  maxFileSize: 2048
};

const minifyInlineOpts = {
  js: {
    output: {
      comments: false,
      ecma: '2016'
    }
  },
  jsSelector: 'script',
  css: {
    level: { 2: { specialComments: 0 } }
  },
  cssSelector: 'style'
};

function terserOpts() {
  // https://github.com/terser/terser#minify-options
  return {
    module: true,
    ecma: '2016',
    compress: {
      passes: 2,
      unsafe_arrows: true,
      unsafe_proto: true,
      unsafe_undefined: true,
      unsafe_Function: true,
      unsafe_methods: true
    },
    mangle: {
      eval: true,
      module: true,
      toplevel: true
    },
    format: {
      ecma: '2016',
      indent_level: 0,
      preamble:
        [
          `/**`,
          ` * ARMOR ALLEY 🚁`,
          ` * Build: ${new Date().toLocaleString()}`,
          ` */`
        ].join('\n') + (isFloppy ? '' : `\n\n${headerFileContents}`)
    }
  };
}

const rollupOpts = {
  onwarn: function (message) {
    // silence / ignore "circular dependency" warnings. :X
    if (/circular dependency/i.test(message)) return;
    console.error(message);
  }
};

async function bundleJS() {
  const bundle = await rollup({ ...rollupOpts, input: mainJSFile() });
  return bundle.write({ file: bundleFile() });
}

async function bundleBootFile() {
  const bundle = await rollup({ ...rollupOpts, input: bootFile() });
  return bundle.write({ file: bootBundleFile() });
}

function minifyBootBundle() {
  return src(bootBundleFile()).pipe(terser(terserOpts())).pipe(dest(dp.js));
}

function minifyJS() {
  return src(bundleFile()).pipe(terser(terserOpts())).pipe(dest(dp.js));
}

function headerJS() {
  // prepend is no longer needed, done via minify.
  return src(bundleFile()).pipe(dest(dp.js));
  /*
  return src([headerFile(), bundleFile()])
    .pipe(concat(bundleFile()))
    .pipe(dest('.'));
  */
}

function headerCSS() {
  const aaCSS = distCSS('aa');
  return src([headerFile(), aaCSS]).pipe(concat(aaCSS)).pipe(dest('.'));
}

function minifyLibs() {
  // only lazy-loaded libraries need to be in dist/
  // PeerJS is fetched on-the-fly, but SM2 and snowstorm are bundled.
  return src(root(`${jsPath}/${libPath}/peerjs*.js`))
    .pipe(terser())
    .pipe(dest(dp.lib));
}

function minifyCSS() {
  return (
    src(css('*'))
      .pipe(postcss([imageInliner(imageInlinerOpts)]))
      /**
       * Remap production / bundled CSS asset references, accordingly.
       * Given this trivial string match, “What could possibly go wrong?” ;)
       */
      .pipe(
        replace(`/${assetPath}/`, `/${distRootPath}/`)
      )
      // https://github.com/clean-css/clean-css#constructor-options
      .pipe(lightningcss(lightningOptions))
      .pipe(dest(dp.css))
  );
}

function minifyHTML() {
  return src(html('*'))
    .pipe(minifyInline(minifyInlineOpts))
    .pipe(htmlmin(htmlminOpts))
    .pipe(dest(dp.html));
}

function buildSpriteSheet() {
  // Battlefield sprites
  var spriteData = binarySrc(spriteSheet.glob).pipe(
    spritesmith({
      imgName: spriteSheet.png,
      cssName: spriteSheet.json,
      padding: 2
      // https://github.com/twolfson/gulp.spritesmith?tab=readme-ov-file#algorithms
      // algorithm: 'left-right'
    })
  );

  var imgStream = spriteData.img.pipe(dest(dp.image));
  var cssStream = spriteData.css.pipe(dest(dp.image));

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
        binarySrc(`${dp.image}/${spriteSheet.png}`),
        imagemin(
          [
            // https://www.npmjs.com/package/imagemin-webp
            imageminWebp({ lossless: 9 })
          ],
          { silent: true }
        ),
        rename(spriteSheet.webp),
        dest(dp.image),
        // battlefield sprite which compresses well
        binarySrc(
          `${assetPath}/${imagePath}/battlefield/standalone/deviantart-Dirt-Explosion-774442026.png`
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
        dest(`dist/${imagePath}/battlefield/standalone`),
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
  return src(`${dp.image}/${spriteSheet.json}`)
    .pipe(rename(spriteSheet.js))
    .pipe(
      map((file, done) => {
        var json = JSON.parse(file.contents.toString());

        const parsedJSON = {};

        Object.keys(json).forEach((key) => {
          let src = json[key]['source_image'];

          /**
           * Account for Windows-style double-slashes, e.g.,
           * 'C:\\Temp\\AA\\assets\\image\\whatever.png'
           * (output is from spritesmith via node.)
           */
          src = src.replace(/\\/g, '/');

          // e.g., `assets/image/whatever.png` -> `/whatever.png`
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
    .pipe(dest(dp.config));
}

function buildAudioSpriteConfig() {
  /**
   * audiosprite howler JSON -> JS
   * Export to a config/ path for inclusion in the main JS bundle.
   */
  return src(`${dp.audio}/${asName}.json`)
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
    .pipe(dest(dp.config));
}

/**
 * All the regular images, icons, manifest.json and so forth.
 * Note: some assets may not always be included. ;)
 */
const bnb = { allowEmpty: true, encoding: false };

/**
 * TODO: reduce to single task, console output is noisy.
 */
const copyStaticResourcesTasks = [
  function fonts() {
    return binarySrc(`${assetPath}/${fontPath}/**/*`).pipe(dest(dp.font));
  },

  function images() {
    // copy all image subdirectories, ignoring .png files inside image/ itself which are bundled into a spritesheet.
    // UI/ images are largely (but not entirely) redundant as anything < 2 KB is base64-encoded in CSS.
    return binarySrc([
      `${assetPath}/${imagePath}/**/*`,
      `!${assetPath}/${imagePath}/*.png`
    ]).pipe(dest(dp.image));
  },

  function manifest() {
    return src(`${assetPath}/manifest.json`).pipe(dest('dist'));
  },

  function staticBNBMP3() {
    // encoded BnB assets may not always be present.
    let path = `${assetPath}/${audioPath}/mp3/bnb`;
    if (!fs.existsSync(path)) return Promise.resolve();
    return src(`${path}/*.*`, bnb).pipe(dest(`${dp.audio}/mp3/bnb`));
  },

  function staticBNBOpus() {
    // encoded BnB assets may not always be present.
    let path = `${assetPath}/${audioPath}/opus/bnb`;
    if (!fs.existsSync(path)) return Promise.resolve();
    return src(`${path}/*.*`, bnb).pipe(dest(`${dp.audio}/opus/bnb`));
  },

  function aaVideo() {
    return binarySrc(`${assetPath}/${videoPath}/aa-*.*`).pipe(dest(dp.video));
  },

  function bnbVideo() {
    return src(`${assetPath}/${videoPath}/bnb/*.*`, bnb).pipe(
      dest(`${dp.video}/bnb`)
    );
  }
];

function getAudioOptions() {
  return {
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
}

const audioSpriteFiles = [`assets/${audioPath}/wav/*.wav`].concat(
  standaloneFiles.map((fn) => `!${fn}`)
);

function createAudioSpriteMP3() {
  return binarySrc(audioSpriteFiles)
    .pipe(audiosprite(getAudioOptions()))
    .pipe(dest(dp.audio));
}

function createAudioSpriteOpus() {
  return binarySrc(audioSpriteFiles)
    .pipe(
      audiosprite({
        ...getAudioOptions(),
        export: 'opus',
        /**
         * audiosprite library has VBR argument only for MP3?
         * Opus can match MP3 quality at lower bitrate, however(?)
         */
        bitrate: 48
      })
    )
    .pipe(dest(dp.audio));
}

function hearThatFloppy(callback) {
  pipeline(
    // lo-fi Opus sprite for floppy version
    binarySrc(audioSpriteFiles),
    audiosprite({
      ...getAudioOptions(),
      export: 'opus',
      // Opus doesn't do VBR, but can match MP3 quality at lower bitrate.
      bitrate: 30,
      samplerate: 22050
    }),
    dest(dp.audio),
    callback
  );
}

function beavis(callback) {
  let unpackedANSI = [...beavisANSI];

  for (let k in sequences) {
    unpackedANSI = unpackedANSI.map((txt) => txt.replaceAll(k, sequences[k]));
  }

  console.log(unpackedANSI.join('\n'));

  callback();
}

function encodeBNBMP3() {
  return src(bnbAudioFiles, bnb)
    .pipe(
      ffmpeg('mp3', function (cmd) {
        return cmd
          .audioChannels(2)
          .audioCodec('libmp3lame')
          .audioFrequency(22050);
      })
    )
    .pipe(dest(`${assetPath}/${audioPath}/mp3/bnb`));
}

function encodeBNBMP3HQ() {
  return src(bnbAudioFilesHQ, bnb)
    .pipe(
      ffmpeg('mp3', function (cmd) {
        return cmd.audioChannels(2).audioCodec('libmp3lame');
      })
    )
    .pipe(dest(`${assetPath}/${audioPath}/mp3/bnb`));
}

function encodeBNBOpus() {
  return src(bnbAudioFiles, bnb)
    .pipe(
      ffmpeg('opus', function (cmd) {
        return cmd.audioChannels(2).audioCodec('libopus').audioBitrate('64k');
      })
    )
    .pipe(dest(`${assetPath}/${audioPath}/opus/bnb`));
}

function encodeBNBOpusHQ() {
  return src(bnbAudioFilesHQ, bnb)
    .pipe(
      ffmpeg('opus', function (cmd) {
        return cmd.audioChannels(2).audioCodec('libopus').audioBitrate('128k');
      })
    )
    .pipe(dest(`${assetPath}/${audioPath}/opus/bnb`));
}

function encodeStandaloneMP3() {
  return binarySrc(standaloneFiles)
    .pipe(
      ffmpeg('mp3', function (cmd) {
        return (
          cmd
            // "generally considered the default and close to perceptual transparency"
            .audioQuality(4)
            .audioChannels(2)
            .audioCodec('libmp3lame')
        );
      })
    )
    .pipe(dest(`${dp.audio}/mp3`));
}

function encodeStandaloneOpus() {
  return binarySrc(standaloneFiles)
    .pipe(
      ffmpeg('opus', function (cmd) {
        return cmd.audioChannels(2).audioCodec('libopus');
      })
    )
    .pipe(dest(`${dp.audio}/opus`));
}

function cleanAudioDist() {
  // delete previously-built audio assets
  return clean([dp.audio]);
}

function cleanAudioTemp() {
  /**
   * Delete temporary audio JS / JSON, post-build
   * ---
   * 02/2026: Duplicate ` .mp3` + ` .opus` of last files to be encoded,
   * Possible ffmpeg / gulp bug stemming from src([glob1, !glob2])?
   */
  return clean([
    `${assetPath}/${audioPath}/mp3/bnb/ .mp3`,
    `${assetPath}/${audioPath}/opus/bnb/ .opus`,
    `${dp.audio}/*.json`
  ]);
}

function cleanDist() {
  // delete dist/ path, with a few exceptions.
  return clean(['dist/*', `!dist/${audioPath}`, '!dist/README.md']);
}

function cleanup() {
  // delete temporary spritesheet files, and PNGs which have been webP-encoded.
  // TODO: refactor. :P
  return clean([
    `${dp.image}/${asName}*.js*`,
    `${dp.image}/${asName}.png`,
    `${dp.image}/battlefield/standalone/deviantart-Dirt-Explosion-774442026.png`
  ]);
}

const minifyCodeTasks = [
  minifyBootBundle,
  minifyJS,
  minifyLibs,
  minifyCSS,
  minifyHTML
];

function cleanThatFloppy() {
  return clean([floppyRoot]);
}

/**
 * TODO: reduce to single task, console output is noisy.
 */
const copyThatFloppyTasks = [
  // copy select assets into a separate build path
  // gotta have a favicon.ico, of course...
  function floppyFavicon() {
    return binarySrc(`assets/${imagePath}/app-icons/favicon.ico`).pipe(
      dest(floppyRoot)
    );
  },

  function floppyIndex() {
    return src('index.html').pipe(dest(floppyRoot));
  },

  // batch file to start the HTTP server
  function floppyBat() {
    return src(`${srcRoot}/floppy/aa.bat`).pipe(dest(floppyRoot));
  },

  // note: ignore all dot-files, e.g., .DS_Store and friends
  function floppyCopy() {
    return binarySrc([
      'dist/**/*',
      // exclude any floppy versions, too
      '!dist/{floppy-*,floppy-*/**}',
      '!**/.*',
      '!**/*.json',
      '!**/*.md',
      `!dist/${audioPath}/**/*`,
      `!dist/${videoPath}/**/*`,
      `!dist/${imagePath}/unused/**/*`,
      `!dist/${imagePath}/unused`
    ]).pipe(dest(`${floppyRoot}/dist`));
  }
];

function copy360FloppySource() {
  // duplicate `src/`
  return binarySrc(`${srcRoot}/**/*`).pipe(dest(srcRoot360));
}

function build360FloppyBundle(callback) {
  // sneaky: have the build reference the floppy source, and output to floppy dist.
  srcRoot = srcRoot360;
  distRoot = `${floppyRoot}/${distRootPath}`;
  updateDistPaths();
  callback();
}

function apply360FloppyOverrides() {
  // floppy-specific source file overrides
  return binarySrc(`${srcRoot}/floppy/src-360/**/*`).pipe(dest(srcRoot360));
}

function renameFloppyFont() {
  const floppyDist = `${floppyRoot}/dist`;
  /**
   * Rename / replace floppy disk version which has
   * only lower-case a-z and - and ' characters.
   * NOTE: shenanigans abound.
   */
  const fontDirName = `CheddarGothicStencil`;
  const fontRoot = `${dp.font}/${fontDirName}`;
  const fontFrom = `${fontRoot}/${cheddarGothic360K}`;
  const fontTo = `CheddarGothicStencil-subset.woff2`;

  return binarySrc(fontFrom)
    .pipe(rename(fontTo))
    .pipe(dest(`${floppyDist}/${fontPath}/${fontDirName}`));
}

function tidyThatFloppyCopy() {
  const globs = [
    // drop all fonts
    `${dp.font}/**/*.*`,

    // empty directories
    `${dp.font}/war-wound`,
    `${dp.font}/EBGaramond`,

    // except certain fonts
    `!${dp.font}/sysfont/*.woff2`,
    `!${dp.font}/Iosevka/Iosevka-Custom-optimized-unicode.woff2`,

    // retain this subset, which will have been overwritten for the 360K version
    `!${dp.font}/CheddarGothicStencil/CheddarGothicStencil*.woff2`,

    // drop non-gzip things
    `${dp.css}/**/*.css`,
    `${dp.html}/**/*.html`,

    // all JS (but not gzip versions)
    `${dp.js}/*.js`,

    // and exclude aa-boot_bundle
    `!${dp.js}/aa-boot_bundle.js`,

    // no network, for now
    `${dp.js}/lib`,

    // pare down images
    `${dp.image}/app-icons`,
    `${dp.image}/app-images`,
    `${dp.image}/bnb`,
    `${dp.image}/snow`,

    // all except select UI
    `${dp.image}/UI/**/*`,
    `!${dp.image}/UI/*.svg`,

    // medals and whatnot
    `${dp.image}/unused`,

    // nor audio or video
    dp.audio,
    dp.video
  ];

  return clean(globs);
}

const gzipOptions = {
  level: 9
};

/**
 * TODO: reduce to single task, console output is noisy.
 */
const gzipThatFloppyTasks = [
  function floppyGZJS() {
    // index.html -> index.html.gz (a new index.html "boot loader" will be created)
    return src(`index.html`)
      .pipe(minifyInline(minifyInlineOpts))
      .pipe(htmlmin(htmlminOpts))
      .pipe(gzip(gzipOptions))
      .pipe(dest(floppyRoot));
  },

  function floppyGZCSS() {
    // CSS
    return src(distCSS('*'))
      .pipe(lightningcss(lightningOptions))
      .pipe(gzip(gzipOptions))
      .pipe(dest(dp.css));
  },

  function floppyGZHTML() {
    // HTML
    return src(`${dp.html}/*.html`)
      .pipe(minifyInline(minifyInlineOpts))
      .pipe(htmlmin(htmlminOpts))
      .pipe(gzip(gzipOptions))
      .pipe(dest(dp.html));
  },

  function floppyGZJSBoot() {
    // JS (excluding aa-boot_bundle)
    return (
      src([distJS('*'), `!${distJS('aa-boot_bundle')}`])
        // note: re-run through terser to drop header comment.
        .pipe(terser(terserOpts(true)))
        .pipe(gzip(gzipOptions))
        .pipe(dest(dp.js))
    );
  }
];

/**
 * Rewrite <script> to point to `dist/js/`
 * Potentially dangerous: greedy pattern.
 */
let pattern = '<script src="';

const bootThatFloppyTasks = [
  // floppy boot -> index.html "boot loader"
  // this will fetch the actual game at index.html.gz

  function floppyBootLoader() {
    return (
      src('src/floppy/index-floppy.html')
        .pipe(minifyInline(minifyInlineOpts))
        .pipe(htmlmin(htmlminOpts))
        // some.js -> dist/some.js
        .pipe(replace(pattern, `${pattern}${distRootPath}/${jsPath}/`))
        .pipe(rename('index.html'))
        .pipe(dest(floppyRoot))
    );
  },

  function floppyJS() {
    return src('src/floppy/*.js')
      .pipe(terser(terserOpts(true)))
      .pipe(dest(dp.js));
  }
];

function lastFloppyCleanup() {
  return clean([
    // try to avoid mac OS junk
    `**/._.DS_Store`,
    `**/.DS_Store`,

    `${dp.audio}/*.json`,

    // HACKISH: drop this sneaky 360K font that may have been renamed.
    `${dp.font}/CheddarGothicStencil/${cheddarGothic360K}`,

    // ensure the other floppy version didn't sneak in
    `${floppyRoot}/dist/floppy-*`
  ]);
}

function lastFloppyCleanup360() {
  return clean([
    // clean up "ephemeral" 360K-modded source path
    srcRoot360,
    // drop all audio from 360K build
    dp.audio,
    // no BnB CSS
    `${dp.css}/aa-bnb.css.gz`
  ]);
}

const copyFilesTasks = [headerCSS, headerJS, ...copyStaticResourcesTasks];

const buildTasks = [
  bundleBootFile,
  buildSpriteSheet,
  buildSpriteSheetConfig,
  bundleJS,
  ...minifyCodeTasks,
  minifyImages,
  ...copyFilesTasks,
  cleanup
];

const audioTasks = [
  cleanAudioDist,
  createAudioSpriteMP3,
  createAudioSpriteOpus,
  buildAudioSpriteConfig,
  encodeStandaloneMP3,
  encodeStandaloneOpus,
  cleanAudioTemp
];

const floppyTasks1200 = [
  cleanThatFloppy,
  ...copyThatFloppyTasks,
  ...buildTasks,
  ...gzipThatFloppyTasks,
  tidyThatFloppyCopy,
  hearThatFloppy,
  ...bootThatFloppyTasks,
  lastFloppyCleanup
];

const floppyTasks360 = [
  cleanThatFloppy,
  ...copyThatFloppyTasks,
  copy360FloppySource,
  apply360FloppyOverrides,
  build360FloppyBundle,
  ...buildTasks,
  ...gzipThatFloppyTasks,
  tidyThatFloppyCopy,
  renameFloppyFont,
  ...bootThatFloppyTasks,
  lastFloppyCleanup,
  lastFloppyCleanup360
];

function setFloppyRoot(path, callback) {
  floppyRoot = `${distRootPath}/${path}`;
  distRoot = `${floppyRoot}/${distRootPath}`;
  updateDistPaths();
  callback();
}

function floppy360KTask() {
  isFloppy = true;
  return series(
    function set360Root(callback) {
      setFloppyRoot(floppyTypes._360, callback);
    },
    ...floppyTasks360
  );
}

function floppy1200KTask() {
  // default floppy build: 1200k version.
  isFloppy = true;
  return series(
    function set1200Root(callback) {
      setFloppyRoot(floppyTypes._1200, callback);
    },
    ...floppyTasks1200
  );
}

/**
 * `gulp`
 * Default task: compile the game into `dist/`
 *
 * This task generates the audio and image sprites, then builds the game
 * including dynamically-built sprite configurations.
 *
 * For faster "rebuilds", use `gulp build` after the default task has run once.
 *
 * The floppy build tasks are separate.
 */
task('default', series(aa, cleanDist, ...audioTasks, ...buildTasks));

/**
 * `gulp build`
 * Builds the game, without re-encoding the audio sprites (saves 15+ seconds.)
 *
 * At least one full build is required first, to generate the audio sprites.
 * Once built, this task is handy for regular development and testing.
 * A full rebuild is needed only if the underlying audio assets change.
 *
 * Note that this does not include encoding the optional BnB audio assets.
 */
task('build', series(aa, cleanDist, ...buildTasks));

/**
 * `gulp build-bnb`
 * Creates MP3 + Opus versions of the BnB .WAV files in `assets/bnb`.
 * This can take about two minutes to run, FWIW.
 *
 * Shell script version, tested on macOS with opus-tools and lame (installed via Homebrew.)
 * Note: this is not as optimized as the gulp script, file sizes will be somewhat larger.
 * find 'assets/audio/wav/bnb' -iname '*.wav' -exec bash -c 'B=$(basename "{}"); opusenc "{}" "./assets/audio/opus/bnb/${B%.*}.opus"' \;
 * find 'assets/audio/wav/bnb' -iname '*.wav' -exec bash -c 'B=$(basename "{}"); lame -V 5 "{}" -o "./assets/audio/mp3/bnb/${B%.*}.mp3"' \;
 *
 */

task(
  'build-bnb',
  series(
    aa,
    beavis,
    encodeBNBMP3,
    encodeBNBMP3HQ,
    encodeBNBOpus,
    encodeBNBOpusHQ,
    cleanAudioTemp
  )
);

/**
 * `gulp build-floppy`
 * 💾 Special case: 360K + 1.2MB floppy disk-specific versions.
 *
 * This builds versions of the game optimized for 3.5" and 5.25" FDD media.
 * This references the default build, so run `gulp` at least once beforehand.
 */
task('build-floppy', series(aa, floppy1200KTask(), floppy360KTask()));

// 360 KB floppy version.
task('build-floppy-360k', series(aa, floppy360KTask()));

// 1.2 MB floppy version.
task('build-floppy-1200k', series(aa, floppy1200KTask()));

// reduced ANSI codes, "optimized" for numerous string replace operations - ridiculous, yes.
let beavisANSI = [
  '*_%%%%%%%%####~$',
  '*_%####~!48;2;113;57;`2;113;57;0mQ!48;2;159;117;`2;159;117;0mm!48;2;48;43;`2;48;43;0mY!48;2;47;19;`2;47;19;0mX!48;2;47;19;`2;47;19;0mX$*_%%%%%####~$',
  '*_%~!48;2;28;13;`2;28;13;0mv!48;2;13;17;`2;13;17;0mv!48;2;14;12;`2;14;12;0mu!48;2;14;1;`2;14;1;0mu$*_~!48;2;76;36;`2;76;36;0mC!48;2;180;118;`2;180;118;0mw!48;2;205;143;`2;205;143;0mp!48;2;197;136;`2;197;136;0mq!48;2;113;59;`2;113;59;0mQ!48;2;13;11;`2;13;11;0mu!48;2;13;11;`2;13;11;0mu!48;2;13;1;`2;13;1;0mu$*_%%%%%~$',
  '*_%~!48;2;103;50;`2;103;50;0mL!48;2;180;125;`2;180;125;0mw!48;2;180;150;`2;180;150;0mq!48;2;178;113;`2;178;113;0mw!48;2;78;65;`2;78;65;0mC!48;2;62;54;`2;62;54;0mC!48;2;84;37;`2;84;37;0mC!48;2;117;102;`2;117;102;0mO!48;2;197;167;`2;197;167;0md!48;2;200;160;`2;200;160;0md!48;2;178;149;`2;178;149;0mq!48;2;178;149;`2;178;149;0mq!48;2;178;114;`2;178;114;0mw!48;2;80;39;`2;80;39;0mJ$*_%%%%####~$',
  '*_#~!48;2;55;27;`2;55;27;0mX!48;2;55;46;`2;55;46;0mY!48;2;45;41;`2;45;41;0mY!48;2;48;40;`2;48;40;0mX!48;2;27;25;`2;27;25;0mY!48;2;80;49;`2;80;49;0mC!48;2;80;67;`2;80;67;0mL!48;2;194;126;`2;194;126;0mq!48;2;201;168;`2;201;168;0md!48;2;201;168;`2;201;168;0md!48;2;199;149;`2;199;149;0mp!48;2;25;6;`2;25;6;0mY!48;2;149;124;`2;149;124;0mm!48;2;192;161;`2;192;161;0mp!48;2;194;164;`2;194;164;0mp!48;2;195;163;`2;195;163;0mp!48;2;194;150;`2;194;150;0mp!48;2;158;117;`2;158;117;0mm!48;2;156;92;`2;156;92;0mZ!48;2;44;18;`2;44;18;0mX$*_%%%%##~$',
  '*_#~!48;2;87;44;`2;87;44;0mL!48;2;79;69;`2;79;69;0mL!48;2;182;117;`2;182;117;0mw!48;2;182;152;`2;182;152;0mp!48;2;204;165;`2;204;165;0md!48;2;190;163;`2;190;163;0mp!48;2;190;158;`2;190;158;0mp!48;2;192;159;`2;192;159;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;162;`2;192;162;0mp!48;2;196;134;`2;196;134;0mq!48;2;105;87;`2;105;87;0m0!48;2;192;163;`2;192;163;0mp!48;2;192;126;`2;192;126;0mq!48;2;178;148;`2;178;148;0mq!48;2;192;131;`2;192;131;0mq!48;2;105;55;`2;105;55;0mQ!48;2;95;79;`2;95;79;0mQ!48;2;204;141;`2;204;141;0mp!48;2;109;56;`2;109;56;0mQ$*_%%%%#~$',
  '*_##~!48;2;60;26;`2;60;26;0mJ!48;2;85;63;`2;85;63;0mL!48;2;87;73;`2;87;73;0mQ!48;2;119;63;`2;119;63;0m0!48;2;195;138;`2;195;138;0mq!48;2;196;165;`2;196;165;0md!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;195;164;`2;195;164;0mp!48;2;196;167;`2;196;167;0md!48;2;201;167;`2;201;167;0md!48;2;195;138;`2;195;138;0mq!48;2;196;156;`2;196;156;0mp!48;2;82;69;`2;82;69;0mL!48;2;199;169;`2;199;169;0md!48;2;201;160;`2;201;160;0md!48;2;167;139;`2;167;139;0mw!48;2;126;108;`2;126;108;0mZ!48;2;201;160;`2;201;160;0md$*_%%%%#~$',
  '*_##~!48;2;96;61;`2;96;61;0mQ!48;2;93;78;`2;93;78;0mQ!48;2;167;102;`2;167;102;0mm!48;2;136;118;`2;136;118;0mZ!48;2;78;46;`2;78;46;0mC!48;2;153;89;`2;153;89;0mZ!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;193;161;`2;193;161;0mp!48;2;78;52;`2;78;52;0mL!48;2;161;134;`2;161;134;0mw!48;2;193;163;`2;193;163;0mp!48;2;78;46;`2;78;46;0mC!48;2;162;98;`2;162;98;0mm!48;2;199;169;`2;199;169;0md!48;2;47;39;`2;47;39;0mJ!48;2;200;155;`2;200;155;0mp!48;2;203;169;`2;203;169;0md$*_~!48;2;200;155;`2;200;155;0mp$*_%%%%#~$',
  '*_#~!48;2;102;85;`2;102;85;0m0!48;2;76;66;`2;76;66;0mL!48;2;95;79;`2;95;79;0mQ!48;2;1;0;`2;1;0;0mz!48;2;187;122;`2;187;122;0mq!48;2;196;162;`2;196;162;0mp!48;2;101;86;`2;101;86;0m0!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;181;153;`2;181;153;0mp!48;2;196;133;`2;196;133;0mq!48;2;1;1;`2;1;1;0mX!48;2;181;117;`2;181;117;0mw!48;2;196;162;`2;196;162;0mp$*_~!48;2;179;117;`2;179;117;0mw$*_~!48;2;92;46;2@38;2;92;46;2mL!48;2;92;76;2@38;2;92;76;2mQ!48;2;1;0;`2;1;0;0mz!48;2;88;42;`2;88;42;0mL$*_%%%%#~$',
  '*_#~!48;2;24;20;`2;24;20;0mY!48;2;57;47;`2;57;47;0mC!48;2;98;82;`2;98;82;0mQ!48;2;176;111;`2;176;111;0mw!48;2;85;61;`2;85;61;0mL!48;2;123;65;`2;123;65;0m0!48;2;204;147;`2;204;147;0mp!48;2;196;165;`2;196;165;0md!48;2;192;160;`2;192;160;0mp!48;2;81;44;`2;81;44;0mC!48;2;123;106;`2;123;106;0mO!48;2;180;150;`2;180;150;0mq!48;2;85;63;`2;85;63;0mL!48;2;123;67;`2;123;67;0m0!48;2;49;28;19@38;2;49;28;19mJ!48;2;91;58;31@38;2;91;58;31mQ!48;2;164;107;68@38;2;164;107;68mp!48;2;193;139;86@38;2;193;139;86mk!48;2;193;137;86@38;2;193;137;86mk!48;2;164;107;68@38;2;164;107;68mp!48;2;156;102;68@38;2;156;102;68mq!48;2;84;59;36@38;2;84;59;36mL!48;2;54;31;21@38;2;54;31;21mJ$*_%%%####~$',
  '*_#~!48;2;110;92;`2;110;92;0m0!48;2;88;76;`2;88;76;0mQ!48;2;22;18;`2;22;18;0mY!48;2;82;58;`2;82;58;0mL!48;2;170;143;`2;170;143;0mq!48;2;132;114;`2;132;114;0mZ!48;2;79;45;`2;79;45;0mC!48;2;156;92;`2;156;92;0mZ!48;2;192;160;`2;192;160;0mp!48;2;198;145;`2;198;145;0mp!48;2;132;72;`2;132;72;0m0!48;2;54;45;`2;54;45;0mJ!48;2;80;63;9@38;2;80;63;9mL!48;2;118;74;51@38;2;118;74;51mZ!48;2;214;147;9`2;214;147;90mh!48;2;231;166;10`2;231;166;100mo!48;2;229;164;98@38;2;229;164;98mo!48;2;227;162;97@38;2;227;162;97ma!48;2;227;162;97@38;2;227;162;97ma!48;2;229;164;98@38;2;229;164;98mo!48;2;229;164;98@38;2;229;164;98mo!48;2;234;167;10`2;234;167;100mo!48;2;214;147;9`2;214;147;90mh!48;2;20;11;8@38;2;20;11;8mY$*_%%%###~$',
  '*_#~!48;2;6;5;`2;6;5;0mX!48;2;185;121;`2;185;121;0mw!48;2;191;160;`2;191;160;0mp!48;2;194;130;`2;194;130;0mq!48;2;1;3;`2;1;3;0mX!48;2;199;133;`2;199;133;0mq!48;2;186;157;`2;186;157;0mp!48;2;98;80;`2;98;80;0mQ!48;2;192;160;`2;192;160;0mp!48;2;192;162;`2;192;162;0mp!48;2;199;164;`2;199;164;0md$*_~!48;2;145;86;64@38;2;145;86;64mw!48;2;236;167;101@38;2;236;167;101mo!48;2;226;162;97@38;2;226;162;97ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;226;162;97@38;2;226;162;97ma!48;2;194;130;81@38;2;194;130;81mb$*_%%%###~$',
  '*_##~!48;2;32;12;`2;32;12;0mc!48;2;34;28;`2;34;28;0mc!48;2;127;110;`2;127;110;0mZ!48;2;169;119;`2;169;119;0mw!48;2;192;150;`2;192;150;0mp!48;2;192;160;`2;192;160;0mp!48;2;201;167;`2;201;167;0md!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;170;104;`2;170;104;0mm!48;2;76;37;8@38;2;76;37;8mC!48;2;120;75;49@38;2;120;75;49mZ!48;2;225;161;97@38;2;225;161;97ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;227;163;98@38;2;227;163;98mo!48;2;45;26;18@38;2;45;26;18mJ$*_%%%##~$',
  '*_####~!48;2;137;103;`2;137;103;0mZ!48;2;196;145;`2;196;145;0mp!48;2;192;161;`2;192;161;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;195;164;`2;195;164;0mp!48;2;198;144;`2;198;144;0mp$*_~!48;2;223;156;95@38;2;223;156;95ma!48;2;227;163;98@38;2;227;163;98mo!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;234;167;10`2;234;167;100mo!48;2;234;167;10`2;234;167;100mo!48;2;227;163;98@38;2;227;163;98mo!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;212;146;9`2;212;146;90mh$*_%%%##~$',
  '*_####~!48;2;104;55;`2;104;55;0mQ!48;2;192;131;`2;192;131;0mq!48;2;199;164;`2;199;164;0md!48;2;192;162;`2;192;162;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;162;`2;192;162;0mp!48;2;95;47;`2;95;47;0mL!48;2;81;46;33@38;2;81;46;33mQ!48;2;193;129;8`2;193;129;80mb!48;2;226;162;97@38;2;226;162;97ma!48;2;224;160;96@38;2;224;160;96ma!48;2;113;81;48@38;2;113;81;48mZ!48;2;111;78;47@38;2;111;78;47mZ!48;2;184;123;77@38;2;184;123;77md!48;2;218;157;94@38;2;218;157;94ma!48;2;230;164;98@38;2;230;164;98mo!48;2;232;166;10`2;232;166;100mo!48;2;226;162;97@38;2;226;162;97ma!48;2;79;48;32@38;2;79;48;32mQ$*_%%%#~$',
  '*_%~!48;2;36;13;`2;36;13;0mz!48;2;138;78;`2;138;78;0mO!48;2;201;146;`2;201;146;0mp!48;2;195;164;`2;195;164;0mp!48;2;192;161;`2;192;161;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;201;156;`2;201;156;0mp!48;2;159;98;`2;159;98;0mZ!48;2;13;7;7@38;2;13;7;7mY!48;2;213;146;9`2;213;146;90mh!48;2;227;163;97@38;2;227;163;97ma!48;2;184;131;79@38;2;184;131;79mb!48;2;146;94;6`2;146;94;60mw!48;2;81;54;34@38;2;81;54;34mQ!48;2;75;48;31@38;2;75;48;31mL!48;2;118;73;48@38;2;118;73;48mZ!48;2;162;115;69@38;2;162;115;69mp!48;2;227;163;97@38;2;227;163;97ma!48;2;19;10;7@38;2;19;10;7mY$*_%%%#~$',
  '*_%##~!48;2;67;30;`2;67;30;0mU!48;2;171;105;`2;171;105;0mm!48;2;201;157;`2;201;157;0mp!48;2;192;163;`2;192;163;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;160;`2;192;160;0mp!48;2;192;164;`2;192;164;0mp!48;2;205;162;`2;205;162;0md!48;2;98;47;`2;98;47;0mL!48;2;47;27;18@38;2;47;27;18mJ!48;2;177;113;72@38;2;177;113;72md!48;2;228;163;98@38;2;228;163;98mo!48;2;230;165;99@38;2;230;165;99mo!48;2;230;165;99@38;2;230;165;99mo!48;2;172;116;72@38;2;172;116;72md!48;2;112;80;48@38;2;112;80;48mZ$*_~!48;2;177;113;72@38;2;177;113;72md!48;2;152;109;65@38;2;152;109;65mq!48;2;24;17;1`2;24;17;10mY$*_%%%~$',
  '*_%###~!48;2;5;0;`2;5;0;0mn!48;2;102;52;`2;102;52;0mL!48;2;194;131;`2;194;131;0mq!48;2;194;162;`2;194;162;0mp!48;2;199;164;`2;199;164;0md!48;2;192;162;`2;192;162;0mp!48;2;192;128;`2;192;128;0mq!48;2;95;48;`2;95;48;0mL!48;2;122;84;48@38;2;122;84;48mZ$*_~!48;2;188;124;78@38;2;188;124;78mb!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;111;80;48@38;2;111;80;48mZ!48;2;117;84;5`2;117;84;50mZ$*_~!48;2;195;129;81@38;2;195;129;81mb!48;2;229;165;98@38;2;229;165;98mo!48;2;221;158;95@38;2;221;158;95ma!48;2;114;82;48@38;2;114;82;48mZ!48;2;12;8;4@38;2;12;8;4mn!48;2;12;8;4@38;2;12;8;4mn$*_%%##~$',
  '*_%%~!48;2;39;14;`2;39;14;0mz!48;2;39;32;`2;39;32;0mX!48;2;142;81;`2;142;81;0mO!48;2;201;148;`2;201;148;0mp!48;2;195;114;`2;195;114;0mq!48;2;41;18;`2;41;18;0mU!48;2;129;83;57@38;2;129;83;57mm!48;2;181;124;76@38;2;181;124;76md!48;2;228;164;98@38;2;228;164;98mo!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;234;167;10`2;234;167;100mo!48;2;234;167;10`2;234;167;100mo!48;2;191;136;82@38;2;191;136;82mb!48;2;161;116;69@38;2;161;116;69mp!48;2;73;47;3`2;73;47;30mL!48;2;228;163;98@38;2;228;163;98mo!48;2;172;123;74@38;2;172;123;74md!48;2;133;95;57@38;2;133;95;57mw!48;2;133;95;57@38;2;133;95;57mw$*_%%##~$',
  '*_%%###~!48;2;70;32;`2;70;32;0mJ!48;2;174;111;`2;174;111;0mw!48;2;208;141;`2;208;141;0mp!48;2;121;68;`2;121;68;0m0!48;2;47;26;22@38;2;47;26;22mJ!48;2;225;158;96@38;2;225;158;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;232;166;10`2;232;166;100mo!48;2;114;71;46@38;2;114;71;46mO!48;2;205;137;86@38;2;205;137;86mk!48;2;193;135;77@38;2;193;135;77mb!48;2;83;49;33@38;2;83;49;33mQ$*_%%####~$',
  '*_%%####~!48;2;9;0;`2;9;0;0mn!48;2;106;57;`2;106;57;0mQ!48;2;203;135;`2;203;135;0mp!48;2;85;72;`2;85;72;0mQ!48;2;90;55;36@38;2;90;55;36m0!48;2;226;162;97@38;2;226;162;97ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;223;159;95@38;2;223;159;95ma!48;2;193;130;81@38;2;193;130;81mb!48;2;133;95;59@38;2;133;95;59mw!48;2;96;61;41@38;2;96;61;41m0!48;2;102;100;99@38;2;102;100;99mw!48;2;14;10;8@38;2;14;10;8mY!48;2;54;56;57@38;2;54;56;57mQ$*_~!48;2;9;7;4@38;2;9;7;4mx$*_%%#~$',
  '*_%%%#~!48;2;42;17;`2;42;17;0mz!48;2;155;91;`2;155;91;0mZ$*_~!48;2;211;146;89@38;2;211;146;89mh!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;186;122;77@38;2;186;122;77md!48;2;59;33;23@38;2;59;33;23mC!48;2;115;121;125@38;2;115;121;125md!48;2;117;123;127@38;2;117;123;127md!48;2;108;109;11`2;108;109;110mq!48;2;125;127;129@38;2;125;127;129md!48;2;65;49;42@38;2;65;49;42mQ!48;2;151;97;62@38;2;151;97;62mq!48;2;133;95;57@38;2;133;95;57mw$*_%%#~$',
  '*_%%%####~!48;2;145;86;58@38;2;145;86;58mw!48;2;227;163;97@38;2;227;163;97ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;225;161;96@38;2;225;161;96ma!48;2;203;139;85@38;2;203;139;85mk!48;2;109;67;43@38;2;109;67;43mO!48;2;116;71;45@38;2;116;71;45mZ!48;2;109;102;94@38;2;109;102;94mw!48;2;125;88;52@38;2;125;88;52mm!48;2;186;125;76@38;2;186;125;76mb!48;2;213;152;91@38;2;213;152;91mh$*_%%##~$',
  '*_%%%####~!48;2;2;0;`2;2;0;0mX!48;2;202;136;84@38;2;202;136;84mk!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;227;163;97@38;2;227;163;97ma!48;2;205;137;86@38;2;205;137;86mk!48;2;134;94;57@38;2;134;94;57mw!48;2;112;77;42@38;2;112;77;42mO!48;2;31;22;13@38;2;31;22;13mc!48;2;19;15;8@38;2;19;15;8mv!48;2;13;10;6@38;2;13;10;6mu$*_%#~!48;2;68;41;28@38;2;68;41;28mC!48;2;96;68;41@38;2;96;68;41m0!48;2;97;69;41@38;2;97;69;41m0$*_~!48;2;70;42;28@38;2;70;42;28mL$*_~$',
  '*_%%%####~!48;2;32;32;31@38;2;32;32;31mJ!48;2;121;70;46@38;2;121;70;46mZ!48;2;229;164;98@38;2;229;164;98mo!48;2;226;162;97@38;2;226;162;97ma!48;2;226;162;97@38;2;226;162;97ma!48;2;229;164;98@38;2;229;164;98mo!48;2;26;14;9@38;2;26;14;9mY$*_%%#~!48;2;69;40;27@38;2;69;40;27mL!48;2;101;72;43@38;2;101;72;43mO!48;2;237;169;102@38;2;237;169;102mo!48;2;54;39;23@38;2;54;39;23mC!48;2;213;143;89@38;2;213;143;89mh$*_~$',
  '*_%%%#~!48;2;14;16;27@38;2;14;16;27mc!48;2;56;78;136@38;2;56;78;136mm!48;2;56;78;136@38;2;56;78;136mm!48;2;61;62;69@38;2;61;62;69m0!48;2;4;6;15@38;2;4;6;15mX!48;2;170;108;62@38;2;170;108;62mp!48;2;205;144;8`2;205;144;80mk!48;2;205;144;8`2;205;144;80mk!48;2;170;108;62@38;2;170;108;62mp!48;2;0;4;9@38;2;0;4;9mX!48;2;15;16;28@38;2;15;16;28mc$*_%####~!48;2;17;13;8@38;2;17;13;8mY!48;2;211;144;89@38;2;211;144;89mh!48;2;235;168;101@38;2;235;168;101mo!48;2;210;150;9`2;210;150;90mh!48;2;181;119;75@38;2;181;119;75md!48;2;64;38;25@38;2;64;38;25mC$*_~$',
  '*_%%%~!48;2;42;54;95@38;2;42;54;95mQ!48;2;66;109;187@38;2;66;109;187md!48;2;39;103;173@38;2;39;103;173mq!48;2;39;103;173@38;2;39;103;173mq!48;2;60;103;182@38;2;60;103;182mp!48;2;66;109;187@38;2;66;109;187md!48;2;45;54;93@38;2;45;54;93m0!48;2;51;60;96@38;2;51;60;96mO!48;2;51;60;96@38;2;51;60;96mO!48;2;45;54;93@38;2;45;54;93m0!48;2;30;91;152@38;2;30;91;152mm!48;2;66;109;187@38;2;66;109;187md!48;2;13;40;67@38;2;13;40;67mC$*_%##~!48;2;101;71;43@38;2;101;71;43m0!48;2;192;129;8`2;192;129;80mb!48;2;137;99;59@38;2;137;99;59mw!48;2;135;96;58@38;2;135;96;58mw!48;2;18;13;8@38;2;18;13;8mv!48;2;8;3;3@38;2;8;3;3mu$*_#~$',
  '*_%%###~!48;2;28;38;68@38;2;28;38;68mJ!48;2;63;99;173@38;2;63;99;173mp!48;2;47;108;182@38;2;47;108;182mp!48;2;29;95;158@38;2;29;95;158mm!48;2;31;96;159@38;2;31;96;159mw!48;2;31;96;159@38;2;31;96;159mw!48;2;30;96;159@38;2;30;96;159mw!48;2;30;96;159@38;2;30;96;159mw!48;2;48;108;183@38;2;48;108;183mp!48;2;48;107;183@38;2;48;107;183mp!48;2;48;107;183@38;2;48;107;183mp!48;2;48;108;183@38;2;48;108;183mp!48;2;32;97;161@38;2;32;97;161mw!48;2;31;100;166@38;2;31;100;166mw!48;2;31;100;166@38;2;31;100;166mw!48;2;7;20;34@38;2;7;20;34mU$*_####~!48;2;62;45;26@38;2;62;45;26mJ!48;2;173;119;73@38;2;173;119;73md!48;2;151;97;62@38;2;151;97;62mq!48;2;38;22;15@38;2;38;22;15mX$*_%~$',
  '*_%%###~!48;2;46;57;98@38;2;46;57;98m0!48;2;35;56;77@38;2;35;56;77mQ!48;2;64;108;185@38;2;64;108;185mp!48;2;35;98;163@38;2;35;98;163mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;30;95;158@38;2;30;95;158mw!48;2;30;95;158@38;2;30;95;158mw!48;2;30;95;158@38;2;30;95;158mw!48;2;30;95;158@38;2;30;95;158mw!48;2;35;98;163@38;2;35;98;163mw!48;2;13;38;64@38;2;13;38;64mC!48;2;59;105;184@38;2;59;105;184mp!48;2;31;94;157@38;2;31;94;157mm$*_##~!48;2;23;18;1`2;23;18;10mv!48;2;138;97;59@38;2;138;97;59mw!48;2;184;121;76@38;2;184;121;76md!48;2;71;43;28@38;2;71;43;28mC$*_%##~$',
  '*_%%##~!48;2;58;34;23@38;2;58;34;23mC!48;2;176;113;65@38;2;176;113;65mp!48;2;124;85;47@38;2;124;85;47mZ!48;2;9;10;17@38;2;9;10;17mY!48;2;92;126;22`2;92;126;220mh!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;92;126;22`2;92;126;220mh$*_~!48;2;67;44;4`2;67;44;40mL!48;2;0;2;8@38;2;0;2;8mX$*_#~!48;2;97;69;41@38;2;97;69;41m0!48;2;191;129;8`2;191;129;80mb!48;2;114;71;46@38;2;114;71;46mO!48;2;11;4;4@38;2;11;4;4mu$*_%###~$',
  '*_%%#~!48;2;45;33;2`2;45;33;20mJ!48;2;219;152;93@38;2;219;152;93ma!48;2;139;89;57@38;2;139;89;57mw$*_#~!48;2;97;129;226@38;2;97;129;226mh!48;2;32;97;161@38;2;32;97;161mw!48;2;32;96;16`2;32;96;160mw!48;2;32;97;161@38;2;32;97;161mw!48;2;32;97;161@38;2;32;97;161mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;97;128;225@38;2;97;128;225mh$*_~!48;2;217;150;9`2;217;150;90mh!48;2;41;29;16@38;2;41;29;16mJ!48;2;58;42;26@38;2;58;42;26mU!48;2;170;118;72@38;2;170;118;72md!48;2;155;100;64@38;2;155;100;64mq!48;2;42;24;17@38;2;42;24;17mY$*_%%~$',
  '*_%%#~!48;2;186;123;77@38;2;186;123;77mb!48;2;218;156;93@38;2;218;156;93ma!48;2;133;95;57@38;2;133;95;57mw!48;2;104;65;42@38;2;104;65;42mO!48;2;11;9;5@38;2;11;9;5mX!48;2;83;116;212@38;2;83;116;212mk!48;2;21;86;15`2;21;86;150mZ!48;2;33;100;167@38;2;33;100;167mw!48;2;31;92;154@38;2;31;92;154mm!48;2;24;88;151@38;2;24;88;151mm!48;2;33;100;167@38;2;33;100;167mw!48;2;33;100;167@38;2;33;100;167mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;96;128;224@38;2;96;128;224mh$*_~!48;2;230;164;98@38;2;230;164;98mo!48;2;234;165;10`2;234;165;100mo!48;2;186;123;77@38;2;186;123;77mb!48;2;75;45;3`2;75;45;30mL$*_%%##~$',
  '*_%%#~!48;2;15;7;6@38;2;15;7;6mv!48;2;27;20;12@38;2;27;20;12mc!48;2;155;111;66@38;2;155;111;66mq!48;2;147;103;62@38;2;147;103;62mq!48;2;190;128;79@38;2;190;128;79mb!48;2;93;69;5`2;93;69;50mO!48;2;87;68;49@38;2;87;68;49m0!48;2;14;58;101@38;2;14;58;101mQ!48;2;0;2;9@38;2;0;2;9mX!48;2;57;39;34@38;2;57;39;34mL!48;2;13;56;10`2;13;56;100mQ!48;2;19;61;103@38;2;19;61;103m0!48;2;32;97;162@38;2;32;97;162mw!48;2;32;96;16`2;32;96;160mw!48;2;96;128;224@38;2;96;128;224mh$*_~!48;2;108;67;44@38;2;108;67;44mO!48;2;109;67;44@38;2;109;67;44mO!48;2;15;7;6@38;2;15;7;6mv$*_%%###~$',
  '*_%%%~!48;2;38;22;15@38;2;38;22;15mU!48;2;79;65;62@38;2;79;65;62mO!48;2;195;135;75@38;2;195;135;75mb!48;2;166;111;62@38;2;166;111;62mp!48;2;180;128;75@38;2;180;128;75md!48;2;220;152;91@38;2;220;152;91ma!48;2;170;118;66@38;2;170;118;66mp!48;2;93;52;3`2;93;52;30mQ!48;2;13;39;65@38;2;13;39;65mC!48;2;32;96;16`2;32;96;160mw!48;2;96;128;224@38;2;96;128;224mh$*_%%%##~$',
  '*_%%%#~!48;2;90;125;225@38;2;90;125;225mh!48;2;14;50;87@38;2;14;50;87mL!48;2;78;49;35@38;2;78;49;35mQ!48;2;108;79;5`2;108;79;50mZ!48;2;185;120;71@38;2;185;120;71md!48;2;224;157;9`2;224;157;90ma!48;2;3;4;5@38;2;3;4;5mX!48;2;31;94;157@38;2;31;94;157mm!48;2;32;96;16`2;32;96;160mw!48;2;96;128;224@38;2;96;128;224mh$*_%%%##~$',
  '*_%%%#~!48;2;96;128;224@38;2;96;128;224mh!48;2;33;100;167@38;2;33;100;167mw!48;2;22;83;142@38;2;22;83;142mZ!48;2;19;80;141@38;2;19;80;141mZ!48;2;23;38;58@38;2;23;38;58mC!48;2;32;47;62@38;2;32;47;62mL!48;2;29;87;145@38;2;29;87;145mm!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;96;128;224@38;2;96;128;224mh$*_%%%##~$',
  '*_%%%#~!48;2;96;128;224@38;2;96;128;224mh!48;2;32;96;16`2;32;96;160mw!48;2;32;97;162@38;2;32;97;162mw!48;2;32;97;162@38;2;32;97;162mw!48;2;31;99;166@38;2;31;99;166mw!48;2;30;98;166@38;2;30;98;166mw!48;2;32;97;162@38;2;32;97;162mw!48;2;32;96;16`2;32;96;160mw!48;2;32;96;16`2;32;96;160mw!48;2;99;130;227@38;2;99;130;227mh$*_%%%##~$',
  '*_%%%#~!48;2;100;133;233@38;2;100;133;233ma!48;2;37;102;17`2;37;102;170mq!48;2;33;100;166@38;2;33;100;166mw!48;2;33;100;166@38;2;33;100;166mw!48;2;33;100;166@38;2;33;100;166mw!48;2;33;100;166@38;2;33;100;166mw!48;2;33;100;166@38;2;33;100;166mw!48;2;33;100;166@38;2;33;100;166mw!48;2;33;100;166@38;2;33;100;166mw!48;2;63;115;196@38;2;63;115;196md!48;2;55;73;128@38;2;55;73;128mZ$*_%%%#~$',
  '*_%%%#~!48;2;66;88;155@38;2;66;88;155mq!48;2;57;82;146@38;2;57;82;146mw!48;2;19;64;109@38;2;19;64;109m0!48;2;19;64;109@38;2;19;64;109m0!48;2;19;64;109@38;2;19;64;109m0!48;2;19;64;109@38;2;19;64;109m0!48;2;19;64;109@38;2;19;64;109m0!48;2;19;64;109@38;2;19;64;109m0!48;2;19;64;109@38;2;19;64;109m0!48;2;16;62;106@38;2;16;62;106m0!48;2;71;94;165@38;2;71;94;165mq$*_%%%#~$',
  '*_%%%##~!48;2;43;41;14@38;2;43;41;14mJ!48;2;45;42;16@38;2;45;42;16mJ!48;2;45;42;16@38;2;45;42;16mJ!48;2;45;42;16@38;2;45;42;16mJ!48;2;45;42;16@38;2;45;42;16mJ!48;2;45;42;16@38;2;45;42;16mJ!48;2;45;42;16@38;2;45;42;16mJ!48;2;45;42;16@38;2;45;42;16mJ!48;2;45;42;16@38;2;45;42;16mJ$*_%%%##~$',
  '*_%%%##~!48;2;66;66;33@38;2;66;66;33mQ!48;2;66;66;33@38;2;66;66;33mQ!48;2;66;66;33@38;2;66;66;33mQ!48;2;66;66;33@38;2;66;66;33mQ!48;2;66;66;33@38;2;66;66;33mQ!48;2;66;66;33@38;2;66;66;33mQ!48;2;66;66;33@38;2;66;66;33mQ!48;2;66;66;33@38;2;66;66;33mQ!48;2;66;66;33@38;2;66;66;33mQ$*_%%%##~$',
  '*_%%%##~!48;2;65;65;33@38;2;65;65;33mQ!48;2;65;65;33@38;2;65;65;33mQ!48;2;65;65;33@38;2;65;65;33mQ!48;2;65;65;33@38;2;65;65;33mQ!48;2;65;65;33@38;2;65;65;33mQ!48;2;8;8;4@38;2;8;8;4mX!48;2;64;65;32@38;2;64;65;32mQ!48;2;64;65;32@38;2;64;65;32mQ!48;2;64;65;32@38;2;64;65;32mQ$*_%%%##~$',
  '*_%%%##~!48;2;49;52;25@38;2;49;52;25mC!48;2;49;52;25@38;2;49;52;25mC!48;2;49;52;25@38;2;49;52;25mC!48;2;49;52;25@38;2;49;52;25mC!48;2;57;57;28@38;2;57;57;28mL$*_~!48;2;35;27;16@38;2;35;27;16mJ!48;2;35;27;16@38;2;35;27;16mJ!48;2;35;27;16@38;2;35;27;16mJ$*_%%%##~$',
  '*_%%%##~!48;2;80;49;32@38;2;80;49;32mQ!48;2;77;46;31@38;2;77;46;31mL!48;2;77;46;31@38;2;77;46;31mL!48;2;77;46;31@38;2;77;46;31mL!48;2;1;1;`2;1;1;0mX$*_~!48;2;187;124;78@38;2;187;124;78mb!48;2;187;124;78@38;2;187;124;78mb!48;2;187;124;78@38;2;187;124;78mb$*_%%%##~$',
  '*_%%%##~!48;2;212;142;89@38;2;212;142;89mh!48;2;222;155;94@38;2;222;155;94ma!48;2;222;155;94@38;2;222;155;94ma!48;2;222;155;94@38;2;222;155;94ma$*_#~!48;2;228;163;98@38;2;228;163;98mo!48;2;228;163;98@38;2;228;163;98mo!48;2;228;163;98@38;2;228;163;98mo$*_%%%##~$',
  '*_%%%##~!48;2;50;30;2`2;50;30;20mJ!48;2;225;161;97@38;2;225;161;97ma!48;2;225;161;97@38;2;225;161;97ma!48;2;225;161;97@38;2;225;161;97ma$*_#~!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma$*_%%%##~$',
  '*_%%%###~!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma$*_#~!48;2;230;164;99@38;2;230;164;99mo!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma$*_%%%##~$',
  '*_%%%###~!48;2;225;161;96@38;2;225;161;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma$*_#~!48;2;130;82;53@38;2;130;82;53mm!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma$*_%%%##~$',
  '*_%%%###~!48;2;226;159;96@38;2;226;159;96ma!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma$*_##~!48;2;224;160;96@38;2;224;160;96ma!48;2;224;160;96@38;2;224;160;96ma$*_%%%##~$',
  '*_%%%###~!48;2;93;56;37@38;2;93;56;37m0!48;2;231;165;99@38;2;231;165;99mo!48;2;231;165;99@38;2;231;165;99mo$*_##~!48;2;231;165;99@38;2;231;165;99mo!48;2;231;165;99@38;2;231;165;99mo$*_%%%##~$',
  '*_%%%####~!48;2;162;113;63@38;2;162;113;63mp!48;2;162;113;63@38;2;162;113;63mp$*_##~!48;2;165;115;66@38;2;165;115;66mp!48;2;165;115;66@38;2;165;115;66mp$*_%%%##~$',
  '*_%%%####~!48;2;144;147;149@38;2;144;147;149mh!48;2;144;147;149@38;2;144;147;149mh$*_##~!48;2;119;121;123@38;2;119;121;123md!48;2;119;121;123@38;2;119;121;123md$*_%%%##~$',
  '*_%%%####~!48;2;142;142;142@38;2;142;142;142mk!48;2;142;142;142@38;2;142;142;142mk$*_##~!48;2;19;19;19@38;2;19;19;19mU!48;2;19;19;19@38;2;19;19;19mU$*_%%%##~$',
  '*_%%%%%%%%####~$',
  '*_%%%%%%%%####~$'
];

// hackish manual expansion of a few common patterns.
let sequences = {
  '`': '0@38;',
  '!': '$[',
  '@': 'm[',
  '%': '~$*_'.repeat(5),
  '#': '~$*_',
  '$': '[0m',
  '*': '[32;2;0;0;0m',
  '_': '[38;2;0;0;0m',
  '~': ' '
};
