'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const cE = React.createElement;
const AppActions = require('../actions/AppActions');

class DisplaySelectDevice extends React.Component {

    constructor(props) {
        super(props);
        this.doDismissSelectDevice = this.doDismissSelectDevice.bind(this);
        this.handleSelect = this.handleSelect.bind(this);
    }

    doDismissSelectDevice(ev) {
        AppActions.setLocalState(this.props.ctx, {displaySelectDevice: false});
    }

    handleSelect(selectedKey) {
        const devices = Object.keys(this.props.devices || {}).sort();
        const deviceAd = this.props.devices[devices[selectedKey]].advertisement;
        AppActions.connect(this.props.ctx, devices[selectedKey], deviceAd);
        this.doDismissSelectDevice();
    }

    updateDevices() {
        const devices = Object.keys(this.props.devices || {}).sort();
        return devices.map((x, i) => {
            const adv = this.props.devices[x].advertisement;
            return cE(rB.NavItem, {eventKey: i, key: 6723*i + 5},
                      cE(rB.Form, {horizontal: true},
                        cE(rB.FormGroup, {controlId: 'deviceInfoId'},
                           cE(rB.Col, {componentClass:rB.ControlLabel,
                                       sm: 4, xs: 12},
                              'Device ID'),
                           cE(rB.Col, {sm: 8, xs: 12},
                              cE(rB.FormControl.Static, null, x)
                             )
                          ),
                         cE(rB.FormGroup, {controlId: 'adId'},
                            cE(rB.Col, {componentClass:rB.ControlLabel,
                                       sm: 4, xs: 12},
                               'Advertisement'),
                            cE(rB.Col, {sm: 8, xs: 12},
                               cE(rB.FormControl.Static,
                                  {style: {wordWrap: "break-word"}},
                                  JSON.stringify(adv))
                              )
                           )
                        )
                     );
        });
    }

    render() {
        const show = this.props.displaySelectDevice &&
                  (!this.props.selectedDevice) && this.props.devices &&
                  (Object.keys(this.props.devices).length > 0);

        return cE(rB.Modal, {show: show,
                             onHide: this.doDismissSelectDevice,
                             animation: false},
                  cE(rB.Modal.Header, {
                      className : 'bg-warning text-warning',
                      closeButton: true},
                     cE(rB.Modal.Title, null, 'Click to Connect')
                    ),
                  cE(rB.ModalBody, null,
                     cE(rB.Nav, {bsStyle: 'pills', stacked: true,
                                 onSelect: this.handleSelect},
                        this.updateDevices())
                    ),
                  cE(rB.Modal.Footer, null,
                     cE(rB.Button, {onClick: this.doDismissSelectDevice},
                        'Dismiss')
                    )
                 );
    }
};

module.exports = DisplaySelectDevice;
