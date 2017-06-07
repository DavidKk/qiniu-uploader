import _ from 'lodash'

let settings = {}

export function configure (options) {
  settings = _.defaultsDeep(options, settings)
}

export function upload (url, data, options, callback) {
  return request('POST', url, data, options, callback)
}

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
    }
    else {
      let uri = parseUrl(url)
      let requestUrl = `${uri.scheme}://${uri.host}/${uri.path}`

      if (uri.scheme) {
        requestUrl += uri.scheme + ':'
      }

      if (uri.host) {
        requestUrl += '//' + uri.host
      }

      if (uri.path) {
        requestUrl += uri.path
      }

      let params = parseParameters(uri.query)
      params = _.assign(params, data)

      if (_.isEmpty(params)) {
        let query = stringifyParameters(params)
        requestUrl += '?' + query
      }

      if (uri.fragment) {
        requestUrl += '#' + uri.fragment
      }

      xhr.open(method, requestUrl, true)
    }
  }
  else {
    xhr.open(method, url, true)
  }

  /**
   * 必须在 xhr.open 后才能配置
   */
  xhr.withCredentials = !!options.withCredentials
  _.forEach(options.headers, (header, name) => xhr.setRequestHeader(name, header))

  if (isGetMethod) {
    xhr.send(null)
  }
  else {
    if (_.isPlainObject(data)) {
      let formData = new FormData()
      _.forEach(data, (value, key) => formData.append(key, value))
      xhr.send(formData)
    }
    else {
      xhr.send(data || null)
    }
  }

  let cancel = function () {
    xhr.abort()
    callback(new Error('Request is canceled'))
  }

  return { cancel, xhr }
}

/**
 * 解析URL地址
 */
function parseUrl (url) {
  let aoMatch = /^(?:([^:/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@]*):?([^:@]*))?@)?([^:/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#/]*\/)*)()(?:[^?#]*))(?:\?([^#]*))?(?:#(.*))?)/.exec(url)
  let aoKeys = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment']
  let oURI = { url }

  for (let i = aoKeys.length; i--;) {
    if (aoMatch[i]) {
      oURI[aoKeys[i]] = aoMatch[i]
    }
  }

  let oDomain = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i)
  if (oDomain) {
    let aoRootDomain = oDomain[1].split('.')
    let nLen = aoRootDomain.length

    oURI.domain = oDomain[1]
    oURI.rootDomain = aoRootDomain.slice(nLen - 2, nLen).join('.')
  }

  if (oURI.scheme) {
    oURI.scheme = oURI.scheme.toLowerCase()
  }

  if (oURI.host) {
    oURI.host = oURI.host.toLowerCase()
  }

  return oURI
}

/**
 * 将 GET 字符串解析成对象
 * a=1&b=2&c=3 -> parseObject(...) -> {a:1, b:2, c:3}
 */
function parseParameters (params) {
  if (!(typeof params === 'string' && params.length > 0)) {
    return {}
  }

  let aoMatch = params.split('&')
  let oArgs = {}

  for (let i = 0, len = aoMatch.length; i < len; i++) {
    let param = aoMatch[i].split('=')
    let key = param[0]
    let value = (param[1] || '').toString()
    oArgs[key] = decodeURIComponent(value)
  }

  return oArgs
}

/**
 * 将对象解析成 GET 数据
 * {a:1,b:2,c:3} -> parseString(...) -> a=1&b=2&c=3
 */
function stringifyParameters (params) {
  return paramsToString(params, '').slice(0, -1).join('')
}

function paramsToString (params, pre) {
  let arr = []
  if (!_.isObject(params)) {
    return
  }

  for (let i in params) {
    let param = params[i]

    if (_.isObject(param)) {
      arr = pre !== ''
      ? arr.concat(paramsToString(param, `${pre}[${i}]`))
      : arr.concat(paramsToString(param, i))
    } else if (undefined !== param) {
      pre !== ''
      ? arr.push(pre, '[', i, ']', '=', param, '&')
      : arr.push(i, '=', param, '&')
    }
  }

  return arr
}
