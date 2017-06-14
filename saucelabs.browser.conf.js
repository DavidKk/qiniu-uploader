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
  sl_android_4: {
    base: 'SauceLabs',
    browserName: 'chrome',
    platform: 'Android',
    version: '4.4',
    device: 'Android GoogleAPI Emulator',
  },
  sl_android_5: {
    base: 'SauceLabs',
    browserName: 'chrome',
    platform: 'Android',
    version: '5.0',
    device: 'Android GoogleAPI Emulator',
  },
  sl_android_6: {
    base: 'SauceLabs',
    browserName: 'chrome',
    platform: 'Android',
    version: '6.0',
    device: 'Android GoogleAPI Emulator',
  },
  /**
   * IOS 全家桶
   */
  sl_ios_8: {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'iOS',
    version: '8.1',
    device: 'iPhone 5s Simulator',
  },
  sl_ios_9: {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'iOS',
    version: '9.0',
    device: 'iPhone 5s Simulator',
  },
  sl_ios_10: {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'iOS',
    version: '10.0',
    device: 'iPhone 5s Simulator',
  },
}
