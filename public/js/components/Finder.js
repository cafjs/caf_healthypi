'use strict';

const React = require('react');
const rB = require('react-bootstrap');
const cE = React.createElement;
const AppActions = require('../actions/AppActions');
const url = require('url');

class Finder extends React.Component {

    constructor(props) {
        super(props);
        this.handleDaemon = this.handleDaemon.bind(this);
        this.doFind = this.doFind.bind(this);
    }

    handleDaemon(e) {
        const spawnDaemon = () => {
            if (typeof window !== 'undefined') {
                const parsedURL = url.parse(window.location.href);
                delete parsedURL.search; // no cache
                parsedURL.hash = parsedURL.hash.replace('session=default',
                                                        'session=standalone');
                window.open(url.format(parsedURL));
            }
        };

        const daemon = this.props.daemon;

        AppActions.setBrowserDaemon(this.props.ctx, e);

        if (e && this.props.inIFrame) {
            // Web Bluetooth API does not work in a cross-origin iframe
            !daemon && spawnDaemon();
        }
    }

    doFind() {
        AppActions.setLocalState(this.props.ctx, {displaySelectDevice: true});
        AppActions.findDevices(this.props.ctx);
    }

    render() {
        const getURL = () => {
            if ((typeof window !== 'undefined') && window.location) {
                const parsedURL = url.parse(window.location.href);
                delete parsedURL.search; // no cache
                parsedURL.pathname = 'index-iot.html';
                return url.format(parsedURL);
            } else {
                // server-side rendering
                return null;
            }
        };

        // with a browser-based daemon, restart the daemon to `find()` again
        const disableFind = this.props.daemon &&
                  (this.props.inIFrame ||
                   (this.props.devices &&
                    (Object.keys(this.props.devices).length > 0))
                  );
        return cE(rB.Form, {horizontal: true},
                  cE(rB.FormGroup, {controlId: 'findControlId'},
                     cE(rB.Col, {sm:6, xs: 12},
                        cE(rB.ControlLabel, null, 'Browser Daemon')
                       ),
                     cE(rB.Col, {sm:6, xs: 12},
                        cE(rB.ToggleButtonGroup, {
                            type: 'radio',
                            name : 'daemon',
                            value: this.props.daemon,
                            onChange: this.handleDaemon
                        },
                           cE(rB.ToggleButton, {value: 0}, 'Off'),
                           cE(rB.ToggleButton, {value: 1}, 'On')
                          )
                       )
                    ),
                   cE(rB.FormGroup, {controlId: 'findControl2Id'},
                      cE(rB.Col, {sm:6, xs: 12},
                         cE(rB.ControlLabel, null, 'Start Search')
                        ),
                      cE(rB.Col, {sm:6, xs: 12},
                         cE(rB.Button, {
                             bsStyle: 'danger',
                             onClick: this.doFind,
                             disabled: !!disableFind
                         }, 'Find')
                        )
                     ),
                  this.props.daemon  && (typeof window !== 'undefined') &&
                  !this.props.inIFrame ?
                  cE(rB.FormGroup, {controlId: 'iframeId'},
                     cE('iframe', {
                         // disable top-navigation
                         sandbox: 'allow-same-origin allow-popups ' +
                             'allow-scripts allow-forms allow-pointer-lock',
                         frameBorder: 8,
                         style: {maxHeight: '85px'},
                         src: getURL()
                     }, null)) :
                  cE('div', null)
                 );
    }
}

module.exports = Finder;
