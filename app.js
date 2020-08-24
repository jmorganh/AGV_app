
document.addEventListener('deviceready', function onDeviceReady() {
  console.log('DEVICE IS READY  ---- angular.bootstrap');
    angular.bootstrap(document, ['BluKee']);
}, false);


if('serviceWorker'in navigator) {
    window.addEventListener('load', () =>{
        navigator.serviceWorker.register('service-worker.js')
        .then(registration =>{
            console.log('service worker is registered', registration);
        })
        .catch(err => {
            console.error('Registration failed', err
            )
        })
    });
}

var app = angular.module('BluKee', ['ui.router']);

app.config( function( $provide, $stateProvider, $urlRouterProvider, $compileProvider) {
  $stateProvider
  .state('splash', {
    url: '/splash',
    views: {
        'contentMain': {templateUrl: 'view/splash/splash.html'}
    }})
  .state('home', {
    url: '/',
    views: {
        'contentMain': {templateUrl: 'view/home/home.html', controller: 'HomeController'}
    }});
        // var currentImgSrcSanitizationWhitelist = $compileProvider.imgSrcSanitizationWhitelist();
        // var newImgSrcSanitizationWhiteList = currentImgSrcSanitizationWhitelist.toString().slice(0,-1)
        // + '|chrome-extension:|data:image|https?:'
        // +currentImgSrcSanitizationWhitelist.toString().slice(-1);
        //
        // $compileProvider.imgSrcSanitizationWhitelist(newImgSrcSanitizationWhiteList);
  $urlRouterProvider.otherwise("home");
});

app.controller('HomeController', function ($scope, $rootScope, $window, FLIDevice) {

  window.scope = $scope;

  $scope.FLIDevice = FLIDevice;

  $scope.d = {};

  $scope.d.name = "bluetooth device";
  
  $scope.connectBluetooth = function() {
    var $target = document.getElementById('target');
  

    if (!('bluetooth' in navigator)) {
      $target.innerText = 'Bluetooth API not supported.';
      return;
    }

    navigator.bluetooth.requestDevice({
      filters: [{namePrefix: 'HMSoft'}]
      })
      .then(device => {
          // Human-readable name of the device.
          console.log(device.name);
          $scope.d.name = device.name;
          console.log(device.id);
          $scope.d.address = device;
          // Attempts to connect to remote GATT Server.
          return device.gatt.connect();
      })
      .then(server => { /* ... */ })
      .catch(error => { console.error(error);
    });
  }

});


app.run(function($state, $rootScope, $timeout) {

$state.transitionTo('splash');

$timeout(function() {
     $state.go('home');
   }, 2000);


var loginOptions = {
  'scopes': 'profile email', // optional, space-separated list of scopes, If not included or empty, defaults to `profile` and `email`.
  'webClientId': '400876556290-dc0g5dc8us5r2f7u7fanj3nqjohim8si.apps.googleusercontent.com', // optional clientId of your Web application from Credentials settings of your project - On Android, this MUST be included to get an idToken. On iOS, it is not required.
  'offline': true, // optional, but requires the webClientId - if set to true the plugin will also return a serverAuthCode, which can be used to grant offline access to a non-Google server
};

var successLoginHandler = function (obj) {
  $state.transitionTo('home');
  $rootScope.user = obj;
  console.log(JSON.stringify(obj)); // do something useful instead of alerting
};

       $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {

            // if (toState.authenticate && !AuthService.isAuthenticated()){
            //   // User isn’t authenticated
            //   console.log('User not authenticated, goto login screen.');
            //   $state.transitionTo("login");
            //   event.preventDefault();
            // }
            // $rootScope.state = toState.name;

       });
});



function toUTF8Array(str) {
  if(typeof str === 'object') return str;

    var utf8 = [];
    for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6),
                      0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12),
                      0x80 | ((charcode>>6) & 0x3f),
                      0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
            i++;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                      | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >>18),
                      0x80 | ((charcode>>12) & 0x3f),
                      0x80 | ((charcode>>6) & 0x3f),
                      0x80 | (charcode & 0x3f));
        }
    }
    return utf8;
}


