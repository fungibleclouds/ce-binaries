window.clipApp = {};

// Log function
clipApp.log = function(msg) {
	if(this.vars.debug) {
		if( typeof console !='undefined' && console.log){
			console.log('ClipApp :: ' + msg);
		}
	}
};

// Set default vars
clipApp.vars = {
	host: "www.kaltura.com",
	redirect_save: false,
	redirect_url: "http://www.kaltura.com/",
	overwrite_entry: false,
	debug: true
};

clipApp.init = function( options ) {
	$.extend( this.vars, options );
};

var jsCallbackReady = function( videoId ) {
	clipApp.kdp = $("#" + videoId ).get(0);

	clipApp.kdp.addJsListener("mediaReady", "clipApp.player.doFirstPlay");
	clipApp.kdp.addJsListener("playerPlayed", "clipApp.player.playerPlaying");
	clipApp.kdp.addJsListener("playerPaused", "clipApp.player.playerPaused");
	//clipApp.kdp.addJsListener("doSeek", "clipApp.resetPreview");
};

var clipperReady = function() {
	clipApp.kClip = $("#clipper").get(0);

	clipApp.kClip.addJsListener("clipStartChanged", "clipApp.updateStartTime");
	clipApp.kClip.addJsListener("clipEndChanged", "clipApp.updateEndTime");
	clipApp.kClip.addJsListener("entryReady", "clipApp.enableAddClip");
	clipApp.kClip.addJsListener("clipAdded", "clipApp.addClipForm");
	clipApp.kClip.addJsListener("clipperError", "clipApp.showError");
};

/* Init the App */
$(function() {
	clipApp.log('Init App');

	clipApp.createTimeSteppers();
	clipApp.activateButtons();

});

// Contains all player related functions
clipApp.player = {

	doFirstPlay: function() {
		clipApp.log('doFirstPlay');
		clipApp.player.firstLoad = true;
		clipApp.kdp.sendNotification("doPlay");
	},

	playerPlaying: function() {
		clipApp.log('clipApp.player.playerPlaying');
		if( clipApp.player.firstLoad ) {
			clipApp.log('pauseKdp');
			clipApp.player.firstLoad = false;
			setTimeout( function() {
				clipApp.kdp.sendNotification("doPause");
			}, 50);
		}

		clipApp.kClip.removeJsListener("playheadUpdated", "clipApp.player.updatePlayhead");
		clipApp.kdp.addJsListener("playerUpdatePlayhead", "clipApp.clipper.updatePlayhead");
	},

	playerPaused: function() {
		clipApp.kClip.addJsListener("playheadUpdated", "clipApp.player.updatePlayhead");
		clipApp.kdp.removeJsListener("playerUpdatePlayhead", "clipApp.clipper.updatePlayhead");
	},

	updatePlayhead: function(val) {
		val = Math.floor( val / 1000 );
		clipApp.kdp.sendNotification("doSeek", val);
		setTimeout(function() {
			clipApp.kdp.sendNotification("doPause");
		}, 250);
	}
};

// Contains all clipper related functions
clipApp.clipper = {
	addClip: function( start, end ) {
		var clip_length = (end) ? end : ( ( (clipApp.getLength() * 10) / 100 ) * 1000 );
		var clip_offset = (start) ? start : clipApp.kClip.getPlayheadLocation();
		clipApp.kClip.addClipAt(clip_offset, clip_length);
		clipApp.log('addClipAt (Length: ' + clip_length + ')');
		clipApp.updateStartTime(clip_offset);
		clipApp.updateEndTime(clip_offset + clip_length);
		setTimeout( function() {
			clipApp.kdp.sendNotification("doPause");
		}, 250);
	},

	updatePlayhead: function(val) {
		clipApp.kClip.scrollToPoint(val * 1000);
	}
};

clipApp.getLength = function() {
	return clipApp.vars.entry.duration;
};

clipApp.showError = function(error) {
	alert(error.messageText);
};

