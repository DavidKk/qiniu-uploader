import _ from 'lodash'
import { File } from './file'

export class Uploader {
  constructor () {
    this.token = ''
    this.tokenExpire = 0
  }

  upload (file, options) {
    file = file instanceof File ? file : new File(file)

    let tunnel = new Tunnel(options)
    tunnel._resuming(file)
  }
}
