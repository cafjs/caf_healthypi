'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const cE = React.createElement;
const AppActions = require('../actions/AppActions');
const ECG = require('./ECG');

class DisplayUser extends React.Component {

    constructor(props) {
        super(props);
        this.doDismissUser = this.doDismissUser.bind(this);
    }

    doDismissUser(ev) {
        AppActions.setLocalState(this.props.ctx, {displayUser: false});
    }

    render() {
        const id = (this.props.selectedDevice &&
                    this.props.selectedDevice.id) || 'None';
        const title = `Device: ${id}`;

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

        return cE(rB.Modal, {show: !!this.props.displayUser,
                             onHide: this.doDismissUser,
                             animation: false},
                  cE(rB.Modal.Header, {
                      className : 'bg-warning text-warning',
                      closeButton: true},
                     cE(rB.Modal.Title, null, title)
                    ),
                  cE(rB.ModalBody, null,
                     cE(rB.Form, {horizontal: true},
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
                       )
                    ),
                  cE(rB.Modal.Footer, null,
                     cE(rB.Button, {onClick: this.doDismissUser}, 'Continue')
                    )
                 );
    }
};

module.exports = DisplayUser;
