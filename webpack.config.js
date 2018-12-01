const { join, resolve } = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  devtool: 'source-map',
  entry: './src/index.ts',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    path: join(resolve('.'), 'dist/'),
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
