import isEmpty from 'lodash/isEmpty'
import isArray from 'lodash/isArray'
import isString from 'lodash/isString'
import isNumber from 'lodash/isNumber'
import isInteger from 'lodash/isInteger'
import isFunction from 'lodash/isFunction'
import isPlainObject from 'lodash/isPlainObject'
import map from 'lodash/map'
import times from 'lodash/times'
import forEach from 'lodash/forEach'
import assign from 'lodash/assign'
import sortBy from 'lodash/sortBy'
import defaultsDeep from 'lodash/defaultsDeep'
import waterfall from 'async/waterfall'
import parallel from 'async/parallel'
import * as http from './request'
import * as CONFIG from './config'
import { File } from './file'
import { QiniupEvent } from './event'
import { isNumeric } from './utils'

/**
 * 七牛通道类
 * 支持普通文件上传，适合图片文本等小文件上传
 * 支持 Base64 文件上传，Base64 字符串长度并不等于文件大小，可参考：https://en.wikipedia.org/wiki/Base64
 * 支持断点续传，缓存上传了的块与片保存在本地缓存中，若清除本地缓存则不能保证能继续上次的断点
 * 块大小，每块均为4MB（1024*1024*4），最后一块大小不超过4MB
 * 所有接口均参考七牛官方文档，一切均以七牛官方文档为准
 * @class
 */
export class Tunnel {
  /**
   * 七牛通道类默认配置
   * @type {Object}
   * @property {Boolean} defaultSettings.useHttps 是否使用 Https 进行上传
   * @property {Boolean} defaultSettings.cache 是否缓存
   * @property {Integer} defaultSettings.maxConnect 最大连接数
   * @property {Integer} defaultSettings.blockSize 分块大小
   * @property {Integer} defaultSettings.blockSize 分片大小
   * @property {Integer} defaultSettings.maxBlockTasks 最大分块任务数, 若文件巨大, 可能分块的时候会卡死浏览器, 因此设置最大分块数
   */
  static defaultSettings = {
    useHttps: typeof window === 'undefined' ? false : window.location.protocol,
    cache: false,
    maxConnect: 4,
    blockSize: 4 * CONFIG.M,
    chunkSize: 1 * CONFIG.M,
    maxFileSize: 1 * CONFIG.G,
    maxBlockTasks: 2000
  }

  /**
   * 创建通道类对象
   * @param {Object} [options] 配置，可以参考{@link Tunnel.defaultSettings}
   * @param {Object} [options.useHttps=true] 是否使用 Https 进行上传
   * @param {Boolean} [options.cache=false] 是否缓存
   * @param {Integer} [options.maxConnect=4] 最大连接数
   * @param {Integer} [options.blockSize=4 * M] 分块大小
   * @param {Integer} [options.chunkSize=1 * M] 分片大小
   * @return {Tunnel}
   */
  constructor (options, request = http) {
    /**
     * 配置
     * @type {Object}
     */
    this.settings = defaultsDeep({}, options, this.constructor.defaultSettings)

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
     * 设置 request
     * @type {Object}
     */
    this.request = request
  }

  _execTokenGetter (getter, callback) {
    if (!isFunction(getter)) {
      throw new TypeError('Getter is not a fucntion')
    }

    if (this.tokenExpire > Date.now() && this.token) {
      return callback(null, this.token)
    }

    getter((error, token) => {
      if (error) {
        return callback(error)
      }

      if (isPlainObject(token)) {
        this.token = token.token
        this.tokenExpire = isNumeric(token.expire) ? token.expire * 1 : 0
      } else {
        this.token = token
        this.tokenExpire = 0
      }

      return callback(null, this.token)
    })
  }

