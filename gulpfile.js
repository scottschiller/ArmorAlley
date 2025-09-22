/**
 * Armor Alley: Gulp "task runner" build/compile script.
 * Use via `npx gulp`, or install `gulp-cli` and run `gulp`.
 *
 * Initial setup:
 *  `npm install`
 *
 * https://www.npmjs.com/package/gulp-cli
 * For more details, see src/README.md.
 *
 * ADDITIONAL REQUIREMENTS
 * `ffmpeg` with `libmp3lame` and `libvorbis` are required for encoding audio.
 * `imagemagick` is required for generating the image spritesheet.
 *
 * Default task, "compiled" game in `dist/` path:
 *  `gulp` (with `gulp-cli`), or `npx gulp`
 *
 * Faster build, excluding audio sprites (handy for code changes):
 *  `gulp build`
 *
 * MP3 + OGG "audio sprite" files take some time to encode.
 * This is included in the default task, but not "build."
 * Once this task has run, `build` will include the new sprite + config.
 * This can be run if you only want to update the audio sprites.
 *  `gulp audio`
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
  return `${assetPath}/${path}`;
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
        replace(`${!isFloppy ? '../../' : ''}${assetPath}/`, `${distRootPath}/`)
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
    return src([
      `${assetPath}/${imagePath}/**/*`,
      `!${assetPath}/${imagePath}/*.png`
    ]).pipe(dest(dp.image));
  },

  function manifest() {
    return src(`${assetPath}/manifest.json`).pipe(dest('dist'));
  },

  function mp3() {
    return src(`${assetPath}/${audioPath}/mp3/bnb/*.*`, bnb).pipe(
      dest(`${dp.audio}/mp3/bnb`)
    );
  },

  function ogg() {
    return src(`${assetPath}/${audioPath}/ogg/bnb/*.*`, bnb).pipe(
      dest(`${dp.audio}/ogg/bnb`)
    );
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

function createAudioSpriteOGG() {
  return binarySrc(audioSpriteFiles)
    .pipe(
      audiosprite({
        ...getAudioOptions(),
        export: 'ogg',
        // OGG doesn't do VBR, but can match MP3 quality at lower bitrate.
        bitrate: 64
      })
    )
    .pipe(dest(dp.audio));
}

function hearThatFloppy(callback) {
  pipeline(
    // lo-fi OGG sprite for floppy version
    binarySrc(audioSpriteFiles),
    audiosprite({
      ...getAudioOptions(),
      export: 'ogg',
      // OGG doesn't do VBR, but can match MP3 quality at lower bitrate.
      bitrate: 32,
      samplerate: 22050
    }),
    dest(dp.audio),
    callback
  );
}

function encodeStandaloneFiles() {
  return merge([encodeStandaloneMP3(), encodeStandaloneOgg()]);
}

function encodeStandaloneMP3() {
  return binarySrc(standaloneFiles)
    .pipe(
      ffmpeg('mp3', function (cmd) {
        return cmd
          .audioBitrate('128k')
          .audioChannels(2)
          .audioCodec('libmp3lame');
      })
    )
    .pipe(dest(`${dp.audio}/mp3`));
}

function encodeStandaloneOgg() {
  return binarySrc(standaloneFiles)
    .pipe(
      ffmpeg('ogg', function (cmd) {
        return cmd
          .audioBitrate('128k')
          .audioChannels(2)
          .audioCodec('libvorbis');
      })
    )
    .pipe(dest(`${dp.audio}/ogg`));
}

function cleanAudioDist() {
  // delete previously-built audio assets
  return clean([dp.audio]);
}

function cleanAudioTemp() {
  // delete temporary audio JS / JSON, post-build
  return clean([`${dp.audio}/*.json`]);
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
  createAudioSpriteOGG,
  buildAudioSpriteConfig,
  encodeStandaloneFiles,
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
 */
task('build', series(aa, cleanDist, ...buildTasks));

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
