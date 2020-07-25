'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const cE = React.createElement;
const AppActions = require('../actions/AppActions');
const ECG = require('./ECG');

class Device extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        const temp = typeof this.props.sensorsValues.temp === 'number' ?
              this.props.sensorsValues.temp :
              '?';
        const heartRate =
              typeof this.props.sensorsValues.heartRate === 'number' ?
              (this.props.sensorsValues.heartRate === -1 ? '?' :
               this.props.sensorsValues.heartRate) :
              '?';
        const oximetry = typeof this.props.sensorsValues.oximetry === 'number' ?
              this.props.sensorsValues.oximetry :
              '?';

        const ecg = typeof this.props.sensorsValues.ecg === 'object' ?
              this.props.sensorsValues.ecg :
              {};

        return cE(rB.Form, {horizontal: true},
                  cE(rB.FormGroup, {controlId: 'deviceId'},
                     cE(rB.Col, {componentClass:rB.ControlLabel, sm: 3, xs: 12},
                        'Device ID'),
                     cE(rB.Col, {sm: 3, xs: 12},
                        cE(rB.FormControl.Static, null,
                           this.props.selectedDevice.id)
                       ),
                     cE(rB.Col, {componentClass:rB.ControlLabel, sm: 3, xs: 12},
                        'Advertisement'),
                     cE(rB.Col, {sm: 3, xs: 12},
                        cE(rB.FormControl.Static,
                           {style: {wordWrap: "break-word"}},
                           JSON.stringify(this.props.selectedDevice.ad))
                       )
                    ),
                  cE(rB.FormGroup, {controlId: 'tempId'},
                     cE(rB.Col, {componentClass:rB.ControlLabel,
                                 sm: 4, xs: 6},
                        'Temperature (Celsius)'),
                     cE(rB.Col, {sm: 2, xs: 4},
                        cE(rB.FormControl.Static, null, temp)
                       )
                    ),
                  cE(rB.FormGroup, {controlId: 'oxId'},
                     cE(rB.Col, {componentClass:rB.ControlLabel,
                                 sm: 4, xs: 6},
                        'SpO2 (%)'),
                     cE(rB.Col, {sm: 2, xs: 4},
                        cE(rB.FormControl.Static, null, oximetry)
                       )
                    ),
                  cE(rB.FormGroup, {controlId: 'heartId'},
                     cE(rB.Col, {componentClass:rB.ControlLabel,
                                 sm: 4, xs: 6},
                        'Heart Rate (bpm)'),
                     cE(rB.Col, {sm: 2, xs: 4},
                        cE(rB.FormControl.Static, null, heartRate)
                       )
                    ),
                  cE(rB.FormGroup, {controlId: 'ecg'},
                     cE(rB.Col, {sm: 12, xs: 12},
                        cE(ECG, {
                            ctx: this.props.ctx,
                            ecg: ecg
                        })
                       )
                    )
                 );
    }
};

module.exports = Device;
