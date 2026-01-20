var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var until = require('selenium-webdriver/lib/until');
var expect = require('chai').expect;

const { Builder, By, Key } = require("selenium-webdriver");
const { TimeoutError } = require('selenium-webdriver/lib/error');

const { environments, cookie } = require('../config/config');

const service = new chrome.ServiceBuilder('chromedriver');

const driver = new Builder()
  .forBrowser('chrome')
  .setChromeService(service)
  .setChromeOptions(new chrome.Options().addArguments(['--headless', '--no-sandbox', '--window-size=1920,1080']))
  .build();

describe('Browser-based tests', function () {
  this.timeout(10000);

  before(async function () {
    // Access a URL to set any cookies on the browser session.  Used to set a domain cookie
    // so that GA can classify this traffic as from a bot.
    await driver.get(cookie.url);
  });

  environments.forEach(({ name, url_prefix, records, users, future_version }) => {

    describe(name, function () {

      describe('Homepage', function () {

        before(async function () {
          await driver.get(url_prefix);
          await expectTheBasics();
        });

        it('Title', async function () {
          let title = await driver.getTitle();
          // expect(title).to.equal("Search Home"); 
          expect(title).to.be.a('string').and.satisfy(txt => txt.startsWith("Search Home"));
        });

        it('Navbar', async function () {
          let banner = await driver.findElement(By.css('.banner'));

          // Test each top-level item in the navbar
          await banner.findElement(By.id('libHomePage'));
          await banner.findElement(By.id('loginOptions'));
          await banner.findElement(By.css('.language'));
          await banner.findElement(By.css('a[href$="/Help/Home?topic=advsearch"]')); // Test via as item
          await banner.findElement(By.linkText('Course Reserves'));
        });

        it('Google Tag Manager', async function () {
          let gtmScript = await driver.findElement(By.css('script[src^="https://www.googletagmanager.com/gtm.js"]'));
          let url = await gtmScript.getAttribute('src');
          expect(url).to.contain(records.gtm_id);
        });
      });

      describe('Catalog tab', function () {

        describe('Record pages', function () {

          describe('Normal print record page', function () {

            before(async function () {
              await driver.get(url_prefix + '/Record/12345');
              await expectTheBasics();
            });

            it('Text this link', async function () {
              if (future_version) {
                await driver.findElement(By.linkText('Text'));
              }
              else {
                await driver.findElement(By.linkText('Text this'));
              }
            });

            it('Displays the location', async function () {
              await driver.wait(until.elementLocated(By.xpath('//div[contains(@class, "holdings-tab")]//*[contains(text(), "Linderman Ground Floor - Upper Level")]')), 5000);
            });

            it('Has a request link', async function () {
              await driver.wait(until.elementLocated(By.css('.holdings-tab .placehold')), 5000);
            });

          });

          describe('Book with additional record data fields', function () {

            before(async function () {
              await driver.get(url_prefix + '/Record/256784');
              await expectTheBasics();
            });

            it('Notes field', async function () {
              await driver.findElement(By.xpath('//div[@class="media-body"]//th[contains(text(), "Notes:")]'));
            });

            it('Description field', async function () {
              await driver.findElement(By.xpath('//div[@class="media-body"]//th[contains(text(), "Description:")]'));
            });

            it('Z39.88 OpenUrl field for Zotero', async function () {
              await driver.findElement(By.css('.Z3988[title*="rft.genre=book"]'));
            });
          })

          it('Un-Requestable Material', async function () {
            await driver.get(url_prefix + '/Record/677843');
            await expectTheBasics();
            let request_links = await driver.findElements(By.css('.holdings-tab .placehold'));
            expect(request_links).to.be.empty;
          });

          it('Summary Holdings', async function () {
            await driver.get(url_prefix + '/Record/1767');
            await expectTheBasics();
            if (future_version) {
              await driver.wait(until.elementLocated(By.xpath('//h2[text()="Summary Holdings"]')), 5000);
            }
            else {
              await driver.findElement(By.xpath('//h3[text()="Summary Holdings"]'));
            }
          });

          describe('Restricted Journal, Hathi Link', function () {
            it('Not Logged In', async function () {
              await driver.get(url_prefix + '/Record/12639');
              await expectTheBasics();

              // Login link
              await driver.wait(until.elementLocated(By.css('.holdings-tab #loginOptions')), 5000);

              // Preview of URL.  This will fail if the Folio.ini note_type is wrong
              await driver.findElement(By.xpath('//div[@class="tab-content"]//*[text()="https://www.nsba.org/ASBJ"]'));

              // Hathi link customized without image
              let hathi_preview = await driver.wait(until.elementLocated(By.css(".record-previews .hathiPreviewDiv"), 5000));
              let hathi_img = await hathi_preview.findElements(By.css("img"));
              expect(hathi_img).to.be.empty;
            });
          });

          it('Bound-with', async function () {
            await driver.get(url_prefix + '/Record/1093118');
            await expectTheBasics();
            if (future_version) {
              await driver.wait(until.elementLocated(By.xpath('//p[contains(text(), "The following works are all found in the book")]')), 5000);
            }
            else {
              await driver.findElement(By.xpath('//h3[text()="This item is bound with: "]'));
            }

            // Make sure the items are displayed in the correct order
            await driver.findElement(By.css('.bound-with-records li:nth-child(4).direct-item'));
          });

          describe('LMC Special Collections item', function () {
            before(async function () {
              await driver.get(url_prefix + '/Record/10664764#findingaid');
              await expectTheBasics();
            });

            it('Description (truncated) at the top linking to full', async function () {
              await driver.findElement(By.css('.media-body a[href*="Description"]'));
            });

            it('Finding Aid tab', async function () {
              await driver.findElement(By.css('.record-tab.findingaid'));
            });

            it('Finding Aid content via AJAX', async function () {
              await driver.wait(until.elementLocated(By.css('.findingaid-tab h4')), 5000);
            });

            it('Display Location Name', async function () {
              if (future_version) {
                // Load the primary tab before checking holdings info
                await driver.get(url_prefix + '/Record/10664764');
                await driver.wait(until.elementLocated(By.xpath('//div[contains(@class, "holdings-tab")]//h2[contains(., "Special Collections")]')), 5000);
              }
              else {
                await driver.findElement(By.xpath('//div[contains(@class, "holdings-tab")]//h3[contains(., "Special Collections")]'));
              }
            });

          });

          if (!future_version) {
            it('ejournal Browzine View Complete Issue link', async function () {
              await driver.get(url_prefix + '/Record/79317');
              await expectTheBasics();
              let browzine_link = await driver.findElement(By.linkText('View complete issue of this journal (Browzine)'));

              // should not be within a heading
              let heading_ancestors = await browzine_link.findElements(By.xpath('ancestor::h3'));
              expect(heading_ancestors).to.be.empty;
            });
          }

          it('Special Collections request link', async function () {
            await driver.get(url_prefix + '/Record/10944200');
            await expectTheBasics();
            await driver.wait(until.elementLocated(By.css('.holdings-tab a[href^="https://lmc-request.lib.lehigh.edu/requestitem/"]')), 5000);
          });

          describe('eBoook record page', function () {
            before(async function () {
              await driver.get(url_prefix + '/Record/10997217');
              await expectTheBasics();
            });

            it('Physical description', async function () {
              await driver.findElement(By.xpath('//div[@class="media-body"]//td[text()="1 online resource (463 pages)"]'));
            });

            it('Media box online access', async function () {
              await driver.findElement(By.css('.record .media a[data-raw-url="https://ebookcentral.proquest.com/lib/lehighlibrary-ebooks/detail.action?docID=5444845"]'));
              await driver.findElement(By.css('.record .media a[data-platform="Ebook Central"]'));
              await driver.findElement(By.css('.record .media a[data-platform-subset="Academic Complete"]'));
            });

            it('Holdings tag online access', async function () {
              await driver.wait(until.elementLocated(By.css('.holdings-tab a[data-raw-url="https://ebookcentral.proquest.com/lib/lehighlibrary-ebooks/detail.action?docID=5444845"]')), 5000);
              await driver.wait(until.elementLocated(By.css('.holdings-tab a[data-platform="Ebook Central"]')), 5000);
              await driver.wait(until.elementLocated(By.css('.holdings-tab a[data-platform-subset="Academic Complete"]')), 500);
            });

          });

          it('Streaming Video physical description', async function () {
            await driver.get(url_prefix + '/Record/10874924');
            await expectTheBasics();
            await driver.findElement(By.xpath('//div[@class="media-body"]//td[text()="1 streaming video file (137 min.)."]'));
          });

          describe('State-dependent', function () {

            it("Item on order", async function () {
              await driver.get(url_prefix + '/Record/' + records.on_order);
              await expectTheBasics();
              // wait for header first, so tab contents are loaded
              await driver.wait(until.elementLocated(By.xpath('//div[contains(@class, "holdings-tab")]/h2')), 5000);
              let holdings_tab = await driver.findElement(By.xpath('//div[contains(@class, "holdings-tab")]'));
              let text = await holdings_tab.getText();
              expect(text).to.contain("This item has been ordered.");
            });

          });

        });

        describe('Search Results pages', function () {

          describe('Solr search', function () {

            before(async function () {
              await driver.get(url_prefix + '/Search/Results?lookfor=test');
              await expectTheBasics();
            });

            if (!future_version) {
              it('Suggests article results', async function () {
                // This anchor is loaded async by JS, so will take a few seconds
                // Test the suggestion box right above the results
                await driver.wait(until.elementLocated(By.css('#articleSearchResults a')), 5000);

                // Also test the Articles tab itself, it should have a number surrounded by '()'
                let articleCountElement = await driver.findElement(By.css('#articleCount'));
                await driver.wait(until.elementTextMatches(articleCountElement, /\d/), 5000);
              });
            }

            describe('Search Box', function () {

              it('Search Type default', async function () {
                let type = await driver.findElement(By.css('#searchForm_type > option[selected]')).getText();
                if (future_version) {
                  expect(type).to.equal("All Fields");
                }
                else {
                  expect(type).to.equal("Catalog - All Fields");
                }
              });

            });

            describe('Facets', function () {

              it('Side exclude facet (call number)', async function () {
                let parentSelector = "#side-collapse-dewey-hundreds";
                await expectNoBadge(parentSelector);

                return await driver.findElement(By.css(parentSelector + " .facet a[title*='Exclude']"));
              });

              it('Top facet', async function () {
                await expectNoBadge(".top-facets-contents");

                let top_facet = await driver.findElement(By.css(".top-facet-inner"));
                let border = await top_facet.getCssValue("border-top-width");
                expect(border).to.equal("0px");
              });

              async function expectNoBadge(parentSelector) {
                let badge_elements = await driver.findElements(By.css(parentSelector + " .facet span.badge"));
                return expect(badge_elements).to.be.empty;
              }

            });

          });

          it('Stopword-heavy search', async function () {
            await driver.get(url_prefix + '/Search/Results?lookfor=how+the+word+is+passed');
            let stats = await driver.findElement(By.css('.search-stats'));
            let result_count = Number(await stats.getAttribute('data-record-total'));
            expect(result_count).greaterThan(0);
          });

          it('Title subfields n & p', async function () {
            await driver.get(url_prefix + '/Search/Results?lookfor=asm+handbook');
            await expectTheBasics();
            await driver.findElement(By.linkText('ASM Handbook.Volume 12, Fractography /'));
          });

          it('Lehigh Author facet', async function () {
            await driver.get(url_prefix + '/Search/Results?lookfor=Athens+priesthood');
            await expectTheBasics();
            await driver.findElement(By.css('#side-panel-lehighAuthor'));
          });

        });

        describe('Books search', function () {
          before(async function () {
            await driver.get(url_prefix + '/Search/Results?hiddenFilters%5B%5D=vufind%3A"books_all"&lookfor=test&type=AllFields');
            await expectTheBasics();
          });

          it('Ebook results', async function () {
            let fulltext_link = await driver.findElement(By.css('#result0 a.fulltext'));
            let raw_url = await fulltext_link.getAttribute('data-raw-url');
            expect(raw_url).contains('https://ebookcentral.proquest.com/lib/lehighlibrary-ebooks/detail.action?docID=3035534');
            let platform = await fulltext_link.getAttribute('data-platform');
            expect(platform).contains('Ebook Central');
            let platform_subset = await fulltext_link.getAttribute('data-platform-subset');
            expect(platform_subset).contains('Academic Complete');
          });
        });

        describe('Empty Search Results page', function () {

          if (!future_version) {
            it('Custom message', async function () {
              await driver.get(url_prefix + '/Search/Results?lookfor=asdfasdfasfdasfd');
              await expectTheBasics();
              await driver.findElement(By.xpath('//div[contains(@class, "alert")]/p[contains(text(), "PALCI")]'));
            });
          }
        });

        describe('Advanced Search page', function () {

          if (!future_version) {
            it('Link to basic search', async function () {
              await driver.get(url_prefix + '/Search/Advanced');
              await expectTheBasics();
              await driver.findElement(By.linkText("Back to Basic Catalog Search"));
            });
          }

        });

        describe('Author home', function () {

          it('Wikipedia not present', async function () {
            await driver.get(url_prefix + '/Author/Home?author=Whitman%2C+Walt%2C');
            await expectTheBasics();
            let wikipedia_entries = await driver.findElements(By.css('.wikipedia'));
            expect(wikipedia_entries).to.be.empty;
          });

        });

        it('Course Reserves home', async function () {
          await driver.get(url_prefix + '/Search/Reserves');
          await expectTheBasics();

          // The table has data
          let department_link = await driver.findElement(By.css('.mainbody table td.department a'));
          let instructor_link = await driver.findElement(By.css('.mainbody table td.instructor a'));

          // The department and instructor links go to a refined search, not a list of records
          let instructor_href = await instructor_link.getAttribute("href");
          expect(instructor_href).contains("type=AllFields&filter[]=instructor_str");
          let department_href = await department_link.getAttribute("href");
          expect(department_href).contains("type=AllFields&filter[]=department_str");
        });

      });

      describe('Articles tab', function () {

        describe('Search Results pages', function () {

          before(async function () {
            await driver.get(url_prefix + '/EDS/Search?lookfor=Trombones+Elicit+Bitter+More+Strongly+Than+Do+Clarinets');
            await expectTheBasics();
          });

          it('Page Count', async function () {
            await driver.findElement(By.xpath('//div[@class="media-body"]//*[contains(., "Page Count")]'));
          });

          it('No Browzine browsing link', async function () {
            try {
              await driver.wait(until.elementLocated(By.linkText("View Complete Issue (Browzine)")), 5000);
              // await driver.wait(until.elementLocated(By.linkText("Browse journal issues in BrowZine")), 5000);
              throw new Error('Test Failed: Unwanted element was found when it should be absent.');
            } catch (error) {
              if (!(error instanceof TimeoutError)) {
                throw error;
              }                
            }
          });

          it('No Full Text checkbox', async function () {
            let fulltext_checkbox = await driver.findElements(By.css('a[data-facet="LIMIT|FT:y"]'));
            expect(fulltext_checkbox).to.be.empty;
          });

        });

        describe('Full text links (record and results pages)', function () {

          it('PDF available', async function () {
            for (const page of [
              url_prefix + '/EdsRecord/mdl,40753217',
              url_prefix + '/EDS/Search?lookfor=Deletion+of+target+gene+%28histidine-rich+protein+2%2F3%29+for+Plasmodium+falciparum+rapid+diagnostic+tests+in+Amhara+region%2C+Ethiopia',
            ]) {
              await driver.get(page);
              await testFullTextLinks('full-text-file', null, false);
            };
          });

          it('PDF available from Science Direct', async function () {
            for (const page of [
              url_prefix + '/EdsRecord/psyh,2026-17309-010',
              url_prefix + '/EDS/Search?lookfor=Stress+and+burnout+in+dogs+involved+in+animal+assisted+interventions%3A+A+survey+of+Italian+handlers%E2%80%99+opinion',
            ]) {
              await driver.get(page);
              await testFullTextLinks('full-text-file', null, false);
            };
          });

          it('Non-PDF full text available', async function () {
            for (const page of [
              url_prefix + '/EdsRecord/edsemr,edsemr.10.1108.00368790310488887',
              url_prefix + '/EDS/Search?lookfor=An+investigation+on+the+effect+of+dimensional+differences+in+friction+welding+of+AISI+1040+specimens',
            ]) {
              await driver.get(page);
              await testFullTextLinks('content-location', null, false);
            };
          });

          it('Retration notice', async function () {
            for (const page of [
              url_prefix + '/EdsRecord/asn,161960713',
              url_prefix + '/EDS/Search?lookfor=A+fuzzy+rough+hybrid+decision+making+technique+for+identifying+the+infected+population+of+COVID-19',
            ]) {
              await driver.get(page);
              // EDS only provides a full text link type 'other'.  Is that worth a fallback?
              await testFullTextLinks(null, 'Retraction', false);
            };
          });

          it('Expression of concern', async function () {
            for (const page of [
              url_prefix + '/EdsRecord/asn,85125644',
              url_prefix + '/EDS/Search?filter%5B%5D=EXPAND%3A%22relatedsubjects%22&filter%5B%5D=LIMIT%7CFT1%3A%22y%22&dfApplied=1&lookfor=Targeted+Disruption+of+Inducible+Nitric+Oxide+Synthase+Protects+Against+Aging%2C+S-Nitrosation%2C+and+Insulin+Resistance+in+Muscle+of+Male+Mice.&type=AllFields&daterange%5B%5D=PublicationDate&PublicationDatefrom=2013&PublicationDateto=2013',
            ]) {
              await driver.get(page);
              // EDS only provides a full text link type 'other'.  Is that worth a fallback?
              await testFullTextLinks(null, 'Concern', false);
            };
          });

          it('Libkey doesn\'t have the record, falls back to "smart link"', async function () {
            this.timeout(20000);
            for (const page of [
              url_prefix + '/EdsRecord/asn,182810252',
              url_prefix + '/EDS/Search?filter%5B%5D=EXPAND%3A%22relatedsubjects%22&filter%5B%5D=LIMIT%7CFT1%3A%22y%22&dfApplied=1&lookfor=Effect+of+Dimensional+Differences+on+Tensile+Strength+in+Tensile+Test+Specimens&type=TI',
            ]) {
              await driver.get(page);
              await testFullTextLinks(null, null, true);
            };
          });

          it('No DOI', async function () {
            this.timeout(20000);
            for (const page of [
              url_prefix + '/EdsRecord/asn,187714598',
              url_prefix + '/EDS/Search?lookfor=Prejudgment+Interest%3A+Is+the+Time+Value+of+Money+Overlooked+in+Divorce+Proceedings',
            ]) {
              await driver.get(page);
              await testFullTextLinks(null, null, true);
            };
          });

          it('No ISSN - newspaper article in EBSCO DB (smart link)', async function () {
            this.timeout(20000);
            for (const page of [
              url_prefix + '/EdsRecord/bth,188824052',
              url_prefix + '/EDS/Search?lookfor=Tripura+govt+implemented+several+steps+to+improve+power+transmission+system%3A+Minister',
            ]) {
              await driver.get(page);
              await testFullTextLinks(null, null, true);
            };
          });

          it('No ISSN - newspaper article in non-EBSCO DB (custom link)', async function () {
            this.timeout(20000);
            for (const page of [
              url_prefix + '/EdsRecord/edsnbk,12BB4ACC815E0D48',
              url_prefix + '/EDS/Search?lookfor=Stress+testing+begins+on+Bay+Bridge',
            ]) {
              await driver.get(page);
              await testFullTextLinks(null, null, true);
            };
          });

          it('ISBN', async function () {
            this.timeout(20000);
            for (const page of [
              url_prefix + '/EdsRecord/eric,ED674523',
              url_prefix + '/EDS/Search?lookfor=Proceedings+of+the+International+Association+for+Development+of+the+Information+Society+%28IADIS%29+International+Conferences+on+Mobile+Learning+%28ML+2025%2C+21st%29+and+Educational+Technologies+%28ICEduTech+2025%2C+10th%29+%28Madeira+Island%2C+Portugal%2C+March+1-3%2C+2025',
            ]) {
              await driver.get(page);
              await testFullTextLinks(null, null, true);
            };
          });

          it('P link only -- EDS database with HTML full text', async function () {
            this.timeout(20000);
            for (const page of [
              url_prefix + '/EdsRecord/asn,189409190',
              url_prefix + '/EDS/Search?lookfor=The+Tragic+True+Story+Behind+%27The+Carman+Family+Deaths',
            ]) {
              await driver.get(page);
              await testFullTextLinks(null, null, true);
            };
          });

          async function testFullTextLinks(doiLinkSubstring, doiTextSubstring, expectEdsLink) {
            if (doiLinkSubstring) {
              await driver.wait(until.elementLocated(By.css('.doiLink > a[href*="' + doiLinkSubstring + '"')), 5000);
            }
            else if (doiTextSubstring) {
              await driver.wait(until.elementLocated(By.xpath('//span[@class="doiLink"]/a/span[contains(., "' + doiTextSubstring + '")]')), 5000);
            }
            else {
              try {
                await driver.wait(until.elementLocated(By.css('.doiLink > a')), 5000);
                throw new Error('Test Failed: Unwanted element was found when it should be absent.');
              } catch (error) {
                if (!(error instanceof TimeoutError)) {
                  throw error;
                }
              }
            }

            if (expectEdsLink) {
              let edsLinkDisplayed = await driver.findElement(By.css('.eds-link')).isDisplayed();
              expect(edsLinkDisplayed).to.be.true;
            }

            await driver.findElement(By.css('.openUrlControls > a'));
          }

        });


        describe('Empty Search Results page', function () {

          if (!future_version) {
            it('Custom message', async function () {
              await driver.get(url_prefix + '/EDS/Search?lookfor=asdfasdfasfdasfd');
              await expectTheBasics();
              await driver.findElement(By.linkText('Google Scholar'));
            });
          }

        });

        describe('Advanced Search page', function () {

          if (!future_version) {
            it('Link to basic search', async function () {
              await driver.get(url_prefix + '/EDS/Advanced');
              await expectTheBasics();
              await driver.findElement(By.linkText("Back to Basic Article Search"));
            });
          }

        });

      });

      describe('Journals tab', function () {

        describe('EPF Record pages', function () {

          it('BrowZine browse journal link', async function () {
            await driver.get(url_prefix + '/EPFRecord/edp19960608');
            await expectTheBasics();
            await driver.findElement(By.linkText("Browse Recent Issues"));
          });

        });

        describe('Search Results pages', function () {

          it('BrowZine browse journal link', async function () {
            await driver.get(url_prefix + '/Blender/Results?lookfor=chemistry');
            await expectTheBasics();
            let record1 = await driver.findElement(By.id('result0'));
            await record1.findElement(By.linkText("Browse Recent Issues"));
          });

        });

      });

      describe('Single Search', function () {

        it('Total records', async function () {
          await driver.get(url_prefix + '/Combined/Results');
          await expectTheBasics();

          for (let { name, selector, attribute = 'data-record-total', minExpected, maxExpected } of records.boxes) {
            let element = await driver.wait(until.elementLocated(By.css(selector), 5000));

            // let element = await driver.findElement(By.css(selector));
            let count = Number(await element.getAttribute(attribute));
            expect(count, name).greaterThan(minExpected);
            expect(count, name).lessThan(maxExpected);
          }
        });

        it('Search by OCLC number', async function () {
          await driver.get(url_prefix + '/Combined/Results?lookfor=1199125571');
          await expectTheBasics();
          let books_stats = await driver.wait(until.elementLocated(By.css('#combined_Solr____books .search-stats')), 5000);
          let books_result_count = Number(await books_stats.getAttribute('data-record-total'));
          expect(books_result_count).greaterThan(0);
        });

      });

      describe('AlphaBrowse (Catalog) tab', function () {

        it('Title browse', async function () {
          await driver.get(url_prefix + '/Alphabrowse/Home?source=title&from=test');
          await expectTheBasics();

          // The basic table appears
          await driver.findElement(By.css('table.alphabrowse'));

          // One of the rows in the table
          await driver.findElement(By.linkText('Test and analysis of Web services / Luciano Baresi, Elisabetta di Nitto.'));
        });

      });

      describe('Login-based tests', function () {

        it('Login', async function () {
          await driver.get(url_prefix);
          await expectTheBasics();

          // Click login link
          let login_link = await driver.findElement(By.css('#loginOptions > a'));
          await login_link.click();
          await driver.wait(until.elementLocated(By.xpath('//h2[text()="Login"]')), 5000);

          // Enter credentials
          let user = users[0];
          let username_field = await driver.findElement(By.css('form.form-login input[name=username]'));
          username_field.sendKeys(user.username);
          let password_field = await driver.findElement(By.css('form.form-login input[name=password]'));
          password_field.sendKeys(user.password);

          // Click submit button
          let login_submit_link = await driver.findElement(By.css('form.form-login input[type=submit]'));
          await login_submit_link.click();
          await driver.wait(until.elementLocated(By.css('.logoutOptions')), 5000);
          await driver.findElement(By.xpath('//li[@class="logoutOptions"]//span[contains(text(), "Log Out")]'));
        });

        records.by_location.forEach(({library, hrid}) => {
          it('Delivery location: ' + library, async function() {
            await driver.get(url_prefix + '/Record/' + hrid);

            await driver.wait(until.elementLocated(By.css('.holdings-tab .placehold')), 5000);
            let request_link = await driver.findElement(By.css('.holdings-tab .placehold'));
            request_link.click();

            await driver.wait(until.elementLocated(By.xpath('//h2[contains(text(), "Place a Request")]')), 5000);
            await driver.findElement(
              By.xpath('//select[@id="pickUpLocation"]/option[1][contains(text(), "' + library + '")]'));
          });
        });

        it('Logout', async function () {
          await driver.get(url_prefix);
          let logout_link = await driver.findElement(By.css('.logoutOptions > a.logout'));
          await logout_link.click();
          await driver.wait(until.elementLocated(By.css('#loginOptions')), 5000);
        });

      });

      describe('Server', function () {

        it('Robots.txt', async function () {
          await driver.get(url_prefix + '/robots.txt');
          await driver.findElement(By.xpath('//*[contains(., "User-agent")]'));
        });

      });
    });
  });

  function expectTheBasics() {
    return expectPageRenders()
      .then(() => { return expectCookieSet() })
      .then(() => { return expectNoFakeData() });
  }

  async function expectPageRenders() {
    return driver.findElement(By.id('loginOptions'));
  }

  async function expectCookieSet() {
    let found_cookie = await driver.manage().getCookie(cookie.name);
    return expect(found_cookie.value).to.equal(cookie.value);
  }

  async function expectNoFakeData() {
    let text = await driver.findElement(By.css('body')).getText();
    return expect(text).not.to.include("fake");
  }

});
