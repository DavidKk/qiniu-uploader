import _ from 'lodash'
import { waterfall, parallel } from 'async'
import * as http from './request'
import * as CONFIG from './config'

export class Tunnel {
  static defaultSettings = {
    cache: false,
    maxFileSize: CONFIG.G,
    minFileSize: 10 * CONFIG.M,
    blockNo: 2,
    chunkNo: 5,
    blockSize: 4 * CONFIG.M,
    chunkSize: 1 * CONFIG.M,
  }

  constructor (options) {
    this.settings = _.defaultsDeep(options, this.constructor.defaultSettings)
  }

  /**
   * 上传文件
   * 普通文件上传，适合小文件
   * @param {File} file 文件
   * @param {Object} params 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Object} [params.key] 如果没有指定则：如果 uptoken.SaveKey 存在则基于 SaveKey 生产 key，否则用 hash 值作 key。EncodedKey 需要经过 base64 编码
   * @param {Object} [options={}] 上传配置
   * @param {String} options.host 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} options.tokenPrefix 令牌前缀
   * @param {Function} callback 回调
   */
  upload (file, params = {}, options = {}, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!(_.isString(params.token) && params.token)) {
      callback(new TypeError('Params.token is not provided or not be a valid string'))
      return
    }

    options = _.defaultsDeep(options, this.settings)

