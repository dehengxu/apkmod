# APKMod is developed for changing meta-data in AndroidManifest.xml

## It's more configurable

Use json file store configuration.

1. You can configure signing key and key password.
2. Work with config file, you can modify any meta-data with any value.

## requirements

You should install apktool.

## configuration

### sign

You can config `key`:key.jks, `password`:key password and `build-tools`'s version.

### meta-data

You can specify which `android:name` should replace new value or with default value.

## Example:

### init config.json

`apkmod --init`

This will create a config.json template in current path.


### modify config.json

```

{
    "sign": {
        "key":"./key.jks",
        "password":"000000",
        "build-tools":"26.0.3"
    },
    "meta-data": {
        "ch1-demo" : {
            "meta-data": [
                {"android:name":"UMENG_CHANNEL"},
                {"android:name":"MY_CHANNEL"}
            ]
        },
        "ch2-demo" : {
            "meta-data": [
                {"android:name":"UMENG_CHANNEL"},
                {"android:name":"MY_CHANNEL"}
            ]
        }
    }
}

```

### execute apkmod

`apkmod --config ./config.json --apk app-debug.apk`

or

`apkmod --apk app-debug.apk` use default config.json path which is your current path.


## future

I'll try to use both `yml` and `json` for configuring.