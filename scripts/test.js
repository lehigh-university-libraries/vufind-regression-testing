var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var until = require('selenium-webdriver/lib/until');
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

      describe('Catalog tab', function() {

        describe('Record pages', function() {

          describe('Normal print record page', function() {

            before(async function() {
              await driver.get(url_prefix + '/Record/12345');
              await expectTheBasics();
            });

            it('Text this link', async function() {
              await driver.findElement(By.linkText('Text this'));
            });

            it('Displays the location', async function() {
              await driver.findElement(By.xpath('//div[contains(@class, "holdings-tab")]//*[contains(text(), "Linderman Ground Floor - Upper Level")]'));
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

              // Login link
              await driver.findElement(By.css('.holdings-tab #loginOptions'));

              // Preview of URL.  This will fail if the Folio.ini note_type is wrong
              await driver.findElement(By.xpath('//div[@class="tab-content"]//*[text()="https://www.nsba.org/ASBJ"]'));
            });
          });

          it('Bound-with', async function() {
            await driver.get(url_prefix + '/Record/1093118');
            await expectTheBasics();
            await driver.findElement(By.xpath('//h3[text()="This item is bound with: "]'));
          });

          it('Finding Aid tab', async function() {
            await driver.get(url_prefix + '/Record/10664764');
            await expectTheBasics();
            await driver.findElement(By.css('.record-tab.findingaid'));
          });

          it('ejournal Browzine View Complete Issue link', async function() {
            await driver.get(url_prefix + '/Record/79317');
            await expectTheBasics();
            let browzine_link = await driver.findElement(By.linkText('View complete issue of this journal (Browzine)'));

            // should not be within a heading
            let heading_ancestors = await browzine_link.findElements(By.xpath('ancestor::h3'));
            expect(heading_ancestors).to.be.empty;
          });

          it('Special Collections request link', async function() {
            await driver.get(url_prefix + '/Record/10944200');
            await expectTheBasics();
            await driver.findElement(By.css('.holdings-tab a[href^="https://lmc-request.lib.lehigh.edu/requestitem/"]'));
          });

          it('eBook physical description', async function() {
            await driver.get(url_prefix + '/Record/10997217');
            await expectTheBasics();
            await driver.findElement(By.xpath('//div[@class="media-body"]//td[text()="1 online resource (463 pages)"]'));
          });

          it('Streaming Video physical description', async function() {
            await driver.get(url_prefix + '/Record/10874924');
            await expectTheBasics();
            await driver.findElement(By.xpath('//div[@class="media-body"]//td[text()="1 streaming video file (137 min.)."]'));
          });

        });

        describe('Search Results pages', function() {

          describe('Normal search', function() {

            before(async function() {
              await driver.get(url_prefix + '/Search/Results?lookfor=test');
              await expectTheBasics();
            });

            it('Suggests article results', async function() {
              // This anchor is loaded async by JS, so will take a few seconds
              await driver.wait(until.elementLocated(By.css('#articleSearchResults a')), 5000);
            });
    
          });

          it('Title subfields n & p', async function() {
            await driver.get(url_prefix + '/Search/Results?lookfor=asm+handbook');
            await expectTheBasics();
            await driver.findElement(By.linkText('ASM Handbook.Volume 12, Fractography /'));
          });

          it('Lehigh Author facet', async function() {
            await driver.get(url_prefix + '/Search/Results?lookfor=Athens+priesthood');
            await expectTheBasics();
            await driver.findElement(By.css('#side-panel-lehighAuthor'));
          });

        });

        describe('Author home', function() {

          it('Wikipedia not present', async function() {
            await driver.get(url_prefix + '/Author/Home?author=Whitman%2C+Walt%2C');
            await expectTheBasics();
            let wikipedia_entries = await driver.findElements(By.css('.wikipedia'));
            expect(wikipedia_entries).to.be.empty;
          });

        });

        it('Course Reserves home', async function() {
            await driver.get(url_prefix + '/Search/Reserves');
            await expectTheBasics();
            await driver.findElement(By.css('.mainbody table td.instructor'));
          });
  
        });

      describe('Articles tab', function() {

        describe('Search Results pages', function() {

          it('Browzine PDF Full-Text link', async function() {
            await driver.get(url_prefix + '/EDS/Search?lookfor=Trombones+Elicit+Bitter+More+Strongly+Than+Do+Clarinets');
            await expectTheBasics();
            await driver.wait(until.elementLocated(By.linkText('Browzine PDF Full Text')), 2000);
          });

        });

      });

      describe ('AlphaBrowse (Catalog) tab', function() {

        it('Title browse', async function() {
          await driver.get(url_prefix + '/Alphabrowse/Home?source=title&from=test');
          await expectTheBasics();

          // The basic table appears
          await driver.findElement(By.css('table.alphabrowse'));

          // One of the rows in the table
          await driver.findElement(By.linkText('Test and analysis of Web services / Luciano Baresi, Elisabetta di Nitto.'));
        });

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
