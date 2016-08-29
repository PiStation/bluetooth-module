import * as PiStation from "../../node_modules/pistation-definitions/PiStation";
import {Observable} from 'rxjs/Rx';
import {Module} from "../../app/module";
import {Server} from "../../app/server";
import {StoreReadData} from "../../app/server";
// import * as Hue from "node_modules/node-hue-api";

var hue = require("node-hue-api");
let hueApi = new hue.HueApi();

interface IBridge {
    id:string;
    ipaddress:string;
}
interface INupnpBridge extends IBridge {
    name:string;
    mac:string;
}

export class HueModule extends Module {
    static moduleId:string;

    constructor(private server:Server) {
        super('HueModule');
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
            console.log('kankerlijer', searchBridgesFunction);
        });


    }

    public searchBridges() {
        let slowBridgeSearch = Observable.fromPromise(hue.upnpSearch());
        let fastBridgeSearch = Observable.fromPromise(hue.nupnpSearch())
            .filter((bridge:IBridge[]) => bridge.length >= 1);

        return fastBridgeSearch
            .merge(slowBridgeSearch)
            .first()
    }

    private registerBridge(args:any) {
        console.log('searchBridgesArgs', args);
        return Observable.fromPromise(hueApi.registerUser(args.bridge, 'Sjaak'));
    }
}
