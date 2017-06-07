import _                                         from 'lodash';
import { M, G, QINIU_UPLOAD_URL, BASE64_REGEXP } from './config';
import { Todo }                                  from './todo';
import { Execption }                             from './execption';
import { http }                                  from './utils';

/**
 * 通道类
 */
export class Tunnel {
  static MIDDLEWARE_TYPE = ['before', 'after', 'error'];

  static DEFAULTS = {
    chunkSize    : 4 * M,
    chunkInBlock : 5,
    blockNo      : 2,
    minFileSize : 10 * M,
    maxFileSize : G,
    blockSize   : 4 * M,
    chunkSize   : 1 * M,
    cache       : false,
  };

  constructor (options) {
    this.setting      = _.defaultsDeep(Tunnel.DEFAULTS, options);
    this._middlewares = {};
  }

  use (type, callback) {
    if (-1 === _.indexOf(Tunnel.MIDDLEWARE_TYPE, (type || '').toLowerCase())) {
      return false;
    }

    if (!(this._middlewares[type] instanceof Todo)) {
      this._middlewares[type] = new Todo();
    }

    this._middlewares[type].addTask(callback);
    return true;
  }

  middleware (type, resolve, reject) {
    let middleware = this._middlewares[type];
    middleware._exec(middleware.tasks, resolve, reject, new Todo());
  }

  _upload (file, options = {}, resolve, reject) {
    http({
      url     : options.host || QINIU_UPLOAD_URL,
      data    : _.merge({
        key   : options.key,
        file  : file,
        token : options.token,
      }, options),
      headers : {
        Authorization: `UpToken ${options.token}`,
      },
    }, resolve, reject);
  }

  _upb64 (content, options = {}, resolve, reject) {
    if (!BASE64_REGEXP.exec(content)) {
      reject(new Execption('Content must be a base64 String.'));
      return false;
    }

    http({
      url     : options.host || `${QINIU_UPLOAD_URL}/putb64/-1${ options.key ? `/key/${options.key}` : ''}`,
      data    : content.replace(BASE64_REGEXP, ''),
      headers : {
        'Content-Type' : 'application/octet-stream',
        Authorization  : `UpToken ${options.token}`,
      },
    }, resolve, reject);
  }

  _mkblk (block, options = {}, resolve, reject) {
    let chunk = block.slice(0, options.chunkSize);

    http({
      url    : `${options.host || QINIU_UPLOAD_URL}/mkblk/${block.size}`,
      data   : chunk,
      headers : {
        'Content-Type' : 'application/octet-stream',
        Authorization  : `UpToken ${options.token}`,
      },
    }, resolve, reject);
  }

  _bput (chunk, options = {}, resolve, reject) {
    http({
      url     : `${options.host || QINIU_UPLOAD_URL}/bput/${options.ctx}/${options.offset}`,
      data    : chunk,
      headers : {
        'Content-Type' : 'application/octet-stream',
        Authorization  : `UpToken ${options.token}`,
      },
    }, resolve, reject);
  }

  _mkfile (file, options = {}, resolve, reject) {
    http({
      url     : `${options.host || QINIU_UPLOAD_URL}/mkfile/${file.size}${options.key ? `/key/${encodeURIComponent(options.key)}` : ''}${file.mimeTypeq ? `/mimeType/${encodeURIComponent(file.mimeType)}` : ''}${options.userVars ? `/x:user-var/${encodeURIComponent(options.userVars)}` : ''}`,
      data    : options.ctxs.join(','),
      headers : {
        'Content-Type' : 'application/octet-stream',
        Authorization  : `UpToken ${options.token}`,
      },
    }, resolve, reject);
  }

  _resuming (file, options = this.setting) {
    let blockSize    = options.blockSize;
    let chunkSize    = options.chunkSize;
    let totalBlockNo = Math.ceil(file.size / blockSize);
    let promises     = [];

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
    for (let i = 0; i < totalBlockNo; i ++) {
      let todo        = new Todo();
      let blockOffset = i * blockSize;
      let block       = file.slice(blockOffset, blockOffset + blockSize);

      /**
       * 判断块(Block)是否已经被上传
       * 因为上传块(Block)的时候必须同时上传第一个切割片(Chunk)
       * 因此我们可以直接判断当前块(Block)是否已经上传
       * 不用额外将块(Block)上传信息另外保存起来
       */
      if (!(true === options.cache && file.isUploaded(blockOffset))) {
        todo.addTask((resolve, reject) => {
          this.middleware('before', (options) => {
            options = _.merge({ chunkSize: chunkSize }, options);

            this._mkblk(block, options, (response) => {
              let blockState = _.merge({
                startPos : blockOffset,
                endPos   : blockOffset + blockSize,
              }, response);

              file.ok('block', blockState);

              let chunkState = _.merge({
                startPos : blockOffset,
                endPos   : blockOffset + chunkSize,
              }, response);

              file.ok('chunk', chunkState);

              resolve(response);
            }, reject);
          });
        });
      }

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
      let offsetStart = chunkSize;

      /* eslint no-constant-condition:off */
      while (1) {
        /**
         * 切割到末尾退出切割上传任务
         */
        if (offsetStart >= block.size) {
          break;
        }

        /**
         * 如果该段已经被上传则执行下一个切割任务
         * 每次切割任务都必须判断片(Chunk)是否上传完成
         */
        if (!(true === options.cache && file.isUploaded(offsetStart))) {
          /**
           * 因为 offsetStart 在不停地增加
           * 而切割过程将在每一次上传的时候才进行切割(减少资源与内存消耗)
           * 因此我们将 offsetStart 复制给内部固定变量
           * offset 无论何时都让然是当前的 offsetStart 的值
           */
          let offset = offsetStart;
          todo.addTask((resolve, reject, params) => {
            this.middleware('before', (options) => {
              options = _.merge({ chunkSize: chunkSize }, options, params);

              let chunk = block.slice(offset, offset + chunkSize);
              this._bput(chunk, options, (response) => {
                let state = _.merge({
                  startPos : blockOffset + offset,
                  endPos   : blockOffset + offset + chunkSize,
                }, response);

                file.ok('chunk', state);

                resolve(response);
              }, reject);
            });
          });
        }

        offsetStart += chunkSize;
      }

      promises.push(todo.promise);
    }

    /**
     * 当所有块(Block)都全部上传完成
     * 则执行合并文件操作
     */
    Promise
    .all(promises)
    .then((response) => {
      let ctxs = _.map(response, function (lastChunk) {
        console.log(lastChunk);
        return lastChunk.ctx;
      });

      console.log(response);
      console.log(ctxs);

      this.middleware('before', (params) => {
        this._mkfile(file, { token: params.token, ctxs: ctxs }, function (response) {
          console.log('upload completed', response);
        });
      });
    })
    .catch((rejection) => {
      console.log(rejection);
    });
  }
}
