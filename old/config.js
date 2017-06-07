export const TOKEN_PREFIX = 'QINIU_SLICE_UPLOAD#';
export const BASE64_REGEXP = /^data\:([\w\W]+?);base64\,/;
export const QINIU_UPLOAD_URL = 'https:' === window.location.protocol ? 'https://up.qbox.me' : 'http://up.qiniu.com';

export const K = 1024;
export const M = K * K;
export const G = M * M;
