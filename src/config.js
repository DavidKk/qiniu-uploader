/**
 * 本地缓存前缀
 * @type {String}
 * @const
 */
export const STORAGE_PREFIX = 'QINIU_UPLOAD'

/**
 * Base64 数据正则，用于判断数据是否为 Base64 数据
 * @type {RegExp}
 * @const
 */
export const BASE64_REGEXP = /^data:([\w\W]+?);base64,/

/**
 * 七牛 HTTPS 上传地址，默认为中国华南地区
 * @see https://developer.qiniu.com/kodo/manual/1671/region-endpoint
 * @type {String}
 * @const
 */
export const QINIU_UPLOAD_HTTPS_URL = 'up.qbox.me'

/**
 * 七牛 HTTP 上传地址，默认为中国华南地区
 * @type {String}
 * @const
 */
export const QINIU_UPLOAD_HTTP_URL = 'up-z0.qiniu.com'

/**
 * 千字节
 * @type {Integer}
 * @const
 */
export const K = 1024

/**
 * 兆字节
 * @type {Integer}
 * @const
 */
export const M = K * K

/**
 * 千兆字节
 * @type {Integer}
 * @const
 */
export const G = M * M

/**
 * 浏览器是否支持
 * @type {Boolean}
 * @const
 */

/* eslint no-mixed-operators: off */
export const SUPPORTED = typeof File !== 'undefined' &&
  typeof window.Blob !== 'undefined' &&
  typeof FileList !== 'undefined' &&
  !!window.Blob.prototype.slice ||
  !!window.Blob.prototype.webkitSlice ||
  !!window.Blob.prototype.mozSlice ||
  false
