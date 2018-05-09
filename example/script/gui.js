import jqlite from 'jqlite'
import times from 'lodash/times'
import flattenDeep from 'lodash/flattenDeep'
import forEach from 'lodash/forEach'
import isFunction from 'lodash/isFunction'
import indexOf from 'lodash/indexOf'
import { Uploader } from '../../src/index'
import { sizeStringify } from '../../src/utils'
import { server } from './server_mock'
import VConsole from 'vconsole'
import eruda from 'eruda'

let host = 'simulate.qiniu.com'
let key = 'simulate_key'
let mimeType = 'plain/text'
let crc32 = 'simulate_crc32'
let userVars = 'simulate_userVars'
let token = 'simulate_token'
let tokenPrefix = 'simulate_UpToken'
let uploader = new Uploader()

jqlite(function () {
  eruda.init();

  jqlite('#file-box').on('change', function (event) {
    let files = []
    let list = event.__files__ || event.target.files

    if (null !== list) {
      for (let i = 0, len = list.length; i < len; i ++) {
        files.push(list.item(i))
      }
    }

    let file = files[0]

    jqlite('#qiniup').addClass('upload')
    jqlite('#qiniup-filename').html(file.name)
    jqlite('#qiniup-filesize').html(sizeStringify(file.size))
    jqlite('#qiniup-progress').html('0')
    jqlite('#qiniup-water').css('transform', 'translateY(0)')

    let print = (type = 'INFO', ...args) => {
      let message = [`\`[${type.toUpperCase()}]\``].concat(...args).join(' ')
      let matched = message.match(/\`/g)
      let styles = times(matched.length / 2, () => ['font-weight:bold;color:#3EABCA;', 'font-weight:normal;color:#000;'])

      message = message.replace(/\`/g, '%c')
      styles = flattenDeep(styles)

      return window.console.log.call(window.console, message, ...styles)
    }

    let grow = (number, callback) => {
      if (!isFunction(callback)) {
        throw new TypeError('Callback is not provided or not be a function')
      }

      intervalId && clearInterval(intervalId)

      intervalId = setInterval(function () {
        progressNo += increment

        callback(progressNo > 1 ? 1 : progressNo)

        progressNo >= number && clearInterval(intervalId)
      }, increment / number * growSpendTime)
    }

    let completedState = []
    let report = (type, state) => {
      if (!(indexOf(completedState, state) === -1 && state.loaded / state.total === 1)) {
        return
      }

      switch (type) {
        case 'mkblk':
          print('PROGRESS', `Block [\`${state.beginOffset}, ${state.endOffset}\`] is created completed`)
          completedState.push(state)
          break

        case 'bput':
          print('PROGRESS', `Chunk [\`${state.beginOffset}, ${state.endOffset}\`] is upload completed`)
          completedState.push(state)
          break

        case 'mkfile':
          print('INFO', `File \`${file.name}\` is upload completed`)
          completedState.push(state)
          break
      }
    }

    let progress = (event) => {
      report(event.type, event.process)

      let progress = event.loaded / event.total
      jqlite('#qiniup-water').css('transform', `translateY(-${(progress * 65)}%)`)
      grow(progress, (progress) => jqlite('#qiniup-progress').html((progress * 100).toFixed(2)))
    }

    let intervalId
    let progressNo = 0
    let increment = 0.01
    let growSpendTime = 1000
    let totalSize = file.size
    let blockNo = 4
    let blockSize = Math.ceil(totalSize / blockNo)
    let chunkNo = 4
    let chunkSize = Math.ceil(blockSize /  chunkNo)

    let params = {
      token,
      key,
      mimeType,
      crc32,
      userVars
    }

    let options = {
      resumingByFileSize: 0,
      useHttps: true,
      host,
      tokenPrefix,
      chunkSize,
      blockSize,
      progress
    }

    print('INFO', `File name is \`${file.name}\``)
    print('INFO', `File size is \`${file.size}\``)
    print('INFO', `File will be spliced \`${blockNo}\` blocks and \`${blockNo * chunkNo}\` chunks`)

    uploader.upload(file, params, options, (error) => {
      setTimeout(() => jqlite('#qiniup').removeClass('upload success error'), 3000)

      if (error) {
        window.console.log(error)
        jqlite('#qiniup').addClass('error')
        return
      }

      jqlite('#qiniup').addClass('success')
    })

    jqlite(this).val('')
  })
})
