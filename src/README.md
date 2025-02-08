**Armor Alley: Remastered**
---
~~~
                            ▄██▀      
                          ▄█▀         
          ▄████▄▄▄▄▄▄▄▄▄ █▀▄▄▄▄▄▄▄▄▄▄▄
                      ▄█████▄▄▄▄  ▀▀▀ 
      ▄         ▄████████████████▄   
      ██       ▀████████████████████▄
      ▀███    ▄██████████████████████
       ████▄▄███████████████████████▀ 
      ████████▀▀▀▀▀▀▀▀████▀█▀▀▀▀█▀
       ██▀              ██▘▘ ██▘▘

 A R M O R  A L L E Y :: R E M A S T E R E D
~~~

A browser-based interpretation of the Macintosh + MS-DOS releases of Armor Alley.

Copyright (c) 2013, Scott Schiller

https://armor-alley.net/

Code provided under the [Attribution-NonCommercial 3.0 Unported (CC BY-NC 3.0) License](https://creativecommons.org/licenses/by-nc/3.0/)

Original game Copyright (C) 1989 - 1991, Information Access Technologies.

https://en.wikipedia.org/wiki/Armor_alley

——///——

## Quick links

* 10th Anniversary summary video (3m 45s): https://youtu.be/oYUCUvg02rY

* 2022 Demo, features and walk-through of "extreme" mode (55 minutes): https://youtu.be/9BQ62c7u2JM 

* [Original article about building "V1.0"](https://www.schillmania.com/content/entries/2013/armor-alley-web-prototype/) (from 2013)


## Developer Notes

**Requirements: Running "Armor Alley" locally**

Armor Alley can be served via your HTTP daemon of choice.

In the olden days, you could drag `index.html` right into a browser where it would open via `file://` and run local and/or remote JavaScript, no problem.

For (now-obvious) security reasons, that is no longer the case. Armor Alley uses JavaScript Modules, which must be served via HTTP.

**CLI set-up**

The npm `http-server` package is popular and convenient, and supports byte serving (useful for HTML5 audio/video) and caching. This is preferable to "simpler" built-in servers, e.g. `python3 -m http.server`.

**Install `http-server`**

* Install [npm + nodeJS](https://nodejs.org), if you don't have it yet. On a Mac with homebrew, try `brew install npm`.

* From the command prompt, within the Armor Alley directory:

    `npm install http-server`

    If all is well, you should now be able to start the server and load Armor Alley.

**Start `http-server`**

* `npx http-server`

  At the time of writing, `http-server` uses port 8080 by default. Your OS may prompt you to allow incoming connections on this port.

**Start the game**

* Open a browser, and load up [http://localhost:8080/](http://localhost:8080/).

If everything is working, you should be looking at your local copy of Armor Alley in your browser of choice. If you use uMatrix or other browser security add-ons, you may need to allow JS + CSS for `localhost`.

---

**Requirements: Building "Armor Alley" JS + CSS bundles + spritesheet(s) with Gulp**

**_Disclaimer:_** I suspect this section is very niche content, and likely not applicable. Notwithstanding, it is documented for my own reference and provided in case anyone else is poking around. ;)

**Note**: If you are editing the source or playing the game locally, then you don't need to worry about the build / bundling process; it's fine to load the raw ES6 modules and unminified CSS. If you're deploying this to a production site for numerous users and want to optimize performance, read on - and tell me about your use case, because that sounds interesting. ;)

**Install required dev dependencies**

* Install [npm + nodeJS](https://nodejs.org), if you don't have it yet. On a Mac with homebrew, try `brew install npm`. The AA project uses a variety of npm packages ("libraries") for its build process.

* With `npm` installed, run this command within the AA home directory (which has `package.json`):

  `npm install`

  (Wait while "magic" happens)

  This should grab all of the required "dev dependencies."

  If all is well, you should now have "gulp" and related packages which bundle, minify and concatenate JS + CSS files and generate spritesheet assets.

**Install required system libraries**

* The build process for Armor Alley includes encoding .WAV audio to .MP3 and .OGG formats via `ffmpeg`, and building spritesheets via `imagemagick`.

* You will need to install `ffmpeg` with `libmp3lame` and `libvorbis` support in order to encode .MP3 and .OGG, respectively. You may be able to obtain a precompiled binary that has these options. Package managers like `brew`, `apt-get` etc. are likely a good place to start. On macOS with "homebrew", Vorbis and lame may be included by default - so `brew install ffmpeg` may work. If not, `brew install ffmpeg --with-theora --with-libvorbis` may be the next thing to try.

* On Windows, `winget` is available by default; try `winget install "FFmpeg (Essentials Build)"` for a build with MP3 + OGG support. For imagemagick, you can try `winget install ImageMagick.Q8`.

**Build the JS bundle + minified CSS**

* To build the assets, run this from the CLI in the AA home directory (which has `gulpfile.js`)...

  `gulp`

  Ideally, this will run without a bunch of errors. Take a look at [gulpfile.js](gulpfile.js) for some notes as to requirements, and troubleshooting.

  Gulp should dump a bunch of output, and ultimately create files under `dist/js`, `dist/css` and the like. This is the "bundled" JS, and minified CSS that the game loads in production mode. The game will load faster using these files, vs. the raw development source files.

  Whenever you make changes to the source JS or CSS, you can re-run `gulp` to update the "build." I also recommend updating the version string in `index.html`, if you are pushing this to production. More on that below.

**Armor Alley "Boot Loader": dev vs. production assets**

The game is served from a static `index.html` file, and so there is a small asset loader baked into it. This is a trade-off, to avoid requiring any server-side scripting language - e.g., PHP or Node etc.

Within `index.html` is a "boot" script that checks the window location / host name, and loads "development" vs. "production" JS / CSS appropriately.

Based on the result, the boot loader will use either the source versions of JS files, _or_, the compressed / optimized bundled versions for production. If you're pushing this to a site for other users and you want better load times, you'll want to edit the logic within `index.html` that checks for the "production" domain.

Take note of the versioning pattern in use, as well.

**.htaccess: Caching and URL versioning pattern**

A "vintage" Apache `.htaccess` file is provided that sets 1-year cache headers on static assets, and simple asset versioning / cache busting to ensure clients get the latest and greatest.

By default, the boot loader appends the versioning string to JS + CSS assets in production.

The versioning pattern allows for a ".V" to be appended to a static file, so `aa.css.V123` actually hits `aa.css` on disk.
```
RewriteRule (.*)\.(.*)\.[vV]\d+$ $1.$2 [L]
```
You may notice a 404 when loading the game, where a JS file fails. In dev, this is not fatal and can be ignored. If your server doesn't grok `.htaccess` files, then the request for e.g. `dist/aa.js.V20240404` will throw a 404 when the actual file on disk is `dist/aa.js`.

If you aren't using Apache in production, then asset versioning will fail and the boot loader will fall back to loading without the versioning. To disable the versioning entirely, comment out the line that assigns `v` the version string, e.g., `v = '.V20240420';` within `index.html`.