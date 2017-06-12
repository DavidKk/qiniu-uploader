/** @module stroage */

import { STORAGE_PREFIX } from './config'

/**
 * 存储类
 * 存储的值拥有前缀，具体参考配置
 * 
 * @class Storage
 * @export
 */
export class Storage {
  static defaultSettings = {
    prefix: STORAGE_PREFIX,
  }
  
  /**
   * Creates an instance of Storage.
   * @param {Object} options 配置
   * 
   * @memberof Storage
   */
  constructor (options) {
    this.settings = _.defaultsDeep(options, this.constructor.defaultSettings)
  }

  /**
   * 设置本地缓存
   * 
   * @param {String} name 名字
   * @param {any} value 值，该值会进行 JSON.parse，因此请确保传入值没有循环引用
   * 
   * @memberof Storage
   */
  set (name, value) {
    if (!_.isString(value)) {
      value = JSON.stringify(value)
    }

    window.localStorage.setItem(`${this.settings.prefix}.${name}`, value)
  }

  /**
   * 获取本地缓存
   * 
   * @param {String} name 名称
   * @returns {any} 值
   * 
   * @memberof Storage
   */
  get (name) {
    let source = window.localStorage.getItem(`${this.settings.prefix}.${name}`)

    if (source) {
      try {
        return JSON.parse(source)
      }
      catch (error) {
        // nothing to do...
      }
    }

    return null
  }

  /**
   * 删除本地缓存
   * 
   * @param {String} name 名称
   * 
   * @memberof Storage
   */
  del (name) {
    window.localStorage.removeItem(`${this.settings.prefix}.${name}`)
  }
}
