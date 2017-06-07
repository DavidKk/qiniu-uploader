import _ from 'lodash';

/**
 * 异常类
 * @extends {Error}
 * 主要用于存储错误信息与错误代码
 */
export class Execption {
  constructor (message, code) {
    if (message instanceof Error) {
      this.origin  = message;
      this.stack   = message.stack;
      this.message = message.message;
    }
    else if (_.isPlainObject(message)) {
      this.origin = message;

      try {
        this.message = JSON.stringify(message);
      }
      catch (err) {
        this.message = String(message);
      }
    }
    else {
      this.message = String(message);
    }

    this.code = code * 1;
  }

  toString () {
    return this.message;
  }
}

Execption.prototype = Error.prototype;