  /**
   * 第三方资源抓取
   *
   * @see https://developer.qiniu.com/kodo/api/1263/fetch
   *
   * @param {String} file 远程文件
   * @param {Object} [params={}] 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Object} [params.key] 如果没有指定则: 如果 uptoken.SaveKey 存在则基于 SaveKey 生产 key，否则用 hash 值作 key。EncodedKey 需要经过 base64 编码
   * @param {Object} [params.bucket] 指定的存储区域 https://developer.qiniu.com/kodo/api/3966/bucket-image-source
   * @param {Object} [options={}] 配置
   * @param {Function} [options.tokenGetter] 获取 Token 拦截器
   * @param {Boolean} [options.useHttps] 是否使用 Https 进行上传
   * @param {String} [options.host] 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} callback 回调函数
   * @memberof Tunnel
   */
  fetch (file, params = {}, options = {}, callback) {
    if (!isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!CONFIG.REMOTE_FILE_URL_REGEXP.test(file)) {
      callback(new TypeError('File is not provided or invalid remote source url'))
      return
    }

    let { token } = params
    let { tokenGetter } = options
    if (!(isString(token) && token)) {
      if (!isFunction(tokenGetter)) {
        callback(new TypeError('Token is not provided'))
        return
      }

      return this._execTokenGetter(tokenGetter, (error, token) => {
        if (error) {
          callback(error)
          return
        }

        return this.fetch(file, assign({ token }, params), options, callback)
      })
    }

    options = defaultsDeep(options, this.settings)

    let { host, useHttps, tokenPrefix } = options
    host = host || (useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)

    let { bucket, key } = params
    let url = `${useHttps ? 'https:' : 'http:'}//${host}/fetch/${window.btoa(file)}/to/${bucket}:${key}`
    let headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `${tokenPrefix || 'UpToken'} ${token}`
    }

