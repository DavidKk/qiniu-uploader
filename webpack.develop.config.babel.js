import WebpackMerger from 'webpack-merge'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import webpackConf from './webpack.common.config.babel'

let plugins = [
  new HtmlWebpackPlugin()
]

export default WebpackMerger(webpackConf, { plugins })
