import webpack from 'webpack'
import WebpackMerger from 'webpack-merge'
import webpackConf from './webpack.common.config.babel'

const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin

export default WebpackMerger(webpackConf, {
  devtool: 'source-map',
  plugins: [
    new UglifyJsPlugin({
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
})
