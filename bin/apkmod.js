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

program
.version('0.1.0')
// .command('package <params>')
.option('--init', 'Create one config.json file in current path.')
.option('--apk <apk>', 'Target APK file.')
.option('--config <conf>', 'config.json file.')
// .option('--path <path>', 'AndroidManifest.xml file path or container directory.')
.parse(process.argv)

var pInit = program.command('init')

var isInit = program.init ? true : false

if (isInit) {
    //Todo: Init a config.json file.
    console.log("program init :", isInit)
}else {

    var configPath = (program.config == undefined ? "./config.json" : program.config)

    console.log("apkPath :" + program.apk)
    console.log("configPath :" + configPath)

    var parsedPath = path.parse(program.apk)
    var channelName
    var config = JSON.parse(fs.readFileSync(configPath))

    if (program.meta) {
        console.log("meta :" + program.meta)
    }
    if (program.attribute) {
        console.log("attribute :" + program.attribute)
    }

    decompile(program.apk)
    .then(function(v) {
        var manifestPath = targetDir + "/AndroidManifest.xml"
        console.log('manifestpath :' + manifestPath)
        parseManifest(manifestPath, configPath)
    })
    .catch(function (error) {
        console.error(error)
    });
    
}

/**
 * 反编译 APK
 * @param {*} apkfile
 */
function decompile(apkfile) {
    console.log("decompile file :" + apkfile)
    return new Promise(function(resolve, reject) {
        targetDir = path.dirname(apkfile) + '/' + parsedPath.name
        console.log("targetDir :" + targetDir)
        fileName = parsedPath.base
        console.log("file :" + targetDir)

        child_process.exec('apktool d -o ' + targetDir + ' -f ' + apkfile, function(error, stdout, stderr) {
            if (error) {
                reject(error);
            }else {
                resolve("successed.");                
            }
        })
    });
}

/**
 * 重编译 APK
 * @param {*} path 
 */
function recompile(path) {
    return new Promise(function (resolve, reject) {
        var newApk = targetDir+'/dist/' + parsedPath.name + '-' + channelName + '.apk'
        console.log('recompile :' + newApk)
        child_process.execSync('apktool b ' + path + ' -o ' + newApk);
        signAPK(newApk, targetDir+'/dist/' + parsedPath.name + '-' + channelName + '-signed.apk')
    })
}

/**
 * APK 签名
 * @param {apk 路径} apk
 * @param {生成 APK 路径} dest 
 */
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

/**
 * 解析 Manifest 文件, 根据配置文件修改 Manifest.xml 中的对应字段值
 * @param {maifest 路径} manifestPath 
 * @param {配置文件路径} configPath 
 */
function parseManifest(manifestPath, configPath) {
    console.log("parseManifest ...", targetFile)
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

    //Iterate all configs.
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
