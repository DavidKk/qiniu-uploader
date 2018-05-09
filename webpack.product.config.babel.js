import webpack from 'webpack'
import WebpackMerger from 'webpack-merge'
import webpackConf from './webpack.common.config.babel'

export default WebpackMerger(webpackConf, {
  mode: 'production',
  devtool: 'source-map',
})
