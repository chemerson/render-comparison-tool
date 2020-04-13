# Render Comparison Tool

A tool for compariing UFG and Classic renders.
Limited to chrome or firefox latest versions. Sauce will use windows 10.

The output in the Applitools dashboard will be one batch with two tests. The first test is the capture
of the grid rendering that is automatically accepted to the baseline. The second test is the comparison of the grid to the classic run.

# Example

```sh
$ node rct-cli.js -b firefox -vx 1200 -vy 800 -u http://www.applitools.com -ml Layout -bn 'rct cli example'
```

# Installation

1) Clone or download the zip for this repo
2) run 'npm install'
3) run using node

# Usage
- Options:
-  -v, --version        : output the current version
-  -k --key             : Set your Applitools API Key. e.g. -k key (will default to APPLITOOLS_API_KEY in env)
-  -u --url             : Add the site URL you want to compare. e.g. -u https://www.applitools.com (default:
                                 "https://www.random.org/integers/?num=100&min=1&max=100&col=5&base=10&format=html&rnd=new")
 - -sk --saucekey       : Your Saucelabs key (Default: local headless chrome, latest)
 - -sn --sauceusername  : Your Saucelabs username
 - -bn --batchname      : Name for the final comparison batch (default: "rct batch")
 - -vx --xdim           : X dimension of the viewport size. e.g. -vx 1600 (default: 1280)
 - -vy --ydim           : Y dimension of the viewport size. e.g. -vy 900 (default: 800)
 - -su  --serverurl     : Set your Applitools  server URL. (Default: https://eyesapi.applitools.com). e.g. -v https://youreyesapi.applitools.com 
 - -l --log             : Enable Applitools Debug Logs (Default: false). e.g. --log (default: false)
 - -an --appname        : Name of the application under test (default: "rct app")
 - -tn --testname       : The name of the final comparison test in the Applitools batch (default: "rct test")
 - -sm --stitchmode     : The stitchmode to be used (Default: CSS) 
 - -hl --headless       : Run the browser headless (Default: false) 
 - -ml --matchlevel     : Run the browser headless (Default: false) 
 - -b --browser         : Use Chrome or FireFox (Default: Chrome)
 - -en --envname        : Set a custom prefix for the environment name assigned to the grid run (default: false)
 - -h, --help           : display help for command


## To Do
1) Add support for safari, ie11, ie10, edge, chrome devices
2) Create a baseline run from the vg-cli tool
2) Add support for older browser versions
3) Eyes log to a file
4) Add support for a configuration file
5) Make this an npm package that can be globally installed
6) when using Sauce, add the ability to split the render between local and sauce
7) add region support for target instead of just window.fully()

## Troubleshooting

1) Baseline is the classic run instead of the visual grid

   The environment tag name was assigned to the classic run. It may not work to simply delete the tag or the environment record in the dashboard due to a bug. Instead, use the command line option -en to create a custom prefix for the env name.

2) Seems like java4 supports viewport resizing better than 3 so leave that in the package, and make sure your chrome version is up to date. Chrome 80 viewports don't seem to let the sdk resize them
