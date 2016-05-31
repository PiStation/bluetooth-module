"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var PiStation = require("../../../node_modules/pistation-definitions/PiStation.ts");
var Rx_1 = require('rxjs/Rx');
var module_1 = require("../../../app/module");
var Dummy = (function (_super) {
    __extends(Dummy, _super);
    function Dummy() {
        _super.call(this, 'Dummy');
        var dummyFunction = new PiStation.Function('powerControl', [new PiStation.Argument('enabled', 'bool')]);
        this.addFunction(dummyFunction);
    }
    Dummy.prototype.powerControl = function (args) {
        console.log("Called Dummy Function with arguments " + args);
        var dummyFunctionUpdates = Rx_1.Observable
            .interval(500)
            .timeInterval()
            .take(3);
        return dummyFunctionUpdates;
    };
    return Dummy;
}(module_1.Module));
exports.Dummy = Dummy;
//# sourceMappingURL=dummy.module.js.map