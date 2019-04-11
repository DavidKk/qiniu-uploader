# 创建分块

```Javascript
Tunnel.prototype.mkblk
```

- 块只是一个虚拟的概念，块表示多个分片的集合的一个统称
- 将文件分成若干块，可以并发进行上传，而块中拥有多个分片, 每个块上传的开始必须将第一个分片同时上传
- 上传完之后会返回第一个分片的哈希值(ctx)，第二个分片必, 须同时上传第一个分片的哈希值

Docs: https://developer.qiniu.com/kodo/api/1286/mkblk


## 使用

```Javascript
import { Tunnel } from 'qiniup'

let tunnel = new Tunnel()
let block = new Blob([base64Image], { type: blockType })

tunnel.mkblk(block, { token }, {}, function (error, response) {
  if (error) {
    console.error(error)
    return
  }

  let { ctx, checksum, crc32, offset, host, expired_at } = response
  // doing something...
})
```


## 参数

### token

- 类型: `String`
- 必填

七牛上传凭证, 通过七牛 SDK 通过后端接口返回的 Token. <br/>
Docs: https://developer.qiniu.com/kodo/manual/1208/upload-token


## 配置

## chunkSize

- 类型: `SafeInteger`
- 默认值: `1048576`

设置每个分片的大小, 上传分块的时候会将第一块分片上传


## useHttps

- 类型: `Boolean`
- 默认值: `true`

是否使用 `https` 协议进行请求; 如果不配置 `host` 属性, `useHttps` 会改变默认 `host` 配置.


## host

- 类型: `String`
- 默认值: `'up.qbox.me'` 或 `'up-z0.qiniu.com'`

七牛云服务器上传地址, 默地址为中国华南地区服务器
默认值会受到 `useHttps`, `useHttps:true` 则会使用 `up.qbox.me` 否则使用 `up-z0.qiniu.com`. 其他七牛地址可以[查看这里](https://developer.qiniu.com/kodo/manual/1671/region-endpoint)


### tokenPrefix

- 类型: `String`
- 默认值: `'UpToken'`

七牛云上传令牌前缀, 固定为 `UpToken`, 不需要修改, 若用于其他服务可以进行配置


### progress

- 类型: `Function`
- 默认值: `undefined`

上传进度回调函数; 根据该函数可以获取当前上传的进度;


## tokenGetter

- 类型: `Function`
- 默认值: `undefined`

获取 token, 通过 `callback` 实现异步获取 `token`. 同时也可以设置过期时间(在 0.2.0 版本以上才适用); 七牛云文档表示: 若为超过过期时间, token 可以继续使用
