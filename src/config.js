/**
 * 本地缓存前缀
 *
 * @type {String}
 * @const
 */
export const STORAGE_PREFIX = 'QINIU_UPLOAD'

/**
 * Base64 数据正则，用于判断数据是否为 Base64 数据
 *
 * @type {RegExp}
 * @const
 */
export const BASE64_REGEXP = /^data:([\w\W]+?);base64,/

/**
 * 七牛 HTTPS 上传地址，默认为中国华南地区
 *
 * @see https://developer.qiniu.com/kodo/manual/1671/region-endpoint
 * @type {String}
 * @const
 */
export const QINIU_UPLOAD_HTTPS_URL = 'upload-z2.qbox.me'

/**
 * 七牛 HTTP 上传地址，默认为中国华南地区
 *
 * @type {String}
 * @const
 */
export const QINIU_UPLOAD_HTTP_URL = 'upload-z2.qiniu.com'

/**
 * 千字节
 *
 * @type {Integer}
 * @const
 */
export const K = 1024

/**
 * 兆字节
 *
 * @type {Integer}
 * @const
 */
export const M = K * K

/**
 * 千兆字节
 *
 * @type {Integer}
 * @const
 */
export const G = M * M
