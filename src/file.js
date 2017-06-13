import _ from 'lodash'
import sha256 from 'crypto-js/sha256'
import * as CONFIG from './config'
import { Enum } from './enum'
import { Storage } from './storage'

/**
 * 文件类
 * 能够统一文件类型，可以传入多种类型对象
 * 能够保存文件分块分片信息到本地缓存中
 * 通过哈希文件获取缓存中的文件以达到保存文件上传情况与断点续传等效果
 *
 * @class
 */
export class File {
  /**
   * File 默认配置
   * @type {Object}
   * @property {String} defaultSettings.mimeType 文件类型，默认为 plain/text 文本类型
   * @property {Integer} defaultSettings.chunkSize
   * 分片大小，默认为 4M，表示一片，虽然没有限制，
   * 但是七牛官方文档表示分块(Block)为4M，最后一个分块(Block)也不能大于 4M，
   * 因此分片不可能大于分块的大小，参考文档: https://developer.qiniu.com/kodo/api/1286/mkblk
   * 
   * @property {Integer} defaultSettings.chunkInBlock 分片数量，默认为 1
   * @property {Boolean} defaultSettings.cache 是否缓存
   * @property {Integer} defaultSettings.expired
   * 过期时间，默认为一天 (1000 x 60 x 60 x 24)，
   * 该事件为保存文件信息到本地缓存中缓存的过期时间
   */
  static defaultSettings = {
    mimeType: 'plain/text',
    chunkSize: 4 * CONFIG.M,
    chunkInBlock: 1,
    cache: true,
    expired: 1000 * 60 * 60 * 24
  }

  /**
   * 上传状态格式
   * @type {Enum}
   */
  static stateFormatter = new Enum({
    OBJECT: 1,
    JSON: 2
  })

  /**
   * 文件大小
   * @type {Integer}
   */
  get size () {
    return this.blob.size
  }

  /**
   * 创建一个文件对象
   * 
   * @param {File|Blob|String} file
   * 需要上传的文件，可以为 Form 获取的 File 对象，
   * 可以为 Blob，或者是 Base64 等字符串
   * 
   * @param {Object} [options={}] 配置，可以参考{@link File.defaultSettings}
   * @param {String} [options.mimeType='plain/text] 文件类型，默认为 plain/text 文本类型
   * @param {Integer} [options.chunkSize=4 * M]
   * 分片大小，默认为 4M，表示一片，虽然没有限制，但是七牛官方文档表示分块(Block)为4M，
   * 最后一个分块(Block)也不能大于 4M，因此分片不可能大于分块的大小，
   * 参考文档: https://developer.qiniu.com/kodo/api/1286/mkblk
   * 
   * @param {Integer} options.chunkInBlock 分片数量，默认为 1
   * @param {Integer} options.expired
   * 过期时间，默认为一天 (1000 x 60 x 60 x 24)，该事件为保存文件信息到本地缓存中缓存的过期时间
   * 
   * @return {File} 文件对象
   */
  constructor (file, options) {
    /**
     * 配置
     * 
     * @type {Object}
     */
    this.settings = _.defaultsDeep(options, this.constructor.defaultSettings)

    /**
     * 文件类型
     * 
     * @type {String}
     */
    this.type = file.type || this.settings.mimeType
    
    /**
     * 源文件
     * 
     * @type {File|Blob|String}
     */
    this.file = file

    /**
     * 源文件转化成的 Blob 对象
     * 将文件(File), 文件列表(Array[<File, File...>]), base64(String) 文件数据转换成 Blob 基础文件对象
     * 
     * @type {Blob}
     */
    this.blob = file instanceof window.Blob ? file : new window.Blob(_.isArray(file) ? file : [file], { type: this.type })

    /**
     * 文件哈希值，根据文件名文件大小文件类型与最后修改时间来确定；
     * 如果源文件为字符串则直接将字符串进行哈希处理
     * 
     * @type {String}
     */
    this.hash = _.isString(file) ? sha256(file) : sha256(file.name + file.size + file.type + file.lastModified).toString()

    /**
     * 文件状态，用于存储文件上传信息
     * 
     * @type {Array<Object>}
     */
    this.state = []

    /**
     * 存储对象，主要用于本地存储
     * 
     * @type {Storage}
     */
    this.storage = new Storage()

    /**
     * 查找并读取本地缓存的上传数据，若没有则不会做任何操作
     */

    this.settings.cache === true && this.loadState()
  }

  /**
   * 文件切片，将文件切割成 Blob 文件段，开始位置与结束位置不能小于 0 并不能大于文件大小，
   * 开始位置不能大于结束位置
   *
   * @param {Integer} beginPos 开始位置，默认为 0，位置必须大于 0, 且不能大于或等于结束位置
   * @param {Integer} endPos 结束位置，必须大于开始位置
   * @param {String} [type=this.type] 类型，默认为文件的类型
   * @return {Blob} 分片文件
   */
  slice (beginPos = 0, endPos, type = this.type) {
    if (!(_.isInteger(beginPos) && _.isInteger(endPos))) {
      throw new TypeError('One of begin pos and end pos is not a integer')
    }

    if (!(beginPos < endPos)) {
      throw new Error('End pos must over begin pos')
    }

    return this.blob.slice(beginPos, endPos, type)
  }

