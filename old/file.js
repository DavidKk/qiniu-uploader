import _          from 'lodash';
import { M, TOKEN_PREFIX }      from './config';
import { mkhash } from './utils';

/**
 * 文件类
 * 存储文件与文件状态
 * 临时保存线上数据库信息
 */
export class File {
  static DEFAULTS = {
    mimeType     : 'plain/text',
    chunkSize    : 4 * M,
    chunkInBlock : 5,
    expired      : 60 * 60 * 24,
  };

  get size () {
    return this.blob.size;
  }

  constructor (file, options) {
    /**
     * 初始化配置
     */
    this.setting = _.defaultsDeep(File.DEFAULTS, options);

    /**
     * 文件类型不得进行任何修改
     */
    Object.defineProperty(this, 'mimeType', {
      writeable : false,
      value     : file.type || this.setting.mimeType,
    });

    /**
     * 转化成 blob 对象
     * 将文件(File), 文件列表(Array[<File, File...>]), base64(String) 文件数据转换成 Blob 基础文件对象
     */
    this.file  = file;
    this.blob  = new Blob(_.isArray(file) ? file : [file], { type: this.mimeType });
    this.hash  = mkhash(file.name + file.size + file.type + file.lastModified);
    this.state = [];

    /**
     * 查找本地是否存在之前临时
     * 保存的上传数据
     */
    this.loadState();
  }

  /**
   * 切片
   * 将文件切割成 blob 段
   */
  slice (startPos = 0, endPos) {
    return this.blob.slice(startPos, endPos);
  }

  /**
   * 保存状态信息
   */
  ok (type, state) {
    let data = _.merge({ type: type }, state);
    this.state.push(data);

    this.saveState();
  }

  /**
   * 是否已经上传片段
   * 主要是开始位置, 因为上传的时候已经确定了所有
   * 上传片的起始位置与结束, 因此这里只需要判断
   * 起始位置就可以知道是否已经上传了
   */
  isUploaded (offset) {
    for (let data = _.filter(this.state, { type: 'chunk' }), i = 0; i < data.length; i ++) {
      if (_.inRange(offset, data[i].startPos, data[i].endPos)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 导入状态信息
   */
  import (source) {
    if (_.isString(source)) {
      try {
        let data = JSON.parse(source);
        return this.import(data);
      }
      catch (err) {
        return false;
      }
    }

    if (!_.isPlainObject(source)) {
      return false;
    }

    if (this.hash !== source.hash) {
      return false;
    }

    if (source.expired < Date.now()) {
      return false;
    }

    if (!_.isArray(source.state)) {
      return false;
    }

    let state = [];
    for (let i = 0, datas = source.state, len = datas.length; i < len; i ++) {
      if (-1 === _.indexOf(['block', 'chunk'], datas[i].type)) {
        return false;
      }

      state.push(datas[i]);
    }

    this.state = state;
    return true;
  }

  /**
   * 导出状态信息
   */
  export (type) {
    if ('json' === (type || '').toLowerCase()) {
      try {
        let data = this.export();
        return JSON.stringify(data);
      }
      catch (err) {
        return null;
      }
    }

    return {
      hash    : this.hash,
      state   : this.state,
      expired : Date.now() + this.setting.expired,
    };
  }

  /**
   * 读取状态信息
   */
  loadState () {
    let source = window.localStorage.getItem(CONFIG.STORAGE_PREFIX + this.hash);
    return this.import(source);
  }

  /**
   * 存储状态信息
   */
  saveState () {
    let source = this.export('JSON');
    return source ? window.localStorage.setItem(TOKEN_PREFIX + this.hash, source) || true : false;
  }

  /**
   * 清除状态信息
   */
  cleanState () {
    window.localStorage.removeItem(TOKEN_PREFIX + this.hash);
  }
}
