const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development', // Change to 'production' as needed
  devtool: 'source-map',
  entry: {
    background: path.resolve(__dirname, 'src/background.js'),
    popup: path.resolve(__dirname, 'static/popup.js')
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    fallback: {
      "process/browser": require.resolve("process/browser")
    },
    alias: {
      // Also alias non-prefixed "async_hooks" to our polyfill
      "async_hooks": path.resolve(__dirname, 'empty.js')
    }
  },
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        }
      }
    ]
  },
  plugins: [
    // Replace any import of "node:async_hooks" with our polyfill from empty.js
    new webpack.NormalModuleReplacementPlugin(/^node:async_hooks$/, resource => {
      resource.request = path.resolve(__dirname, 'empty.js');
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'static'),
          to: path.resolve(__dirname, 'dist'),
          globOptions: {
            ignore: ['popup.js']
          }
        }
      ]
    })
  ]
};