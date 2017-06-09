/** @module enum */

import _ from 'lodash'

/**
 * 枚举类
 * 
 * @export
 * @class Enum
 */
export class Enum {
	/**
	 * Creates an instance of Enum.
	 * @param {Object} map 
	 * 
	 * @memberof Enum
	 */
	constructor (map) {
		let inverted = _.invert(map)
		let keys = Object.keys(map)

		this._inverted = inverted
		this._keys = keys
		this._map = map

		_.assign(this, this._inverted, this._map)
	}

	/**
	 * 根据 index 获取 key 值
	 * 
	 * @param {Integer} index 索引
	 * @return {String}
	 * 
	 * @memberof Enum
	 */
	get (index) {
		return this._keys[index]
	}

	/**
	 * 判断键值是否为合法值
	 * 
	 * @param {String} key 
	 * @return {Boolean}
	 * 
	 * @memberof Enum
	 */
	isValidKey (key) {
		return !!this.get(key)
	}

	/**
	 * 通过索引(index) 获取值
	 * 
	 * @param {Integer} index 索引
	 * @return {any}
	 * 
	 * @memberof Enum
	 */
	value (index) {
    let key = this.get(index)
		return this._map[key]
	}
}

