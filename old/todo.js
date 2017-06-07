import _             from 'lodash';
import { Execption } from './execption';
import { execQueue } from './utils';

/**
 * 任务队列类
 * 阻塞的任务队列, 先进先出
 */
export class Todo {
  static DEFAULTS = {
    tryTimes: 0,
  };

  get promise () {
    return new Promise((resolve, reject) => {
      this.exec(resolve.bind(this), reject.bind(this));
    });
  }

  constructor (options = {}) {
    this.setting = _.defaultsDeep(Todo.DEFAULTS, options);

    this.tasks    = [];
    this.index    = 0;
    this.tryTimes = 0;
    this.running  = false;
    this.status   = 'none';
  }

  addTask (callback) {
    return this.tasks.push(callback);
  }

  _exec (tasks, callback, reject, todo) {
    if (!(todo instanceof Todo)) {
      reject(new Execption('todo must be a class Todo', 422), todo);
      return;
    }

    if (false !== todo.running) {
      reject(new Execption('it\'s busy now', 500), todo);
      return;
    }

    /**
     * 完成任务队列处理
     */
    let doneHandling = (params) => {
      todo.running = false;
      todo.status  = 'success';

      _.isFunction(callback) && callback(params);
    };

    /**
     * 每个任务的处理
     */
    let eachHandling = (next, task, params, errorCallback) => {
      todo.index = _.indexOf(tasks, task);

      try {
        task(next, (error) => {
          errorCallback(error, next, task, params);
        }, params);
      }
      catch (error) {
        errorCallback(error, next, task, params);
      }
    };

    /**
     * 错误处理
     */
    let errorHandling = (error) => {
      /**
       * 失败重试
       * 若重试超过上限, 则中断之后的所有任务
       * 必须使用 retry 来继续后面所有的任务
       */
      if (todo.tryTimes < todo.setting.tryTimes) {
        /**
         * 更新存储重试次数
         */
        todo.tryTimes ++;

        /**
         * 执行后面所有没有完成的任务
         */
        let undoTasks = tasks.slice(todo.index);
        execQueue(undoTasks, doneHandling, errorHandling, eachHandling);
      }
      else {
        /**
         * 重试过也失败, 则不做任何操作并且设置
         * 当前任务队列状态为 `fail`
         */
        todo.running = false;
        todo.status  = 'fail';

        _.isFunction(reject) && reject(error, todo);
      }
    };

    /**
     * 执行任务必须初始化所有状态与数据
     * 重试次数是每次执行任务队列都必须重新还原为0
     * 状态设置成任务中
     */
    todo.running  = true;
    todo.status   = 'doing';
    todo.tryTimes = 0;

    execQueue(tasks, doneHandling, errorHandling, eachHandling);
  }

  retry (callback, reject) {
    let tasks = this.tasks.slice(this.index);
    return this._exec(tasks, callback, reject, this);
  }

  exec (resolve, reject) {
    return this._exec(this.tasks, resolve, reject, this);
  }
}