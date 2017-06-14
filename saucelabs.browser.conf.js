export const launchers = {
  sl_chrome: {
    base: 'SauceLabs',
    browserName: 'chrome',
    version: '48'
  },
  sl_firefox: {
    base: 'SauceLabs',
    browserName: 'firefox',
    version: '44'
  },
  sl_mac_safari: {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'OS X 10.10',
    version: '8'
  },
  /**
   * IE 全家桶
   */
  sl_win_7_ie_10: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 7',
    version: '10'
  },
  sl_win_8_ie_10: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 8',
    version: '10'
  },
  sl_win_10_ie_11: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 10',
    version: '11'
  },
  sl_win_10_edge: {
    base: 'SauceLabs',
    browserName: 'microsoftedge',
    platform: 'Windows 10'
  },
  /**
   * Android 全家桶
   */
  'sl_android_4.4': {
    base: 'SauceLabs',
    browserName: 'android',
    platform: 'Linux',
    version: '4.4'
  },
  'sl_android_5.0': {
    base: 'SauceLabs',
    browserName: 'android',
    platform: 'Linux',
    version: '5.0'
  },
  'sl_android_5.1': {
    base: 'SauceLabs',
    browserName: 'android',
    platform: 'Linux',
    version: '5.1'
  },
  'sl_android_6.0': {
    base: 'SauceLabs',
    browserName: 'android',
    platform: 'Linux',
    version: '6.0'
  },
  /**
   * IOS 全家桶
   */
  'sl_ios_7.1': {
    base: 'SauceLabs',
    browserName: 'iphone',
    platform: 'OS X 10.10',
    version: '7.1'
  },
  'sl_ios_8.4': {
    base: 'SauceLabs',
    browserName: 'iphone',
    platform: 'OS X 10.10',
    version: '8.4'
  },
  'sl_ios_9.3': {
    base: 'SauceLabs',
    browserName: 'iphone',
    platform: 'OS X 10.10',
    version: '9.3'
  },
  'sl_ios_10.0': {
    base: 'SauceLabs',
    browserName: 'iphone',
    platform: 'OS X 10.10',
    version: '10.3'
  }
}
