# 分片上传

## Tunnel.prototype.bput

- 多个分片可以组成一个块，每一个分片的开始与结尾都必须在创建的时候并定义好，且第一个分片在上传块的时候必须一并上传
- 七牛会返回一个哈希值（ctx），上传下一个分片的时候必须将前一个分片的哈希值同时上传给服务器，第二个分片拿创建块时上传的第一个分片范围的哈希值
- 最后一个分片值代表该块的结束，必须记录好哈希值(ctx)；在合并文件的时候可以通过这些最后的哈希值进行合成文件

### ctx

- 类型: `String`
- 必填

前一次上传返回的块级上传控制信息, 若第一个则为所在分块(`block`)上传后的 `ctx` 信息

### offset

- 类型: `SafeInteger`
- 必填

当前片在整个分块(`block`)中的起始偏移

```Javascript
import { Tunnel } from 'qiniup'

let block = new Blob([base64Image], { type: blockType })

```
