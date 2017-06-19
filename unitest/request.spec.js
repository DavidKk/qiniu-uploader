/* eslint max-nested-callbacks: off */
/* eslint-env mocha */
/* global expect */

import sinon from 'sinon'
import * as http from '../src/request'

describe('Class Http', function () {
  describe('Http Request', function () {
    let server

    beforeEach(function () {
      server = sinon.fakeServer.create()
    })

    afterEach(function () {
      server.restore()
    })

    it('can request source', function (done) {
      let data = JSON.stringify({ code: 1 })
      server.respondWith('GET', 'http://x.com/test/', [200, { 'Content-Type': 'application/json' }, data])

      let { xhr } = http.request('GET', 'http://x.com/test/', function (error, response) {
        expect(xhr.status).to.equal(200)
        expect(xhr.responseText).to.equal(data)

        expect(error).not.to.be.an('error')
        expect(response).to.deep.equal({ code: 1 })

        done()
      })

      server.respond()
    })

    it('can post form data', function () {

    })

    it('can cancel http request', function () {

    })
  })
})
