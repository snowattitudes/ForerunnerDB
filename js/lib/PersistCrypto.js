"use strict";

var Shared = require('./Shared'),
	CryptoJS = require('crypto-js');

var Plugin = function () {
	this.init.apply(this, arguments);
};

Plugin.prototype.init = function (options) {
	// Ensure at least a password is passed in options
	if (!options || !options.pass) {
		throw('Cannot initialise persistent storage encryption without a passphrase provided in the passed options object as the "pass" field.');
	}

	this._algo = options.algo || 'AES';
	this._pass = options.pass;
};

/**
 * Gets / sets the current pass-phrase being used to encrypt / decrypt
 * data with the plugin.
 */
Shared.synthesize(Plugin.prototype, 'pass');

Plugin.prototype._jsonFormatter = {
	stringify: function (cipherParams) {
		// create json object with ciphertext
		var jsonObj = {
			ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
		};

		// optionally add iv and salt
		if (cipherParams.iv) {
			jsonObj.iv = cipherParams.iv.toString();
		}
		if (cipherParams.salt) {
			jsonObj.s = cipherParams.salt.toString();
		}

		// stringify json object
		return JSON.stringify(jsonObj);
	},

	parse: function (jsonStr) {
		// parse json string
		var jsonObj = JSON.parse(jsonStr);

		// extract ciphertext from json object, and create cipher params object
		var cipherParams = CryptoJS.lib.CipherParams.create({
			ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
		});

		// optionally extract iv and salt
		if (jsonObj.iv) {
			cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
		}
		if (jsonObj.s) {
			cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s);
		}

		return cipherParams;
	}
};

Plugin.prototype.encode = function (val, meta, finished) {
	var wrapper = {
			type: 'fdbCrypto'
		},
		encryptedVal;

	// Encrypt the data
	encryptedVal = CryptoJS[this._algo].encrypt(val, this._pass, {
		format: this._jsonFormatter
	});

	wrapper.data = encryptedVal.toString();
	wrapper.enabled = true;

	meta.encryption = {
		enabled: wrapper.enabled
	};

	if (finished) {
		finished(false, JSON.stringify(wrapper), meta);
	}
};

Plugin.prototype.decode = function (wrapper, meta, finished) {
	var data;

	if (wrapper) {
		wrapper = JSON.parse(wrapper);

		data = CryptoJS[this._algo].decrypt(wrapper.data, this._pass, {
			format: this._jsonFormatter
		}).toString(CryptoJS.enc.Utf8);

		if (finished) {
			finished(false, data, meta);
		}
	} else {
		if (finished) {
			finished(false, wrapper, meta);
		}
	}
};

// Register this plugin with the persistent storage class
Shared.plugins.FdbCrypto = Plugin;

module.exports = Plugin;