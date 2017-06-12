/** @module uploader */

import _ from 'lodash'
import { File } from './file'

/**
 * 上传类
 * 
 * @class Uploader
 * @export
 */
export class Uploader {
  /**
   * Creates an instance of Uploader
   * 
   * @memberof Uploader
   */
  constructor () {
    this.token = ''
    this.tokenExpire = 0
  }

  /**
   * 上传
   * 
   * @param {File|Blob|String|Array} file 
   * @param {Object} params 上传参数
   * @param {Object} options 上传配置，具体参考 Tunnel.defaultSettings
   * @param {Function} callback 回调函数
   * 
   * @memberof Uploader
   */
  upload (file, params, options, callback) {
    file = file instanceof File ? file : new File(file)

    let tunnel = new Tunnel(options)
    tunnel.resuming(file, params, options, callback)
  }
}
