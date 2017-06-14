import _ from 'lodash'
import path from 'path'
import WebpackMerger from 'webpack-merge'
import webpackConf from './webpack.common.config.babel'
import { launchers as sauceBrowsers } from './saucelabs.browser.conf'

const basePath = path.resolve('./')

export default function (config) {
  let customLaunchers = {
    'SL_CHROME': {
      base: 'SauceLabs',
      browserName: 'chrome',
      version: '54',
    },
  }

  let karmaConf = {
    basePath: basePath,
    browsers: ['PhantomJS'],
    browserDisconnectTimeout: 5000,
    browserNoActivityTimeout: 5000,
    browserDisconnectTolerance: 10,
    frameworks: ['mocha', 'chai', 'sinon'],
    files: ['./unitest/**/*.spec.js'],
    client: {
      chai: {
        includeStack: true
      }
    },
    preprocessors: {
      './unitest/**/*.spec.js': [
        'webpack',
        'sourcemap'
      ]
    },
    reporters: [
      'mocha'
    ],
    webpack: webpackConf,
    webpackMiddleware: {
      noInfo: false,
      stats: true
    },
    /**
     * in empty test folder, it will return
     * status 1 and throw error.
     * set 'failOnEmptyTestSuite' to false
     * will resolve this problem.
     */
    failOnEmptyTestSuite: false,
    autoWatch: false,
    singleRun: true,
    colors: true,
    plugins: [
      'karma-sauce-launcher',
      'karma-phantomjs-launcher',
      'karma-webpack',
      'karma-chai',
      'karma-sinon',
      'karma-mocha',
      'karma-mocha-reporter',
      'karma-coverage-istanbul-reporter',
      'karma-sourcemap-loader'
    ]
  }

  if (process.env.COVERAGE) {
    _.merge(karmaConf, {
      reporters: [
        'mocha',
        'coverage-istanbul'
      ],
      coverageIstanbulReporter: {
        reports: ['lcov', 'text-summary'],
        fixWebpackSourcePaths: true
      },
      webpack: WebpackMerger(webpackConf, {
        module: {
          rules: [
            {
              test: /\.js$/,
              enforce: 'post',
              loader: 'istanbul-instrumenter-loader',
              include: webpackConf.resolve.modules,
              exclude: [/node_modules/, /unitest/],
              query: {
                esModules: true
              }
            }
          ]
        }
      })
    })
  }

  if (process.env.TRAVIS) {
    _.merge(karmaConf, {
      customLaunchers: sauceBrowsers,
      browsers: Object.keys(sauceBrowsers),
      sauceLabs: {
        testName: 'test',
        retryLimit: 3,
        startConnect: false,
        recordVideo: false,
        recordScreenshots: false,
        options: {
          'selenium-version': '2.53.0',
          'command-timeout': 600,
          'idle-timeout': 600,
          'max-duration': 5400,
        }
      },
    })
  }

  config.set(karmaConf)
};
