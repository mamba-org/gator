// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;

module.exports = [
  {
    entry: { gator: './lib/gator.js', notebook: './lib/notebook.js' },
    output: {
      path: path.resolve(
        __dirname,
        '..',
        '..',
        'mamba_gator',
        'navigator',
        'static'
      ),
      filename: '[name].bundle.js'
    },
    bail: true,
    devtool: 'source-map',
    module: {
      rules: [
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
        { test: /\.html$/, use: 'file-loader' },
        { test: /\.md$/, use: 'raw-loader' },
        { test: /\.(jpg|png|gif)$/, use: 'file-loader' },
        { test: /\.js.map$/, use: 'file-loader' },
        {
          test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
          use: 'url-loader?limit=10000&mimetype=application/font-woff'
        },
        {
          test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
          use: 'url-loader?limit=10000&mimetype=application/font-woff'
        },
        {
          test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
          use: 'url-loader?limit=10000&mimetype=application/octet-stream'
        },
        { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, use: 'file-loader' },
        {
          // In .css files, svg is loaded as a data URI.
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          issuer: /\.css$/,
          use: {
            loader: 'svg-url-loader',
            options: { encoding: 'none', limit: 10000 }
          }
        },
        {
          // In .ts and .tsx files (both of which compile to .js), svg files
          // must be loaded as a raw string instead of data URIs.
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          issuer: /\.js$/,
          use: {
            loader: 'raw-loader'
          }
        }
      ]
    },
    optimization: {
      sideEffects: false,
      splitChunks: {
        chunks: 'all'
      }
    },
    plugins: [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: path.resolve(__dirname, 'webpack-report.html')
      })
    ]
  }
];
