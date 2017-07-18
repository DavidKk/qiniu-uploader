/* eslint max-nested-callbacks: off */
/* eslint-env mocha, browser */
/* global expect, sinon */

import URI from 'urijs'
import trim from 'lodash/trim'
import { File } from '../src/file'
import { Tunnel } from '../src/tunnel'
import * as CONFIG from '../src/config'

describe('Class Tunnel', function () {
  let base64Image = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
  let host = 'x.com'
  let key = 'key'
  let mimeType = 'plain/text'
  let crc32 = 'crc32'
  let userVars = 'userVars'
  let token = 'token'
  let tokenPrefix = 'UpToken'
  let blockSize = 40
  let chunkSize = 10

  describe('Tunnel Initialization', function () {
    it('can be created', function () {
      let tunnel = new Tunnel()

      expect(tunnel.settings).to.be.a('Object')
      expect(tunnel.token).to.be.a('String')
      expect(tunnel.tokenExpire).to.be.a('Number')

      expect(tunnel.settings).to.deep.equal(Tunnel.defaultSettings)
    })
  })

  describe('Tunnel Upload', function () {
    let server
    let tunnel

    beforeEach(function () {
      server = sinon.fakeServer.create()
      tunnel = new Tunnel()
    })

    afterEach(function () {
      server.restore()
    })

    it('can upload file', function (done) {
      let responseData = JSON.stringify({ code: 1 })

      server.respondWith(function (xhr) {
        let uri = new URI(xhr.url)
        expect(xhr.method).to.equal('POST')
        expect(uri.host()).to.equal(host)
        expect(uri.protocol()).to.equal('https')
        expect(uri.path()).to.equal('/')

        let headers = xhr.requestHeaders
        expect(headers.Authorization).to.equal(`${tokenPrefix} ${token}`)

        let body = xhr.requestBody
        expect(body).to.be.an.instanceof(window.FormData)

        if (window.FormData.prototype.has) {
          /* eslint no-unused-expressions: 0 */
          expect(body.has('key')).to.be.true
          expect(body.has('token')).to.be.true
          expect(body.has('file')).to.be.true

          expect(body.getAll('key')).to.have.lengthOf(1)
          expect(body.getAll('token')).to.have.lengthOf(1)
          expect(body.getAll('file')).to.have.lengthOf(1)

          expect(body.get('key')).to.equal(key)
          expect(body.get('token')).to.equal(token)
          expect(body.get('file')).to.be.instanceOf(Blob)
        } else {
          console.warn('Browser does\'t support method `FormData.prototype.has` and it will ignore validate datas which from form post')
        }

        xhr.respond(200, { 'Content-Type': 'application/json' }, responseData)
      })

      let file = new Blob(['test'], { type: 'plain/text' })
      let { xhr, cancel } = tunnel.upload(file, { token, key }, { useHttps: true, host, tokenPrefix }, function (error, response) {
        expect(error).not.to.be.an('error')

        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(responseData)

        expect(response).to.deep.equal({ code: 1 })

        done()
      })

      expect(xhr).to.be.an.instanceof(XMLHttpRequest)
      expect(cancel).to.be.a.function

      server.respond()
    })

    it('can upload base64 source', function (done) {
      let responseData = JSON.stringify({ code: 1, image: base64Image })

      server.respondWith(function (xhr) {
        let uri = new URI(xhr.url)
        expect(xhr.method).to.equal('POST')
        expect(uri.host()).to.equal(host)
        expect(uri.protocol()).to.equal('https')
        expect(uri.path()).to.equal(`/${base64Image.length}/key/${encodeURIComponent(key)}/mimeType/${encodeURIComponent(mimeType)}/crc32/${encodeURIComponent(crc32)}/x:user-var/${encodeURIComponent(userVars)}`)

        let headers = xhr.requestHeaders
        expect(headers['Content-Type']).to.equal('application/octet-stream;charset=utf-8')
        expect(headers.Authorization).to.equal(`${tokenPrefix} ${token}`)

        let body = xhr.requestBody
        expect(body).to.equal(base64Image.replace(CONFIG.BASE64_REGEXP, ''))
        xhr.respond(200, { 'Content-Type': 'application/json' }, responseData)
      })

      let { xhr, cancel } = tunnel.upb64(base64Image, { size: base64Image.length, token, key, mimeType, crc32, userVars }, { useHttps: true, host, tokenPrefix }, function (error, response) {
        expect(error).not.to.be.an('error')

        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(responseData)
        expect(response).to.deep.equal(JSON.parse(responseData))

        done()
      })

      expect(xhr).to.be.an.instanceof(XMLHttpRequest)
      expect(cancel).to.be.a.function

      server.respond()
    })

    it('can generate block', function (done) {
      let responseData = JSON.stringify({ code: 1 })
      let chunkSize = 14
      let blockType = 'plain/text'
      let block = new Blob([base64Image], { type: blockType })

      server.respondWith(function (xhr) {
        let uri = new URI(xhr.url)
        expect(xhr.method).to.equal('POST')
        expect(uri.host()).to.equal(host)
        expect(uri.protocol()).to.equal('https')
        expect(uri.path()).to.equal(`/mkblk/${block.size}`)

        let headers = xhr.requestHeaders
        expect(headers['Content-Type']).to.equal('application/octet-stream;charset=utf-8')
        expect(headers.Authorization).to.equal(`${tokenPrefix} ${token}`)

        let body = xhr.requestBody
        expect(body).to.be.an.instanceof(Blob)
        expect(body.type).to.equal(blockType)
        expect(body.size).to.equal(chunkSize)

        xhr.respond(200, { 'Content-Type': 'application/json' }, responseData)
      })

      let { xhr, cancel } = tunnel.mkblk(block, { token }, { useHttps: true, host, tokenPrefix, chunkSize }, function (error, response) {
        expect(error).not.to.be.an('error')

        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(responseData)
        expect(response).to.deep.equal(JSON.parse(responseData))

        done()
      })

      expect(xhr).to.be.an.instanceof(XMLHttpRequest)
      expect(cancel).to.be.a.function

      server.respond()
    })

    it('can upload chunk', function (done) {
      let responseData = JSON.stringify({ code: 1 })
      let chunkSize = 14
      let blockType = 'plain/text'
      let block = new Blob([base64Image], { type: blockType })
      let chunk = block.slice(chunkSize, chunkSize * 2, blockType)
      let ctx = 'ctx'

      server.respondWith(function (xhr) {
        let uri = new URI(xhr.url)
        expect(xhr.method).to.equal('POST')
        expect(uri.host()).to.equal(host)
        expect(uri.protocol()).to.equal('https')
        expect(uri.path()).to.equal(`/bput/${ctx}/${chunkSize}`)

        let headers = xhr.requestHeaders
        expect(headers['Content-Type']).to.equal('application/octet-stream;charset=utf-8')
        expect(headers.Authorization).to.equal(`${tokenPrefix} ${token}`)

        let body = xhr.requestBody
        expect(body).to.be.an.instanceof(Blob)
        expect(body.type).to.equal(blockType)
        expect(body.size).to.equal(chunkSize)

        xhr.respond(200, { 'Content-Type': 'application/json' }, responseData)
      })

      let { xhr, cancel } = tunnel.bput(chunk, { token, ctx, offset: chunkSize }, { useHttps: true, host, tokenPrefix, chunkSize }, function (error, response) {
        expect(error).not.to.be.an('error')

        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(responseData)
        expect(response).to.deep.equal(JSON.parse(responseData))

        done()
      })

      expect(xhr).to.be.an.instanceof(XMLHttpRequest)
      expect(cancel).to.be.a.function

      server.respond()
    })

    it('can concat all block to a file', function (done) {
      let responseData = JSON.stringify({ code: 1 })
      let chunkSize = 14
      let blockType = 'plain/text'
      let block = new Blob([base64Image], { type: blockType })
      let ctxs = ['ctx1', 'ctx2']

      server.respondWith(function (xhr) {
        let uri = new URI(xhr.url)
        expect(xhr.method).to.equal('POST')
        expect(uri.host()).to.equal(host)
        expect(uri.protocol()).to.equal('https')
        expect(uri.path()).to.equal(`/mkfile/${block.size}/key/${encodeURIComponent(key)}/mimeType/${encodeURIComponent(mimeType)}/crc32/${encodeURIComponent(crc32)}/x:user-var/${encodeURIComponent(userVars)}`)

        let headers = xhr.requestHeaders
        expect(headers['Content-Type']).to.equal('application/octet-stream;charset=utf-8')
        expect(headers.Authorization).to.equal(`${tokenPrefix} ${token}`)

        let body = xhr.requestBody
        expect(body).to.equal(ctxs.join(','))

        xhr.respond(200, { 'Content-Type': 'application/json' }, responseData)
      })

      let { xhr, cancel } = tunnel.mkfile(ctxs, { size: block.size, token, key, mimeType, crc32, userVars }, { useHttps: true, host, tokenPrefix, chunkSize }, function (error, response) {
        expect(error).not.to.be.an('error')

        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(responseData)
        expect(response).to.deep.equal(JSON.parse(responseData))

        done()
      })

      expect(xhr).to.be.an.instanceof(XMLHttpRequest)
      expect(cancel).to.be.a.function

      server.respond()
    })

    it('can upload by sliced', function (done) {
      /**
       * 大小为 74 字节
       */
      let file = new File(base64Image, { mimeType })

      /**
       * 因为上传涉及多个 AJAX 请求，因此必须设置
       * 自动回复并根据请求地址返回相应的信息
       */
      server.autoRespond = true
      server.respondWith(function (xhr) {
        let uri = new URI(xhr.url)
        expect(xhr.method).to.equal('POST')
        expect(uri.host()).to.equal(host)
        expect(uri.protocol()).to.equal('https')

        let headers = xhr.requestHeaders
        expect(headers['Content-Type']).to.equal('application/octet-stream;charset=utf-8')
        expect(headers.Authorization).to.equal(`${tokenPrefix} ${token}`)

        let body = xhr.requestBody
        let paths = trim(uri.path(), '/').split('/')

        switch (paths[0]) {
          /**
           * 创建块的同时必须上传第一个分片，又因为文件总
           * 大小为 74，分块大小为 40，因此最后一个分块的
           * 大小仍然为分片的大小
           */
          case 'mkblk':
            expect(body).to.be.an.instanceof(Blob)
            expect(body.type).to.equal(mimeType)
            expect(body.size).to.equal(chunkSize)

            xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ ctx: `block_${body.size}` }))
            break

          /**
           * 因为文件总大小为 74，因此最后一个分块可能为 34
           * 而最后一个分块中的最后一个分片必然为 4
           */
          case 'bput':
            /* eslint no-unused-expressions: 0 */
            expect(body).to.be.an.instanceof(Blob)
            expect(body.type).to.equal(mimeType)
            expect(body.size === chunkSize || body.size === 4).to.be.true

            xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ ctx: `chunk_${body.size}` }))
            break

          /**
           * 上传的 ctxs 值个数只有分块的个数，因为只需要
           * 上传分块中的最后一个分片上传完返回的哈希值
           *
           * 合并文件的时候必须要注意的是上传的 ctxs 值必须
           * 是分割的顺序的，这里我们通过最后一个块的大小不同来
           * 模拟位置
           */
          case 'mkfile':
            expect(body).to.be.a('String')
            expect(body).to.equal('chunk_10,chunk_4')

            xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ ctx: 'file' }))
            break
        }
      })

      let params = { token, key, mimeType, crc32, userVars }
      let options = { useHttps: true, host, tokenPrefix, chunkSize, blockSize }
      let { cancel, xhr } = tunnel.resuming(file, params, options, function (error, response) {
        expect(error).not.to.be.an('error')
        expect(response).to.deep.equal({ ctx: 'file' })

        done()
      })

      expect(cancel).to.be.a.function
      expect(xhr).to.be.null

      server.respond()
    })
  })

  describe('Tunnel Resume Breakpoint', function () {
    let server
    let tunnel

    beforeEach(function () {
      server = sinon.fakeServer.create()
      tunnel = new Tunnel()
    })

    afterEach(function () {
      server.restore()
    })

    let file = new File(base64Image, { mimeType })

    it('can cancel the tasks', function (done) {
      server.autoRespond = true
      server.autoRespondAfter = 10

      let { cancel } = tunnel.resuming(file, { token, key, mimeType, crc32, userVars }, { useHttps: true, host, tokenPrefix, chunkSize, blockSize }, function (error, response) {
        expect(error).to.be.an('Error')
        expect(error.message).to.equal('Request is canceled')
      })

      setTimeout(done.bind(null), 11)
      setTimeout(cancel.bind(null), 1)
    })

    it('support progress event', function (done) {
      server.autoRespond = true
      server.respondWith(function (xhr) {
        let uri = new URI(xhr.url)
        let body = xhr.requestBody
        let paths = trim(uri.path(), '/').split('/')

        switch (paths[0]) {
          case 'mkblk':
            xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ ctx: `block_${body.size}` }))
            break
          case 'bput':
            xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ ctx: `chunk_${body.size}` }))
            break
          case 'mkfile':
            xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ ctx: 'file' }))
            break
        }
      })

      let _resumingProgressHandle = (event) => {
        expect(event.processes).to.be.an('array')
        expect(event.process).to.be.an('object')
        expect(event.loaded).to.be.a('number')
        expect(event.total).to.be.a('number')

        expect(event.process).to.have.property('request')
        expect(event.process).to.have.property('xhr')

        expect(event.total).to.equal(file.size)
        expect(event.loaded).to.be.most(event.total)
      }

      tunnel.resuming(file, { token, key, mimeType, crc32, userVars }, { progress: _resumingProgressHandle, useHttps: true, host, tokenPrefix, chunkSize, blockSize }, function (error, response) {
        expect(error).not.to.be.an('error')
        expect(response).to.deep.equal({ ctx: 'file' })

        done()
      })

      server.respond()
    })

    it('can load state from local storage and continue to upload', function () {
      // sinon.spy(window.localStorage, 'setItem')
    })
  })
})
