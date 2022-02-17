const _ = require('lodash')

const PLUGIN_ID = 'signalk-generic-pgn-parser'
const PLUGIN_NAME = 'Generic PGN Parser'

module.exports = function(app) {
  var plugin = {};
  var n2kCallback

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = 'Allows users to parse PGNs that are not directly supported by SignalK.';

  plugin.schema = {
    type: "object",
    properties: {
      pgns: {
        type: "array",
        title: "PGNs",
        items: {
          type: "object",
          required: ['pgn', 'basePath'],
          properties: {
            pgn: {
              type: 'number',
              title: 'PGN',
              description: 'The PGN to parse.'
            },
            basePath: {
              type: 'string',
              title: 'Base Path',
              description: 'The path to map it to'
            },
            manufacturer: {
              type: 'string',
              title: 'Manufacturer',
              description: 'Optional: Used for proprietary PGNs.'
            },
            fields: {
              type: 'string',
              title: 'PGN fields',
              description: 'Comma seperated listed of data fields. If no fields are selected then all fields will be returned.'
            }
          }
        }
      }
    }
  }

  plugin.start = function(options) {

    n2kCallback = (msg) => {
      try {
        if (options.pgns && options.pgns.length > 0) {
          let fields = msg['fields']

          let details = options.pgns.find(({
            pgn
          }) => pgn === msg.pgn)

          if (details && (details.manufacturer == '' || details.manufacturer == fields['Manufacturer Code'])) {

            let instance = getInstance(fields, msg.src)

            if (!isNaN(parseInt(instance))) {
              let basePath = replace(details.basePath, fields, instance)

              let keys = []
              if (details.fields && details.fields.length > 0) {
                keys = details.fields.split(",").map(field => field.trim())
              } else {
                keys = Object.keys(fields)
              }

              handleDelta(fields, keys, basePath, msg.src, instance)
            } else {
              app.error('Instance not found for pgn ' + msg.pgn + ' source ' + msg.src)
            }
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    app.on("N2KAnalyzerOut", n2kCallback)
  }

  plugin.stop = function() {
    if (n2kCallback) {
      app.removeListener("N2KAnalyzerOut", n2kCallback)
      n2kCallback = undefined
    }
  }
  return plugin;

  function handleDelta(fields, keys, basePath, src, instance) {

    let values = (keys.map(key => ({
      "path": basePath + '.' + toCamelCase(key),
      "value": fields.hasOwnProperty(key) ? fields[key] : ''
    })))

    let delta = {
      "updates": [{
        "values": values
      }]
    }
    app.debug(JSON.stringify(delta))

    app.handleMessage(PLUGIN_ID, delta)
  }

  function replace(template, fields, instance) {
    //pull out the field name enclosed in {}
    let replacementArray = template.match(/{(.*?)}/ig)

    //if there is nothing to replace in the basePath
    if(replacementArray == null){
        return template;
    }

    for (let i = 0; i < replacementArray.length; i++) {
      let name = replacementArray[i].slice(1, -1)

      let value = ''
      if (fields.hasOwnProperty(name)) {
        value = toCamelCase(fields[name])
      } else if (name.includes('Instance')) {
        value = instance
      } else {
        value = ''
        app.error('replacement not found for field ' + name)
      }

      //replace all the occurences with the property value
      template = template.replace(new RegExp(replacementArray[i], 'g'), value)
    }
    return template;
  }

  function findValueByIncludes(object, search) {
    for (var property in object) {
      if (object.hasOwnProperty(property) &&
        property.toString().includes(search)) {
        return object[property]
      }
    }
    return false
  }

  function toCamelCase(input) {
    if (typeof input === 'string') {
      let regex = /[A-Z\xC0-\xD6\xD8-\xDE]?[a-z\xDF-\xF6\xF8-\xFF]+|[A-Z\xC0-\xD6\xD8-\xDE]+(?![a-z\xDF-\xF6\xF8-\xFF])|\d+/g
      let inputArray = input.match(regex)

      let result = ""
      for (let i = 0, len = inputArray.length; i < len; i++) {

        let currentStr = inputArray[i]
        let tempStr = currentStr.toLowerCase()

        if (i != 0) {
          tempStr = tempStr.substr(0, 1).toUpperCase() + tempStr.substr(1)
        }

        result += tempStr
      }

      return result
    } else {
      return input
    }
  }

  function getDeviceInstance(src) {
    app.debug('Looking for device instance of ' + src)
    const sources = app.getPath('/sources')
    let deviceInstance
    if (sources) {
      _.values(sources).forEach(v => {
        if (typeof v === 'object') {
          _.keys(v).forEach(id => {
            if (v[id] && v[id].n2k && v[id].n2k.src == src.toString()) {
              if (v[id].n2k.hasOwnProperty('deviceInstance')) {
                deviceInstance = v[id].n2k.deviceInstance
                app.debug('Found deviceInstance ' + deviceInstance)
              }
            }
          })
        }
      })
      return deviceInstance
    }
  }

  function getInstance(fields, src) {
    let instance = findValueByIncludes(fields, 'Instance')
    if (!isNaN(parseInt(instance))) {
      app.debug('Found data instance ' + instance)
      return instance
    } else {
      instance = getDeviceInstance(src)
      return instance
    }
  }
};
