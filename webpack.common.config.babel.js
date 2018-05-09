import path from 'path'
import WebpackMerger from 'webpack-merge'
import pkg from './package.json'

export let resolveModules = [
  path.join(__dirname, './node_modules'),
  path.join(__dirname, './src')
]

export let rules = [
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
  mode: 'production',
  devtool: 'inline-source-map',
  entry: {
    [pkg.name]: path.join(__dirname, './src/index.js')
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
