import isFunction from 'lodash/isFunction'

/**
 * 事件类
 * @class
 * @extends {Event}
 */
export class QiniupEvent {
  /**
   * 创建一个事件类
   * @param {String} 事件名称
   * @param {Object} [params={ bubbles: false, cancelable: false, detail: undefined }]
   */
  constructor (event, params = { bubbles: false, cancelable: false, detail: undefined }) {
    if (isFunction(window.CustomEvent)) {
      return new window.CustomEvent(event, params)
    }

    /**
     * CustomEvent in IE
     * Docs: https://stackoverflow.com/questions/26596123/internet-explorer-9-10-11-event-constructor-doesnt-work
     */
    var evt = document.createEvent('CustomEvent')
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail)
    return evt
  }
}

QiniupEvent.prototype = window.Event.prototype
