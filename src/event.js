import isFunction from 'lodash/isFunction'

export class QiniupEvent {
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
