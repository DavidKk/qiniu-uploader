/* eslint max-nested-callbacks: off */
/* eslint-env mocha */
/* global expect */

import URI from 'urijs'
import { File } from '../src/file'
import { Tunnel } from '../src/tunnel'
import * as CONFIG from '../src/config'

describe('Class Tunnel', function () {
  let base64Image = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

  describe('Tunnel Initialization', function () {
    it('can be created', function () {
      let tunnel = new Tunnel()

      expect(tunnel.settings).to.be.a('Object')
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

    let host = 'x.com'
    let key = 'key'
    let mimeType = 'mimeType'
    let crc32 = 'crc32'
    let userVars = 'userVars'
    let token = 'token'
    let tokenPrefix = 'UpToken'

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
        expect(body).to.be.an.instanceof(FormData)

        if (FormData.prototype.has) {
          expect(body.has('key')).to.be.true
          expect(body.has('token')).to.be.true
          expect(body.has('file')).to.be.true

          expect(body.getAll('key')).to.have.lengthOf(1)
          expect(body.getAll('token')).to.have.lengthOf(1)
          expect(body.getAll('file')).to.have.lengthOf(1)

          expect(body.get('key')).to.equal(key)
          expect(body.get('token')).to.equal(token)
          expect(body.get('file')).to.equal(file)
        }
        else {
          console.warn('Browser does\'t support method `FormData.prototype.has` and it will ignore validate datas which from form post')
        }

        xhr.respond(200, { 'Content-Type': 'application/json' }, responseData)
      })

      let file = new Blob(['test'], { type: 'plain/text' })
      let { xhr } = tunnel.upload(file, { token, key }, { useHttps: true, host, tokenPrefix }, function (error, response) {
        expect(error).not.to.be.an('error')

        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(responseData)

        expect(response).to.deep.equal({ code: 1 })

        done()
      })

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
        expect(body).to.be.equal(base64Image.replace(CONFIG.BASE64_REGEXP, ''))

        /**
         * PhantomJS not support FormData fully
         * only support method `append`
         */
        if (FormData.prototype.has) {
          expect(body.has('key')).to.be.true
          expect(body.has('token')).to.be.true
          expect(body.has('file')).to.be.true

          expect(body.getAll('key')).to.have.lengthOf(1)
          expect(body.getAll('token')).to.have.lengthOf(1)
          expect(body.getAll('file')).to.have.lengthOf(1)

          expect(body.get('key')).to.equal(key)
          expect(body.get('token')).to.equal(token)
          expect(body.get('file')).to.equal(base64Image.replace(CONFIG.BASE64_REGEXP, ''))
        }
        else {
          console.warn('Browser does\'t support method `FormData.prototype.has` and it will ignore validate some form datas')
        }

        xhr.respond(200, { 'Content-Type': 'application/json' }, responseData)
      })

      let { xhr } = tunnel.upb64(base64Image, { size: base64Image.length, token, key, mimeType, crc32, userVars }, { useHttps: true, host, tokenPrefix }, function (error, response) {
        expect(error).not.to.be.an('error')

        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(responseData)
        expect(response).to.deep.equal(JSON.parse(responseData))

        done()
      })

      server.respond()
    })

    it('can generate block', function (done) {
      let responseData = JSON.stringify({ code: 1 })
      let base64Image = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
      let chunkSize = 14;
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

      let { xhr } = tunnel.mkblk(block, { token }, { useHttps: true, host, tokenPrefix, chunkSize }, function (error, response) {
        expect(error).not.to.be.an('error')

        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(responseData)
        expect(response).to.deep.equal(JSON.parse(responseData))

        done()
      })

      server.respond()
    })

    it('can upload chunk', function (done) {
      let responseData = JSON.stringify({ code: 1 })
      let base64Image = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
      let chunkSize = 14;
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

      let { xhr } = tunnel.bput(chunk, { token, ctx, offset: chunkSize }, { useHttps: true, host, tokenPrefix, chunkSize }, function (error, response) {
        expect(error).not.to.be.an('error')

        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(responseData)
        expect(response).to.deep.equal(JSON.parse(responseData))

        done()
      })

      server.respond()
    })

    it('can concat all block to a file', function (done) {
      let responseData = JSON.stringify({ code: 1 })
      let base64Image = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
      let chunkSize = 14;
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

      let { xhr } = tunnel.mkfile(ctxs, { size: block.size, token, key, mimeType, crc32, userVars }, { useHttps: true, host, tokenPrefix, chunkSize }, function (error, response) {
        expect(error).not.to.be.an('error')

        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(responseData)
        expect(response).to.deep.equal(JSON.parse(responseData))

        done()
      })

      server.respond()
    })

    // it('can upload by slice', function () {

    // })
  })
})