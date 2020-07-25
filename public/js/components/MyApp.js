'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const AppActions = require('../actions/AppActions');
const AppStatus = require('./AppStatus');

const DisplayError = require('./DisplayError');
const DisplayUser = require('./DisplayUser');
const DisplayURL = require('./DisplayURL');
const DisplaySelectDevice = require('./DisplaySelectDevice');

const Finder = require('./Finder');
const Devices = require('./Devices');

const cE = React.createElement;

class MyApp extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.props.ctx.store.getState();
    }

    componentDidMount() {
        if (!this.unsubscribe) {
            this.unsubscribe = this.props.ctx.store
                .subscribe(this._onChange.bind(this));
            this._onChange();
        }
    }

    componentWillUnmount() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    _onChange() {
        if (this.unsubscribe) {
            this.setState(this.props.ctx.store.getState());
        }
    }

    render() {
        const service = this.state.config.serviceECG || '?';
        const charECG = this.state.config.charECG || '?';
        const title = `${service}/${charECG}  (Service/Charact)`;

        return cE('div', {className: 'container-fluid'},
                  cE(DisplayError, {
                      ctx: this.props.ctx,
                      error: this.state.error
                  }),
                  cE(DisplayUser, {
                      ctx: this.props.ctx,
                      selectedDevice: this.state.selectedDevice,
                      sensorsValues: this.state.sensorsValues,
                      displayUser: this.state.displayUser
                  }),
                  cE(DisplayURL, {
                      ctx: this.props.ctx,
                      selectedDevice: this.state.selectedDevice,
                      displayURL: this.state.displayURL
                  }),
                  cE(DisplaySelectDevice, {
                      ctx: this.props.ctx,
                      devices: this.state.devices,
                      selectedDevice: this.state.selectedDevice,
                      displaySelectDevice: this.state.displaySelectDevice
                  }),
                  cE(rB.Panel, null,
                     cE(rB.Panel.Heading, null,
                        cE(rB.Panel.Title, null,
                           cE(rB.Grid, {fluid: true},
                              cE(rB.Row, null,
                                 cE(rB.Col, {sm:1, xs:1},
                                    cE(AppStatus, {
                                        isClosed: this.state.isClosed
                                    })
                                   ),
                                 cE(rB.Col, {
                                     sm: 5,
                                     xs:10,
                                     className: 'text-right'
                                 }, 'Healthypi'),
                                 cE(rB.Col, {
                                     sm: 5,
                                     xs:11,
                                     className: 'text-right'
                                 }, this.state.fullName)
                                )
                             )
                          )
                       ),
                     cE(rB.Panel.Body, null,
                        cE(rB.Panel, null,
                           cE(rB.Panel.Heading, null,
                              cE(rB.Panel.Title, null, title)
                             ),
                           cE(rB.Panel.Body, null,
                              cE(Finder, {
                                  ctx: this.props.ctx,
                                  inIFrame: this.state.inIFrame,
                                  daemon: this.state.daemon,
                                  devices: this.state.devices
                              })
                             )
                          ),
                        cE(rB.Panel, null,
                           cE(rB.Panel.Heading, null,
                              cE(rB.Panel.Title, null, 'Connected Devices')
                             ),
                           cE(rB.Panel.Body, null,
                              cE(Devices, {
                                  ctx: this.props.ctx,
                                  selectedDevice: this.state.selectedDevice
                              })
                             )
                          )
                       )
                    )
                 );
    }
};

module.exports = MyApp;
