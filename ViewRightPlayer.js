window.ViewRightPlayer = (function() {
	'use strict';

	/**
	 * ViewRight Verimatrix player wrapper.
	 *
	 * Provides convenient interface to the ViewRight API.
	 *
	 * @class Player
	 * @constructor
	 */
	var ViewRightPlayer = function() {
		this._ie = /MSIE (\d+\.\d+);/.test(navigator.userAgent);
		this._player = null;
		this._initialized = false;
		this._lastOpenedUrl = null;
		this._lastResponseCode = null;
		this._lastErrorCode = null;
		this._stateMonitorInterval = null;
		this._playbackMonitorInterval = null;
		this._lastState = null;
		this._lastPosition = 0;
	};

	/**
	 * List of possible player statuses.
	 *
	 * @property State
	 * @type {Object}
	 */
	ViewRightPlayer.prototype.State = {
		UNINITIALIZED: 0,
		IDLE: 1,
		OPENING: 2,
		BUFFERING: 3,
		PLAYING: 4,
		STOPPED: 5,
		PAUSED: 6,
		FAST_FORWARDING: 7,
		REWINDING: 8,
		SLOW_MOTION: 9,
		CLOSING: 10,
		SHUTTING_DOWN: 11
	};

	/**
	 * List of possible status codes.
	 *
	 * @property StatusCode
	 * @type {Object}
	 */
	ViewRightPlayer.prototype.StatusCode = {
		SUCCESS: 0,
		NO_CONNECTION: 1,
		GENERAL_ERROR: 2,
		BAD_MEMORY_ALLOCATION: 3,
		BAD_RANDOM_NUMBER_GENERATED: 4,
		BAD_URL: 5,
		BAD_REPLY: 6,
		BAD_REPLY_MOVED: 7,
		FAILED_VERIFYING_CERTIFICATE_CHAIN: 8,
		FAILED_CREATING_KEY_PAIR: 9,
		NOT_ENTITLED: 10,
		FAILED_CREATING_STORE_FILE: 11,
		FAILED_WRITING_STORE_FILE: 12,
		FAILED_READING_STORE_FILE: 13,
		FAILED_STORE_FILE_INTEGRITY_CHECK: 14,
		STORE_FILE_NOT_EXISTS: 15,
		BAD_CERTIFICATE: 16,
		BAD_INI_FILE: 17,
		BAD_PRIVATE_KEY: 18,
		FAILED_CONVERTING_PEM_TO_X509: 19,
		BAD_PUBLIC_ENCRYPTION: 20,
		INVALID_X509_ENTRY: 21,
		INVALID_X509_SUBJECT: 22,
		INVALID_X509_SIGN: 23,
		FAILED_RETRIEVING_BOOT: 24,
		FAILED_PROVISIONING: 25,
		INVALID_ARGUMENTS: 26,
		FAILED_KEY_GENERATION: 27,
		NOT_PROVISIONED: 28,
		COMMUNICATION_OBJECT_NOT_INITIALIZED: 29,
		MISSING_OTT_SIGNATURE: 30,
		INVALID_OTT_SIGNATURE: 31,
		KEY_FILE_NOT_ENTITLED: 32,
		CERTIFICATE_EXPIRED: 33,
		FAILED_INTEGRITY_CHECK: 34,
		SECURITY_ERROR: 35
	};

	/**
	 * Logs a message.
	 *
	 * Accepts any number of any parameters.
	 *
	 * Over-define this in your instance of the player for custom logging.
	 *
	 * @method log
	 */
	ViewRightPlayer.prototype.log = function() {
		if (typeof(window.console) !== 'object') {
			return;
		}

		window.console.log.apply(window.console, arguments);
	};

	/**
	 * Logs an error.
	 *
	 * Accepts any number of any parameters.
	 *
	 * Over-define this in your instance of the player for custom error handling.
	 *
	 * @method log
	 */
	ViewRightPlayer.prototype.error = function() {
		if (typeof(window.console) !== 'object') {
			return;
		}

		window.console.error.apply(window.console, arguments);
	};

	/**
	 * Called when the state of the player changes.
	 *
	 * The codes match those of ViewRightPlayer.State.
	 *
	 * By default, it logs the state changes but you can over-define this in your code.
	 *
	 * @method onStateChanged
	 * @param {Number} newState New state code
	 * @param {Number} lastState Last state code
	 */
	ViewRightPlayer.prototype.onStateChanged = function(newState, lastState) {
		this.log('State changed from ' + this.getStateName(lastState) + ' to ' + this.getStateName(newState));
	};

	/**
	 * Called when the playback position changes.
	 *
	 * The time is in seconds.
	 *
	 * By default, it doesn't do anything but you can over-define this in your code.
	 *
	 * @method onPositionChanged
	 * @param {Number} newPosition New position in seconds
	 * @param {Number} lastPosition Last position
	 */
	ViewRightPlayer.prototype.onPositionChanged = function(/*newPosition, lastPosition*/) {};

	/**
	 * Returns the response code of the last called action.
	 *
	 * The codes match those of ViewRightPlayer.StatusCode.
	 *
	 * @method getLastResponseCode
	 * @return {Number} Response code or null if no calls have been made
	 */
	ViewRightPlayer.prototype.getLastResponseCode = function() {
		return this._lastResponseCode;
	};

	/**
	 * Returns the name of the response code of the last called action.
	 *
	 * The name match those of ViewRightPlayer.StatusCode.
	 *
	 * @method getLastResponseName
	 * @return {String} Response code name
	 */
	ViewRightPlayer.prototype.getLastResponseName = function() {
		return this.getVerimatrixStatusName(this._lastResponseCode);
	};

	/**
	 * Returns the response code of the last error.
	 *
	 * The codes match those of ViewRightPlayer.StatusCode.
	 *
	 * @method getLastErrorCode
	 * @return {Number} Error Response code or null if no calls have been made
	 */
	ViewRightPlayer.prototype.getLastErrorCode = function() {
		return this._lastErrorCode;
	};

	/**
	 * Returns the name of the response code of the last error.
	 *
	 * The name match those of ViewRightPlayer.StatusCode.
	 *
	 * @method getLastErrorName
	 * @return {String} Last error code name
	 */
	ViewRightPlayer.prototype.getLastErrorName = function() {
		return this.getVerimatrixStatusName(this._lastErrorCode);
	};

	/**
	 * Returns the last requested URL.
	 *
	 * @method getLastOpenedUrl
	 * @return {String} Last requested URL or null if none made.
	 */
	ViewRightPlayer.prototype.getLastOpenedUrl = function() {
		return this._lastOpenedUrl;
	};

	/**
	 * Initializes the ViewRightPlayer.
	 *
	 * @method init
	 * @param {String|DOMElement} container Player container element or selector
	 * @return {Player} Self
	 */
	ViewRightPlayer.prototype.init = function(container) {
		this.log('Initializing player');

		var self = this,
			wrap = $(container),
			width = wrap.innerWidth(),
			height = wrap.innerHeight();

		if (this._ie) {
			wrap.append(
				'<object id="view-right-control" classid="CLSID:059BFDA3-0AAB-419F-9F69-AF9BBE3A4668" width="' +
				width + '" height="' + height + '"></object>'
			);
		} else {
			wrap.append(
				'<object id="view-right-control" type="application/x-viewright-m3u8" width="' + width +
				'" height="' + height + '"></object>'
			);
		}

		this._player = $('#view-right-control')[0];

		this._stateMonitorInterval = window.setInterval(function() {
			self._monitorState();
		}, 100);

		this._playbackMonitorInterval = window.setInterval(function() {
			self._monitorPlayback();
		}, 1000);

		this.onPositionChanged(0, 0);

		this._initialized = true;

		return this;
	};

	/**
	 * Destroys the player.
	 *
	 * Unloads the player and removes the DOM element.
	 *
	 * @method destroy
	 * @returns {Boolean} Was destroying the player successful
	 */
	ViewRightPlayer.prototype.destroy = function() {
		this.log('Destroying player');

		if (!this._initialized) {
			this.error('Unable to destroy Verimatrix player, not initialized');
		}

		window.clearInterval(this._stateMonitorInterval);
		this._stateMonitorInterval = null;

		window.clearInterval(this._playbackMonitorInterval);
		this._playbackMonitorInterval = null;

		var result = this._validateResponse(
			this._player.UnLoad(),
			'Destroying played failed'
		);

		$(this._player).remove();

		this._initialized = false;

		return result;
	};

	/**
	 * Returns whether the device is provisioned.
	 *
	 * @method isProvisioned
	 * @return {Boolean}
	 */
	ViewRightPlayer.prototype.isProvisioned = function() {
		return this._player.IsDeviceProvisioned() ? true : false;
	};

	/**
	 * Returns client id.
	 *
	 * @method getClientId
	 * @return {String}
	 */
	ViewRightPlayer.prototype.getClientId = function() {
		return this._player.GetClientID();
	};

	/**
	 * Returns current state code.
	 *
	 * @method getState
	 * @returns {Number}
	 */
	ViewRightPlayer.prototype.getState = function() {
		return this._player.GetStatusCode();
	};

	/**
	 * Returns current or given state code name.
	 *
	 * @method getStateName
	 * @param {Number} [code] Optional code to get name of, otherwise gives current state name
	 * @return {String}
	 */
	ViewRightPlayer.prototype.getStateName = function(code) {
		if (typeof(code) === 'undefined') {
			code = this.getState();
		} else if (code === null) {
			return 'UNINITIALIZED';
		}

		for (var name in this.State) {
			if (this.State[name] === code) {
				return name;
			}
		}

		return 'INVALID';
	};

	/**
	 * Returns the status of the last VCAS communication.
	 *
	 * @method getVerimatrixStatusCode
	 * @return {Number}
	 */
	ViewRightPlayer.prototype.getVerimatrixStatusCode = function() {
		return this._player.GetVCASStatusCode();
	};

	/**
	 * Returns the status name of the last VCAS communication.
	 *
	 * @method getVerimatrixStatusName
	 * @return {String}
	 */
	ViewRightPlayer.prototype.getVerimatrixStatusName = function(code) {
		if (typeof(code) === 'undefined') {
			code = this.getVerimatrixStatusCode();
		}

		for (var name in this.StatusCode) {
			if (this.StatusCode[name] === code) {
				return name;
			}
		}

		return 'INVALID';
	};

	/**
	 * Returns whether the player is currently muted.
	 *
	 * @method isMuted
	 * @return {Boolean}
	 */
	ViewRightPlayer.prototype.isMuted = function() {
		return this._player.IsMuted() ? true : false;
	};

	/**
	 * Returns whether the player is currently in fullscreen mode.
	 *
	 * @method isFullscreen
	 * @return {Boolean}
	 */
	ViewRightPlayer.prototype.isFullscreen = function() {
		return this._player.IsFullscreen() ? true : false;
	};

	/**
	 * Returns whether currently playing media is seekable.
	 *
	 * @method isMediaSeekable
	 * @return {Boolean}
	 */
	ViewRightPlayer.prototype.isMediaSeekable = function() {
		return this._player.IsMediaSeekable() ? true : false;
	};

	/**
	 * Returns whether currently playing media is secure.
	 *
	 * @method isMediaSecure
	 * @return {Boolean}
	 */
	ViewRightPlayer.prototype.isMediaSecure = function() {
		return this._player.IsMediaSecure() ? true : false;
	};

	/**
	 * Opens and starts playing an URL.
	 *
	 * @method open
	 * @param {String} url URL to open
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.open = function(url) {
		this.log('Opening URL "' + url + '"');

		if (this.getState() === this.State.PLAYING) {
			this.log('Player is already playing, stopping it first');

			this.stop();
		}

		this._lastOpenedUrl = url;

		return this._validateResponse(
			this._player.Open(url, false),
			'Opening URL "' + url + '" failed'
		);
	};

	/**
	 * Pauses the player.
	 *
	 * @method pause
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.pause = function() {
		this.log('Pausing player');

		if (this.getState() === this.State.PAUSED) {
			this.log('Player is already paused');

			return true;
		}

		if (this.getState() === this.State.PLAYING) {
			return this._player.Pause();
		} else {
			this.log('Unable to pause player, expected PLAYING state, currently ' + this.getStateName());

			return false;
		}
	};

	/**
	 * Resumes the player.
	 *
	 * @method resume
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.resume = function() {
		this.log('Resuming player');

		if (this.getState() === this.State.PLAYING) {
			this.log('Player is already playing');

			return true;
		}

		if (this.getState() === this.State.PAUSED) {
			return this._player.Play();
		} else {
			this.log('Unable to resume player, expected PAUSED state, currently ' + this.getStateName());

			return false;
		}
	};

	/**
	 * Stops the player.
	 *
	 * @method stop
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.stop = function() {
		this.log('Stopping player');

		if (this.getState() === this.State.IDLE) {
			this.log('Player is already in idle state');

			return true;
		}

		return this._validateResponse(
			this._player.Close(),
			'Stopping player failed'
		);
	};

	/**
	 * Rewinds the player.
	 *
	 * Rewinds to the beginning of the playlist in the currently playing broadcast stream. This feature is not
	 * supported when playing VOD stream.
	 *
	 * @method rewind
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.rewind = function() {
		var state = this.getState();

		if (state !== this.State.PLAYING && state !== this.State.PAUSED) {
			this.log(
				'Unable to rewind player, expected PLAYING or PAUSED state, currently ' + this.getStateName(state)
			);

			return false;
		}

		this.log('Rewinding player');

		return this._validateResponse(
			this._player.Rewind(),
			'Rewinding player failed'
		);
	};

	/**
	 * Fast-forwards the player.
	 *
	 * Begins playing near the end of the playlist in the currently playing broadcast stream. This feature is not
	 * supported when playing VOD stream.
	 *
	 * @method fastForward
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.fastForward = function() {
		var state = this.getState();

		if (state !== this.State.PLAYING && state !== this.State.PAUSED) {
			this.log(
				'Unable to fast-forward player, expected PLAYING or PAUSED state, currently ' + this.getStateName(state)
			);

			return false;
		}

		this.log('Fast-forwarding');

		return this._validateResponse(
			this._player.FastForward(),
			'Fast-forwarding failed'
		);
	};

	/**
	 * Sets whether the player should be muted.
	 *
	 * @method setMute
	 * @param {Boolean} enabled Should mute be enabled
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.setMute = function(enabled) {
		this.log(enabled ? 'Muting player' : 'Unmuting player');

		return this._validateResponse(
			this._player.SetMute(enabled ? 1 : 0),
			enabled ? 'Muting played failed' : 'Unmuting player failed'
		);
	};

	/**
	 * Mutes the player.
	 *
	 * @method mute
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.mute = function() {
		return this.setMute(true);
	};

	/**
	 * Un-mutes the player.
	 *
	 * @method unmute
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.unmute = function() {
		return this.setMute(false);
	};

	/**
	 * Toggles player mute.
	 *
	 * @method toggleMute
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.toggleMute = function() {
		return this.setMute(!this.isMuted());
	};

	/**
	 * Sets the balance.
	 *
	 * @method setBalance
	 * @param {Number} balance Playback balance to use in range 0..100
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.setBalance = function(balance) {
		balance = Math.min(Math.max(balance, 0), 100);

		this.log('Setting balance to ' + balance);

		return this._validateResponse(
			this._player.SetBalance(balance),
			'Setting balance to ' + balance + ' failed'
		);
	};

	/**
	 * Sets whether the player should be fullscreened.
	 *
	 * @method setFullscreen
	 * @param {Boolean} enabled Should fullscreen be used
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.setFullscreen = function(enabled) {
		this.log(enabled ? 'Enabling fullscreen' : 'Disabling fullscreen');

		return this._validateResponse(
			this._player.Fullscreen(enabled ? 1 : 0),
			enabled ? 'Enabling fullscreen failed' : 'Disabling fullscreen failed'
		);
	};

	/**
	 * Enables fullscreen mode.
	 *
	 * @method enableFullscreen
	 * @@return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.enableFullscreen = function() {
		return this.setFullscreen(true);
	};

	/**
	 * Disables fullscreen mode.
	 *
	 * @method disableFullscreen
	 * @@return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.disableFullscreen = function() {
		return this.setFullscreen(false);
	};

	/**
	 * Sets whether hardware interlacing should be enabled.
	 *
	 * @method setHardwareInterlacing
	 * @param {Boolean} enabled Should hardware interlacing be enabled
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.setHardwareInterlacing = function(enabled) {
		this.log(enabled ? 'Enabling hardware interlacing' : 'Disabling hardware interlacing');

		return this._validateResponse(
			this._player.SetHardwareDeinterlacing(enabled ? true : false),
			enabled ? 'Enabling hardware interlacing failed' : 'Disabling hardware interlacing failed'
		);
	};

	/**
	 * Enabled hardware interlacing.
	 *
	 * @method enableHardwareInterlacing
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.enableHardwareInterlacing = function() {
		this.setHardwareInterlacing(true);
	};

	/**
	 * Disables hardware interlacing.
	 *
	 * @method disableHardwareInterlacing
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.disableHardwareInterlacing = function() {
		this.setHardwareInterlacing(false);
	};

	/**
	 * Returns whether hardware interlacing is being used.
	 *
	 * @method isUsingHardwareDeinterlacing
	 * @return {Boolean}
	 */
	ViewRightPlayer.prototype.isUsingHardwareDeinterlacing = function() {
		return this._player.GetHardwareDeinterlacing() ? true : false;
	};

	/**
	 * Aborts currently requested operation.
	 *
	 * @method abortOperation
	 * @return {Boolean} Was the operation successful
	 */
	ViewRightPlayer.prototype.abortOperation = function() {
		this.log('Aborting current operation');

		this._player.AbortOperation();

		return true;
	};

	/**
	 * Returns SDK version.
	 *
	 * @method getSDKVersion
	 * @return {String}
	 */
	ViewRightPlayer.prototype.getSDKVersion = function() {
		return this._player.GetSDKVersion();
	};

	/**
	 * Returns current client status as object.
	 *
	 * @method getClientStatus
	 * @return {Object}
	 */
	ViewRightPlayer.prototype.getClientStatus = function() {
		return JSON.parse(this._player.GetClientStatus(1));
	};

	/**
	 * Returns media width/height ratio.
	 *
	 * @method getAspectRatio
	 * @return {Number}
	 */
	ViewRightPlayer.prototype.getAspectRatio = function() {
		var ratio = this._player.GetAspectRatio();

		if (ratio === 0 || isNaN(ratio)) {
			return -1;
		} else {
			return ratio;
		}
	};

	/**
	 * Returns the length of playing content in seconds.
	 *
	 * @method getContentLength
	 * @return {Number}
	 */
	ViewRightPlayer.prototype.getContentLength = function() {
		return this._player.GetContentLength();
	};

	/**
	 * Returns current player position.
	 *
	 * @method getPosition
	 * @return {Number}
	 */
	ViewRightPlayer.prototype.getPosition = function() {
		return this._player.GetPosition();
	};

	/**
	 * Returns current player position percentage of total length.
	 *
	 * @method getPlaybackPercentage
	 * @return {Number}
	 */
	ViewRightPlayer.prototype.getPlaybackPercentage = function() {
		var length = this.getContentLength();

		if (length === 0) {
			return 0;
		}

		return this._player.GetPosition() * 100.0 / length;
	};

	/**
	 * Returns current volume level in range 0..100.
	 *
	 * @method getVolume
	 * @return {Number}
	 */
	ViewRightPlayer.prototype.getVolume = function() {
		return this._player.GetVolume();
	};

	/**
	 * Returns player balance in range 0..100.
	 *
	 * @method getBalance
	 * @return {Number}
	 */
	ViewRightPlayer.prototype.getBalance = function() {
		return this._player.GetBalance();
	};

	/**
	 * Returns list of quality metrics:
	 * - jitter
	 * - continuityCounter
	 * - framesDropped
	 * - avgFrameRate
	 * - playlistRate
	 * - downloadRate
	 *
	 * @return {Object}
	 */
	ViewRightPlayer.prototype.getQualityMetrics = function() {
		return {
			jitter: this._player.GetMediaQualityMetricJitter(),
			continuityCounter: this._player.GetMediaQualityMetricContinuityCounter(),
			framesDropped: this._player.GetMediaQualityMetricFramesDropped(),
			avgFrameRate: this._player.GetMediaQualityMetricAvgFrameRate(),
			playlistRate: this._player.GetMediaQualityMetricHTTPLiveStreamingPlaylistRate(),
			downloadRate: this._player.GetMediaQualityMetricHTTPLiveStreamingDownloadRate()
		};
	};

	ViewRightPlayer.prototype.setPosition = function(position) {
		var state = this.getState();

		if (state !== this.State.PLAYING && state !== this.State.PAUSED) {
			this.log(
				'Unable to change position, expected PLAYING or PAUSED state, currently ' + this.getStateName(state)
			);

			return false;
		}

		var contentLength = this.getContentLength(),
			boundedPosition = Math.min(Math.max(parseInt(position, 10), 0), contentLength);

		this.log('Setting player position to ' + boundedPosition + '/' + contentLength);

		return this._validateResponse(
			this._player.SetPosition(boundedPosition),
			'Setting player position to ' + boundedPosition + '/' + contentLength + ' failed'
		);
	};

	ViewRightPlayer.prototype.setPlaybackPercentage = function(percentage) {
		percentage = Math.min(Math.max(percentage, 0), 100);

		var position = Math.floor(percentage / 100 * this.getContentLength());

		this.log('Setting player playback percentage to ' + parseInt(percentage, 10) + '%');

		return this.setPosition(position);
	};

	ViewRightPlayer.prototype.setVolume = function(level) {
		level = Math.min(Math.max(level, 0), 100);

		this.log('Setting volume to ' + level);

		return this._validateResponse(
			this._player.SetVolume(level),
			'Setting volume to ' + level + ' failed'
		);
	};

	ViewRightPlayer.prototype._validateResponse = function(code, errorMessage) {
		if (typeof(errorMessage) !== 'string') {
			errorMessage = 'API request failed';
		}

		this._lastResponseCode = code;

		if (code !== this.StatusCode.SUCCESS) {
			this._lastErrorCode = code;

			this.error(errorMessage + ': ' + this.getVerimatrixStatusName(code));

			return false;
		} else {
			return true;
		}
	};

	ViewRightPlayer.prototype._monitorState = function() {
		var currentState = this.getState();

		if (currentState !== this._lastState) {
			this.onStateChanged(currentState, this._lastState);
		}

		this._lastState = currentState;
	};

	ViewRightPlayer.prototype._monitorPlayback = function() {
		var currentPosition = this.getPosition();

		if (currentPosition !== this._lastPosition) {
			this.onPositionChanged(currentPosition, this._lastPosition);
		}

		this._lastPosition = currentPosition;
	};

	return ViewRightPlayer;
})();