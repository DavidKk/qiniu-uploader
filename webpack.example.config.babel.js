import path from 'path'
import WebpackMerger from 'webpack-merge'
import webpackConf from './webpack.develop.config.babel'

export default WebpackMerger(webpackConf, {
  output: {
    path: path.join(__dirname, './demo'),
    publicPath: '/qiniu-uploader/',
    umdNamedDefine: false
  }
})
