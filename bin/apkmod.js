#!/usr/bin/env node

var inspect = require('util').inspect
console.log("AndroidManifest Dom js")

// Libraries
var Promise = require('promise')
var fs = require('fs');
var child_process = require('child_process');
var path=require('path');
var env = process.env;
var targetDir=".";

var program = require('commander')
program.version('v0.0.1')

program
.option('--apk <apk>', 'Target APK file.')
.option('--config <conf>', 'config.json file.')

// .option('--path <path>', 'AndroidManifest.xml file path or container directory.')

program.parse(process.argv)

var parsedPath = path.parse(program.apk)
var channelName
var config = JSON.parse(fs.readFileSync(program.config))

console.log("path :" + program.path + ", config :" + program.config)

if (program.meta) {
	console.log("meta :" + program.meta)
}
if (program.attribute) {
	console.log("attribute :" + program.attribute)
}
// ---

function child_process_handler(error, stdout, stderr) {
    if (error) {
        console.log(error)
    }else {
        console.log(stdout)
    }
}

function decompile(apkfile) {
    console.log("decompile")

    return new Promise(function(resolve, reject) {
        targetDir = path.dirname(apkfile) + '/' + parsedPath.name
        console.log("targetDir :" + targetDir)
        fileName = parsedPath.base
        console.log("file :" + targetDir)

        child_process.exec('apktool d -f ' + apkfile, function(error, stdout, stderr) {
            if (error) {
                reject(error);
            }else {
                resolve();                
            }
        })
    });

}

function recompile(path) {
    return new Promise(function (resolve, reject) {
        var newApk = targetDir+'/dist/' + parsedPath.name + '-' + channelName + '.apk'
        console.log('recompile :' + newApk)
        child_process.execSync('apktool b ' + path + ' -o ' + newApk);
        signAPK(newApk, targetDir+'/dist/' + parsedPath.name + '-' + channelName + '-signed.apk')
    })
}

function signAPK(apk, dest) {
    console.log("signing " + apk + " to " + dest)
    var sign = config['sign'];
    var keyPath = sign.key
    var password =  sign.password
    console.log("env :" + inspect(env.ANDROID_HOME))
    var signerCmd = env.ANDROID_HOME + "/build-tools/" + config.sign['build-tools']+'/apksigner'
    var cmd = signerCmd + ' sign --ks ' + sign.key + ' --ks-pass pass:' + sign.password + ' --out ' + dest + ' --in ' + apk
    console.log("build-tools :" + cmd)
    child_process.execSync(cmd)
}

function parseManifest(manifestPath, configPath) {
    // Load xml file.
    var targetFile = manifestPath
    var xmlFile = fs.readFileSync(targetFile);
    console.log("xmlFile :" + (xmlFile ? true : false) )

    // Construct dom.
    var parser = require('xml2json')
    var metaDataConfigs = config['meta-data']
    console.log("load config :" + inspect(config))
	var json = JSON.parse(parser.toJson(xmlFile))
    var meta_datas = json.manifest.application['meta-data']

    for (chName in metaDataConfigs) {
        if (chName) {
            channelName = chName
            console.log("Channel %s", chName)
            var cfgChannel = metaDataConfigs[chName]
            if (cfgChannel) {
                var cfgMeta = cfgChannel['meta-data']

                if (cfgMeta) {
                    for (n in meta_datas) {
                        var attrName = meta_datas[n]['android:name']
            
                        for (name in cfgMeta) {
                            if (cfgMeta[name]['android:name'] === attrName) {
                                console.log("attrib :" + attrName)
                                console.log("value :" + cfgMeta[name]['android:value'])
                                if (cfgMeta[name]['android:value']) {
                                    meta_datas[n]['android:value'] = cfgMeta[name]['android:value']
                                }else {
                                    //Use channel name as default value if 'android:value' undefined.
                                    meta_datas[n]['android:value'] = chName;
                                }
                            }
                        }            
                    }
                }else {
                    console.log("config without \'meta-data\' segment.")
                }
            }
        }
        // Save new xml file.
        var xml = parser.toXml(json)
        // Write back to AndroidManifest.xml
        fs.writeFileSync(targetFile, xml, 'utf-8')

        // Pakaging with apktool
        recompile(targetDir)
    }
}

decompile(program.apk)
.then(function() {
    var manifestPath = targetDir + "/AndroidManifest.xml"
    console.log('manifestpath :' + manifestPath)
    parseManifest(manifestPath, program.config)
})
.catch(function (error) {

});
