import trim from 'lodash/trim'
import URI from 'urijs'
import sinon from 'sinon'

let server = sinon.fakeServer.create()

server.autoRespond = true

server.respondWith(function (xhr) {
  let uri = new URI(xhr.url)
  let body = xhr.requestBody
  console.log(uri.path())
})
