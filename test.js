
    var program = require('commander');
   
    program
        .version('0.0.1', '-v, --vers', 'output the current version')
        .description('A tool for comparing UFG and Classic renders on various platforms')
        .option('-u --url [url]', 'Add the site URL you want to generate a sitemap for. e.g. -u https://www.seleniumconf.com')
        .option('-k --key [key]', 'Set your Applitools API Key. e.g. -k key')
        .option('-v --serverUrl [serverUrl]', 'Set your Applitools  server URL. (Default: https://eyesapi.applitools.com). e.g. -v https://youreyesapi.applitools.com')
        .option('-l --log', 'Enable Applitools Debug Logs (Default: false). e.g. --log')
        .on('--help', () => {
            console.log('');
            console.log('Example call:');
            console.log('  $ rct-cli --help');
        })
        .parse(process.argv);
    
