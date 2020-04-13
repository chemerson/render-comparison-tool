"use strict"
const {Eyes, Target, ProxySettings, StitchMode} = require("@applitools/eyes-selenium")
const {Builder, Capabilities, By} = require('selenium-webdriver');
const { ConsoleLogHandler } = require('@applitools/eyes-common');
async function main() {

    var caps = {
        "browserName": 'MicrosoftEdge',
        "browserVersion": '80.0',
        "platformName": 'Windows 10',
        "sauce:options": {
        }
    }

    let driver = await new Builder().withCapabilities(caps).usingServer("http://" + process.env.SAUCE_USERNAME + ":" + process.env.SAUCE_ACCESS_KEY + "@ondemand.saucelabs.com/wd/hub").build();

    var eyes = new Eyes();
    eyes.setForceFullPageScreenshot(true); 
    eyes.setStitchMode(StitchMode.CSS);
    eyes.setHideScrollbars(true);
    await eyes.setApiKey(process.env.APPLITOOLS_API_KEY);

    try {
        await driver.get("https://applitools.com");
        await eyes.open(driver, "Sauce Test", "Sauce Test");
        await eyes.check("region", Target.region(By.xpath("/html/body/div[3]/div[1]/div[1]/div/div/div/h2"))); 
        await eyes.close();

    } finally {
        await driver.quit();
        eyes.abortIfNotClosed();
    }
}
main();