  /**
   * 保存状态信息
   * 
   * @param {Integer} beginPos 起始位置
   * @param {Integer} endPos 结束位置
   * @param {Object} state 状态，保存的状态
   * @param {Boolean} [cache=this.settings.cache] 是否缓存
   */
  setState (beginPos, endPos, state = {}, cache = this.settings.cache) {
    if (!(_.isInteger(beginPos) && _.isInteger(endPos))) {
      throw new TypeError('One of begin pos and end pos is not a integer')
    }

    if (!(beginPos < endPos)) {
      throw new Error('End pos must over begin pos')
    }

    let data = _.assign({ beginPos, endPos }, state)
    this.state.push(data)

    cache === true && this.saveState()
  }

  /**
   * 获取文件上传信息
   * 
   * @param {Integer} beginPos 起始位置
   * @param {Integer} endPos 结束位置
   * @return {Object} 信息数据
   */
  getState (beginPos, endPos) {
    if (!(_.isInteger(beginPos) && _.isInteger(endPos))) {
      throw new TypeError('One of begin pos and end pos is not a integer')
    }

    if (!(beginPos < endPos)) {
      throw new Error('End pos must over begin pos')
    }

    return _.find(this.state, { beginPos, endPos })
  }

  /**
   * 检测分块或者分片是否被上传
   * 
   * @param {Integer} beginPos 起始位置
   * @param {Integer} endPos 结束位置
   * @return {Boolean} 返回是否上传成功
   */
  isUploaded (beginPos, endPos) {
    let item = this.getState(beginPos, endPos) || {}
    return item.status === 'uploaded'
  }

  /**
   * 导入文件上传状态信息
   *
   * @param {Object|Json} source 上传状态信息数据
   * @param {Function} [callback] 回调函数，成功导入将不会抛出异常，失败第一个参数将返回错误信息
   */
  import (source, callback) {
    if (_.isString(source)) {
      let data = JSON.parse(source)
      return this.import(data, callback)
    }

    if (callback && !_.isFunction(callback)) {
      throw new TypeError('Callback is not a function')
    }

    if (!_.isPlainObject(source)) {
      callback && callback(new Error('Source is not a plain object'))
      return
    }

    if (this.hash !== source.hash) {
      callback && callback(new Error('Source is invalid'))
      return
    }

    if (source.expired < Date.now()) {
      callback && callback(new Error('Source is out of date'))
      return
    }

    if (!_.isArray(source.state)) {
      callback && callback(new TypeError('Source is invalid'))
      return
    }

    let state = []
    for (let i = 0, datas = source.state, len = datas.length; i < len; i++) {
      state.push(datas[i])
    }

    this.state.splice(0)
    this.state = this.state.concat(state)

    callback && callback(null)
  }

  /**
   * 导出文件上传状态信息
   *
   * @param {Integer} [type=this.constructor.stateFormatter.OBJECT] 格式类型，具体值参考 File.stateFormatter
   * @param {Function} callback 回调函数，导出成功将返回数据
   */
  export (type = this.constructor.stateFormatter.OBJECT, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provided or not be a function')
    }

    if (!this.constructor.stateFormatter.isValidKey(type)) {
      callback(new TypeError('Type is invalid, it must equal one of File.stateFormatter'))
      return
    }

    if (type === this.constructor.stateFormatter.JSON) {
      return this.export(this.constructor.stateFormatter.OBJECT, function (error, data) {
        if (error) {
          callback(error)
          return
        }

        let source

        try {
          source = JSON.stringify(data)
        } catch (error) {
          callback(error)
          return
        }

        callback(null, source)
      })
    }

    callback(null, {
      hash: this.hash,
      state: this.state,
      expired: Date.now() + this.settings.expired
    })
  }

  /**
   * 从本地缓存中读取并导入文件上传状态信息
   *
   * @param {String} [hashCode=this.hash] 文件哈希值，默认为读取文件的哈希值
   * @param {Function} [callback] 回调函数，错误会抛出错误异常
   */
  loadState (hashCode = this.hash, callback) {
    if (arguments.length < 2 && _.isFunction(hashCode)) {
      return this.loadState(this.hash, hashCode)
    }

    if (callback && !_.isFunction(callback)) {
      throw new TypeError('Callback is not a function')
    }

    let source = this.storage.get(hashCode)
    this.import(source, callback)
  }

  /**
   * 导出并保存文件上传状态信息到本地缓存中
   *
   * @param {String} [hashCode=this.hash] 文件哈希值，默认为读取文件的哈希值
   * @param {Function} [callback] 回调函数，错误会抛出错误异常
   */
  saveState (hashCode = this.hash, callback) {
    if (arguments.length < 2 && _.isFunction(hashCode)) {
      return this.saveState(this.hash, hashCode)
    }

    if (callback && !_.isFunction(callback)) {
      throw new TypeError('Callback is not a function')
    }

    this.export(this.constructor.stateFormatter.JSON, (error, source) => {
      if (error) {
        callback && callback(error)
        return
      }

      this.storage.set(hashCode, source)
      callback && callback(null)
    })
  }

  /**
   * 删除文件上传信息的本地缓存
   *
   * @param {String} [hashCode=this.hash] 文件哈希值，默认为读取文件的哈希值
   */
  cleanCache (hashCode = this.hash) {
    this.storage.del(hashCode)
  }

  /**
   * 销毁对象
   */
  destory () {
    this.cleanCache()

    _.forEach(this, function (value, key) {
      this[key] = _.isFunction(value) ? Function.prototype : undefined
    })
  }
}
