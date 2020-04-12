'use strict';

require('chromedriver');
require('geckodriver');
var chrome = require('selenium-webdriver/chrome');
var firefox = require('selenium-webdriver/firefox');
var webdriver = require('selenium-webdriver')

const { Builder, Capabilities, By } = require('selenium-webdriver');
const { ConsoleLogHandler, Region, TestResults, GeneralUtils, MatchLevel } = require('@applitools/eyes-sdk-core');
const { Eyes, 
    Target, 
    Configuration, 
    DeviceName, 
    VisualGridRunner, 
    ClassicRunner, 
    BrowserType, 
    RectangleSize, 
    StitchMode, 
    BatchInfo } = require('@applitools/eyes-selenium');

const sleep = require('sleep');
const pry = require('pryjs')

var eyesConfig = {};

;(async function() {

    var program = require('commander');

    program
        .version('0.0.1', '-v, --version', 'output the current version')
        .description('A tool for comparing UFG and Classic renders on various platforms')
        .requiredOption('-k --key [key]', 'Set your Applitools API Key. e.g. -k key', process.env.APPLITOOLS_API_KEY)
        .requiredOption('-u --url [url]', 'Add the site URL you want to generate a sitemap for. e.g. -u https://www.applitools.com', 'https://www.random.org/integers/?num=100&min=1&max=100&col=5&base=10&format=html&rnd=new')
        .option('-sk --saucekey [saucekey]', 'Your Saucelabs key. Default: local headless chromedriver')
        .option('-bn --batchname [batchname]', 'Name for the final comparison batch', 'rct batch')
        .option('-vx --xdim [xdim]', 'X dimension of the viewport size. e.g. -vx 1600', 1600)
        .option('-vy --ydim [ydim]', 'Y dimension of the viewport size. e.g. -vy 900', 900)
        .option('-su  --serverurl [serverurl]', 'Set your Applitools  server URL. (Default: https://eyesapi.applitools.com). e.g. -v https://youreyesapi.applitools.com', 'https://eyesapi.applitools.com')
        .option('-l --log [log]', 'Enable Applitools Debug Logs (Default: false). e.g. --log', false)
        .option('-an --appname [appname]', 'Name of the application under test', 'rct app')
        .option('-tn --testname [testname]', 'The name of the final comparison test in the Applitools batch', 'rct test')
        .option('-sm --stitchmode [stitchmode]', 'The stitchmode to be used (Default: CSS)', 'CSS')
        .option('-hl --headless [headless]', 'Run the browser headless (Default: false)', false)
        .option('-ml --matchlevel [matchlevel]', 'Run the browser headless (Default: false)', 'Strict')
        .option('-b --browser [browser]', 'Use Chrome or FireFox (Default: Chrome)', 'Chrome')
        .option('-en --envname [envname]', 'Set a custom prefix for the environment name assigned to the grid run', false)
        .on('--help', () => {
            console.log('');
            console.log('Example call:');
            console.log('  $ rct-cli -k 1234567890abcxyz -u http://www.applitools.com');
        })
        .parse(process.argv);

    eyesConfig = {
        vx: program.xdim,
        vy: program.ydim,
        batchName: program.batchname,
        batchId: 'rct-cli-' +  Math.round((new Date()).getTime() / 1000).toString(),
        apiKey: program.key,
        url: program.url,
        appName: program.appname,
        testName: program.testname,
        serverUrl: program.serverurl,
        stitchMode: program.stitchmode.toLowerCase(),
        log: program.log,
        envName: program.envname ? program.envname + program.xdim + 'x' + program.ydim : 'Render from grid ' + program.xdim + 'x' + program.ydim,
        headless: program.headless,
        matchLevel: program.matchlevel,
        browser: program.browser.toLowerCase(),
    }


    try {

        //logEyesConfig()

        eyesConfig.useGrid = true
        const eyesVisualGrid = await eyesSetup()

        l('Grid run begin')
        await runEyes(eyesVisualGrid);
        l('Grid run end\n')

        eyesConfig.useGrid = false
        eyesConfig.closeBatch = true
        const eyesClassic = await eyesSetup()

        l('Classic run begin')
        await runEyes(eyesClassic);  
        l('Classic run end\n') 

    } catch(err) {
        console.error(err.message);
        if(typeof eyesVisualGrid !== 'undefined') eyesVisualGrid.abortIfNotClosed();
        if(typeof eyesClassic !== 'undefined') eyesClassic.abortIfNotClosed();
    }

})()


async function getBrowser() {

    // Get a browser
    // TODO: Add Sauce, Browserstack, Perfecto, Plain Selenium grid

    try{
        switch(eyesConfig.browser) {
            case 'chrome' : {
                var options = await new chrome.Options();
                if(eyesConfig.headless){options.addArguments('--headless');}
                let driver = new webdriver.Builder()
                    .forBrowser('chrome')
                    .withCapabilities(webdriver.Capabilities.chrome())
                    .setChromeOptions(options)          
                    .build(); 
                    return driver;
                }

            case 'firefox' : {                    
                var options = new firefox.Options();
                if(eyesConfig.headless){options.addArguments("-headless");}
                let driver = await new webdriver.Builder()
                    .forBrowser('firefox')
                    .setFirefoxOptions(options)
                    .build();
                return driver;
            }

        }

    } catch(err) {
        console.error('ERROR: function getBrowser() : ' + err.message);
        throw err;
    }
}

