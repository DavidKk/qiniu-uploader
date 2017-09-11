import defaultsDeep from 'lodash/defaultsDeep'
import isString from 'lodash/isString'
import { STORAGE_PREFIX } from './config'

/**
 * 存储类
 * 存储的值拥有前缀，具体参考配置
 * @class
 */
export class Storage {
  /**
   * 默认配置
   * @property {String} prefix 前缀
   */
  static defaultSettings = {
    prefix: STORAGE_PREFIX
  }

  /**
   * 创建一个存储类对象
   * @param {Object} [options={}] 配置，可以参考{@link Storage.defaultSettings}
   * @return {Storage} 存储类的对象
   */
  constructor (options = {}) {
    this.settings = defaultsDeep({}, options, this.constructor.defaultSettings)
  }

  /**
   * 设置本地缓存
   *
   * @param {String} name 名字
   * @param {any} value 值，该值会进行 JSON.parse，因此请确保传入值没有循环引用
   */
  set (name, value) {
    if (!isString(value)) {
      value = JSON.stringify(value)
    }

    window.localStorage.setItem(`${this.settings.prefix}.${name}`, value)
  }

  /**
   * 获取本地缓存
   *
   * @param {String} name 名称
   * @returns {any} 值
   */
  get (name) {
    let source = window.localStorage.getItem(`${this.settings.prefix}.${name}`)

    if (source) {
      try {
        return JSON.parse(source)
      } catch (error) {
        // nothing to do...
      }
    }

    return null
  }

  /**
   * 删除本地缓存
   *
   * @param {String} name 名称
   */
  del (name) {
    window.localStorage.removeItem(`${this.settings.prefix}.${name}`)
  }
}
