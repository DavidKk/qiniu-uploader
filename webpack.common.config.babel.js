import path from 'path'
import WebpackMerger from 'webpack-merge'

let resolveModules = [
  path.join(__dirname, './node_modules'),
  path.join(__dirname, './src')
]

let rules = [
  {
    loader: 'babel-loader',
    exclude: [/node_modules/],
    options: {
      presets: [
        require.resolve('babel-preset-es2015'),
        require.resolve('babel-preset-stage-0')
      ]
    }
  }
]

export default WebpackMerger({
  devtool: 'inline-source-map',
  entry: {
    qiniuUploader: path.join(__dirname, './src/index.js')
  },
  output: {
    path: path.join(__dirname, './dist'),
    publicPath: '/',
    filename: '[name].js',
    library: pkg.name,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: rules
  },
  resolve: {
    modules: resolveModules
  },
  resolveLoader: {
    modules: resolveModules
  }
})
