'use strict';

const mongoose = require('mongoose');

exports.connect = ({ uri }) => mongoose.connect(uri, { useNewUrlParser: true });
exports.disconnect = mongoose.disconnect;