    let url = options.host || CONFIG.QINIU_UPLOAD_URL
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
   * @param {string} content base64文件数据
   * @param {Object} params 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Integer} [params.size=-1] 文件大小，-1为自动获取
   * @param {Object} [params.key] 如果没有指定则：如果 uptoken.SaveKey 存在则基于 SaveKey 生产 key，否则用 hash 值作 key。EncodedKey 需要经过 base64 编码
   * @param {Object} [params.mimeType] 文件的 MIME 类型，默认是 application/octet-stream
   * @param {Object} [params.crc32] 文件内容的 crc32 校验值，不指定则不进行校验
   * @param {Object} [options={}] 上传配置
   * @param {String} options.host 七牛HOST https://developer.qiniu.com/kodo/manual/1671/region-endpoint
   * @param {String} options.tokenPrefix 令牌前缀
   * @param {Function} callback 回调
   */
  upb64 (content, params = { size: -1 }, options = {}, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!_.isString(params.token)) {
      callback('Params.token is not provided or not be a valid string')
      return
    }

    if (!CONFIG.BASE64_REGEXP.exec(content)) {
      callback(new TypeError('Content is not a valid base64 string'))
      return
    }

    if (!(_.isNumber(params.size) && _.isInteger(params.size) && params.size > 0)) {
      params.size = -1
    }

    options = _.defaultsDeep(options, this.settings)

    let host = options.host || CONFIG.QINIU_UPLOAD_URL
    let url = `${host}/putb64/${params.size}`

    if (_.isString(params.key) && params.key) {
      url += `/key/${params.key}`
    }

    if (_.isString(params.mimeType) && params.mimeType) {
      url += `/mimeType/${params.mimeType}`
    }

    if (_.isString(params.crc32) && params.crc32) {
      url += `/crc32/${params.crc32}`
    }

    if (_.isString(params.userVars) && params.userVars) {
      url += `/x:user-var/${params.userVars}`
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
   * @param {Blob} block 块
   * @param {Object} params 上传参数
   * @param {Object} params.token 七牛令牌
   * @param {Object} [options={}] 上传配置
   * @param {number} options.chunkSize 设置每个分片的大小
   * @param {String} options.host 七牛HOST
   * @param {mkblkCallback} callback 上传之后执行的回调函数
   */
  mkblk (block, params, options = {}, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!_.isString(params.token)) {
      callback('Params.token is not provided or not be a valid string')
      return
    }

    options = _.defaultsDeep(options, this.settings)

    let chunk = block.slice(0, options.chunkSize, block.type)
    let url = `${options.host || CONFIG.QINIU_UPLOAD_URL}/mkblk/${block.size}`
    let headers = {
      'Content-Type' : 'application/octet-stream',
      Authorization  : `UpToken ${params.token}`,
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
   * @param {Blob} chunk 片
   * @param {Object} params 参数
   * @param {String} params.ctx 创建块或上一个分片上传成功的哈希值
   * @param {String} params.offset 偏移位置，分片所在块中的开始位置
   * @param {String} params.token 七牛令牌
   * @param {Object} [options={}] 上传配置
   * @param {String} options.host 七牛HOST
   * @param {Function} callback 回调
   */
  bput (chunk, params, options = {}, callback) {
    if (!_.isFunction(callback)) {
      throw new TypeError('Callback is not provied or not be a function')
    }

    if (!_.isString(params.token)) {
      callback('Params.token is not provided or not be a valid string')
      return
    }

    if (!_.isString(params.ctx)) {
      callback('Params.ctx is not provided or not be a valid string')
      return
    }

    if (_.isNumber(params.offset) && _.isInteger(params.offset) && params.offset > 0) {
      callback('Params.offset is not provided or not be a valid interger')
      return
    }

    options = _.defaultsDeep(options, this.settings)

    let url = `${options.host || CONFIG.QINIU_UPLOAD_URL}/bput/${params.ctx}/${params.offset}`
    let headers = {
      'Content-Type' : 'application/octet-stream',
      Authorization  : `UpToken ${params.token}`,
    }

    return http.upload(url, chunk, _.assign({ headers }, options), callback)
  }

  /**
   * 提交组合文件，将所有块与分片组合起来并生成文件
   * 当所有块与分片都上传了，将所有块的返回
   * @param {File} file 文件
   * @param {Object} options 配置
   * @param {Function} callback 回调
   */
  mkfile (file, options = {}, callback) {
    let url = options.url || `${QINIU_UPLOAD_URL}/mkfile/${file.size}${options.key ? `/key/${encodeURIComponent(options.key)}` : ''}${file.mimeTypeq ? `/mimeType/${encodeURIComponent(file.mimeType)}` : ''}${options.userVars ? `/x:user-var/${encodeURIComponent(options.userVars)}` : ''}`
    let data = options.ctxs.join(',')
    let headers = {
      'Content-Type' : 'application/octet-stream',
      Authorization  : `UpToken ${options.token}`,
    }

    return http.upload(url, chunk, headers, callback)
  }

  /**
   * 分割文件并上传
   * 一次过将文件分成多个，并进行并发上传
   * @param {File} file 文件
   * @param {Object} options 配置
   * @param {Function} callback 回调 
   */
  resuming (file, options, callback) {
    let blockSize    = options.blockSize
    let chunkSize    = options.chunkSize
    let totalBlockNo = Math.ceil(file.size / blockSize)
    let promises     = []

    /**
     * 创建块(Block)上传任务
     * 因为块(Block)上传为并发式上传
     * 因此这里可以直接创建多个并行上传的线程
     *
     * 线程的多少并不取决于上传的并发数, 我们应该尽量
     * 创建适当多个块(Block), 因为没上传的块只是阻塞
     * 在任务队列中
     *
     * 块(Block)的大小与位置必须是已经给定的, 否则无法
     * 做到切换多个线程, 而使用额定块(Block)则可以很稳定
     * 地实现各种并发, 串行与断点续传
     */
    let blockTask = []
    let chunkTask = []

    _.times(totalBlockNo, (number) => {
      let blockOffset = number * blockSize
      let block = file.slice(blockOffset, blockOffset + blockSize)

      /**
       * 判断块(Block)是否已经被上传
       * 因为上传块(Block)的时候必须同时上传第一个切割片(Chunk)
       * 因此我们可以直接判断当前块的第一个切片(Chunk)是否已经上传
       * 不用额外将块(Block)上传信息另外保存起来
       */
      blockTask.push((callback) => {
        if (true === options.cache && file.isUploaded(blockOffset)) {
          callback(null)
          return
        }

        options = _.merge({ chunkSize }, options)
        this.mkblk(block, options, (response) => {
          let startPos = blockOffset
          let endPos = blockOffset + blockSize
          let blockState = _.merge({ startPos, endPos }, response)
          file.ok('block', blockState)

          let chunkState = _.merge({ startPos, endPos }, response)
          file.ok('chunk', chunkState)

          callback(null, response)
        })
      })

      /**
       * 上传片(Chunk)
       * 每个块都由许多片(Chunk)组成
       * 因此要先预设每个快(Block)中的片(Chunk)的起始位置(offset)
       * 这样就预先定义好上传的任务队列
       *
       * 注意:
       * 因为切割块(Block)是比较浪费资源, 而且保存多个片(Chunk)会导致
       * 内存大幅增加, 因此我们必须在每个任务上传之前先给定相应的配置(起始位置与片大小等)
       * 来进行定义任务, 而非切割多个片(Chunk)资源, 而且上传完必须销毁
       */
      let offsetStart = chunkSize

      /* eslint no-constant-condition:off */
      while (1) {
        /**
         * 切割到末尾退出切割上传任务
         */
        if (offsetStart >= block.size) {
          break
        }

        /**
         * 如果该段已经被上传则执行下一个切割任务
         * 每次切割任务都必须判断片(Chunk)是否上传完成
         */
        if (true === options.cache && file.isUploaded(offsetStart)) {
          continue
        }

        /**
         * 因为 offsetStart 在不停地增加
         * 而切割过程将在每一次上传的时候才进行切割(减少资源与内存消耗)
         * 因此我们将 offsetStart 复制给内部固定变量
         * offset 无论何时都让然是当前的 offsetStart 的值
         */
        let offset = offsetStart
        chunkTask.push((callback) => {
          options = _.merge({ chunkSize }, options, params)

          let chunk = block.slice(offset, offset + chunkSize)

          this.bput(chunk, options, (response) => {
            let startPos = blockOffset + offset
            let endPos = blockOffset + offset + chunkSize
            let state = _.merge({ startPos, endPos }, response)

            file.ok('chunk', state)

            callback(null, response)
          })
        })

        offsetStart += chunkSize
      }
    })

    /**
     * 当所有块(Block)都全部上传完成
     * 则执行合并文件操作
     */
    // waterfall([parallel.bind(null, blockTask), parallel.bind(null, chunkTask)], (error, responses) => {
    //   if (error) {
    //     callback(error)
    //     return
    //   }

    //   let ctxs = _.map(responses, (lastChunk) => lastChunk.ctx)
    //   this.mkfile(file, { token, ctxs }, callback)
    // })
  }
}
