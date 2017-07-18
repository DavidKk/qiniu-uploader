import { G, M, K } from './config'

/**
 * 转换大小成描述
 * @param {Integer} size 字节
 * @return {Stirng} 描述
 */
export function sizeStringify (size) {
  if (size > G) {
    return `${(size / G).toFixed(2)}Gb`
  }

  if (size > M) {
    return `${(size / M).toFixed(2)}Mb`
  }

  if (size > K) {
    return `${(size / K).toFixed(2)}Kb`
  }

  return `${size.toFixed(2)}Byte`
}

/**
 * 判断是否为数字
 * @param {Number|String} number 需要判断的数字
 * @return {Boolean} 结果
 */
export function isNumeric (number) {
  return !isNaN(parseFloat(number)) && isFinite(number) && number.constructor !== Array
}
