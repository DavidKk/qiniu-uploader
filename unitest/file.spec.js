/* eslint max-nested-callbacks: off */
/* eslint-env mocha */
/* global expect */

import { File } from '../src/file'

describe('Class File', function () {
  let base64Image = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

  describe('File Initialization', function () {
    it('can import a base64 source', function () {
      let file = new File(base64Image)

      expect(file.type).to.be.a('string')
      expect(file.file).to.be.a('string')
      expect(file.blob).to.be.a('Blob')
      expect(file.hash).to.be.a('string')
      expect(file.state).to.be.a('array')

      expect(file.settings).to.deep.equal(File.defaultSettings)
      expect(file.type).to.equal(File.defaultSettings.mimeType)
      expect(file.file).to.equal(base64Image)
      expect(file.size).to.equal(base64Image.length)
    })

    it('can custom options', function () {

    })
  })

  describe('File Slice', function () {
    let file
    before(function () {
      file = new File(base64Image)
    })

    after(function () {
      file.cleanCache()
    })

    it('can slice custom size', function () {

    })
  })
})
