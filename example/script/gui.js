import jqlite from 'jqlite'
import { sizeStringify } from '../../src/utils'

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

    jqlite(this).val('')
  })

  // jqlite(document.body).on('click', () => {
  //   jqlite('#qiniup').toggleClass('qiniup-upload')
  // })
})