clipApp.getEmbedCode = function(entry_id) {

	var unique_id = clipApp.getUniqueId();
	var entry_url = 'http://' + clipApp.vars.host + '/kwidget/wid/_' + clipApp.vars.partner_id + '/uiconf_id/' + clipApp.vars.kdp.id + '/entry_id/' + entry_id;
	
	var embed_code = '<object id="kaltura_player_' + unique_id + '" name="kaltura_player_' + unique_id + '" type="application/x-shockwave-flash" allowFullScreen="true"' +
				' allowNetworking="all" allowScriptAccess="always" height="' + clipApp.vars.kdp.height + '" width="' + clipApp.vars.kdp.width + '" bgcolor="#000000"' +
				' resource="' + entry_url + '" data="' + entry_url + '"><param name="allowFullScreen" value="true" /><param name="allowNetworking" value="all" />' +
				' <param name="allowScriptAccess" value="always" /><param name="bgcolor" value="#000000" /><param name="movie" value="' + entry_url + '" /></object>';

	return embed_code;
};

clipApp.getUniqueId = function() {
	var d = new Date();
	return d.getTime().toString().substring(4);
};

clipApp.addClipForm = function() {
	$("#newclip").hide();
	$("#embed").hide();
	$("#timers").fadeIn();
	$("#form").fadeIn();
	$("#actions").fadeIn();
};

clipApp.createTimeSteppers = function() {
	clipApp.log('Create Time Steppers');
	$("#startTime").timeStepper( {
		onChange: function( val ) {
			console.log('start time changed:' + val);
			
			clipApp.kClip.removeJsListener("clipStartChanged", "clipApp.updateStartTime");
			clipApp.kClip.removeJsListener("clipEndChanged", "clipApp.updateEndTime");
			clipApp.setStartTime( val );
			clipApp.kClip.addJsListener("clipStartChanged", "clipApp.updateStartTime");
			clipApp.kClip.addJsListener("clipEndChanged", "clipApp.updateEndTime");
			
		}
	} );
	$("#endTime").timeStepper( {
		onChange: function( val ) {
			console.log('end time changed:' + val);
			
			clipApp.kClip.removeJsListener("clipStartChanged", "clipApp.updateStartTime");
			clipApp.kClip.removeJsListener("clipEndChanged", "clipApp.updateEndTime");
			clipApp.setEndTime( val );
			clipApp.kClip.addJsListener("clipStartChanged", "clipApp.updateStartTime");
			clipApp.kClip.addJsListener("clipEndChanged", "clipApp.updateEndTime");
			
		}
	} );
};

clipApp.updateStartTime = function(clip) {
	var val = (typeof clip === "object") ? clip.clipAttributes.offset : clip;
	val = Math.floor( val );
	clipApp.log('updateStartTime (' + val + ')');
	$("#startTime").timeStepper( 'setValue', val );
};

clipApp.updateEndTime = function(clip) {
	var val = (typeof clip === "object") ? (clip.clipAttributes.offset + clip.clipAttributes.duration) : clip;
	if( val > 0 ) {
		clipApp.log('updateEndTime (' + val + ')');
		$("#endTime").timeStepper( 'setValue', val );
	}
};

clipApp.setStartTime = function( val ) {

	if( val >= $("#endTime").timeStepper( 'getValue' ) ) {
		alert('Start time cannot be bigger then End time. ');
		return false;
	}
	
	var currentClip = clipApp.kClip.getSelected();
	var duration = currentClip.clipAttributes.duration - (val - currentClip.clipAttributes.offset);

	clipApp.kClip.updateClipLength( duration );
	clipApp.updateEndTime( val + duration );
	
	clipApp.kClip.updateInTime( val );
	clipApp.updateStartTime( val );

	clipApp.kdp.sendNotification("doPause");

	return true;
};

clipApp.setEndTime = function( val ) {
	if( val <= $("#startTime").timeStepper( 'getValue' ) ) {
		alert('End time cannot be smaller then Start time');
		return false;
	}
	var length = ( val - $("#startTime").timeStepper( 'getValue' ) );
	clipApp.kClip.updateClipLength(length);
	clipApp.updateEndTime( val );
	clipApp.kdp.sendNotification("doPause");
	return true;
};

