const path = require('path');
const fs = require('fs');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/index.ts',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    path: path.join(path.resolve('.'), 'dist/'),
    filename: 'index.js',
    library: 'twilly',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: ['.ts', '.js', '.d.ts'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: { loader: 'ts-loader' },
      },
    ],
  },
};
