import _ from 'lodash'
import sha256 from 'crypto-js/sha256'
import * as CONFIG from './config'
import { Enum } from './enum'

export class File {
  /**
   * File 默认配置
   * 
   * @type {Object}
   * 
   * @memberof File
   * @static
   */
  static defaultSettings = {
    /**
     * 文件类型，默认为 plain/text 文本类型
     * @type {String}
     * @inner
     */
    mimeType: 'plain/text',
    /**
     * 分片大小，默认为 ４M，表示一片，虽然没有限制，但是七牛官方文档表示分块(Block)为4M，最后一个分块(Block)也不能大于 4M，因此分片不可能大于分块的大小，参考文档: https://developer.qiniu.com/kodo/api/1286/mkblk
     * @type {Integer}
     * @inner
     */
    chunkSize: 4 * CONFIG.M,
    /**
     * 分片数量，默认为 1
     * @type {Integer}
     * @inner
     */
    chunkInBlock: 1,
    /**
     * 过期时间，默认为一天 (1000 * 60 * 60 * 24)，该事件为保存文件信息到本地缓存中缓存的过期时间
     * @type {Integer}
     * @inner
     */
    expired: 1000 *　60 * 60 * 24,
  }

  /**
   * 上传状态类型
   * 
   * @enum {Integer}
   * 
   * @memberof File
   * @static
   */
  static stateType = new Enum({
    BLOCK: 1,
    CHUNK: 2,
  })

  /**
   * 上传状态格式
   * 
   * @enum {Integer}
   * 
   * @memberof File
   * @static
   */
  static stateFormatter = new Enum({
    OBJECT: 1,
    JSON: 2,
  })

  /**
   * 文件大小
   * 
   * @type {Integer}
   * 
   * @memberof File
   * @readonly
   */
  get size () {
    return this.blob.size
  }

  /**
   * 创建文件对象
   * 能够统一文件类型，可以传入多种类型对象
   * 能够保存文件分块分片信息到本地缓存中
   * 通过哈希文件获取缓存中的文件以达到保存文件上传情况与断点续传等效果
   * 
   * @param {File|Blob|String} file 需要上传的文件，可以为 Form 获取的 File 对象，可以为 Blob，或者是 Base64 等字符串
   * @param {Object} options 配置
   * @param {String} options.mimeType 文件类型，默认为 plain/text 文本类型
   * @param {Integer} options.chunkSize 分片大小，默认为 ４M，表示一片，虽然没有限制，但是七牛官方文档表示分块(Block)为4M，最后一个分块(Block)也不能大于 4M，因此分片不可能大于分块的大小，参考文档: https://developer.qiniu.com/kodo/api/1286/mkblk
   * @param {Integer} options.chunkInBlock 分片数量，默认为 1
   * @param {Integer} options.expired 过期时间，默认为一天 (1000 * 60 * 60 * 24)，该事件为保存文件信息到本地缓存中缓存的过期时间
   * 
   * @memberof File
   */
  constructor (file, options) {
    this.settings = _.defaultsDeep(options, this.constructor.defaultSettings)
    this.mimeType = file.mimeType || this.settings.mimeType
    this.file = file

    /**
     * 转化成 blob 对象
     * 将文件(File), 文件列表(Array[<File, File...>]), base64(String) 文件数据转换成 Blob 基础文件对象
     */
    this.blob = file instanceof Blob ? file : new Blob(_.isArray(file) ? file : [file], { type: this.mimeType })
    this.hash = sha256(file.name + file.size + file.type + file.lastModified).toString()
    this.state = []
    this.storage = new Storage()

    /**
     * 查找并读取本地缓存的上传数据，若没有则不会做任何操作
     */
    this.load()
  }

  /**
   * 文件切片，将文件切割成 Blob 文件段，开始位置与结束位置不能小于 0 并不能大于文件大小，
   * 开始位置不能大于结束位置
   * 
   * @param {Integer} beginPos 开始位置，默认为 0，位置必须大于 0, 且不能大于或等于结束位置
   * @param {Integer} endPos 结束位置，必须大于开始位置
   * @return {Blob} 分片文件
   * 
   * @memberof File
   */
  slice (beginPos = 0, endPos) {
    if (!(_.isInteger(beginPos) && _.isInteger(endPos))) {
      throw new TypeErrror('One of begin pos and end pos is not a integer')
    }

    if (!(beginPos < endPos)) {
      throw new Error('End pos must over begin pos')
    }

    return this.blob.slice(beginPos, endPos)
  }

