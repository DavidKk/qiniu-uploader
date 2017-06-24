import jqlite from 'jqlite'
import isFunction from 'lodash/isFunction'
import { Uploader } from '../../src/index'
import { sizeStringify } from '../../src/utils'
import { server } from './server_mock'

let host = 'simulate.qiniu.com'
let key = 'simulate_key'
let mimeType = 'plain/text'
let crc32 = 'simulate_crc32'
let userVars = 'simulate_userVars'
let token = 'simulate_token'
let tokenPrefix = 'simulate_UpToken'
let blockSize = 40
let chunkSize = 10
let uploader = new Uploader()

jqlite(function () {
  jqlite('#file-box').on('change', function (event) {
    let files = []
    let list = event.__files__ || event.target.files

    if (null !== list) {
      for (let i = 0, len = list.length; i < len; i ++) {
        files.push(list.item(i));
      }
    }
    
    jqlite('#qiniup').addClass('qiniup-upload')
    jqlite('#qiniup-filename').html(files[0].name)
    jqlite('#qiniup-filesize').html(sizeStringify(files[0].size))
    jqlite('#qiniup-progress').html('0')

    let progress = (event) => {
      console.log(event)

      let progress = event.loaded / event.total

      jqlite('#qiniup-water').css('transform', `translateY(-${(progress * 65)}%)`)
      grow(progress, (progress) => jqlite('#qiniup-progress').html((progress * 100).toFixed(2)))
    }

    let intervalId
    let progressNo = 0
    let increment = 0.01
    let growSpendTime = 1000

    let grow = (number, callback) => {
      if (!isFunction(callback)) {
        throw new TypeError('Callback is not provided or not be a function')
      }

      intervalId && clearInterval(intervalId)

      intervalId = setInterval(function () {
        progressNo += increment

        callback(progressNo)

        progressNo >= number && clearInterval(intervalId)
      }, increment / number * growSpendTime)
    }

    uploader.upload(files[0], { token, key, mimeType, crc32, userVars }, { resumingByFileSize: 0, useHttps: true, host, tokenPrefix, chunkSize, blockSize, progress }, function (error) {
      setTimeout(() => jqlite('#qiniup').removeClass('qiniup-upload qiniup-upload-success qiniup-upload-error'), 3000)

      if (error) {
        window.console.log(error)
        jqlite('#qiniup').addClass('qiniup-upload-error')
        return
      }

      jqlite('#qiniup').addClass('qiniup-upload-success')
    })

    jqlite(this).val('')
  })
})
