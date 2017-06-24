import path from 'path'
import autoprefixer from 'autoprefixer'
import WebpackMerger from 'webpack-merge'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ExtractTextPlugin from 'extract-text-webpack-plugin'
import webpackConf, { resolveModules } from './webpack.common.config.babel'
import pkg from './package.json'

let rules = [
  {
    test: /\.(jade|pug)$/,
    use: [
      {
        loader: 'pug-loader'
      }
    ]
  },
  {
    test: /\.(sass|scss)$/,
    use: ExtractTextPlugin.extract({
      fallback: 'style-loader',
      use: [
        {
          loader: 'css-loader',
          options: {
            sourceMap: true
          }
        },
        {
          loader: 'sass-loader',
          options: {
            includePaths: resolveModules
          }
        },
        {
          loader: 'postcss-loader',
          options: {
            plugins: [
              autoprefixer({
                browsers: [
                  'last 10 version',
                  'ie >= 9'
                ]
              })
            ]
          }
        }
      ]
    })
  }
]

let plugins = [
  /**
   * Extract style file
   * Inline styles can be externally optimized for loading
   */
  new ExtractTextPlugin({
    filename: 'styles/[name].[contenthash].css',
    allChunks: true
  }),

  /**
   * Entry template
   */
  new HtmlWebpackPlugin({
    filename: 'index.html',
    template: './example/index.pug'
  })
]

export default WebpackMerger(webpackConf, {
  entry: {
    [pkg.name]: path.join(__dirname, './example/index.js')
  },
  module: {
    rules: rules
  },
  plugins
})
