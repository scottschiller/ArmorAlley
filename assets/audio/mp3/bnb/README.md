NOTE: BnB .WAV sound assets are omitted from source control,
but may be available separately and can be placed in `assets/wav/bnb`.
https://github.com/scottschiller/ArmorAlley/issues/29

The gulp build script uses the .WAV files to encode MP3 + OGG versions
in `dist/audio/mp3/bnb` and `dist/audio/ogg/bnb` respectively.

Run `gulp build-bnb` from the AA root path to encode the MP3 + OGG files.
This involves encoding over 1,000 files, so it may take a few minutes.

Once encoded, `gulp` (default build task) will copy these to the `dist` path.
 