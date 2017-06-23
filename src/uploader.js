import { File } from './file'
import { Tunnel } from './tunnel'
import { G, M, BASE64_REGEXP } from './config'

export class Uploader {
  /**
   * 上传类默认配置
   * @type {Object}
   * @property {Boolean} defaultSettings.maxFileSize 最大文件大小
   * @property {Boolean} defaultSettings.minFileSize 最小文件大小
   */
  static defaultSettings = {
    maxFileSize: G,
    minFileSize: 0
  }

  /**
   * 上传类
   * @param {Object} [options={}] 配置，可以参考{@link Uploader.defaultSettings}
   * @param {Object} [options.maxFileSize=1 * G] 最大文件大小
   * @param {Object} [options.minFileSize=0] 最小文件大小
   * @return {Uploader} 上传对象
   */
  constructor (options = {}) {
    /**
     * 令牌
     * @type {String}
     */
    this.token = ''

    /**
     * 令牌过期时间
     * @type {Integer}
     */
    this.tokenExpire = 0

    /**
     * 通道类对象
     * @type {Tunnel}
     */
    this.tunnel = new Tunnel(options)
  }

  /**
   * 上传
   *
   * @param {File|Blob|String|Array} file 需要上传的文件
   * @param {Object} params 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Object} [options={}] 上传配置
   * @param {String} [options.host] 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} callback 回调函数
   * @return {Request} 请求对象
   */
  upload (file, params, options, callback) {
    if (BASE64_REGEXP.test(file)) {
      this.tunnel.up64(file, params, options, callback)
      return
    }

    file = file instanceof File ? file : new File(file)

    file.size > 4 * M
    ? this.tunnel.resuming(file, params, options, callback)
    : this.tunnel.upload(file, params, options, callback)
  }
}
