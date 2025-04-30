const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development', // Change to 'production' as needed
  devtool: 'source-map',
  entry: {
    background: path.resolve(__dirname, 'src/background.js'),
    popup: path.resolve(__dirname, 'static/popup.js'),
    tools: path.resolve(__dirname, 'src/langchain/tools.js'),
    content_script: path.resolve(__dirname, 'src/content_script.js')
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    fallback: {
      "process/browser": require.resolve("process/browser"),
      "path": require.resolve("path-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "url": require.resolve("url/"),
      "util": require.resolve("util/"),
      "zlib": require.resolve("browserify-zlib"),
      "assert": require.resolve("assert/"),
      "async_hooks": path.resolve(__dirname, 'empty.js')
    },
    alias: {
      "async_hooks": path.resolve(__dirname, 'empty.js')
    },
    extensions: ['.js', '.mjs'],
  },
  target: "webworker",
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        }
      }
    ]
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(/^node:async_hooks$/, resource => {
      resource.request = path.resolve(__dirname, 'empty.js');
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'static'),
          to: path.resolve(__dirname, 'dist'),
          globOptions: {
            ignore: ['**/popup.js']
          }
        }
      ]
    })
  ],
  experiments: {
    topLevelAwait: true
  }
};