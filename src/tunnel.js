/** @module tunnel */

import _ from 'lodash'
import { waterfall, parallelLimit } from 'async'
import * as http from './request'
import * as CONFIG from './config'
import { File } from './file'

/**
 * 七牛通道类
 * 支持普通文件上传，适合图片文本等小文件上传
 * 支持 Base64 文件上传，Base64 字符串长度并不等于文件大小，可参考：https://en.wikipedia.org/wiki/Base64
 * 支持断点续传，缓存上传了的块与片保存在本地缓存中，若清除本地缓存则不能保证能继续上次的断点
 * 块大小，每块均为4MB（1024*1024*4），最后一块大小不超过4MB
 * 所有接口均参考七牛官方文档，一切均以七牛官方文档为准
 *
 * @class Tunnel
 * @export
 */
export class Tunnel {
  /**
   * 七牛通道类默认配置
   * 
   * @type {Object}
   * 
   * @memberof Tunnel
   * @static
   */
  static defaultSettings = {
    /**
     * 是否使用 Https 进行上传
     * @type {Boolean}
     * @inner
     */
    useHttps: 'https:' === 'undefined' === typeof window ? false : window.location.protocol,
    /**
     * 是否缓存
     * @type {Boolean}
     * @inner
     */
    cache: false,
    /**
     * 最大连接数
     * @type {Integer}
     * @inner
     */
    maxConnect: 4,
    /**
     * 最大文件大小
     * @type {Integer}
     * @inner
     */
    maxFileSize: CONFIG.G,
    /**
     * 最小文件大小
     * @type {Integer}
     * @inner
     */
    minFileSize: 10 * CONFIG.M,
    /**
     * 分块大小
     * @type {Integer}
     * @inner
     */
    blockSize: 4 * CONFIG.M,
    /**
     * 分片大小
     * @type {Integer}
     * @inner
     */
    chunkSize: 1 * CONFIG.M,
  }

  /**
   * Creates an instance of Tunnel
   * 
   * @param {Object} options 默认配置
   * 
   * @memberof Tunnel
   */
  constructor (options) {
    this.settings = _.defaultsDeep(options, this.constructor.defaultSettings)
  }

  /**
   * 上传文件
   * 普通文件上传，适合小文件
   * 
   * @param {File|Blob} file 文件
   * @param {Object} params 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Object} [params.key] 如果没有指定则：如果 uptoken.SaveKey 存在则基于 SaveKey 生产 key，否则用 hash 值作 key。EncodedKey 需要经过 base64 编码
   * @param {Object} [options={}] 上传配置
   * @param {String} options.host 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} callback 回调
   * @returns {Object|Undefined} 包括 xhr　与 cancel 方法
   * 
   * @memberof Tunnel
   */
  upload (file, params = {}, options = {}, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!(file instanceof File || file instanceof Blob)) {
      callback(new TypeError('File is not provided or not instanceof File'))
      return
    }

    if (!(_.isString(params.token) && params.token)) {
      callback(new TypeError('Params.token is not provided or not be a valid string'))
      return
    }

    options = _.defaultsDeep(options, this.settings)

    let host = options.host || (options.useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)
    let url = `${options.useHttps ? 'https:' : 'http:'}//${host}`
    let datas = _.assign({ file }, params)
    let headers = {
      Authorization: `${options.tokenPrefix || 'UpToken'} ${params.token}`,
    }

