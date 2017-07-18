/* eslint max-nested-callbacks: off */
/* eslint-env mocha */
/* global expect */

import sinon from 'sinon'
import URI from 'urijs'
import trim from 'lodash/trim'
import { File } from '../src/file'
import { Uploader } from '../src/uploader'

describe('Class Uploader', function () {
  let base64Image = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
  let mimeType = 'plain/text'
  let blockSize = 40
  let chunkSize = 10

  describe('Uploader Initialization', function () {
    it('can be created', function () {
      let uploader = new Uploader()

      expect(uploader.settings).to.be.a('Object')
      expect(uploader.settings).to.deep.equal(Uploader.defaultSettings)
    })
  })

  describe('Token Getter', function () {
    let server

    beforeEach(function () {
      server = sinon.fakeServer.create()
    })

    afterEach(function () {
      server.restore()
    })

    it('can set getter to get token', function (done) {
      let tokenGetter = sinon.spy(function (callback) {
        callback(null, 'xxx')
      })

      server.respondWith(function (xhr) {
        let responseData = JSON.stringify({ code: 1 })
        xhr.respond(200, { 'Content-Type': 'application/json' }, responseData)
      })

      let file = new File(base64Image, { mimeType })
      let qiniup = new Uploader({ tokenGetter })
      qiniup.upload(file, {}, {}, function (error) {
        expect(error).not.to.be.an('error')

        /* eslint no-unused-expressions: 0 */
        expect(tokenGetter.calledOnce).to.be.true

        done()
      })

      server.respond()
    })

    it('can cache token', function (done) {
      let tokenGetter = sinon.spy(function (callback) {
        callback(null, { token: 'xxx', expire: Date.now() * 2 })
      })

      server.autoRespond = true
      server.respondWith(function (xhr) {
        let uri = new URI(xhr.url)
        let paths = trim(uri.path(), '/').split('/')

        switch (paths[0]) {
          case 'mkblk':
            xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ ctx: 'block_ctx' }))
            break
          case 'bput':
            xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ ctx: 'chunk_ctx' }))
            break
          case 'mkfile':
            xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ ctx: 'file' }))
            break
        }
      })

      let file = new File(base64Image, { mimeType })
      let qiniup = new Uploader({ tokenGetter })

      /**
       * 因为有 cache 本来分段上传必须执行9次提交操作在没有
       * 传入 Token 的情况下将执行9次 tokenGetter 函数，
       * 若拥有 cache 特性，则在短时间内将不会重复请求 token
       * 而上面我们设置的过期时间为两倍的当前时间
       */
      qiniup.upload(file, {}, { resumingByFileSize: 0, blockSize, chunkSize }, function (error) {
        expect(error).not.to.be.an('error')

        /**
         * 只需要确保 tokenGetter 有且只有一次执行过就
         * 可以证明函数具有缓存属性
         */

        /* eslint no-unused-expressions: 0 */
        expect(tokenGetter.calledOnce).to.be.true

        done()
      })

      server.respond()
    })
  })
})
