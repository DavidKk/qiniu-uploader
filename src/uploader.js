import isFunction from 'lodash/isFunction'
import defaultsDeep from 'lodash/defaultsDeep'
import { File } from './file'
import * as http from './request'
import { Tunnel } from './tunnel'
import {
  G, M,
  BASE64_REGEXP, REMOTE_FILE_URL_REGEXP,
  SUPPORTED
} from './config'
import { sizeStringify } from './utils'

/**
 * 七牛上传类
 * @class
 */
export class Uploader {
  /**
   * 浏览器是否支持
   * @type {Boolean}
   */
  static supported = SUPPORTED

  /**
   * 上传类默认配置
   * @type {Object}
   * @property {Boolean} defaultSettings.maxFileSize 最大文件大小
   * @property {Boolean} defaultSettings.minFileSize 最小文件大小
   */
  static defaultSettings = {
    maxFileSize: G,
    minFileSize: 0,
    resumingByFileSize: 4 * M
  }

  /**
   * 上传类
   * @param {Object} [options={}] 配置，可以参考{@link Uploader.defaultSettings}
   * @param {Object} [options.maxFileSize=1 * G] 最大文件大小
   * @param {Object} [options.minFileSize=0] 最小文件大小
   * @return {Uploader} 上传对象
   */
  constructor (options = {}, request = http) {
    /**
     * 配置
     * @type {Object}
     */
    this.settings = defaultsDeep({}, options, this.constructor.defaultSettings)

    /**
     * 通道类对象
     * @type {Tunnel}
     */
    this.tunnel = new Tunnel(this.settings, request)
  }

  /**
   * 上传
   * @param {File|Blob|String|Array} file 需要上传的文件
   * @param {Object} [params={}] 上传参数
   * @param {String} params.token 七牛令牌
   * @param {Object} [options={}] 上传配置
   * @param {String} [options.host] 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} callback 回调函数
   * @return {Request} 请求对象
   */
  upload (file, params = {}, options = {}, callback) {
    if (arguments.length < 3) {
      return this.upload(file, params, {}, options)
    }

    if (!isFunction(callback)) {
      throw new Error('Callback is not provided')
    }

    options = defaultsDeep(options, this.settings)

    if (REMOTE_FILE_URL_REGEXP.test(file)) {
      this.fetch(file, params, options, callback)
      return
    }

    if (BASE64_REGEXP.test(file)) {
      this.tunnel.up64(file, params, options, callback)
      return
    }

    if (file.size > options.maxFileSize) {
      callback(new Error(`File size must be smaller than ${sizeStringify(options.maxFileSize)}`))
      return
    }

    if (file.size < options.minFileSize) {
      callback(new Error(`File size must be larger than ${sizeStringify(options.minFileSize)}`))
      return
    }

    file = file instanceof File ? file : new File(file)

    file.size > options.resumingByFileSize
      ? this.tunnel.resuming(file, params, options, callback)
      : this.tunnel.upload(file, params, options, callback)
  }

  /**
   * 抓取远程文件
   * @param {String} file 远程文件
   * @param {Object} [params={}] 上传参数
   * @param {String} params.token 七牛令牌
   * @param {Object} [options={}] 上传配置
   * @param {String} [options.host] 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} callback 回调函数
   * @return {Request} 请求对象
   */
  fetch (file, params, options, callback) {
    if (arguments.length < 3) {
      return this.fetch(file, params, {}, options)
    }

    if (!isFunction(callback)) {
      throw new Error('Callback is not provided')
    }

    if (!REMOTE_FILE_URL_REGEXP.test(file)) {
      callback(new TypeError('File is not a valid remote url'))
      return
    }

    options = defaultsDeep(options, this.settings)
    this.tunnel.fetch(file, params, options, callback)
  }
}
