import webpack from 'webpack'
import WebpackMerger from 'webpack-merge'
import webpackConf from './webpack.common.config.babel'

const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;

export default WebpackMerger(webpackConf, {
  plugins: [
    new UglifyJsPlugin({
      sourceMap : false,
      mangle    : false,
      compress  : {
        warnings: false,
      },
      output: {
        comments: false
      },
    }),
  ],
})