var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var expect = require('chai').expect;

const { Builder, By, Key } = require("selenium-webdriver");

const service = new chrome.ServiceBuilder('chromedriver'); 

const driver = new Builder()
  .forBrowser('chrome')
  .setChromeService(service)
  .setChromeOptions(new chrome.Options().addArguments( ['--headless','--no-sandbox']))
  .build();

describe('browser', function() {
  this.timeout(5000);

  it('basic', async function() {
    await driver.manage().setTimeouts({implicit: 10000});
    await driver.get("https://www.bing.com");
    let title = await driver.getTitle();
    expect(title).to.equal("Bing"); 
  });

});
