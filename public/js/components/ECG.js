'use strict';

const React = require('react');
const cE = React.createElement;
const wglP = require('webgl-plot');
const WebGlPlot = wglP.default;

const N_SEC = 5;
const N_SAMPLES_PER_SEC = 125;
const N_SAMPLES = N_SAMPLES_PER_SEC * N_SEC;
const DELAY_IN_MSEC = 1000;
//const LOW_VALUE =  63000;//913;
//const AMPLITUDE_VALUE = 1000;//350;
const MAX_MIN_WINDOW = 6;

const calculateMinMax = function(values) {
    let max = 0;
    let min = 10000000;
    values.forEach((x) => {
        if (x < min) {
            min = x;
        };
        if (x > max) {
            max = x;
        }
    });
    return [min, max];
};

const updateMinMax = function(values, minArray, maxArray) {
    const [min, max] = calculateMinMax(values);
    minArray.push(min);
    if (minArray.length >  MAX_MIN_WINDOW) {
        minArray.shift();
    }

    maxArray.push(max);
    if (maxArray.length >  MAX_MIN_WINDOW) {
        maxArray.shift();
    }

    const [newMin] = calculateMinMax(minArray);
    const [ignore, newMax] = calculateMinMax(maxArray);
    return [newMin, newMax];
};

class ECG extends React.Component {

    constructor(props) {
        super(props);
        this.frameId = null;
        this.loop = this.loop.bind(this);
        this.values = [];
        this.index = -1;
        this.lastIndex = -1;
        this.canvasRef = React.createRef();
        this.lastCurrent = null;
        this.allMax = [];
        this.allMin = [];
    }

    initPlot() {
        this.lastCurrent = this.canvasRef.current;
        this.webglP = new WebGlPlot(this.canvasRef.current);
        const color = new wglP.ColorRGBA(1, 0, 0, 1);
        this.line = new wglP.WebglLine(color, N_SAMPLES);
        this.line.lineSpaceX(-1, 2 / N_SAMPLES);

        // from [0, 1] to [-1, 1]
        this.line.scaleY = 2;
        this.line.offsetY = -1;

        this.webglP.addLine(this.line);
    }

    componentDidMount() {
        if (this.canvasRef.current) {
            this.initPlot();
            this.startLoop();
        }
    }


    componentDidUpdate() {
        if (this.canvasRef.current &&
            (this.lastCurrent !== this.canvasRef.current)) {
            this.initPlot();
        }
    }

    componentWillUnmount() {
        this.stopLoop();
    }

    startLoop() {
        // TO DO: use performance.now() to avoid NTP drift
        this.nowStart = (new Date()).getTime();

        if (!this.frameId) {
            if (typeof window !== 'undefined') {
                this.frameId = window.requestAnimationFrame(this.loop);
            }
        }
    }

    stopLoop() {
        if (this.frameId) {
            if (typeof window !== 'undefined') {
                window.cancelAnimationFrame(this.frameId);
            }
            this.frameId = null;
        }
    }

    getSamples() {
        const traceStart = this.nowStart + DELAY_IN_MSEC;
        const timeToIndex = (t) =>
              Math.trunc((t-traceStart) * N_SAMPLES_PER_SEC/1000);
        const clip = (x) => x > 0 ? x : 0;

        const now = (new Date()).getTime();

        const start = clip(timeToIndex(now - N_SEC*1000));
        const end = clip(timeToIndex(now));

//        console.log('start:' + start + ' end:' + end + ' max:' +
//                    this.values.length);
        return this.values.slice(start, end);
    }

    loop() {
        const samples = this.getSamples();
        for (let i = 0; i < samples.length; i++) {
            this.line.setY(i, samples[i]);
        }
        this.webglP.update();
        if (typeof window !== 'undefined') {
            this.frameId = window.requestAnimationFrame(this.loop);
        }
    }

    updateTrace() {
        if ((typeof this.props.ecg.index === 'number') &&
            (this.props.ecg.index !== this.lastIndex)) { // remove duplicates
                this.lastIndex = this.props.ecg.index;
            const [min, max] = updateMinMax(this.props.ecg.values,
                                            this.allMin, this.allMax);
            const normValues = this.props.ecg.values
                  .map(x => (x - min) / (max - min));
            if (this.index + this.values.length === this.props.ecg.index) {
                // this leaks 40MB in 24h, but it is likely to reset before...
                this.values = this.values.concat(normValues);
            } else {
                // reset
                console.log('Resetting trace from ' + this.index + ' to ' +
                            this.props.ecg.index);
                this.values = normValues;
                this.index = this.props.ecg.index;
                this.nowStart = (new Date()).getTime();
            }
        }
    }

    render() {
        this.updateTrace();

        return cE('canvas', {
            style: {width: '100%', height: '30vh'},
            ref: this.canvasRef
        });
    }
};

module.exports = ECG;
