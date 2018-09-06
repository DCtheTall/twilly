const path = require('path');

module.exports = {
  entry: './src/main.ts',
  output: {
    path: path.join(path.resolve('.'), 'dist/'),
    filename: 'index.js'
  },
  resolve: {
    extensions: ['.ts', '.js', '.d.ts'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: { loader: 'awesome-typescript-loader' },
      },
    ],
  },
};
