import webpack from 'webpack'
import WebpackMerger from 'webpack-merge'
import webpackConf from './webpack.common.config.babel'

let plugins = [
  new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
    mangle: false,
    compress: {
      warnings: false
    },
    output: {
      comments: false
    }
  })
]

export default WebpackMerger(webpackConf, {
  devtool: 'source-map',
  plugins
})
