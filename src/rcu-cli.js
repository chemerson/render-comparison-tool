
'use strict';

require('chromedriver')
require('geckodriver')
var chrome = require('selenium-webdriver/chrome')
var firefox = require('selenium-webdriver/firefox')
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

exports.compare = async function() {

    var program = require('commander');


//TODO: API key reading from environment and not command line

    program
        .version('0.0.2', '-v, --version', 'output the current version')
        .description('A tool for comparing UFG and Classic renders on various platforms')
        .requiredOption('-u --url [url]', 'Add the site URL you want to test. e.g. -u https://www.applitools.com', 'https://www.random.org/integers/?num=100&min=1&max=100&col=5&base=10&format=html&rnd=new')
        .option('-k --key [key]', 'Set your Applitools API Key. e.g. -k key', process.env.APPLITOOLS_API_KEY)
        .option('-sk --saucekey [saucekey]', 'Your Saucelabs key. Default: local headless chromedriver', false)
        .option('-sn --sauceun [sauceun]', 'Your Saucelabs username. Default: local headless chromedriver', false)
        .option('-bn --batchname [batchname]', 'Name for the final comparison batch', 'rcu batch')
        .option('-vx --xdim [xdim]', 'X dimension of the viewport and/or render size. e.g. -vx 1600', 1280)
        .option('-vy --ydim [ydim]', 'Y dimension of the viewport and/or render size size. e.g. -vy 900', 800)
        .option('-vpx --vpxdim [vpxdim]', 'X dimension of the viewport size for DOM capture. e.g. -vpx 1600', 1280)
        .option('-vpy --vpydim [vpydim]', 'Y dimension of the viewport size for DOM capture. e.g. -vpy 900', 800)
        .option('-su  --serverurl [serverurl]', 'Set your Applitools  server URL. (Default: https://eyesapi.applitools.com). e.g. -v https://youreyesapi.applitools.com', 'https://eyesapi.applitools.com')
        .option('-l --log [log]', 'Enable Applitools Debug Logs (Default: false). e.g. --log', false)
        .option('-an --appname [appname]', 'Name of the application under test', 'rcu app')
        .option('-tn --testname [testname]', 'The name of the final comparison test in the Applitools batch', 'rcu test')
        .option('-sm --stitchmode [stitchmode]', 'The stitchmode to be used (Default: CSS)', 'CSS')
        .option('-hl --headless [headless]', 'Run the browser headless (Default: false)', false)
        .option('-ml --matchlevel [matchlevel]', 'Run the browser headless (Default: false)', 'Strict')
        .option('-b --browser [browser]', 'Use Chrome or FireFox (Default: Chrome)', 'Chrome')
        .option('-en --envname [envname]', 'Set a custom prefix for the environment name assigned to the grid run', false)
        .on('--help', () => {
            console.log('');
            console.log('Example call:');
            console.log('  $ rcu-cli -k 1234567890abcxyz -u http://www.applitools.com');
        })
        .parse(process.argv)

    eyesConfig = {
        vx: program.xdim,
        vy: program.ydim,
        vpx: program.vpxdim,
        vpy: program.vpydim,
        batchName: program.batchname,
        batchId: 'rcu-cli ' +  Math.round((new Date()).getTime() / 1000).toString(),
        apiKey: program.key,
        url: program.url,
        appName: program.appname,
        testName: program.testname,
        serverUrl: program.serverurl,
        stitchMode: program.stitchmode.toLowerCase(),
        log: program.log,
        envName: program.envname ? program.envname + program.xdim + 'x' + program.ydim : 'Render from grid ' + program.xdim + 'x' + program.ydim + ' (id ' + Math.round((new Date()).getTime() / 1000).toString() + ')' ,
        headless: program.headless,
        matchLevel: program.matchlevel,
        browser: program.browser.toLowerCase(),
        sauceKey: program.saucekey,
        sauceUsername: program.sauceun
    }

    try {

        eyesConfig.useGrid = true
        const eyesVisualGrid = await eyesSetup()

        l(program.opts())
        l('Grid run begin')
        l('API Key: ' + eyesConfig.apiKey)
        await runEyes(eyesVisualGrid)
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

}


async function getBrowser() {

    try{

        if(eyesConfig.sauceKey !== false && eyesConfig.sauceUsername !== false) {

            l('Using Saucelabs (please wait)');
            let tags = ["render compare"];
            let driver = await new webdriver.Builder().withCapabilities({
                'browserName': eyesConfig.browser,
                'platformName': 'Windows 10',
                'browserVersion': 'latest',
                'goog:chromeOptions' : { 'w3c' : true },
                'sauce:options': {
                    'username': eyesConfig.sauceUsername,
                    'accessKey': eyesConfig.sauceKey,
                    "recordVideo": true,
                    "recordScreenshots": false,
                    'build': 'render compare',
                    'name': 'render compare',
                    'maxDuration': 3600,
                    'idleTimeout': 1000,
                    'screenResolution': '2560x1600', // max size for sauce then eyes reduces
                    'tags': tags
                }
            }).usingServer("https://ondemand.saucelabs.com:443/wd/hub")
            .build();
            
            await driver.getSession().then(function (sessionid) {
                driver.sessionID = sessionid.id_;
            });

            return driver;

        } else {

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

        configuration
            .setBatch(batchInfo)
            .setConcurrentSessions(5)
            .setAppName(eyesConfig.appName)
            .setTestName(eyesConfig.testName)
            .setMatchLevel(eyesConfig.matchLevel)
            .setSaveFailedTests(true)
            .addBrowser(parseInt(eyesConfig.vx),  parseInt(eyesConfig.vy), BrowserType.CHROME)
            .setBaselineEnvName(eyesConfig.envName) 
            .setServerUrl(eyesConfig.serverUrl)
            .setHideScrollbars(true)
            .setSendDom(true)
            .setViewportSize({width: Number(eyesConfig.vpx), height: Number(eyesConfig.vpy)});
        switch (eyesConfig.stitchMode) {
            case 'css': configuration.setStitchMode(StitchMode.CSS); break;
            case 'scroll': configuration.setStitchMode(StitchMode.SCROLL); break;
            default: configuration.setStitchMode(StitchMode.CSS);
        }

        eyes.setConfiguration(configuration);

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
        await lazyLoadPage(driver)
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

async function getPageHeight(driver) {
    var clientHeight = await driver.executeScript("return document.documentElement.clientHeight");
    var bodyClientHeight = await driver.executeScript("return document.body.clientHeight");
    var scrollHeight = await driver.executeScript("return document.documentElement.scrollHeight");
    var bodyScrollHeight = await driver.executeScript("return document.body.scrollHeight");
    var maxDocElementHeight = Math.max(clientHeight, scrollHeight);
    var maxBodyHeight = Math.max(bodyClientHeight, bodyScrollHeight);
    return Math.max(maxDocElementHeight, maxBodyHeight);
};
  
async function lazyLoadPage(driver) {
    var height =  await driver.executeScript("return window.innerHeight");
    var pageHeight = await getPageHeight(driver);
    for (var j = 0; j < pageHeight; j += (height - 20)) {
        await driver.executeScript("window.scrollTo(0," + j + ")");
        sleep.msleep(2000);
        pageHeight = await getPageHeight(driver);
    }
    await driver.executeScript("window.scrollTo(0, 0);");
    sleep.msleep(2000);
};
  