# 上传进程

## progress

- 类型: `Function`
- 默认值: `undefined`

上传进度回调函数; 根据该函数可以获取当前上传的进度;

```Javascript
import { Uploader } from 'qiniup'
let qiniup = new Uploader()
let progress = (event) => {
  let progress = event.loaded / event.total
  console.log(progress)
}

qiniup.upload(url, params, { progress }, callback)
```
