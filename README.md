This is a suite of read-only Mocha / Chai / Selenium integration tests for VuFind.  
- The intent is to run them against an existing instance (test or prod) to catch regressions.
- The individual tests are designed for records with specific content features, to make sure they render those features, to a basic degree.
- Some of those content-features are Lehigh-specific local customizations.

Configuring it requires
- Changing the specific record IDs queried to those that represent the relevant content features in your instance.
- Creating a `config.js` (based on `config.js.example`) pointing to the relevant VuFind instance(s) to test.

I installed in Ubuntu:
- node 18.x
- Java JDK
- google chrome
- and via npm:
  - mocha
  - selenium-webdriver
  - chromedriver
  - chai

Running it requires
- `npm test`
- Or using VS Code with the [Mocha Test Explorer extension](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter)
