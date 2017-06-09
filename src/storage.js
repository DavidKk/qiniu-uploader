import { STORAGE_PREFIX } from './config'

export class Storage {
  static defaultSettings = {
    prefix: STORAGE_PREFIX,
  }

  constructor (options) {
    this.settings = _.defaultsDeep(options, this.constructor.defaultSettings)
  }

  set (name, value) {
    if (!_.isString(value)) {
      value = JSON.stringify(value)
    }

    window.localStorage.setItem(`${this.settings.prefix}.${name}`, value)
  }

  get (name) {
    let source = window.localStorage.getItem(`${this.settings.prefix}.${name}`)

    if (source) {
      try {
        return JSON.parse(source)
      }
      catch (error) {
        // nothing to do...
      }
    }

    return null
  }

  del (name) {
    window.localStorage.removeItem(`${this.settings.prefix}.${name}`)
  }
}
