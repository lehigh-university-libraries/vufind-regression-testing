var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var expect = require('chai').expect;

const { Builder, By, Key } = require("selenium-webdriver");

const environments = require('../config/config');

const service = new chrome.ServiceBuilder('chromedriver'); 

const driver = new Builder()
  .forBrowser('chrome')
  .setChromeService(service)
  .setChromeOptions(new chrome.Options().addArguments( ['--headless','--no-sandbox']))
  .build();

describe('Browser-based tests', function() {
  this.timeout(10000);

  environments.forEach(({name, url_prefix}) => {

    describe(name, function() {

      it('Homepage', async function() {
        await driver.get(url_prefix);
        await expectTheBasics();
        let title = await driver.getTitle();
        expect(title).to.equal("Search Home"); 
      });

      describe('Normal print record page', function() {

        before(async function() {
          await driver.get(url_prefix + '/Record/12345');
          await expectTheBasics();
        });

        it('Has a request link', async function() {
          await driver.findElement(By.css('.holdings-tab .placehold'));
        });

      });

      it('Un-Requestable Material', async function() {
        await driver.get(url_prefix + '/Record/677843');
        await expectTheBasics();
        let request_links = await driver.findElements(By.css('.holdings-tab .placehold'));
        expect(request_links).to.be.empty;
      });

      it('Summary Holdings', async function() {
        await driver.get(url_prefix + '/Record/742590');
        await expectTheBasics();
        await driver.findElement(By.xpath('//h3[text()="Summary Holdings"]'));
      });

      describe('Restricted Journal', function() {
        it('Not Logged In', async function() {
          await driver.get(url_prefix + '/Record/12639');
          await expectTheBasics();
          await driver.findElement(By.css('.holdings-tab #loginOptions'));
        });
      });

      it('Bound-with', async function() {
        await driver.get(url_prefix + '/Record/1092692');
        await expectTheBasics();
        await driver.findElement(By.xpath('//h3[text()="This item is bound with: "]'));
      });

      it('Finding Aid tab', async function() {
        await driver.get(url_prefix + '/Record/10664764');
        await expectTheBasics();
        await driver.findElement(By.css('.record-tab.findingaid'));
      });

    });
  });

  function expectTheBasics() {
    return expectPageRenders()
      .then(() => {return expectNoFakeData()});
  }

  async function expectPageRenders() {
    return driver.findElement(By.id('loginOptions'));
  }

  async function expectNoFakeData() {
    let text = await driver.findElement(By.css('body')).getText();
    return expect(text).not.to.include("fake");
  }

});