clipApp.activateButtons = function() {
	clipApp.log('Activate Buttons');

	$("#newclip input").click( function() {
		clipApp.clipper.addClip();
	});

	$("#preview").click( function() { clipApp.doPreview(); });

	$("#setStartTime").click( function() {
		var currentTime = clipApp.kdp.evaluate('{video.player.currentTime}') * 1000;
		clipApp.setStartTime( currentTime );
	});

	$("#setEndTime").click( function() {
		var currentTime = clipApp.kdp.evaluate('{video.player.currentTime}') * 1000;
		clipApp.setEndTime( currentTime );
	});

	$("#delete").click( function() {
		if ( confirm("Are you sure you want to delete?") ) {
			clipApp.deleteClip();
		}
		return false;
	});

	$("#save").click( function() {
		return clipApp.doSave();
	});
};

clipApp.enableAddClip = function() {
	if( clipApp.vars.overwrite_entry ) {
		clipApp.log('Add new clip for trimming', (clipApp.getLength() * 1000) );
		clipApp.clipper.addClip(0, (clipApp.getLength() * 1000) );
	}
	$("#newclip input").attr('disabled', false);
};

clipApp.doPreview = function() {
	var startTime = $("#startTime").timeStepper( 'getValue', 'seconds' ),
		endTime = $("#endTime").timeStepper( 'getValue', 'seconds' );

	clipApp.log('Start Time: ' + startTime + ', End Time: ' + endTime );

	clipApp.kdp.sendNotification("doStop");
	clipApp.kdp.setKDPAttribute("mediaProxy", "mediaPlayFrom", startTime );
	clipApp.kdp.setKDPAttribute("mediaProxy", "mediaPlayTo", endTime );
	clipApp.kdp.sendNotification("doPlay");
};

clipApp.resetPreview = function() { 
	clipApp.kdp.setKDPAttribute("mediaProxy", "mediaPlayFrom", 0 );
	clipApp.kdp.setKDPAttribute("mediaProxy", "mediaPlayTo", clipApp.getLength() );
};

clipApp.showEmbed = function( entry_id ) {
	// Hide current elements
	clipApp.deleteClip();

	// Set embed code
	$("#embedcode").click( function() { this.select(); } );
	$("#embedcode").val( clipApp.getEmbedCode( entry_id ) );

	// Show embed code
	$("#embed").fadeIn();
};

clipApp.doSave = function() {
	if( ($("#endTime").timeStepper( 'getValue' ) - $("#startTime").timeStepper( 'getValue' )) <= 100 ) {
		alert('Clip duration must be bigger then 100ms.');
		return false;
	}
	
	// Get Params
	var params = {
		'entryId': clipApp.vars.entry.id,
		'name': $("#entry_title").val(),
		'desc': $("#entry_desc").val(),
		'start': $("#startTime").timeStepper( 'getValue' ),
		'end': $("#endTime").timeStepper( 'getValue' )
	};

	var saveUrl = 'save.php';
	if( clipApp.vars.config.length > 0 ) {
		saveUrl += '?config=' + clipApp.vars.config + '&partnerId=' + clipApp.vars.partner_id + '&kclipUiconf=' + clipApp.vars.kclip_uiconf_id + '&kdpUiconf=' + clipApp.vars.kdp_uiconf_id + '&mode=' + ((clipApp.vars.overwrite_entry) ? 'trim' : 'clip');
	}

	// Make the request
	$.ajax({
		url: saveUrl,
		type: "post",
		data: params,
		dataType: "json",
		success: function(res) {
			$("#loading").fadeOut();
			if( res.error ) {
				alert(res.error);
				return false;
			}
			if( clipApp.vars.redirect_save === true ) {
				window.location.href = clipApp.vars.redirect_url;
			} else {
				clipApp.showEmbed(res.id);
				return true;
			}
		}
	});
};

clipApp.deleteClip = function() {
	// Stop the KDP
	clipApp.kdp.sendNotification("doStop");

	// Remove clip from clipper
	clipApp.kClip.deleteSelected();

	// Reset fields
	$("#entry_title").val('');
	$("#entry_desc").val('');

	$("#newclip").fadeIn();
	$("#timers").hide();
	$("#form").hide();
	$("#actions").hide();
};

clipApp.isIpad = function(){
	return ( navigator.userAgent.indexOf('iPad') != -1 );
};