app.factory('FLIDevice', function ($timeout, $interval) {

  var FLIDevice = {}
  var service = {devices:{}}
  service.scan = function(){
      var params = {
        request:true,
        allowDuplicates: true,
        time: 10000
      };
      console.log("Start Scan: " + JSON.stringify(params));

    };

  var addDevice = function(device){
      if(service.devices[device.address]){
        device.connected = false;
        return;
      }
      service.devices[device.address] = device;
      console.log('ok, allow connection to '+device.name);
  };

  service.setTime = function(device){

    var address = device.address;
    var date = new Date();
    var month = date.getMonth()+1;
    var day = date.getDay();
    var year = date.getYear()-100;
    service.sendIt(address, "<set date "+month+" "+day+" "+year+">");

    var hours = date.getHours();
    var mins = date.getMinutes();
    service.sendIt(address, "<set time "+hours+" "+mins+" 01>");
  }

  service.sendIt = function(address, bytes, responseRequest){
            console.log("SENDING -- "+JSON.stringify(bytes));
            var encodedString = bluetoothle.bytesToEncodedString(toUTF8Array(bytes));
            var params = {
              value: encodedString,
              service:"ffe0",
              characteristic:"ffe1",
              address:address
            };

            if(!responseRequest) params.type = "noResponse";
            console.log('write...'+ JSON.stringify(params));

            return $cordovaBluetoothLE.write(params).then(function(result){
              console.log('write success!!!!!'+ JSON.stringify(result));
            }, function(result){
              if(result.error == "isNotConnected"){
                //Not Connected, we should remove out object
                service.devices[result.address].connected = false;

                $cordovaBluetoothLE.close({address:address});
              }
              console.log('write FAILED!!!!!'+ JSON.stringify(error));

            });
  };

  service.disconnect = function(device){
    return $cordovaBluetoothLE.disconnect({address: device.address}).then(function(){
      device.connected = false;
      $cordovaBluetoothLE.close({address:device.address});
    });
  };

  service.connect = function(device){

        console.log("Connect To Device: " + JSON.stringify(device));
        var params = {address: device.address, timeout: 10000};

        console.log("Connect : " + JSON.stringify(params));

      return $cordovaBluetoothLE.connect(params).then(null, function(obj) {
        console.log("Connect Error : " + JSON.stringify(obj));
        //$rootScope.close(address); //Best practice is to close on connection error
      }, function(obj) {
        console.log("Connect Success : " + JSON.stringify(obj));

        device.connected = true;

        return $cordovaBluetoothLE.discover({
            address: device.address
          }).then(function(result){
              console.log('Discover ' + JSON.stringify(result));

              console.log('SUBSCRIBE ON ALL DISCOVERED DEVICES')
              device.disover = result;
              service.subscribe(device);
          });
      });
  };

  service.subscribe = function(device){
      var address = device.address;
      var params = {
        service:"ffe0",
        characteristic:"ffe1",
        address:address
      };

      bluetoothle.subscribe(function(result){
        if(result.status == "subscribedResult" && result.value){
          var value = window.atob(result.value)
          device.lastMessage = value;

          console.log(value);

        }else{
          console.log('connected....?')
        }
      },function(result){
        console.log('err',result);
      },params);

  };

  service.gotoPosition = function(device, position){
    //range zero to 650
    if(position > 100) position = 100;
    var newPos = (position * 6.5).toFixed(0)
    service.sendIt(device.address,"<set pos "+newPos+">");
  };


  service.setPositionHome = function(device){
    service.sendIt(device.address,"<set poshome>");
  };








////

service.openCloseA = function(device){
  service.writeRelay(device.address, 0x04);
  setTimeout(function(){ service.writeRelay(device.address, 0x06); }, 500);
};

service.openCloseB = function(device){
  service.writeRelay(device.address, 0x05);
  setTimeout(function(){ service.writeRelay(device.address, 0x07); }, 500);
};

service.passCode = "12345678";
service.newCode = "12345678";

service.changeCode = function(address, passCode, newCode){
  if(newCode.length != 8) {
    console.log('bad code length!'); return;
  }
  service.passCode = passCode;
  service.newCode = newCode;
  var bytes = [0xC5,
    0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38,
    0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38,
    0xAA];
    for(var i=0; i < service.passCode.length; i++){
      bytes[i+1] = service.passCode.charCodeAt(i);
    }
    for(var i=0; i < service.newCode.length; i++){
      bytes[i+9] = service.newCode.charCodeAt(i);
    }
    return service.sendIt(address, bytes).then(function(){
      console.log('SUCCESSFULLY CHANGED CODE FROM '+passCode+' TO '+newCode);
      service.passCode = service.newCode;
    });
};

service.writeRelay = function(address, command){

  console.log('write relay request '+address+' '+command);
  var bytes = [0xC5, command, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0xAA];
  for(var i=0; i < service.passCode.length; i++){   bytes[i+2] = service.passCode.charCodeAt(i);   }
  console.log("Passcode replaced Now send to Relay -- "+JSON.stringify(bytes));
  return service.sendIt(address, bytes);
};

////



  return service;
});

function readBatteryLevel() {
  

  // navigator.bluetooth.requestDevice({
  //     filters: [{
  //       services: ['battery_service']
  //     }]
  //   })
  //   .then(function (device) {
  //     return device.gatt.connect();
  //   })
  //   .then(function (server) {
  //     return server.getPrimaryService('battery_service');
  //   })
  //   .then(function (service) {
  //     return service.getCharacteristic('battery_level');
  //   })
  //   .then(function (characteristic) {
  //     return characteristic.readValue();
  //   })
  //   .then(function (value) {
  //     $target.innerHTML = 'Battery percentage is ' + value.getUint8(0) + '.';
  //   })
  //   .catch(function (error) {
  //     $target.innerText = 'error found in catch -- ' + error;
  //   });
  };



//install button for PWA app
  let deferredPrompt;
  const addBtn = document.querySelector('.add-button');
  addBtn.style.display = 'none';

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can add to home screen
    addBtn.style.display = 'block';

    addBtn.addEventListener('click', (e) => {
      // hide our user interface that shows our A2HS button
      addBtn.style.display = 'none';
      // Show the prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
          } else {
            console.log('User dismissed the A2HS prompt');
          }
          deferredPrompt = null;
        });
    });
  });
