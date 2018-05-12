# 配置

## useHttps

- 类型: `Boolean`
- 默认值: `true`

是否使用 `https` 协议进行请求; 如果不配置 `host` 属性, `useHttps` 会改变默认 `host` 配置.

```Javascript
{
  useHttps: true
}
```


## host

- 类型: `String`
- 默认值: `'up.qbox.me'` 或 `'up-z0.qiniu.com'`

七牛云服务器上传地址, 默地址为中国华南地区服务器
默认值会受到 `useHttps`, `useHttps:true` 则会使用 `up.qbox.me` 否则使用 `up-z0.qiniu.com`. 其他七牛地址可以[查看这里](https://developer.qiniu.com/kodo/manual/1671/region-endpoint)

```Javascript
{
  host: 'up.qbox.me'
}
```


## tokenPrefix

- 类型: `String`
- 默认值: `'UpToken'`

七牛云上传令牌前缀, 固定为 `UpToken`, 不需要修改, 若用于其他服务可以进行配置

```Javascript
{
  tokenPrefix: 'UpToken'
}
```


## maxFileSize

- 类型: `SafeInteger`
- 默认值: `1099511627776`

最大文件限制, 默认为 `1G`

```Javascript
let k = 1024
let m = k * k
let g = m * m
{
  maxFileSize: 1 * g
}
```


## cache

- 类型: `Boolean`
- 默认值: `true`

是否缓存, 使用`断点续传`时默认值为 `true`, 普通上传默认值为 `false`; 对文件进行分析切割时会将文件信息与上传状态保存到 `localStorage` 本地缓存中; 若出现刷新页面的情况, 当再次上传同一个文件的时候, 浏览器会直接根据保存的信息进行断点续传.

```Javascript
{
  cache: true
}
```

## override

- 类型: `Boolean`
- 默认值: `false`

无论是否已经上传都进行重新上传, `断点续传`才拥有该配置; 若配置为 `true`, 则忽略本地缓存和已经上传的状态进行重新上传

```Javascript
{
  override: false
}
```

## maxConnect

- 类型: `SafeInteger`
- 默认值: `4`

最大连接数; 并发上传连接数, 最大值根据不同浏览器不同而不同. 根据切割文件的 `block` `chunk` 数量定义一个合理的连接数.

```Javascript
{
  maxConnect: 4
}
```


## maxBlockTasks

- 类型: `SafeInteger`
- 默认值: `1000`

最大分块任务数; 因为七牛官方指定分块(`block`)为 `4M`, 因此超大的文件分块数可能会造成浏览器崩溃, 因此这里可以设置一个安全的分块任务数, 若超过则报错.

```Javascript
{
  maxBlockTasks: 1000
}
```


## blockSize

- 类型: `SafeInteger`
- 默认值: `4194304`

分块的大小; `qiniup` 默认根据文件大小决定是否切割文件, 默认大于 4M 会切割文件, 对应七牛云分割成多个 块(`block`) 而每个块由多个 分片(`chunk`) 组成. 设置分块的大小, 若最后一块小于该大小, 则等于剩余的的大小.

七牛官方文档表示分块(`Block`)为 4M，最后一个分块(`Block`)也不能大于 4M; 因此设置该值不应该大于 `4M`

```Javascript
{
  blockSize: 4 * 1024 * 1024 // 4M
}
```


## chunkSize

- 类型: `SafeInteger`
- 默认值: `1048576`

分片的大小; 分片(`chunk`)的大小不能大于分块(`block`)的大小 (`chunkSize <= blockSize`). 默认情况下一个分块中拥有4个分片

```Javascript
{
  blockSize: 1 * 1024 * 1024 // 1M
}
```


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


## tokenGetter

- 类型: `Function`
- 默认值: `undefined`

获取 token, 通过 `callback` 实现异步获取 `token`

```Javascript
new Uploader({
  tokenGetter (callback) {
    // doing somthing
    callback(null, token)
  }
})
```

同时也可以设置过期时间（在 0.2.0 版本以上才适用）; 七牛云文档表示: 若为超过过期时间, token 可以继续使用

```Javascript
new Uploader({
  tokenGetter (callback) {
    // doing somthing
    callback(null, { token, expire })
  }
})
```
