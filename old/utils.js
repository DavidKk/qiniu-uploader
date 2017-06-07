import _             from 'lodash';
import { Execption } from './execption';

export function mkhash (source) {
  let hash = 0;

  if (0 === source.length) {
    return hash;
  }

  for (let i = 0, len = source.length; i < len; i ++) {
    let chr = source.charCodeAt(i);
    hash = (hash << 5 - hash) + chr;
    hash |= 0;
  }

  return hash;
}

export function http (optoins = {}, resolve, reject) {
  try {
    let xhr = new XMLHttpRequest();

    /**
     * 错误处理
     */
    xhr.onerror = function () {
      _.isFunction(reject) && reject(new Execption(`XMLHttpRequest cannot load ${optoins.url}`, xhr.status));
    };

    xhr.onreadystatechange = function () {
      if (4 === xhr.readyState) {
        try {
          if (!_.isEmpty(xhr.responseText)) {
            let response = JSON.parse(xhr.responseText);

            200 === xhr.status
            ? _.isFunction(resolve) && resolve(response)
            : _.isFunction(reject) && reject(new Execption(response), xhr.status);
          }
        }
        catch (parseError) {
          _.isFunction(reject) && reject(new Execption(parseError), 422);
        }
      }
    };

    xhr.open((optoins.method || 'POST').toUpperCase(), optoins.url, true);

    if (true === optoins.withCredentials) {
      xhr.withCredentials = true;
    }

    /**
     * 设置头部信息
     */
    _.forEach(optoins.headers, function (header, name) {
      xhr.setRequestHeader(name, header);
    });

    /**
     * 设置提交数据
     * @type {FormData}
     */

    if (_.isPlainObject(optoins.data)) {
      let formData = new FormData();

      _.forEach(optoins.data, function (value, key) {
        formData.append(key, value);
      });

      xhr.send(formData);
    }
    else {
      xhr.send(optoins.data || null);
    }
  }
  catch (err) {
    _.isFunction(reject) && reject(new Execption(err, 502));
  }
}

export function execQueue (queue, completeCallback, throwCallback, eachCallback) {
  exec([].concat(queue), eachCallback || execNext, null, completeCallback);

  function exec (queue, eachCallback, params, completeCallback) {
    if (0 < queue.length) {
      eachCallback(function next (params) {
        exec(queue, eachCallback, params, completeCallback);
      },
      Array.prototype.shift.call(queue), params, throwCallback);
    }
    else {
      _.isFunction(completeCallback) && completeCallback(params);
    }
  }

  function execNext (next, task, params, throwCallback) {
    try {
      task(next, function (error) {
        throwCallback(error, next, task, params);
      }, params);
    }
    catch (error) {
      throwCallback(error, next, task, params);
    }
  }
}
