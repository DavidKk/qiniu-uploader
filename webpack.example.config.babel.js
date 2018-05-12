import path from 'path'
import WebpackMerger from 'webpack-merge'
import webpackConf from './webpack.develop.config.babel'

export default WebpackMerger(webpackConf, {
  output: {
    path: path.join(__dirname, './gh-pages/demo'),
    publicPath: '/qiniu-uploader/demo',
    umdNamedDefine: false
  }
})
