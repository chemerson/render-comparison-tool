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

    // Get a browser
    // TODO: Add Sauce, Browserstack, Perfecto, Plain Selenium grid

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

async function eyesSetup(eyesConfig) {

    // Return an eyes object ready to rock

    //try {
        const runner = eyesConfig.useGrid ? new VisualGridRunner() : new ClassicRunner();
        let eyes = new Eyes(runner);

        eyes.setApiKey(eyesConfig.apiKey);
        eyes.setLogHandler(new ConsoleLogHandler(false));

        for (let i = 0; i < setMethods.length; i++) {
            console.log(setMethods[i]);
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
            configuration.setMatchLevel('Layout');
            configuration.addBrowser(eyesConfig.vx,  eyesConfig.vy, BrowserType.CHROME);
            console.log('-------------');
            eyes.setConfiguration(configuration);
            console.log('-------------');
        }
/*     } catch(err) {
        console.log('-------------');
        console.error(err.message);
        console.log('-------------');
    } */
    return eyes;
}

async function runEyes(rdriver, reyes, eyesConfig) {

    try {
        
        

        await reyes.open(rdriver, eyesConfig.appName, eyesConfig.testName, { width: eyesConfig.vx, height: eyesConfig.vy });

        // await rdriver.get('https://www.timeanddate.com/worldclock/usa/melbourne');  // causes JSON error !!!! Stringify of an element
        // await rdriver.get('https://applitools.github.io/demo/TestPages/FramesTestPage');
        await rdriver.get('https://www.random.org/integers/?num=100&min=1&max=100&col=5&base=10&format=html&rnd=new');

        
        var currentUrl = await rdriver.getCurrentUrl().then(function(url){
            console.log('Testing URL: ' + url);
            return url;
            });

        await reyes.check(currentUrl, Target.window().fully());
        await reyes.close(false);
        const results = await reyes.getRunner().getAllTestResults();
        console.log(results); 
    
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


;(async function() {

    var program = require('commander');

    program
        .version('0.0.1', '-v, --version', 'output the current version')
        .description('A tool for comparing UFG and Classic renders on various platforms')
        .option('-k --key [key]', 'Set your Applitools API Key. e.g. -k key', process.env.APPLITOOLS_API_KEY)
        .option('-u --url [url]', 'Add the site URL you want to generate a sitemap for. e.g. -u https://www.applitools.com')
        .option('-sk --saucekey [saucekey]', 'Your Saucelabs key. Default: local headless chromedriver')
        .option('-bn --batchName [batchName]', 'Name for the final comparison batch', 'rct batch')
        .option('-vx --xdim [xdim]', 'X dimension of the viewport size. e.g. -vx 1600', 1600)
        .option('-vy --ydim [ydim]', 'Y dimension of the viewport size. e.g. -vy 900', 900)
        .option('-su  --serverUrl [serverUrl]', 'Set your Applitools  server URL. (Default: https://eyesapi.applitools.com). e.g. -v https://youreyesapi.applitools.com', 'https://eyesapi.applitools.com')
        .option('-l --log', 'Enable Applitools Debug Logs (Default: false). e.g. --log')
        .option('-an --appName [appName]', 'Name of the application under test', 'rct app')
        .option('-tn --testName [testName]', 'The name of the final comparison test in the Applitools batch', 'rct test')
        .option('-sm --stitchMode [stitchMode]', 'The stitchmode to be used (Default: CSS)', 'CSS')
        .on('--help', () => {
            console.log('');
            console.log('Example call:');
            console.log('  $ rct-cli -k 1234567890abcxyz -u http://www.applitools.com');
        })
        .parse(process.argv);

    var eyesConfig = {
        useGrid: true,
        vx: program.xdim,
        vy: program.ydim,
        batchName: program.batchName,
        batchId: 'rct-cli-' +  Math.round((new Date()).getTime() / 1000).toString(),
        apiKey: program.key,
        url: program.url,
        appName: program.appName,
        testName: program.testName,
        serverUrl: program.serverUrl,
        stitchMode: program.stitchMode
    }

    Object.getOwnPropertyNames(eyesConfig).forEach(
        function (val, idx, array) {
          console.log(val + ': ' + eyesConfig[val]);
        }
      );

    try {
        let eyes1 = await eyesSetup(eyesConfig);
       
        let driver = await getBrowser();

        
        await runEyes(driver, eyes1, eyesConfig);
        
 /*        eyesConfig.useGrid = false;
        let eyes2 = await eyesSetup();
        await runEyes(driver, eyes2, eyesConfig);  */

    } catch(err) {

        console.error(err.message);
    
        if (driver && eyes) {
            await rdriver.quit();
            await reyes.abortIfNotClosed();
        }

    }

})()

