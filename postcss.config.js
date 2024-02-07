module.exports = {
    plugins: [
        require('cssnano')({
          preset: [ 
            require('cssnano-preset-default'),
            {
              discardComments: false,
              normalizeWhitespace: false,
              reduceTransforms: false,
              preferredQuote: 'single',
              autoPrefixer: true
            }
          ]
        }),
    ],
};