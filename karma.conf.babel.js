import _ from 'lodash'
import pkg from './package.json'
import path from 'path'
import WebpackMerger from 'webpack-merge'
import webpackConf from './webpack.common.config.babel'
import { launchers as sauceBrowsers } from './saucelabs.browser.conf'

const basePath = path.resolve('./')

export default function (config) {
  let karmaConf = {
    basePath: basePath,
    browsers: ['PhantomJS'],
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
    karmaConf.reporters = [
      'mocha',
      'coverage-istanbul'
    ]

    karmaConf.coverageIstanbulReporter = {
      reports: ['lcov', 'text-summary'],
      fixWebpackSourcePaths: true
    }

    karmaConf.webpack = WebpackMerger(webpackConf, {
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
  }

  if (process.env.TRAVIS) {
    process.env.SAUCE_USERNAME = 'DavidKk';
    process.env.SAUCE_ACCESS_KEY = 'df6414d8-7bbc-46ef-bcd9-75b9b6fdddf3';

    karmaConf.customLaunchers = sauceBrowsers
    karmaConf.browsers = Object.keys(sauceBrowsers)
    karmaConf.browserDisconnectTimeout = 5000
    karmaConf.browserNoActivityTimeout = 5000
    karmaConf.browserDisconnectTolerance = 10
    karmaConf.sauceLabs = {
      testName: pkg.name,
      build: `TRAVIS #${process.env.TRAVIS_BUILD_NUMBER} (${process.env.TRAVIS_BUILD_ID})`,
      tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER,
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
    }

    karmaConf.plugins.push('karma-saucelabs-launcher')
    // karmaConf.plugins.push('karma-sauce-launcher')
  }

  config.set(karmaConf)
}
