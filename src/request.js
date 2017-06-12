import _ from 'lodash'
import URI from 'urijs'

let settings = {}

/**
 * 设置默认配置
 *
 * @param {Object} options 配置
 */
export function configure (options) {
  settings = _.defaultsDeep(options, settings)
}

/**
 * 上传，执行 POST 请求 XMLHttpRequest
 *
 * @param {String} url 请求地址
 * @param {Object} data 提交数据
 * @param {Object} [options] 配置
 * @param {Function} callback 回调函数
 * @returns {Object} 返回 xhr:XMLHttpRequest 与 cancel:Function
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
 * @returns {Object} 返回 xhr:XMLHttpRequest 与 cancel:Function
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

  if (!_.isFunction(callback)) {
    throw new TypeError('Callback is not provided or not be a function')
  }

  method = method.toUpperCase()
  options = _.defaultsDeep(options, settings)

  let xhr = new window.XMLHttpRequest()
  xhr.onerror = callback.bind(null)
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      let parsedData

      if (!xhr.responseText) {
        callback(new Error('Response text is empty'))
        return
      }

      try {
        parsedData = JSON.parse(xhr.responseText)
      } catch (error) {
        callback(new Error(`Reponse data is invalid JSON\n${xhr.responseText}`))
        return
      }

      xhr.status === 200
      ? callback(null, parsedData)
      : callback(new Error(parsedData))
    }
  }

  let isGetMethod = method === 'GET' && _.isPlainObject(data)
  if (isGetMethod) {
    if (_.isEmpty(data)) {
      xhr.open(method, url, true)
    } else {
      let uri = new URI(url)
      let params = URI.parseParameters(uri.query())

      params = _.assign(params, data)
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
  _.forEach(options.headers, (header, name) => xhr.setRequestHeader(name, header))

  if (isGetMethod) {
    xhr.send(null)
  } else {
    if (_.isPlainObject(data)) {
      let formData = new window.FormData()
      _.forEach(data, (value, key) => formData.append(key, value))
      xhr.send(formData)
    } else {
      xhr.send(data || null)
    }
  }

  let cancel = function () {
    xhr.abort()
    callback(new Error('Request is canceled'))
  }

  return { cancel, xhr }
}
