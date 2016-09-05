import * as PiStation from "../../node_modules/pistation-definitions/PiStation";
import {Observable} from 'rxjs/Rx';
import {Module} from "../../app/module";
import {Server} from "../../app/server";
import {StoreReadData} from "../../app/server";
// import * as Hue from "node_modules/node-hue-api";

var hue = require("node-hue-api");

interface IBridge {
    id:string;
    ipaddress:string;
}
interface INupnpBridge extends IBridge {
    name:string;
    mac:string;
}
interface IHueConnection {
    username:string;
    ipaddress:string;
}
interface ILight {
    id:string;
    state: {
        on:boolean;
    };
}

export class HueModule extends Module {
    static moduleId:string;
    private storeReadStream:Rx.Observable<StoreReadData>;
    private hueApi;
    private lightState;
    private availableLights;


    constructor(private server:Server) {
        super('HueModule');
        this.storeReadStream = server.createModuleStoreReadStream(this);
        let foundBridgesStream = this.searchBridges();
        foundBridgesStream.subscribe((bridges:IBridge[]) => {

            let searchBridgesFunction = new PiStation.Function('registerBridge', [
                new PiStation.ArgumentMultiple({
                    key: 'bridge',
                    label: 'Bridge',
                    options: bridges.map((bridge) => {
                        return {key:bridge.ipaddress, value:bridge.ipaddress}
                    }),
                    required: true,
                })
            ]);
            this.addFunction(searchBridgesFunction);
            console.log('Search Bridges Function:', searchBridgesFunction);
        });
        this.hueApi = new hue.HueApi();
        this.getAvailableBridges().subscribe((connection:IHueConnection) => {
                this.hueApi = new hue.HueApi(connection.ipaddress, connection.username)
                this.lightState = hue.lightState;
                console.log('connection', connection);
            },
            () => {
                console.log('Connection search completed');
            });

        let activeLights = this.getLights();

        activeLights.subscribe((lights: any) => {
            console.log('active lights', lights);
            let toggleLights = new PiStation.Function('toggleLights', [
                new PiStation.ArgumentMultiple({
                    key: 'light',
                    label: 'Toggle',
                    options: lights.lights.map((light) => {
                        return {key: light.id, value: light.state.on}
                    }),
                    required: true,
                })
            ]);
            this.addFunction(toggleLights);
        });
    }

    private getLights() {
        let activeLights = this.getAvailableBridges().flatMap((connection: IHueConnection) => {
            return this.getLightsStream();
        });
        activeLights.forEach((lights) => {
            this.availableLights = lights.lights;
        });
        return activeLights;
    }

    public searchBridges() {
        let slowBridgeSearch = Observable.fromPromise(hue.upnpSearch());
        let fastBridgeSearch = Observable.fromPromise(hue.nupnpSearch())
            .filter((bridge:IBridge[]) => bridge.length >= 1);

        return fastBridgeSearch
            .merge(slowBridgeSearch)
            .first();
    }

    private getLightsStream() {
        return Observable.fromPromise(this.hueApi.lights());
    }

    private getAvailableBridges() {
        let ipaddress = this.storeReadStream
            .filter((storeItem:StoreReadData) => storeItem.key == 'ipaddress')
            .map((ipaddress) => ipaddress.value);
        let username = this.storeReadStream
            .filter((storeItem:StoreReadData) => storeItem.key == 'username')
            .map((username) => username.value);

        let bridgeConfig = ipaddress.combineLatest(username, (ipaddress, username) => {
            return <IHueConnection>{ipaddress: ipaddress, username: username}
        }).take(1);
       return bridgeConfig;
    }

    private registerBridge(args:any) {
        console.log('searchBridgesArgs', args.bridge);
        let functionOutputStream = Observable.from([{'value': 'Press link button'}]);
        let bridgeRegisterTryout = Observable.interval(1000)
            .flatMap(() => Observable.fromPromise(this.hueApi.registerUser(args.bridge, 'Random Username')))
            .retry()
            .first()
            .takeUntil(Observable.timer(10000))
            .map((username) => {
                return {'value': username};
            });
        bridgeRegisterTryout.subscribe((username) => {
            this.saveBridgeConfig(username, args.bridge);
        });
        return functionOutputStream.merge(bridgeRegisterTryout);
    }

    private saveBridgeConfig(username, ipaddress) {
        let moduleStore = this.server.getModuleStore(this);
        this.hueApi = new hue.HueApi(ipaddress, username.value);
        moduleStore.put('username', username.value);
        moduleStore.put('ipaddress', ipaddress);
    }

    private toggleLights(lightArgs) {
        console.log('lightId: ', lightArgs.light);
        let light = this.getLightsStream()
            .map((lightsArray:any) => <ILight[]>lightsArray.lights)
            .first();
        light.subscribe((lights:ILight[]) => {
            let light = lights.filter((light) => light.id == lightArgs.light)[0];
            console.log('Staat het licht aan?', light);
            this.hueApi.setLightState(lightArgs.light,
                (light.state.on?this.lightState.create().turnOff():this.lightState.create().turnOn()));
        });
    }
}
