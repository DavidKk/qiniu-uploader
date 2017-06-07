require('babel-register')
require('babel-preset-es2015')
require('babel-preset-stage-0')

module.exports = require('./karma.conf.babel.js').default
