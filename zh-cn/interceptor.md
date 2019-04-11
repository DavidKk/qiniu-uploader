# 拦截器

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
