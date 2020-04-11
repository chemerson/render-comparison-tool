'use strict';

require('chromedriver');
var chrome = require('selenium-webdriver/chrome');
var webdriver = require('selenium-webdriver')

const { Builder, Capabilities, By } = require('selenium-webdriver');
const { ConsoleLogHandler, Region, TestResults, GeneralUtils, MatchLevel } = require('@applitools/eyes-sdk-core');
const { Eyes, Target, Configuration, DeviceName, VisualGridRunner, ClassicRunner, BrowserType, ScreenOrientation, StitchMode, BatchInfo } = require('@applitools/eyes-selenium');
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
  'eyes.setSaveFailedTests(true)',
  //'eyes.setScaleRatio(0)',
  'eyes.setServerUrl("https://eyesapi.applitools.com")',
  'eyes.setStitchMode(StitchMode.CSS)',
  //'eyes.setViewportSize({width: 1600, height: 900})',
  //'eyes.setWaitBeforeScreenshots(3000)',
  //'eyes.addProperty("PROPERTY", "PROP-VALUE")'
];

function getBrowser() {

    // Get a browser
    // TODO: Add Sauce, Browserstack, Perfecto, Plain Selenium grid

    try{
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
    } catch(err) {
        console.error('ERROR: function getBrowser() : ' + err.message);
    }
}

async function eyesSetup(eyesConfig) {

    try {
        const runner = eyesConfig.useGrid ? new VisualGridRunner() : new ClassicRunner();
        let eyes = new Eyes(runner);

        eyes.setApiKey(eyesConfig.apiKey);
        if(eyesConfig.log){eyes.setLogHandler(new ConsoleLogHandler(false));}        

        for (let i = 0; i < setMethods.length; i++) {
            try { 
                await eval(setMethods[i]);
            } catch(err) {
                console.log("Set Method: " + setMethods[i] + " Error: " + err);
            }
        }

        const batchInfo = new BatchInfo(eyesConfig.batchName);
        batchInfo.setId(eyesConfig.batchId);

        if(eyesConfig.useGrid) {
            const configuration = new Configuration();
            configuration.setBatch(batchInfo)
            configuration.setConcurrentSessions(5);
            configuration.setAppName(eyesConfig.appName);
            configuration.setTestName(eyesConfig.testName);
            configuration.setMatchLevel('Strict');
            configuration.setSaveFailedTests(true);
            configuration.addBrowser(eyesConfig.vx,  eyesConfig.vy, BrowserType.CHROME);
            eyes.setConfiguration(configuration);
        } else {
            eyes.setBatch(batchInfo);
        }
        return eyes;
    } catch(err) {
        console.error('ERROR: function eyesConfig() : ' +err.message);
    } 

}

async function runEyes(reyes, eyesConfig) {

    const driver = await getBrowser()

    try {
        if(eyesConfig.useGrid){
            await reyes.open(driver);
        } else {
            await reyes.open(driver, eyesConfig.appName, eyesConfig.testName, { width: eyesConfig.vx, height: eyesConfig.vy });
        }
        // await rdriver.get('https://www.timeanddate.com/worldclock/usa/melbourne');  // causes JSON error !!!! Stringify of an element
        // await rdriver.get('https://applitools.github.io/demo/TestPages/FramesTestPage');
        await driver.get(eyesConfig.url);
        var currentUrl = await driver.getCurrentUrl().then(function(url){
            console.log('Testing URL: ' + url);
            return url;
        });
        await reyes.check(currentUrl, Target.window().fully());
        if(eyesConfig.useGrid) { await reyes.closeAsync() } else { await reyes.close(false) }
        const results = await reyes.getRunner().getAllTestResults(false);
        console.log(results); 

    } catch(err) {

        console.error('ERROR: function runEyes() : ' + err.message);

    } finally {
        if (driver && reyes) {
            driver.quit();
            reyes.abortIfNotClosed();
        }
    }
}

function logEyesConfig(eyesConfig){
    l('log eyesConfig  start')
    Object.getOwnPropertyNames(eyesConfig).forEach(
        function (val, idx, array) {
          console.log(val + ': ' + eyesConfig[val])
        }
      );
      l('log eyesConfig end')
}

function l(msg){ console.log(new Date() + ': ' + msg)}

;(async function() {

    var program = require('commander');

    program
        .version('0.0.1', '-v, --version', 'output the current version')
        .description('A tool for comparing UFG and Classic renders on various platforms')
        .option('-k --key [key]', 'Set your Applitools API Key. e.g. -k key', process.env.APPLITOOLS_API_KEY)
        .option('-u --url [url]', 'Add the site URL you want to generate a sitemap for. e.g. -u https://www.applitools.com', 'https://www.random.org/integers/?num=100&min=1&max=100&col=5&base=10&format=html&rnd=new')
        .option('-sk --saucekey [saucekey]', 'Your Saucelabs key. Default: local headless chromedriver')
        .option('-bn --batchName [batchName]', 'Name for the final comparison batch', 'rct batch')
        .option('-vx --xdim [xdim]', 'X dimension of the viewport size. e.g. -vx 1600', 1600)
        .option('-vy --ydim [ydim]', 'Y dimension of the viewport size. e.g. -vy 900', 900)
        .option('-su  --serverUrl [serverUrl]', 'Set your Applitools  server URL. (Default: https://eyesapi.applitools.com). e.g. -v https://youreyesapi.applitools.com', 'https://eyesapi.applitools.com')
        .option('-l --log [log]', 'Enable Applitools Debug Logs (Default: false). e.g. --log', false)
        .option('-an --appName [appName]', 'Name of the application under test', 'rct app')
        .option('-tn --testName [testName]', 'The name of the final comparison test in the Applitools batch', 'rct test')
        .option('-sm --stitchMode [stitchMode]', 'The stitchmode to be used (Default: CSS)', 'CSS')
        .on('--help', () => {
            console.log('');
            console.log('Example call:');
            console.log('  $ rct-cli -k 1234567890abcxyz -u http://www.applitools.com');
        })
        .parse(process.argv);

    const eyesConfig = {
        vx: program.xdim,
        vy: program.ydim,
        batchName: program.batchName,
        batchId: 'rct-cli-' +  Math.round((new Date()).getTime() / 1000).toString(),
        apiKey: program.key,
        url: program.url,
        appName: program.appName,
        testName: program.testName,
        serverUrl: program.serverUrl,
        stitchMode: program.stitchMode,
        log: program.log
    }

    try {

        logEyesConfig(eyesConfig)

        eyesConfig.useGrid = true
        const eyesVisualGrid = await eyesSetup(eyesConfig)

        l('Grid run begin')
        await runEyes(eyesVisualGrid, eyesConfig);
        l('Grid run end')

        eyesConfig.useGrid = false
        const eyesClassic = await eyesSetup(eyesConfig)

        l('Classic run begin')
        await runEyes(eyesClassic, eyesConfig);  
        l('Classic run end')  

        logEyesConfig(eyesConfig)

    } catch(err) {
        console.error(err.message);
        if(eyesVisualGrid) eyesVisualGrid.abortIfNotClosed();
        if(eyesClassic) eyesClassic.abortIfNotClosed();
    }

})()

