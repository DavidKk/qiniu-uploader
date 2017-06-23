import defaultsDeep from 'lodash/defaultsDeep'
import isFunction from 'lodash/isFunction'
import isPlainObject from 'lodash/isPlainObject'
import isEmpty from 'lodash/isEmpty'
import forEach from 'lodash/forEach'
import assign from 'lodash/assign'
import URI from 'urijs'
import { G, M, K } from './config'

/**
 * @typedef {Object} Request
 * @property {XMLHttpRequest} xhr AJAX 对象
 * @property {Function} cancel 取消函数
 */

let settings = {}

/**
 * 设置默认配置
 *
 * @param {Object} [options={}] 配置
 */
export function configure (options = {}) {
  settings = defaultsDeep(options, settings)
}

/**
 * 上传，执行 POST 请求 XMLHttpRequest
 *
 * @param {String} url 请求地址
 * @param {Object} data 提交数据
 * @param {Object} [options] 配置
 * @param {Function} callback 回调函数
 * @return {Request} 返回一个请求对象
 */
export function upload (url, data, options, callback) {
  return request('POST', url, data, options, callback)
}

/**
 * 请求 XMLHttpRequest
 *
 * @param {string} [method='POST'] 提交方法
 * @param {String} url 请求地址
 * @param {Object} data 提交数据，若请求方法为 GET，则数据将转换成请求地址的 query
 * @param {Object} [options={}] 请求配置
 * @param {Function} callback 回调函数
 * @return {Request} 返回一个请求对象
 */
export function request (method = 'POST', url, data, options = {}, callback) {
  if (arguments.length < 3) {
    return request('POST', method, {}, {}, url)
  }

  if (arguments.length < 4) {
    return request(method, url, {}, {}, data)
  }

  if (arguments.length < 5) {
    return request(method, url, data, {}, options)
  }

  if (!isFunction(callback)) {
    throw new TypeError('Callback is not provided or not be a function')
  }

  method = method.toUpperCase()
  options = defaultsDeep(options, settings)

  let xhr = new window.XMLHttpRequest()

  let xhrComplete = function () {
    xhr.onerror = null
    xhr.onreadystatechange = null
    xhr = undefined
  }

  xhr.onerror = (error) => {
    if (xhr.aborted === true) {
      return
    }

    xhr.errorFlag = true
    callback(error)
    xhrComplete()
  }

  xhr.onreadystatechange = () => {
    if (xhr.errorFlag === true || xhr.aborted === true) {
      return
    }

    if (xhr.readyState === 4) {
      let parsedData

      if (!xhr.responseText) {
        callback(new Error('Response text is empty'))
        xhrComplete()
        return
      }

      try {
        parsedData = JSON.parse(xhr.responseText)
      } catch (error) {
        callback(new Error(`Reponse data is invalid JSON\n${xhr.responseText}`))
        xhrComplete()
        return
      }

      xhr.status === 200
      ? callback(null, parsedData)
      : callback(new Error(parsedData))

      xhrComplete()
    }
  }

  if (isFunction(options.progress)) {
    let startDatetime = Date.now()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        let nowDatetime = Date.now()
        let spendTime = nowDatetime - startDatetime
        let size = event.loaded
        let time = spendTime / 1000
        let speed = size / time || 0
        let description = `${speed.toFixed(2)}Byte/s`

        if (speed > G) {
          description = `${(speed / G).toFixed(2)}Gb/s`
        } else if (speed > M) {
          description = `${(speed / M).toFixed(2)}Mb/s`
        } else if (speed > K) {
          description = `${(speed / K).toFixed(2)}Kb/s`
        }

        event.during = time
        event.speed = speed
        event.speedDescription = description

        options.progress.call(xhr, event)
      }
    }, false)
  }

  let isGetMethod = method === 'GET' && isPlainObject(data)
  if (isGetMethod) {
    if (isEmpty(data)) {
      xhr.open(method, url, true)
    } else {
      let uri = new URI(url)
      let params = URI.parseParameters(uri.query())

      params = assign(params, data)
      uri.query(params)

      xhr.open(method, uri.href(), true)
    }
  } else {
    xhr.open(method, url, true)
  }

  /**
   * 必须在 xhr.open 后才能配置
   */
  xhr.withCredentials = !!options.withCredentials
  forEach(options.headers, (header, name) => xhr.setRequestHeader(name, header))

  if (isGetMethod) {
    xhr.send(null)
  } else {
    if (isPlainObject(data)) {
      let formData = new window.FormData()
      forEach(data, (value, key) => formData.append(key, value))
      xhr.send(formData)
    } else {
      xhr.send(data || null)
    }
  }

  let cancel = function () {
    if (xhr) {
      xhr.readyState !== 4 && xhr.abort()
      xhr.aborted = true

      callback(new Error('Request is canceled'))
    }
  }

  return { cancel, xhr }
}
