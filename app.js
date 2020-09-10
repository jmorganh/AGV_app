if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("./svcworker.js")
      .then(res => console.log("service worker registered"))
      .catch(err => console.log("service worker not registered", err))
  })
}

let deferredPrompt; // Allows to show the install prompt
const installButton = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", e => {
  console.log("beforeinstallprompt fired");
  // Prevent Chrome 76 and earlier from automatically showing a prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Show the install button
  installButton.hidden = false;
  installButton.addEventListener("click", installApp);
});

function installApp() {
     // Show the prompt
  deferredPrompt.prompt();
  installButton.disabled = true;

    // Wait for the user to respond to the prompt
  deferredPrompt.userChoice.then(choiceResult => {
    if (choiceResult.outcome === "accepted") {
      console.log("PWA setup accepted");
      installButton.hidden = true;
    } else {
      console.log("PWA setup rejected");
    }
    installButton.disabled = false;
    deferredPrompt = null;
  });
}

window.addEventListener("appinstalled", evt => {
  console.log("appinstalled fired", evt);
});

var ChromeSamples = {
  log: function() {
    var line = Array.prototype.slice.call(arguments).map(function(argument) {
      return typeof argument === 'string' ? argument : JSON.stringify(argument);
    }).join(' ');

    document.querySelector('#log').textContent += line + '\n';
  },

  clearLog: function() {
    document.querySelector('#log').textContent = '';
  },

  setStatus: function(status) {
    document.querySelector('#status').textContent = status;
  },

  setContent: function(newContent) {
    var content = document.querySelector('#content');
    while(content.hasChildNodes()) {
      content.removeChild(content.lastChild);
    }
    content.appendChild(newContent);
  }
};

let bleDevice = null;
let characteristicCache = null;
let readBuffer = '';

function onButtonClick() {
  log('Requesting Bluetooth Device...');
  navigator.bluetooth.requestDevice({filters:[
    {services: [0xFFE0]},         // notification (serial) service
    {namePrefix: 'HMSoft'}
  ]})
  .then(device => {
    log('> Name:      ' + device.name);
    log('> Id:        ' + device.id);
    log('> Connected: ' + device.gatt.connected);
    bleDevice = device;  // save/cache for later, device is re-used
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
    return connect();
  })
  .then(characteristic => startNotifications(characteristic))
  .catch(error => {
    log('Argh!1 ' + error);
  });
}

//  .then(characteristic => startNotifications(characteristic))

function connect() {
  if (bleDevice.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }
  log('Connecting to Bluetooth Device...');

  return bleDevice.gatt.connect()
  .then(server => {
    log('> GATT connected=' + bleDevice.gatt.connected + ', get services..');
        return server.getPrimaryService(0xFFE0);
      }).
      then(service => {
        log('Service found, getting characteristic...');

        return service.getCharacteristic(0xFFE1);
      }).
      then(characteristic => {
        log('Characteristic found');
        characteristicCache = characteristic;

        return characteristicCache;
  });
}
/*
function connectDeviceAndCacheCharacteristic(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');

  return device.gatt.connect().
      then(server => {
        log('GATT server connected, getting service...');

        return server.getPrimaryService(0xFFE0);
      }).
      then(service => {
        log('Service found, getting characteristic...');

        return service.getCharacteristic(0xFFE1);
      }).
      then(characteristic => {
        log('Characteristic found');
        characteristicCache = characteristic;

        return characteristicCache;
      });
} */

function startNotifications(characteristic) {
  log('Starting notifications...');

  return characteristic.startNotifications().
      then(() => {
        log('Notifications started');
        characteristic.addEventListener('characteristicvaluechanged',
            handleCharacteristicValueChanged);
      });
}

function handleCharacteristicValueChanged(event) {
  let value = new TextDecoder().decode(event.target.value);

  for (let c of value) {
    if (c === '\n') {
      let data = readBuffer.trim();
      readBuffer = '';

      if (data) {
        log(data, 'in');       // receive(data);
      }
    }
    else {
      readBuffer += c;
    }
  }
}

function sendIt(data) {
  data = String(data);

  if (!data || !characteristicCache) {
    return;
  }

  //data += '\n';

  if (data.length > 20) {
    let chunks = data.match(/(.|[\r\n]){1,20}/g);

    writeToCharacteristic(characteristicCache, chunks[0]);

    for (let i = 1; i < chunks.length; i++) {
      setTimeout(() => {
        writeToCharacteristic(characteristicCache, chunks[i]);
      }, i * 100);
    }
  }
  else {
    characteristicCache.writeValue(new TextEncoder().encode(data));
  }
  log(data, 'out');
}

function setIt(data) {    // read input field from DOM and build command
  data  = String(data);
  input = String(document.getElementById("inpVar").value);

  if (!data || !characteristicCache) {
    return;
  }

  if(data === "time")
    data = "<set time " + input + ">";
  else
    if(data === "position")
      data = "<set pos " + input + ">";

  characteristicCache.writeValue(new TextEncoder().encode(data));
  log(data, 'out');
}

function writeToCharacteristic(characteristic, data) {
  characteristic.writeValue(new TextEncoder().encode(data));
}

function onDisconnectButtonClick() {
  if (!bleDevice) {
    return;
  }
  log('Disconnecting from Bluetooth Device...');
  if (bleDevice.gatt.connected) {
    bleDevice.gatt.disconnect();
  } else {
    log('> Bluetooth Device is already disconnected');
  }
}

function onDisconnected(event) {
  // Object event.target is Bluetooth Device getting disconnected.
  log('> Bluetooth Device disconnected');
       // next ONLY if you want to try to auto-reconnect
/*  connectDeviceAndCacheCharacteristic(bleDevice).
    then(characteristic => startNotifications(characteristic)).
    catch(error => log(error));  */
}

function onReconnectButtonClick() {
  if (!bleDevice) {
    return;
  }
  if (bleDevice.gatt.connected) {
    log('> Bluetooth Device is already connected');
    return;
  }
  connect()
  .catch(error => {
    log('UhOh!1 ' + error);
  });
}

document.querySelector('#scan').addEventListener('click', function(event) {
  event.stopPropagation();
  event.preventDefault();

  if (isWebBluetoothEnabled()) {
    ChromeSamples.clearLog();
    onButtonClick();
  }
});

document.querySelector('#bye').addEventListener('click', function(event) {
  event.stopPropagation();
  event.preventDefault();

  if (isWebBluetoothEnabled()) {
    onDisconnectButtonClick();
  }
});
document.querySelector('#byebye').addEventListener('click', function(event) {
  event.stopPropagation();
  event.preventDefault();

  if (isWebBluetoothEnabled()) {
    onDisconnectButtonClick();
  }
});

document.querySelector('#reconnect').addEventListener('click', function(event){
  event.stopPropagation();
  event.preventDefault();

  if (isWebBluetoothEnabled()) {
    onReconnectButtonClick();
  }
});

log = ChromeSamples.log;
function isWebBluetoothEnabled() {
  if (navigator.bluetooth) {
    return true;
  } else {
    ChromeSamples.setStatus('Web Bluetooth API is not available.\n' +
        'Please make sure the "Experimental Web Platform features" flag is enabled.');
    return false;
  }
}
