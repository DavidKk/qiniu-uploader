import { File } from './file'
import { Tunnel } from './tunnel'
import { M, BASE64_REGEXP } from './config'

/**
 * 上传类
 *
 * @class Uploader
 */
export class Uploader {
  /**
   * Creates an instance of Uploader
   *
   * @memberof Uploader
   */
  constructor (options) {
    this.token = ''
    this.tokenExpire = 0
    this.tunnel = new Tunnel(options)
  }

  /**
   * 上传
   *
   * @param {File|Blob|String|Array} file
   * @param {Object} params 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Object} [options={}] 上传配置
   * @param {String} options.host 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} callback 回调函数
   *
   * @memberof Uploader
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