async function eyesSetup() {

    try {           
        
        const runner = eyesConfig.useGrid ? new VisualGridRunner() : new ClassicRunner();
        let eyes = new Eyes(runner);

        const batchInfo = new BatchInfo(eyesConfig.batchName);
        batchInfo.setId(eyesConfig.batchId); 
        
        const configuration = new Configuration();

        configuration.setBatch(batchInfo)
        configuration.setConcurrentSessions(5);
        configuration.setAppName(eyesConfig.appName);
        configuration.setTestName(eyesConfig.testName);
        configuration.setMatchLevel(eyesConfig.matchLevel);
        configuration.setSaveFailedTests(true);
        configuration.addBrowser(parseInt(eyesConfig.vx),  parseInt(eyesConfig.vy), BrowserType.CHROME);
        configuration.setBaselineEnvName(eyesConfig.envName);
        switch (eyesConfig.stitchMode) {
            case 'css': configuration.setStitchMode(StitchMode.CSS); break;
            case 'scroll': configuration.setStitchMode(StitchMode.SCROLL); break;
            default: configuration.setStitchMode(StitchMode.CSS);
        }
        configuration.setServerUrl(eyesConfig.serverUrl);
        configuration.setHideScrollbars(true);
        configuration.setSendDom(true);
        configuration.setViewportSize({width: Number(eyesConfig.vx), height: Number(eyesConfig.vy)});
        eyes.setConfiguration(configuration);

       // if(!eyesConfig.useGrid) {eyes.setViewportSize({width: Number(eyesConfig.vx), height: Number(eyesConfig.vy)});}
        eyes.setApiKey(eyesConfig.apiKey);
        if(eyesConfig.log){eyes.setLogHandler(new ConsoleLogHandler(false));}        

        return eyes;
    } catch(err) {
        console.error('ERROR: function eyesConfig() : ' +err.message);
        throw err;
    } 

}

async function runEyes(reyes) {

    const driver = await getBrowser()

    try {
        // await rdriver.get('https://www.timeanddate.com/worldclock/usa/melbourne');  // causes JSON error !!!! Stringify of an element
        // await rdriver.get('https://applitools.github.io/demo/TestPages/FramesTestPage');
        await driver.get(eyesConfig.url);
        await reyes.open(driver);
        var currentUrl = await driver.getCurrentUrl().then(function(url){
            console.log('Testing URL: ' + url);
            return url;
        });
        await reyes.check(currentUrl, Target.window().fully());
        if(eyesConfig.useGrid) { await reyes.closeAsync() } else { await reyes.close(false) }
        
        if(eyesConfig.closeBatch){
            const testResultsSummary = await reyes.getRunner().getAllTestResults(false);

            const resultsStr = testResultsSummary
            .getAllResults()
            .map(testResultContainer => {
              const testResults = testResultContainer.getTestResults()
              return testResults ? formatResults(testResults) : testResultContainer.getException()
            })
            .join('\n')
            console.log('\nRender results:\n', resultsStr)
        }

    } catch(err) {
        console.error('ERROR: function runEyes() : ' + err.message);
        await driver.quit();
        throw err;
    } finally {
        if (driver && reyes) {
            await driver.quit();
            reyes.abortIfNotClosed();
        }
    }
}

function logEyesConfig(){
    Object.getOwnPropertyNames(eyesConfig).forEach(
        function (val, idx, array) {
          console.log(val + ': ' + eyesConfig[val])
        }
      );
}

function l(msg){ console.log(new Date() + ': ' + msg)}

function formatResults(testResults) {
    return `
  Test name                 : ${testResults.getName()}
  Test status               : ${testResults.getStatus()}
  URL to results            : ${testResults.getUrl()}
  Total number of steps     : ${testResults.getSteps()}
  Number of matching steps  : ${testResults.getMatches()}
  Number of visual diffs    : ${testResults.getMismatches()}
  Number of missing steps   : ${testResults.getMissing()}
  Display size              : ${testResults.getHostDisplaySize().toString()}
  Steps                     :
  ${testResults
    .getStepsInfo()
    .map(step => {
      return `  ${step.getName()} - ${getStepStatus(step)}`
    })
    .join('\n')}`
  }
  
function getStepStatus(step) {
    if (step.getIsDifferent()) {
      return 'Diff'
    } else if (!step.getHasBaselineImage()) {
      return 'New'
    } else if (!step.getHasCurrentImage()) {
      return 'Missing'
    } else {
      return 'Passed'
    }
  }
  