    return this.request.post(url, null, assign({ headers }, options), callback)
  }

  /**
   * 上传文件
   * 普通文件上传，适合小文件
   *
   * @param {File|Blob} file 文件
   * @param {Object} [params={}] 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Object} [params.key] 如果没有指定则：如果 uptoken.SaveKey 存在则基于 SaveKey 生产 key，否则用 hash 值作 key。EncodedKey 需要经过 base64 编码
   * @param {Object} [options={}] 上传配置
   * @param {Function} [options.tokenGetter] 获取 Token 拦截器
   * @param {Boolean} [options.useHttps] 是否使用 Https 进行上传
   * @param {String} [options.host] 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} [options.progress] 上传进度
   * @param {Function} callback 回调
   * @returns {Object} state
   * @returns {XMLHttpsRequest} state.xhr AJAX 对象
   * @returns {Function} state.cancel 取消函数
   */
  upload (file, params = {}, options = {}, callback) {
    if (!isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!(file instanceof File || file instanceof window.Blob)) {
      callback(new TypeError('File is not provided or not instanceof File'))
      return
    }

    let { token } = params
    let { tokenGetter } = options
    if (!(isString(token) && token)) {
      if (!isFunction(tokenGetter)) {
        callback(new TypeError('Token is not provided'))
        return
      }

      return this._execTokenGetter(tokenGetter, (error, token) => {
        if (error) {
          callback(error)
          return
        }

        return this.upload(file, assign({ token }, params), options, callback)
      })
    }

    options = defaultsDeep(options, this.settings)

    let { host, useHttps, tokenPrefix } = options
    host = host || (useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)

    let url = `${useHttps ? 'https:' : 'http:'}//${host}`
    let datas = assign({ file: file.file }, params)
    let headers = {
      Authorization: `${tokenPrefix || 'UpToken'} ${token}`
    }

    return this.request.upload(url, datas, assign({ headers }, options), callback)
  }

  /**
   * 上传 base64 资源
   * @see https://developer.qiniu.com/kodo/kb/1326/how-to-upload-photos-to-seven-niuyun-base64-code
   *
   * @param {string} content base64文件数据
   * @param {Object} params 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Integer} [params.size=-1] 文件大小，-1为自动获取
   * @param {Object} [params.key] 如果没有指定则：如果 uptoken.SaveKey 存在则基于 SaveKey 生产 key，否则用 hash 值作 key。EncodedKey 需要经过 base64 编码
   * @param {Object} [params.mimeType] 文件的 MIME 类型，默认是 application/octet-stream
   * @param {Object} [params.crc32] 文件内容的 crc32 校验值，不指定则不进行校验
   * @param {Object} [params.userVars]
   * @param {Object} [options={}] 上传配置
   * @param {Function} [options.tokenGetter] 获取 Token 拦截器
   * @param {Boolean} [options.useHttps] 是否使用 Https 进行上传
   * @param {String} [options.host] 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} [options.progress] 上传进度
   * @param {Function} callback 回调
   * @returns {Object} state
   * @returns {XMLHttpsRequest} state.xhr AJAX 对象
   * @returns {Function} state.cancel 取消函数
   */
  upb64 (content, params = { size: -1 }, options = {}, callback) {
    if (!isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (isEmpty(content) || !CONFIG.BASE64_REGEXP.exec(content)) {
      callback(new TypeError('Content is not provided or not a valid base64 string'))
      return
    }

    let { token } = params
    let { tokenGetter } = options
    if (!(isString(token) && token)) {
      if (!isFunction(tokenGetter)) {
        callback(new TypeError('Token is not provided'))
        return
      }

      return this._execTokenGetter(tokenGetter, (error, token) => {
        if (error) {
          callback(error)
          return
        }

        return this.upb64(content, assign({ token }, params), options, callback)
      })
    }

    if (!(isNumber(params.size) && isInteger(params.size) && params.size > 0)) {
      params.size = -1
    }

    options = defaultsDeep(options, this.settings)

    let { host, useHttps, tokenPrefix } = options
    host = host || (useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)

    let { size, key, mimeType, crc32, userVars } = params
    let url = `${useHttps ? 'https:' : 'http:'}//${host}/${size}`
    if (isString(key) && key) {
      url += `/key/${encodeURIComponent(key)}`
    }

    if (isString(mimeType) && mimeType) {
      url += `/mimeType/${encodeURIComponent(mimeType)}`
    }

    if (isString(crc32) && crc32) {
      url += `/crc32/${encodeURIComponent(crc32)}`
    }

    if (isString(userVars) && userVars) {
      url += `/x:user-var/${encodeURIComponent(userVars)}`
    }

    let datas = content.replace(CONFIG.BASE64_REGEXP, '')
    let headers = {
      'Content-Type': 'application/octet-stream',
      Authorization: `${tokenPrefix || 'UpToken'} ${token}`
    }

    return this.request.upload(url, datas, assign({ headers }, options), callback)
  }

  /**
   * 上传块:
   * 块只是一个虚拟的概念，块表示多个分片的集合的一个统称
   * 1. 将文件分成若干块，可以并发进行上传，而块中拥有多个分片
   * 每个块上传的开始必须将第一个分片同时上传
   * 2. 上传完之后会返回第一个分片的哈希值(ctx)，第二个分片必
   * 须同时上传第一个分片的哈希值
   *
   * @see https://developer.qiniu.com/kodo/api/1286/mkblk
   *
   * @param {Blob} block 块
   * @param {Object} params 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Object} [options={}] 上传配置
   * @param {Function} [options.tokenGetter] 获取 Token 拦截器
   * @param {Boolean} [options.useHttps] 是否使用 Https 进行上传
   * @param {String} [options.host] 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {number} [options.chunkSize] 设置每个分片的大小
   * @param {Function} [options.progress] 上传进度
   * @param {mkblkCallback} callback 上传之后执行的回调函数
   * @returns {Object} state
   * @returns {XMLHttpsRequest} state.xhr AJAX 对象
   * @returns {Function} state.cancel 取消函数
   */
  mkblk (block, params = {}, options = {}, callback) {
    if (!isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!block || !(block instanceof window.Blob)) {
      callback(new TypeError('Block is not provided or not instanceof Blob'))
      return
    }

    let { token } = params
    let { tokenGetter } = options
    if (!(isString(token) && token)) {
      if (!isFunction(tokenGetter)) {
        callback(new TypeError('Token is not provided'))
        return
      }

      return this._execTokenGetter(tokenGetter, (error, token) => {
        if (error) {
          callback(error)
          return
        }

        return this.mkblk(block, assign({ token }, params), options, callback)
      })
    }

    options = defaultsDeep(options, this.settings)

    let { chunkSize, useHttps, host, tokenPrefix } = options
    host = host || (useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)

    let url = `${useHttps ? 'https:' : 'http:'}//${host}/mkblk/${block.size}`
    let headers = {
      'Content-Type': 'application/octet-stream',
      Authorization: `${tokenPrefix || 'UpToken'} ${token}`
    }

    let chunk = block.slice(0, chunkSize, block.type)
    return this.request.upload(url, chunk, assign({ headers }, options), callback)
  }

  /**
   * 上传分片
   * 1. 多个分片可以组成一个块，每一个分片的开始与结尾都必须
   * 在创建的时候并定义好，且第一个分片在上传块的时候必须
   * 一并上传
   * 2. 七牛会返回一个哈希值（ctx），上传下一个分片的时候必须
   * 将前一个分片的哈希值同时上传给服务器，第二个分片拿创建
   * 块时上传的第一个分片范围的哈希值
   * 3. 最后一个分片值代表该块的结束，必须记录好哈希值(ctx)；
   * 在合并文件的时候可以通过这些最后的哈希值进行合成文件
   *
   * @see https://developer.qiniu.com/kodo/api/1251/bput
   *
   * @param {Blob} chunk 片
   * @param {Object} params 参数
   * @param {String} params.ctx 前一次上传返回的块级上传控制信息
   * @param {String} params.offset 当前片在整个块中的起始偏移
   * @param {String} params.token 七牛令牌
   * @param {Object} [options={}] 上传配置
   * @param {Function} [options.tokenGetter] 获取 Token 拦截器
   * @param {Boolean} [options.useHttps] 是否使用 Https 进行上传
   * @param {String} [options.host] 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} [options.progress] 上传进度
   * @param {Function} callback 回调
   * @returns {Object} state
   * @returns {XMLHttpsRequest} state.xhr AJAX 对象
   * @returns {Function} state.cancel 取消函数
   */
  bput (chunk, params = {}, options = {}, callback) {
    if (!isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!chunk || !(chunk instanceof window.Blob)) {
      callback(new TypeError('Block is not provided or not instanceof Blob'))
      return
    }

    let { token } = params
    let { tokenGetter } = options
    if (!(isString(token) && token)) {
      if (!isFunction(tokenGetter)) {
        callback(new TypeError('Token is not provided'))
        return
      }

      return this._execTokenGetter(tokenGetter, (error, token) => {
        if (error) {
          callback(error)
          return
        }

        return this.bput(chunk, assign({ token }, params), options, callback)
      })
    }

    let { ctx, offset } = params
    if (!isString(params.ctx)) {
      callback(new TypeError('Params.ctx is not provided or not be a valid string'))
      return
    }

    if (!(isNumber(offset) && isInteger(offset) && offset > 0)) {
      callback(new TypeError('Params.offset is not provided or not be a valid interger'))
      return
    }

    options = defaultsDeep(options, this.settings)

    let { host, useHttps, tokenPrefix } = options
    host = host || (useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)

    let url = `${useHttps ? 'https:' : 'http:'}//${host}/bput/${ctx}/${offset}`
    let headers = {
      'Content-Type': 'application/octet-stream',
      Authorization: `${tokenPrefix || 'UpToken'} ${token}`
    }

    return this.request.upload(url, chunk, assign({ headers }, options), callback)
  }

  /**
   * 提交组合文件，将所有块与分片组合起来并生成文件
   * 当所有块与分片都上传了，将所有块的返回
   *
   * @see https://developer.qiniu.com/kodo/api/1287/mkfile
   *
   * @param {Array|String} ctxs 文件
   * @param {Object} params 参数
   * @param {Integer} params.size 文件大小
   * @param {Object} [params.key] 如果没有指定则：如果 uptoken.SaveKey 存在则基于 SaveKey 生产 key，否则用 hash 值作 key。EncodedKey 需要经过 base64 编码
   * @param {Object} [params.mimeType] 文件的 MIME 类型，默认是 application/octet-stream
   * @param {Object} [params.crc32] 文件内容的 crc32 校验值，不指定则不进行校验
   * @param {Object} [options={}] 上传配置
   * @param {Function} [options.tokenGetter] 获取 Token 拦截器
   * @param {Boolean} [options.useHttps] 是否使用 Https 进行上传
   * @param {String} [options.host] 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} [options.progress] 上传进度
   * @param {Function} callback 回调
   * @returns {Object} state
   * @returns {XMLHttpsRequest} state.xhr AJAX 对象
   * @returns {Function} state.cancel 取消函数
   */
  mkfile (ctxs, params = {}, options = {}, callback) {
    if (!isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (isEmpty(ctxs) || !(isArray(ctxs) || isString(ctxs))) {
      callback(new TypeError('Ctxs is not provided or not be a valid value'))
      return
    }

    let { token } = params
    let { tokenGetter } = options
    if (!(isString(token) && token)) {
      if (!isFunction(tokenGetter)) {
        callback(new TypeError('Token is not provided'))
        return
      }

      return this._execTokenGetter(tokenGetter, (error, token) => {
        if (error) {
          callback(error)
          return
        }

        return this.mkfile(ctxs, assign({ token }, params), options, callback)
      })
    }

    let { size } = params
    if (!(isNumber(size) && isInteger(size) && size > 0)) {
      callback(new TypeError('Param.size is not provided or not be a valid integer'))
      return
    }

    let { host, useHttps, tokenPrefix } = options
    host = host || (useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)

    let url = `${useHttps ? 'https:' : 'http:'}//${host}/mkfile/${size}`
    let { key, mimeType, crc32, userVars } = params
    if (isString(key) && key) {
      url += `/key/${encodeURIComponent(key)}`
    }

    if (isString(mimeType) && mimeType) {
      url += `/mimeType/${encodeURIComponent(mimeType)}`
    }

    if (isString(crc32) && crc32) {
      url += `/crc32/${encodeURIComponent(crc32)}`
    }

    if (isString(userVars) && userVars) {
      url += `/x:user-var/${encodeURIComponent(userVars)}`
    }

    let data = isArray(ctxs) ? ctxs.join(',') : ctxs
    let headers = {
      'Content-Type': 'application/octet-stream',
      Authorization: `${tokenPrefix || 'UpToken'} ${token}`
    }

    return this.request.upload(url, data, assign({ headers }, options), callback)
  }

  /**
   * 分割文件并上传
   * 一次过将文件分成多个，并进行并发上传
   * 上传的快慢并不代表分个数的大小, 我们应该尽量
   * 创建适当多个块(Block), 因为没上传的块只是阻塞
   * 在任务队列中
   *
   * @param {File|Blob} file 文件
   * @param {Object} params 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Object} [params.key] 如果没有指定则：如果 uptoken.SaveKey 存在则基于 SaveKey 生产 key，否则用 hash 值作 key。EncodedKey 需要经过 base64 编码
   * @param {Object} [params.mimeType] 文件的 MIME 类型，默认是 application/octet-stream
   * @param {Object} [params.crc32] 文件内容的 crc32 校验值，不指定则不进行校验
   * @param {Object} [options={}] 上传配置
   * @param {Function} [options.tokenGetter] 获取 Token 拦截器
   * @param {Boolean} [options.useHttps] 是否使用 Https 进行上传
   * @param {String} [options.host] 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Boolean} [options.cache=true] 设置本地缓存
   * @param {Boolean} [options.override=false] 无论是否已经上传都进行重新上传
   * @param {Integer} [options.maxConnect=4] 最大连接数，设置最大上传分块(Block)的数量，其余分块(Block)将会插入队列中
   * @param {Function} [options.progress] 上传进度
   * @param {Function} callback 回调
   * @returns {Object} state
   * @returns {XMLHttpsRequest} state.xhr AJAX 对象
   * @returns {Function} state.cancel 取消函数
   */
  resuming (file, params, options, callback) {
    if (!isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!(file instanceof File)) {
      callback(new TypeError('File is not provided or not instanceof File (QiniuUploader.File)'))
      return
    }

    options = defaultsDeep(options, { cache: true, override: false }, this.settings)

    let { maxConnect } = options
    if (!(isInteger(maxConnect) && maxConnect > 0)) {
      callback(new TypeError('Options.maxConnect is invalid or not a integer'))
      return
    }

    let {
      blockSize: perBlockSize,
      chunkSize: perChunkSize
    } = options

    if (!isInteger(perBlockSize)) {
      callback(new TypeError('Block size is not a integer'))
      return
    }

    if (!isInteger(perChunkSize)) {
      callback(new TypeError('Chunk size is not a integer'))
      return
    }

    if (perBlockSize < perChunkSize) {
      callback(new Error('Chunk size must less than block size'))
      return
    }

    let { maxFileSize } = options
    if (file.size > maxFileSize) {
      callback(new Error(`File size must less than ${maxFileSize}`))
      return
    }

    if (!isInteger(maxFileSize)) {
      callback(new TypeError('MaxFileSize is not a integer'))
      return
    }

    let _resumingProgressHandle = options.progress
    options.progress = undefined

    let processes = []
    let listenProgress = isFunction(_resumingProgressHandle)

    let registerRequest = function (type, request, progressRelativeData) {
      if (!(request && request.xhr && request.xhr instanceof window.XMLHttpRequest)) {
        return
      }

      let { xhr } = request

      /* eslint standard/object-curly-even-spacing:0 */
      let process = { request, xhr /** , size, beginOffset, endOffset */ }

      if (!isEmpty(progressRelativeData)) {
        assign(process, progressRelativeData)

        if (listenProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              process.loaded = event.loaded
              process.total = event.total
            }

            triggerRequestProgress(type, xhr, process)
          }, false)
        }
      }

      type === 'bput' && processes.push(process)
    }

    let triggerRequestProgress = function (type, xhr, process) {
      let uploadSize = 0

      forEach(processes, function ({ size, loaded, total, beginPos, endPos }) {
        if (isInteger(size) && isInteger(loaded) && isInteger(total)) {
          uploadSize += size * loaded / total
        }
      })

      let event = new QiniupEvent(type)
      event.processes = processes
      event.process = process
      event.loaded = uploadSize
      event.total = file.size

      let nowDatetime = Date.now()
      let spendTime = nowDatetime - startDatetime
      let size = event.loaded
      let time = spendTime / 1000
      let speed = size / time || 0
      let description = `${speed.toFixed(2)}Byte/s`

      if (speed > CONFIG.G) {
        description = `${(speed / CONFIG.G).toFixed(2)}Gb/s`
      } else if (speed > CONFIG.M) {
        description = `${(speed / CONFIG.M).toFixed(2)}Mb/s`
      } else if (speed > CONFIG.K) {
        description = `${(speed / CONFIG.K).toFixed(2)}Kb/s`
      }

      event.during = time
      event.speed = speed
      event.speedDescription = description

      _resumingProgressHandle.call(xhr, event)
    }

    let abortRequest = function () {
      forEach(processes, ({ request }) => request.cancel())
    }

    /**
     * 创建分块任务
     * @param {File} file 文件对象
     * @param {Integer} beginPos 起始位置
     * @param {Integer} endPos 结束位置
     * @param {Function} callback 回调函数
     */
    let mkblk = (file, beginPos, endPos, info, callback) => {
      /**
       * 如果该段已经被上传则执行下一个切割任务
       * 每次切割任务都必须判断分片(Chunk)是否上传完成
       */
      let state = file.getState(beginPos, endPos)
      if (info.options.override === false && state) {
        callback(null, state)
        return
      }

      /**
       * 当到该段上传的时候才进行切割，否则大型文件在切割的情况下会变得好卡
       * 这样也能减少资源与内存的消耗
       */
      let block = file.slice(beginPos, endPos)
      let request = this.mkblk(block, info.params, info.options, (error, response) => {
        if (error) {
          callback(error)
          return
        }

        let state = assign({ status: 'uploaded', beginPos, endPos }, response)
        file.setState(beginPos, endPos, state, info.options.cache)
        callback(null, assign({ file, block, state }, info))
      })

      /**
       * 这里是返回的是分块(block)中的第一个分片(chunk)
       * 与上面的末位置不同(endPos)
       */
      let size = block.size > perChunkSize ? perChunkSize : block.size
      registerRequest('mkblk', request, { size: block.size, beginOffset: beginPos, endOffset: endPos })
      registerRequest('bput', request, { size, beginOffset: beginPos, endOffset: beginPos + size })
    }

    /**
     * 创建分片任务
     * @param {Blob} block 分块
     * @param {File} file 文件对象
     * @param {String} ctx 七牛创建分块并上传第一个分片完成后返回哈希值
     * @param {Integer} beginPos 起始位置
     * @param {Integer} endPos 结束位置
     * @param {Function} callback 回调函数
     */
    let mkchk = (block, beginPos, endPos, info, callback) => {
      /**
       * 如果该段已经被上传则执行下一个切割任务
       * 每次切割任务都必须判断分片(Chunk)是否上传完成
       */
      let state = info.file.getState(info.beginOffset, info.endOffset)
      if (info.options.override === false && state) {
        callback(null, state)
        return
      }

      let chunk = block.slice(beginPos, endPos, block.type)
      let params = assign({ ctx: info.ctx, offset: beginPos }, info.params)
      let request = this.bput(chunk, params, info.options, (error, response) => {
        if (error) {
          callback(error)
          return
        }

        let state = assign({ status: 'uploaded', beginPos, endPos }, response)
        file.setState(beginPos, endPos, state, info.options.cache)
        callback(null, assign({ state, chunk, block }, info))
      })

      let datas = {
        size: chunk.size,
        beginOffset: info.beginOffset,
        endOffset: info.endOffset
      }

      registerRequest('bput', request, datas)
    }

    let totalBlockNo = Math.ceil(file.size / perBlockSize)
    if (totalBlockNo > options.maxBlockTasks) {
      callback(new Error(`Block total number (${totalBlockNo}) is too large, it must be less than ${options.maxBlockTasks}, please check uploader options`))
      return
    }

    let tasks = times(totalBlockNo, (blockNo) => {
      let tasks = []
      let blockOffset = perBlockSize * blockNo
      let blockBeginPos = blockOffset
      let blockEndPos = blockOffset + perBlockSize

      if (blockEndPos > file.size) {
        blockEndPos = file.size
      }

      /**
       * 因为上传块(Block)的时候必须同时上传第一个切割片(Chunk)
       * 因此我们可以直接判断当前块的第一个切片(Chunk)是否已经上传
       * 不用额外将块(Block)上传信息另外保存起来
       */
      let task = (callback) => {
        let info = { params, options }
        return mkblk(file, blockBeginPos, blockEndPos, info, callback)
      }

      tasks.push(task)

      /**
       * 上传片(Chunk)
       * 每个块都由许多片(Chunk)组成
       * 因此要先预设每个快(Block)中的片(Chunk)的起始位置(offset)
       * 这样就预先定义好上传的任务队列
       *
       * 注意:
       * 因为切割块(Block)是比较浪费资源，而且保存多个片(Chunk)会导致
       * 内存大幅增加，因此我们必须在每个任务上传之前先给定相应的配置(起始位置与片大小等)
       * 来进行定义任务，而非切割多个片(Chunk)资源，而且上传完必须销毁
       */
      let blockSize = blockEndPos - blockBeginPos
      let totalChunkNo = Math.ceil(blockSize / perChunkSize)

      /**
       * 因为上传分块(Block)已经上传了第一个分片(Chunk)
       * 所以可以忽略第一个分片(Chunk)，而分片(Chunk)的总数也减一
       */
      times(totalChunkNo - 1, (chunkNo) => {
        let chunkOffset = perChunkSize * (chunkNo + 1)
        let chunkBeginPos = chunkOffset
        let chunkEndPos = chunkOffset + perChunkSize

        if (chunkEndPos > blockSize) {
          chunkEndPos = blockSize
        }

        let task = ({ state, block, file }, callback) => {
          let info = {
            file,
            ctx: state.ctx,
            params,
            options,
            beginOffset: blockBeginPos + chunkBeginPos,
            endOffset: blockBeginPos + chunkEndPos
          }

          return mkchk(block, chunkBeginPos, chunkEndPos, info, callback)
        }

        tasks.push(task)
      })

      return (callback) => waterfall(tasks, callback)
    })

    let startDatetime = Date.now()

    /**
     * 当所有块(Block)都全部上传完
     * 则执行合并文件操作
     */
    parallel(tasks, (error, responses) => {
      if (error) {
        callback(error)
        return
      }

      /**
       * 合并文件的时候必须要注意的是上传的 ctxs 值必须
       * 是分割的顺序的，所以可以根据起始位置(beginPos)或者
       * 结束位置(endPos)进行排序
       */
      responses = sortBy(responses, 'state.beginPos')

      /**
       * 获取所有分块中最后分片上传完成返回的哈希值(ctx)，
       * 并组成数组提交创建文件接口
       */
      let ctxs = map(responses, 'state.ctx')
      let size = file.size
      let request = this.mkfile(ctxs, assign({ size }, params), options, callback)

      registerRequest('mkfile', request, { size })
    })

    return { cancel: abortRequest, xhr: null }
  }
}
