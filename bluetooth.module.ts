import * as PiStation from "../../node_modules/pistation-definitions/PiStation";
import * as Rx from 'rxjs/Rx';
import {Module} from "../../app/module";
import {Server} from "../../app/server";
import {StoreReadData} from "../../app/server";


export class BluetoohModule extends Module {
    private noble: any;
    private availableDevices: any[];


    constructor(private server:Server) {
        super('BleutoothModule');
        this.noble = require('noble');
        // nobleStateChanged('stateChange').subscribe((event)=>{
        //     console.log('test', event);
        // }, (error)=>{
        //     console.log('errors', error)
        // }, ()=> console.log('complete'));

        let stateChangeEvent = this.on('stateChange');
        let isPoweredOn = stateChangeEvent.filter((state)=> state === 'poweredOn');
        let isPoweredOff = stateChangeEvent.filter((state)=> state === 'poweredOff');
        isPoweredOff.do(()=> this.noble.stopScanning());

        let nobleSearchStart = this.on('scanStart').takeUntil(isPoweredOff);
        let nobleSearchStop = this.on('scanStop');
        isPoweredOn.subscribe((data)=> console.log('isPoweredOn', data));
        nobleSearchStart.map((search) => {
            console.log('search', search)
        });
        let discoveredDevices = this.on('discover')
            .bufferTime(5000)
            .first();

        discoveredDevices.subscribe((devices: any[]) => {
            this.availableDevices = devices;
            let connectBluetoothButton = new PiStation.Function('connectBluetooth', [
                new PiStation.ArgumentMultiple({
                    key: 'connectBluetooth',
                    label: 'Connect Bluetooth',
                    options: devices.map((device) => {
                        return {key:device.uuid, value:`${device.advertisement.localName} ${device.rssi}`}
                    }),
                    required: true,
                })
            ]);
            this.addFunction(connectBluetoothButton);
            console.log('Connect bluetooth button: ', connectBluetoothButton);

            console.log(devices[0]);
        });
        isPoweredOn.subscribe((state) => {
           console.log('noble state: ', state);
            this.noble.startScanning();
        });
        nobleSearchStart.subscribe((event) => {
            console.log('noble Search Start: ', event);
        });
        nobleSearchStop.subscribe((event) => {
            console.log('noble Search Stop: ', event);
        });
    }

    private on(event : string) {
        console.log(1);
        return  Rx.Observable.create((observer : Rx.Observer<string>)=> {
            this.noble.on(event, (stateChange : string)=> {
                observer.next(stateChange);
            })
        });
    }

    private connectBluetooth(args) {
        let device = this.availableDevices.filter((device) => device.uuid === args.connectBluetooth)[0];
        device.connect((error) => {
            console.log('connected to peripheral: ' + device.uuid);
            device.discoverServices(null, (error, services) => {
                services[0].discoverCharacteristics(null, (error, characteristics) => {
                    console.log(characteristics[1]);
                    characteristics[1].on('read', (data, isNotification) => {
                        // data is a buffer
                        console.log('Data', data);
                        console.log('Notification? ', isNotification);
                    });
                    characteristics[1].notify(true, (error) => {
                        console.log('notify on.');
                    });
                })
            });
        });
        return console.log('button clicked', device);
    }
}
