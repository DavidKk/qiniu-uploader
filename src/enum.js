import invert from 'lodash/invert'
import assign from 'lodash/assign'

/**
 * 枚举类
 * @class
 */
export class Enum {
  /**
   * 创建一个枚举类对象
   * @param {Object} map 键与对应的值
   * @return {Enum}
   */
  constructor (map) {
    let inverted = invert(map)
    let keys = Object.keys(map)

    this._inverted = inverted
    this._keys = keys
    this._map = map

    assign(this, this._inverted, this._map)
  }

  /**
   * 根据 index 获取 key 值
   *
   * @param {Integer} index 索引
   * @returns {String}
   */
  get (index) {
    return this._keys[index]
  }

  /**
   * 判断键值是否为合法值
   *
   * @param {String} key 键值
   * @returns {Boolean}
   */
  isValidKey (key) {
    return !!this.get(key)
  }

  /**
   * 通过索引(index) 获取值
   *
   * @param {Integer} index 索引
   * @returns {any}
   */
  value (index) {
    let key = this.get(index)
    return this._map[key]
  }
}
