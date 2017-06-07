import _          from 'lodash'
import { Tunnel } from './tunnel'
import { File }   from './file'

export class Uploader {
  constructor () {
    this.token        = ''
    this.tokenExpire  = 0
    this._middlewares = {}

    _.forEach(Tunnel.MIDDLEWARE_TYPE, (type) => {
      this._middlewares[type] = [];
    });
  }

  use (event, middleware) {
    if (_.isArray(this._middlewares[event])) {
      this._middlewares[event].push(middleware);
      return true;
    }

    return false;
  }

  upload (file, options) {
    let tunnel = new Tunnel(options);

    _.forEach(Tunnel.MIDDLEWARE_TYPE, (type) => {
      _.forEach(this._middlewares[type], (middleware) => {
        tunnel.use(type, middleware);
      });
    });

    file = new File(file);
    tunnel._resuming(file);
  }
}