    return http.upload(url, datas, _.assign({ headers }, options), callback)
  }

  /**
   * 上传 base64 资源
   * 普通文件上传，适合一次过base64文件
   * @see https://developer.qiniu.com/kodo/kb/1326/how-to-upload-photos-to-seven-niuyun-base64-code
   * 
   * @param {string} content base64文件数据
   * @param {Object} params 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Integer} [params.size=-1] 文件大小，-1为自动获取
   * @param {Object} [params.key] 如果没有指定则：如果 uptoken.SaveKey 存在则基于 SaveKey 生产 key，否则用 hash 值作 key。EncodedKey 需要经过 base64 编码
   * @param {Object} [params.mimeType] 文件的 MIME 类型，默认是 application/octet-stream
   * @param {Object} [params.crc32] 文件内容的 crc32 校验值，不指定则不进行校验
   * @param {Object} [options={}] 上传配置
   * @param {String} options.host 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} callback 回调
   * @returns {Object|Undefined} 包括 xhr　与 cancel 方法
   * 
   * @memberof Tunnel
   */
  upb64 (content, params = { size: -1 }, options = {}, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (_.isEmpty(content) || !CONFIG.BASE64_REGEXP.exec(content)) {
      callback(new TypeError('Content is not provided or not a valid base64 string'))
      return
    }

    if (!_.isString(params.token)) {
      callback(new TypeError('Params.token is not provided or not be a valid string'))
      return
    }

    if (!(_.isNumber(params.size) && _.isInteger(params.size) && params.size > 0)) {
      params.size = -1
    }

    options = _.defaultsDeep(options, this.settings)

    let host = options.host || (options.useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)
    let url = `${options.useHttps ? 'https:' : 'http:'}//${host}/${params.size}`

    if (_.isString(params.key) && params.key) {
      url += `/key/${encodeURIComponent(params.key)}`
    }

    if (_.isString(params.mimeType) && params.mimeType) {
      url += `/mimeType/${encodeURIComponent(params.mimeType)}`
    }

    if (_.isString(params.crc32) && params.crc32) {
      url += `/crc32/${encodeURIComponent(params.crc32)}`
    }

    if (_.isString(params.userVars) && params.userVars) {
      url += `/x:user-var/${encodeURIComponent(params.userVars)}`
    }

    let datas = content.replace(CONFIG.BASE64_REGEXP, '')
    let headers = {
      'Content-Type': 'application/octet-stream',
      Authorization: `${options.tokenPrefix || 'UpToken'} ${params.token}`,
    }

    return http.upload(url, datas, _.assign({ headers }, options), callback)
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
   * @param {String} options.host 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {number} options.chunkSize 设置每个分片的大小
   * @param {mkblkCallback} callback 上传之后执行的回调函数
   * @returns {Object|Undefined} 包括 xhr　与 cancel 方法
   * 
   * @memberof Tunnel
   */
  mkblk (block, params = {}, options = {}, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (_.isEmpty(block) || !(block instanceof Blob)) {
      callback(new TypeError('Block is not provided or not instanceof Blob'))
      return
    }

    if (!_.isString(params.token)) {
      callback(new TypeError('Params.token is not provided or not be a valid string'))
      return
    }

    options = _.defaultsDeep(options, this.settings)

    let chunk = block.slice(0, options.chunkSize, block.type)
    let host = options.host || (options.useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)
    let url = `${options.useHttps ? 'https:' : 'http:'}//${host}/mkblk/${block.size}`
    let headers = {
      'Content-Type': 'application/octet-stream',
      Authorization: `${options.tokenPrefix || 'UpToken'} ${params.token}`,
    }

    return http.upload(url, chunk, _.assign({ headers }, options), callback)
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
   * @param {String} options.host 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} callback 回调
   * @returns {Object|Undefined} 包括 xhr　与 cancel 方法
   * 
   * @memberof Tunnel
   */
  bput (chunk, params = {}, options = {}, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (_.isEmpty(chunk) || !(chunk instanceof Blob)) {
      callback(new TypeError('Block is not provided or not instanceof Blob'))
      return
    }

    if (!_.isString(params.token)) {
      callback(new TypeError('Params.token is not provided or not be a valid string'))
      return
    }

    if (!_.isString(params.ctx)) {
      callback(new TypeError('Params.ctx is not provided or not be a valid string'))
      return
    }

    if (!(_.isNumber(params.offset) && _.isInteger(params.offset) && params.offset > 0)) {
      callback(new TypeError('Params.offset is not provided or not be a valid interger'))
      return
    }

    options = _.defaultsDeep(options, this.settings)

    let host = options.host || (options.useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)
    let url = `${options.useHttps ? 'https:' : 'http:'}//${host}/bput/${params.ctx}/${params.offset}`
    let headers = {
      'Content-Type': 'application/octet-stream',
      Authorization: `${options.tokenPrefix || 'UpToken'} ${params.token}`,
    }

    return http.upload(url, chunk, _.assign({ headers }, options), callback)
  }

  /**
   * 提交组合文件，将所有块与分片组合起来并生成文件
   * 当所有块与分片都上传了，将所有块的返回
   * 
   * @see https://developer.qiniu.com/kodo/api/1287/mkfile
   * 
   * @param {Array|String} ctx 文件
   * @param {Object} params 参数
   * @param {Integer} params.size 文件大小
   * @param {Object} [params.key] 如果没有指定则：如果 uptoken.SaveKey 存在则基于 SaveKey 生产 key，否则用 hash 值作 key。EncodedKey 需要经过 base64 编码
   * @param {Object} [params.mimeType] 文件的 MIME 类型，默认是 application/octet-stream
   * @param {Object} [params.crc32] 文件内容的 crc32 校验值，不指定则不进行校验
   * @param {Object} [options={}] 上传配置
   * @param {String} options.host 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Function} callback 回调
   * @returns {Object|Undefined} 包括 xhr　与 cancel 方法
   * 
   * @memberof Tunnel
   */
  mkfile (ctxs, params = {}, options = {}, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (_.isEmpty(ctxs) || !(_.isArray(ctxs) || _.isString(ctxs))) {
      callback(new TypeError('Ctxs is not provided or not be a valid value'))
      return
    }

    if (!_.isString(params.token)) {
      callback(new TypeError('Params.token is not provided or not be a valid string'))
      return
    }

    if (!(_.isNumber(params.size) && _.isInteger(params.size) && params.size > 0)) {
      callback(new TypeError('Param.size is not provided or not be a valid integer'))
      return
    }

    let host = options.host || (options.useHttps ? CONFIG.QINIU_UPLOAD_HTTPS_URL : CONFIG.QINIU_UPLOAD_HTTP_URL)
    let url = `${options.useHttps ? 'https:' : 'http:'}//${host}/mkfile/${params.size}`

    if (_.isString(params.key) && params.key) {
      url += `/key/${encodeURIComponent(params.key)}`
    }

    if (_.isString(params.mimeType) && params.mimeType) {
      url += `/mimeType/${encodeURIComponent(params.mimeType)}`
    }

    if (_.isString(params.crc32) && params.crc32) {
      url += `/crc32/${encodeURIComponent(params.crc32)}`
    }

    if (_.isString(params.userVars) && params.userVars) {
      url += `/x:user-var/${encodeURIComponent(params.userVars)}`
    }

    let data = _.isArray(ctxs) ? ctxs.join(',') : ctxs
    let headers = {
      'Content-Type': 'application/octet-stream',
      Authorization: `${options.tokenPrefix || 'UpToken'} ${params.token}`,
    }

    return http.upload(url, data, _.assign({ headers }, options), callback)
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
   * @param {Object} options 上传配置
   * @param {String} options.host 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} [options.tokenPrefix] 令牌前缀
   * @param {Boolean} [options.cache=true] 设置本地缓存
   * @param {Boolean} [options.override=false] 无论是否已经上传都进行重新上传
   * @param {Integer} [options.maxConnect=4] 最大连接数，设置最大上传分块(Block)的数量，其余分块(Block)将会插入队列中
   * @param {Function} callback 回调 
   * @returns {Object|Undefined} 包括 xhr　与 cancel 方法
   * 
   * @memberof Tunnel
   */
  resuming (file, params, options, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!(file instanceof File)) {
      callback(new TypeError('File is not provided or not instanceof File (QiniuUploader.File)'))
      return
    }

    options = _.defaultsDeep(options, { cache: true, override: false }, this.settings)

    if (!(_.isInteger(options.maxConnect) && options.maxConnect > 0)) {
      callback(new TypeError('Options.maxConnect is invalid or not a integer'))
      return
    }

    let perBlockSize = options.blockSize
    let perChunkSize = options.chunkSize

    if (!_.isInteger(perBlockSize)) {
      callback(new TypeError('Block size is not a integer'))
      return
    }

    if (!_.isInteger(perChunkSize)) {
      callback(new TypeError('Chunk size is not a integer'))
      return
    }

    if (perBlockSize < perChunkSize) {
      callback(new Error('Chunk size must less than block size'))
      return
    }

    /**
     * 创建分块任务
     * @param {File} file 文件对象
     * @param {Integer} beginPos 起始位置
     * @param {Integer} endPos 结束位置
     * @param {Function} callback 回调函数
     */
    let mkblk = (file, beginPos, endPos, callback) => {
      /**
       * 如果该段已经被上传则执行下一个切割任务
       * 每次切割任务都必须判断分块(Block)是否上传完成
       */
      let state = file.getState(beginPos, endPos)
      if (false === options.override && state) {
        callback(null, state)
        return
      }

      /**
       * 当到该段上传的时候才进行切割，否则大型文件在切割的情况下会变得好卡
       * 这样也能减少资源与内存的消耗
       */
      let block = file.slice(beginPos, endPos)
      this.mkblk(block, params, options, (error, response) => {
        if (error) {
          callback(error)
          return
        }

        let state = _.assign({ status: 'uploaded', beginPos, endPos }, response)
        file.setState(beginPos, endPos, state, options.cache)
        callback(null, { state, block, file })
      })
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
    let mkchk = (block, file, ctx, beginPos, endPos, callback) => {
      /**
       * 如果该段已经被上传则执行下一个切割任务
       * 每次切割任务都必须判断分片(Chunk)是否上传完成
       */
      let state = file.getState(beginPos, endPos)
      if (false === options.override && state) {
        callback(null, state)
        return
      }

      let chunk = block.slice(beginPos, endPos, block.type)
      this.bput(chunk, _.assign({ ctx, offset: beginPos }, params), options, (error, response) => {
        if (error) {
          callback(error)
          return
        }

        let state = _.assign({ status: 'uploaded', beginPos, endPos }, response)
        file.setState(beginPos, endPos, state, options.cache)
        callback(null, { state, chunk, block, file })
      })
    }

    let totalBlockNo = Math.ceil(file.size / perBlockSize)
    let tasks = _.times(totalBlockNo, (blockNo) => {
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
      tasks.push((callback) => mkblk(file, blockBeginPos, blockEndPos, callback))

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
       */
      _.times(totalChunkNo - 1, (chunkNo) => {
        let chunkOffset = perChunkSize * (chunkNo + 1)
        let chunkBeginPos = chunkOffset
        let chunkEndPos = chunkOffset + perChunkSize

        if (chunkEndPos > blockSize) {
          chunkEndPos = blockSize
        }

        tasks.push(({ state, block, file }, callback) => mkchk(block, file, state.ctx, chunkBeginPos, chunkEndPos, callback))
      })

      return (callback) => waterfall(tasks, callback)
    })

    /**
     * 当所有块(Block)都全部上传完成
     * 则执行合并文件操作
     */
    parallelLimit(tasks, options.maxConnect, (error, responses) => {
      if (error) {
        callback(error)
        return
      }

      /**
       * 合并文件的时候必须要注意的是上传的 ctxs 值必须
       * 是分割的顺序的，所以可以根据起始位置(beginPos)或者
       * 结束位置(endPos)进行排序
       */
      responses = _.sortBy(responses, 'state.beginPos')

      /**
       * 获取所有分块中最后分片上传完成返回的哈希值(ctx)，
       * 并组成数组提交创建文件接口
       */
      let ctxs = _.map(responses, 'state.ctx')
      this.mkfile(ctxs, _.assign({ size: file.size }, params), options, callback)
    })
  }
}