  /**
   * 保存状态信息
   * @param {Integer} type 类型，具体参考 File.stateType
   * @param {Object} state 状态，保存的状态
   * 
   * @memberof File
   */
  ok (type, state) {
    if (!this.stateType.isValidKey(type)) {
      throw new TypeError('Type is invalid, it must euqal one of enum File.stateType')
    }

    let data = _.assign({ type }, state)
    this.state.push(data)
    this.save()
  }

  /**
   * 检测是否已经上传片段，主要是开始位置，
   * 因为上传的时候已经确定了所有，
   * 上传片的起始位置与结束，因此这里只需要判断
   * 起始位置就可以知道是否已经上传了
   * 
   * @param {Integer} offset 分片开始位置所在文件的偏移位置
   * @return {Boolean} 返回是否上传成功
   * 
   * @memberof File
   */
  isUploaded (offset) {
    let data = _.filter(this.state, { type: this.constructor.stateType.CHUNK })

    for (let i = 0, l = data.length; i < l; i ++) {
      if (_.inRange(offset, data[i].startPos, data[i].endPos)) {
        return true
      }
    }

    return false
  }

  /**
   * 导入文件上传状态信息
   * 
   * @param {Object|Json} source 上传状态信息数据
   * @param {Function} callback 回调函数，成功导入将不会抛出异常，失败第一个参数将返回错误信息
   * 
   * @memberof File
   */
  import (source, callback) {
    if (_.isString(source)) {
      let data = JSON.parse(source)
      return this.import(data, callback)
    }

    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provided or not be a function')
    }

    if (!_.isPlainObject(source)) {
      callback(new TypeError('Source is not a plain object'))
      return
    }

    if (this.hash !== source.hash) {
      callback(new TypeError('Source is invalid'))
      return
    }

    if (source.expired < Date.now()) {
      callback(new Error('Source is out of date'))
      return
    }

    if (!_.isArray(source.state)) {
      callback(new TypeError('Source is invalid'))
      return
    }

    let state = []
    for (let i = 0, datas = source.state, len = datas.length; i < len; i ++) {
      if (-1 === _.indexOf(this.constructor.stateType._keys, datas[i].type)) {
        callback(new Error('Source is invalid'))
        return
      }

      state.push(datas[i])
    }

    this.state.splice(0)
    this.state = this.state.concat(state)

    callback(null)
  }

  /**
   * 导出文件上传状态信息
   * 
   * @param {Integer} [type=this.constructor.stateType.OBJECT] 格式类型，具体值参考 File.stateFormatter
   * @param {Function} callback 回调函数，导出成功将返回数据
   * 
   * @memberof File
   */
  export (type = this.constructor.stateFormatter.OBJECT, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provided or not be a function')
    }

    if (!this.constructor.stateType.isValidKey(type)) {
      callback(new TypeError('Type is invalid, it must equal one of File.stateFormatter'))
      return
    }

    if (type === this.constructor.stateType.JSON) {
      return this.export(this.constructor.stateType.OBJECT, function (error, data) {
        let source
        try {
          source = JSON.stringify(data)
        }
        catch (error) {
          callback(error)
          return
        }

        callback(null, source)
      })
    }

    callback(null, {
      hash: this.hash,
      state: this.state,
      expired: Date.now() + this.settings.expired,
    })
  }

  /**
   * 从本地缓存中读取并导入文件上传状态信息
   * 
   * @param {String} [hashCode=this.hash] 文件哈希值，默认为读取文件的哈希值
   * @param {Function} callback 回调函数，错误会抛出错误异常
   * 
   * @memberof File
   */
  load (hashCode = this.hash, callback) {
    if (arguments.length < 2) {
      return this.load(this.hash, hashCode)
    }

    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provided or not be a function')
    }

    let source = this.storage.get(hashCode)
    this.import(source, callback)
  }

  /**
   * 导出并保存文件上传状态信息到本地缓存中
   * 
   * @param {String} [hashCode=this.hash] 文件哈希值，默认为读取文件的哈希值
   * @param {Function} callback 回调函数，错误会抛出错误异常
   */
  save (hashCode = this.hash, callback) {
    if (arguments.length < 2) {
      return this.save(this.hash, hashCode)
    }

    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provided or not be a function')
    }

    this.export(this.constructor.stateFormatter.JSON, (error, source) => {
      if (error) {
        callback(error)
        return
      }

      this.storage.set(hashCode, source)
      callback(null)
    })
  }

  clean (hashCode = this.hash) {
    this.storage.del(hashCode)
  }

  destory () {
    this.clean()

    _.forEach(this, function (value, key) {
      this[key] = _.isFunction(value) ? Function.prototype : undefined
    })
  }
}
