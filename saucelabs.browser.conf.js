export const launchers = {
  /**
   * Normal
   */
  slChrome: {
    base: 'SauceLabs',
    browserName: 'chrome',
    platform: 'Windows 7'
  },
  slFirefox: {
    base: 'SauceLabs',
    browserName: 'firefox'
  },
  /**
   * IE 全家桶
   */
  slIE11: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 8.1',
    version: '11'
  },
  slIE10: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 8',
    version: '10'
  },
  slIE9: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 7',
    version: '9'
  },
  /**
   * Safari from Mac
   */
  slMacSafari: {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'OS X 10.10'
  }
}
