'use strict';

require('chromedriver');
var chrome = require('selenium-webdriver/chrome');
var webdriver = require('selenium-webdriver')

const { Builder, Capabilities, By } = require('selenium-webdriver');
const { ConsoleLogHandler, Region, TestResults, GeneralUtils, MatchLevel } = require('@applitools/eyes-sdk-core');
const { Eyes, Target, SeleniumConfiguration, DeviceName, VisualGridRunner, BrowserType, ScreenOrientation, StitchMode } = require('@applitools/eyes-selenium');
const pry = require('pryjs')

var setMethods = [
  //  'eyes.setAppName("VG Compare")',
  //'eyes.setAgentId("setAgentId")',
  //'eyes.setBaselineBranchName("default")',
  //'eyes.setBranchName("setBranchName")',

  //'eyes.setScrollRootElement(webdriver.By.id("overflowing-div-image"))',

  'eyes.setForceFullPageScreenshot(true)',
  'eyes.setHideScrollbars(false)',   // HEADLESS -> FALSE result OK, TRUE result bad
  //'eyes.setForcedImageRotation(0)',
  
  //'eyes.setHostOS("setHostOS")',
  //'eyes.setHostApp("setHostApp")',

  //'eyes.setHostingApp("setHostingApp")',
  //'eyes.setIgnoreCaret(true)',
  'eyes.setIsDisabled(false)',
  'eyes.setMatchLevel(MatchLevel.Strict)',
  //'eyes.setParentBranchName("setParentBranchName")',
  'eyes.setSaveNewTests(true)',
  //'eyes.setScaleRatio(0)',
  'eyes.setServerUrl("https://eyesapi.applitools.com")',
  'eyes.setStitchMode(StitchMode.CSS)',
  //'eyes.setViewportSize({width: 1600, height: 900})',
  //'eyes.setWaitBeforeScreenshots(3000)',
  //'eyes.addProperty("PROPERTY", "PROP-VALUE")'
];

// Methods
// 1) setup the common eyes properties for grid or classic runner (API key, stitch mode, match level, batch id)
// 2) setup the branch names separately to be able eto play around with them
// 3) eyes run caller that takes a url and vg or classic flag, and a baseline identifier and runs a test with a new eyes instance each time

// Questions
// 1) Use environments and the order the tests are compared to match baselines to checkpoints (I could have a linux machine that 
// has the same environment as the VG but if I run it second it matches my machine against the grid baseline)
// 2) OR use baseline branch names and force the matches to take place with a simple branch name (but environment could differ and then I'm back to 1)

async function getBrowser() {
    var options = new chrome.Options();
       // options.addArguments('--headless');
        options.addArguments('disable-gpu');
        options.addArguments('disable-infobars');
    
    let driver = new webdriver.Builder()
        .forBrowser('chrome')
        .withCapabilities(webdriver.Capabilities.chrome())
        .setChromeOptions(options)          
        .build();

    return driver;
}

async function eyesSetup_grid() {
    const eyes = new Eyes(new VisualGridRunner());
    
    const configuration = new SeleniumConfiguration();
    configuration.appName = 'VG Javascript 1';
    configuration.testName = 'URL Test';
    
    configuration.concurrentSessions = 50;
    configuration.addBrowser( 500,  800, BrowserType.CHROME  );
    configuration.addBrowser( 500,  800, BrowserType.FIREFOX );
    configuration.addBrowser( 1000, 800, BrowserType.CHROME  );
    configuration.addBrowser( 1000, 800, BrowserType.FIREFOX );
    configuration.addBrowser( 1500, 800, BrowserType.CHROME  );
    configuration.addBrowser(1500, 800, BrowserType.FIREFOX );
    configuration.addBrowser(1200, 800, BrowserType.CHROME);
    configuration.addBrowser(1200, 800, BrowserType.FIREFOX);
    configuration.addDevice(DeviceName.iPhone_4, ScreenOrientation.PORTRAIT);

    await eyes.setConfiguration(configuration);

    return eyes;
}

async function eyesSetup_classic() {
    let eyes = new Eyes();

    return eyes;
}

async function eyesSetup_common(reyes) {

    reyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    reyes.setLogHandler(new ConsoleLogHandler(false));
    
    for (let i = 0; i < setMethods.length; i++) {
        console.log(setMethods[i]);
        try { 
            await eval('r' + setMethods[i]);
        } catch(err) {
            console.log("Set Method: " + setMethods[i] + " Error: " + err);
        }
    }

    return reyes;
}

async function runEyes(rdriver, reyes) {

    let appName = 'VG compare';
    let testName = 'Cross render test';

    try {
        
        await reyes.open(rdriver, appName, testName, { width: 1600, height: 900 });

        // await rdriver.get('https://www.timeanddate.com/worldclock/usa/melbourne');  // causes JSON error !!!! Stringify of an element
        // await rdriver.get('https://applitools.github.io/demo/TestPages/FramesTestPage');

        await rdriver.get('https://www.random.org/integers/?num=100&min=1&max=100&col=5&base=10&format=html&rnd=new');


        //await eyes.open(driver, 'JS Selenium 4', 'JS Selenium 4', { width: 1600, height: 900 });
        
        var currentUrl = await rdriver.getCurrentUrl().then(function(url){
            console.log(url);
            return url;
            });

        await reyes.check(currentUrl, Target.window().fully());

        const results = await reyes.close(false);

       // FOR VG const results = await reyes.getRunner().getAllTestResults();
        console.log(results); // eslint-disable-line
    
    } catch(err) {

        console.error(err.message);
        
        if (rdriver && reyes) {
            await rdriver.quit();
            await reyes.abortIfNotClosed();
        }

    } finally {
        await rdriver.quit();
        await reyes.abortIfNotClosed();
    }

}

async function baselineSetup(reyes) {

    try{
        reyes.setBaselineBranchName("setBranchName_2");

  //  reyes.setBranchName("setBranchName_1");
    } catch(err) {
        console.error('baselineSetup method error: ' + err.message);
    }
}

async function main() {
  
    //Globals
    var program = require('commander');

    program
        .version('0.0.1', '-v, --version', 'output the current version')
        .description('A tool for comparing UFG and Classic renders on various platforms')
        .option('-k --key [key]', 'Set your Applitools API Key. e.g. -k key')
        .option('-u --url [url]', 'Add the site URL you want to generate a sitemap for. e.g. -u https://www.seleniumconf.com')
        .option('-sk, --saucekey [saucekey]', 'Your Saucelabs key. Default: local headless chromedriver')
        .option('-bn --batchName [batchName]', 'Name for the final comparison batch')
        .option('-su  --serverUrl [serverUrl]', 'Set your Applitools  server URL. (Default: https://eyesapi.applitools.com). e.g. -v https://youreyesapi.applitools.com')
        .option('-l --log', 'Enable Applitools Debug Logs (Default: false). e.g. --log')
        .on('--help', () => {
            console.log('');
            console.log('Example call:');
            console.log('  $ rct-cli -k 1234567890abcxyz -u http://www.applitools.com');
        })
        .parse(process.argv);

    //Global variables
    let batchId = 'rct-cli-' +  Math.round((new Date()).getTime() / 1000).toString();
    console.log("My Applitools Batch ID: " + batchId)

    var driver = await getBrowser(program);
    var eyes = await eyesSetup_classic();

    await baselineSetup(eyes);
    await eyesSetup_common(eyes);
    await runEyes(driver, eyes);
}

main();