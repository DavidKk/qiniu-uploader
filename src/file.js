import _ from 'lodash'
import sha256 from 'crypto-js/sha256'
import * as CONFIG from './config'

export class File {
  static defaultSettings = {
    mimeType     : 'plain/text',
    chunkSize    : 4 * CONFIG.M,
    chunkInBlock : 5,
    expired      : 60 * 60 * 24,
  }

  get size () {
    return this.blob.size
  }

  constructor (file, options) {
    this.setting = _.defaultsDeep(options, this.constructor.defaultSettings)
    this.mimeType = file.type || this.setting.mimeType

    /**
     * 转化成 blob 对象
     * 将文件(File), 文件列表(Array[<File, File...>]), base64(String) 文件数据转换成 Blob 基础文件对象
     */
    this.file = file
    this.blob = new Blob(_.isArray(file) ? file : [file], { type: this.mimeType })
    this.hash = sha256(file.name + file.size + file.type + file.lastModified).toString()
    this.state = []

    /**
     * 查找本地是否存在之前临时
     * 保存的上传数据
     */
    this.loadState()
  }

  /**
   * 切片
   * 将文件切割成 blob 段
   */
  slice (startPos = 0, endPos) {
    return this.blob.slice(startPos, endPos)
  }

  /**
   * 保存状态信息
   */
  ok (type, state) {
    let data = _.merge({ type }, state)
    this.state.push(data)
    this.saveState()
  }

  /**
   * 是否已经上传片段
   * 主要是开始位置, 因为上传的时候已经确定了所有
   * 上传片的起始位置与结束, 因此这里只需要判断
   * 起始位置就可以知道是否已经上传了
   */
  isUploaded (offset) {
    let data = _.filter(this.state, { type: 'chunk' })

    for (let i = 0, l = data.length; i < l; i ++) {
      if (_.inRange(offset, data[i].startPos, data[i].endPos)) {
        return true
      }
    }

    return false
  }

  /**
   * 导入状态信息
   */
  import (source) {
    if (_.isString(source)) {
      let data = JSON.parse(source)
      return this.import(data)
    }

    if (!_.isPlainObject(source)) {
      return false
    }

    if (this.hash !== source.hash) {
      return false
    }

    if (source.expired < Date.now()) {
      return false
    }

    if (!_.isArray(source.state)) {
      return false
    }

    let state = []
    for (let i = 0, datas = source.state, len = datas.length; i < len; i ++) {
      if (-1 === _.indexOf(['block', 'chunk'], datas[i].type)) {
        return false
      }

      state.push(datas[i])
    }

    this.state = state
    return true
  }

  /**
   * 导出状态信息
   */
  export (type = 'OBJECT') {
    if (type.toUpperCase() === 'JSON') {
      let data = this.export('OBJECT')
      return JSON.stringify(data)
    }

    return {
      hash    : this.hash,
      state   : this.state,
      expired : Date.now() + this.setting.expired,
    }
  }

  /**
   * 读取状态信息
   */
  loadState () {
    let name = `${CONFIG.STORAGE_PREFIX}.${this.hash}`
    let source = window.localStorage.getItem(name)

    return this.import(source)
  }

  /**
   * 存储状态信息
   */
  saveState () {
    let name = `${CONFIG.STORAGE_PREFIX}.${this.hash}`
    let source = this.export('JSON')

    return source && window.localStorage.setItem(name, source) ? true : false
  }

  /**
   * 清除状态信息
   */
  cleanState () {
    let name = `${CONFIG.STORAGE_PREFIX}.${this.hash}`
    window.localStorage.removeItem(name)

    return true
  }

  destory () {
    this.cleanState()

    this.setting = undefined
    this.mimeType = undefined
    this.file = undefined
    this.blob = undefined
    this.hash = undefined
    this.state = undefined
  }
}
