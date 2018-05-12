# 分片上传

```Javascript
Tunnel.prototype.bput
```

- 多个分片可以组成一个块，每一个分片的开始与结尾都必须在创建的时候并定义好，且第一个分片在上传块的时候必须一并上传
- 七牛会返回一个哈希值（ctx），上传下一个分片的时候必须将前一个分片的哈希值同时上传给服务器，第二个分片拿创建块时上传的第一个分片范围的哈希值
- 最后一个分片值代表该块的结束，必须记录好哈希值(ctx)；在合并文件的时候可以通过这些最后的哈希值进行合成文件

Docs: https://developer.qiniu.com/kodo/api/1251/bput


## 使用

```Javascript
import { Tunnel } from 'qiniup'

let tunnel = new Tunnel()
let block = new Blob([base64Image], { type: blockType })
let chunk = block.slice(chunkSize, chunkSize * 2, blockType)

tunnel.bput(chunk, { ctx, offset, token }, {}, function (error, response) {
  if (error) {
    console.error(error)
    return
  }

  let { ctx, checksum, crc32, offset, host, expired_at } = response
  // doing something...
})
```


## 参数

### ctx

- 类型: `String`
- 必填

前一次上传返回的块级上传控制信息, 若第一个则为所在分块(`block`)上传后的 `ctx` 信息


### offset

- 类型: `SafeInteger`
- 必填

当前片在整个分块(`block`)中的起始偏移


### token

- 类型: `String`
- 必填

七牛上传凭证, 通过七牛 SDK 通过后端接口返回的 Token. <br/>
Docs: https://developer.qiniu.com/kodo/manual/1208/upload-token


## 配置

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
