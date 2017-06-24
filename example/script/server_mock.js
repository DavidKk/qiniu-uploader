import trim from 'lodash/trim'
import URI from 'urijs'
import sinon from 'sinon'

export let server = sinon.fakeServer.create()
server.respondImmediately = false
server.autoRespondAfter = 1000
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
