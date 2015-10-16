"use strict";

var DOUBLE_CLICK_TIMEOUT = 1500;
var state = {
	initialized: false
};
var networks = {};
var settings = {
	save_finished_matches: true,
	go_fullscreen: false,
	show_pronounciation: true,
	umpire_name: '',
	court_id: '',
	court_description: '',
	network_timeout: 5000,
};

function _parse_query_string(qs) {
	// http://stackoverflow.com/a/2880929/35070
	var pl     = /\+/g;
	var search = /([^&=]+)=?([^&]*)/g;
	var decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };

	var res = {};
	var m;
	while (m = search.exec(qs)) {
		res[decode(m[1])] = decode(m[2]);
	}
	return res;
}

function _add_zeroes(n) {
	if (n < 10) {
		return '0' + n;
	} else {
		return '' + n;
	}
};

function _duration_str(start_timestamp, end_timestamp) {
	var start = new Date(start_timestamp);
	var end = new Date(end_timestamp);

	// Since we're not showing seconds, we pretend to calculate in minutes:
	// start:      10:00:59 | 10:00:01
	// end:        11:12:01 | 11:12:59
	// precise:     1:11:02 |  1:12:58
	// our result:  1:12    |  1:12
	start.setSeconds(0);
	end.setSeconds(0);
	start.setMilliseconds(0);
	end.setMilliseconds(0);

	var diff_ms = end.getTime() - start.getTime();
	var mins = Math.round(diff_ms / 60000);
	var hours = (mins - (mins % 60)) / 60;
	return hours + ':' + _add_zeroes(mins % 60);
}

function _multiline_regexp(regs, options) {
    return new RegExp(regs.map(
        function(reg){ return reg.source; }
    ).join(''), options);
}

function _get_time_str(d) {
	return _add_zeroes(d.getHours()) + ':' + _add_zeroes(d.getMinutes());
}

function _get_date_str(d) {
	return _add_zeroes(d.getDate()) + '.' + _add_zeroes(d.getMonth()+1) + '.' + d.getFullYear();
}

function _get_datetime_str(d) {
	return _get_date_str(d) + ' ' + _get_time_str(d);
}

function _iso8601(d) {
	return d.getFullYear() + '-' + _add_zeroes(d.getMonth()+1) + '-' + _add_zeroes(d.getDate());
}

function _human_date_str(d) {
	var WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
	return WEEKDAYS[d.getDay()] + ' ' + _get_date_str(d);
}

function _xml_get_text(node, element_name) {
	var els = node.getElementsByTagName(element_name);
	if ((els.length > 0) && (els[0].childNodes.length > 0)) {
		return els[0].childNodes[0].nodeValue;
	}
	return null;
}

var _ui_esc_stack = [];
function ui_esc_stack_push(cancel) {
	_ui_esc_stack.push(cancel);
	Mousetrap.bind('escape', function() {
		cancel();
	});
}

function ui_esc_stack_pop() {
	if (_ui_esc_stack.length == 0) {
		show_error('Empty escape stack');
		return;
	}

	_ui_esc_stack.pop();
	Mousetrap.unbind('escape');
	var cancel = _ui_esc_stack[_ui_esc_stack.length - 1];
	if (_ui_esc_stack.length > 0) {
		Mousetrap.bind('escape', function() {
			cancel();
		});
	}
}

function _ui_make_pick(label, values, on_pick, on_cancel, container) {
	if (! container) {
		container = $('.bottom-ui');
	}

	var kill_dialog = function() {
		ui_esc_stack_pop();
		dlg_wrapper.remove();
	};
	var cancel = function() {
		if (! on_cancel) {
			return;  // No cancelling allowed
		}
		kill_dialog();
		on_cancel();
	}
	ui_esc_stack_push(cancel);

	var dlg_wrapper = $('<div class="modal-wrapper">');
	dlg_wrapper.on('click', function(e) {
		if (e.target == dlg_wrapper[0]) {
			cancel();
		}
	});
	var dlg = $('<div class="pick_dialog">');
	dlg.appendTo(dlg_wrapper);

	var label_span = $('<span>');
	label_span.text(label);
	label_span.appendTo(dlg);

	values.forEach(function(v) {
		var btn = $('<button>');
		btn.text(v.label);
		btn.on('click', function() {
			kill_dialog();
			on_pick(v);
		});
		dlg.append(btn);
	});

	if (on_cancel) {
		var cancel_btn = $('<button class="cancel-button">Abbrechen</button>');
		cancel_btn.on('click', cancel);
		cancel_btn.appendTo(dlg);
	}

	container.append(dlg_wrapper);
}

function _ui_make_team_pick(s, label, type, on_cancel, modify_button) {
	var kill_dialog = function() {
		ui_esc_stack_pop();
		dlg_wrapper.remove();
	};
	var cancel = function() {
		kill_dialog();
		on_cancel();
	}

	ui_esc_stack_push(cancel);
	var dlg_wrapper = $('<div class="modal-wrapper">');
	dlg_wrapper.on('click', function(e) {
		if (e.target == dlg_wrapper[0]) {
			cancel();
		}
	});
	var dlg = $('<div class="pick_dialog">');
	dlg.appendTo(dlg_wrapper);

	var label_span = $('<span>');
	label_span.text(label);
	label_span.appendTo(dlg);

	var team_indices = [0, 1]
	team_indices.forEach(function(ti) {
		var btn = _ui_add_player_pick(s, dlg, type, ti, null, kill_dialog, function() {
			return calc_teamtext_internal(s, ti);
		});
		if (modify_button) {
			modify_button(btn, ti);
		}
	});

	var cancel_btn = $('<button class="cancel-button">Abbrechen</button>');
	cancel_btn.on('click', cancel);
	cancel_btn.appendTo(dlg);

	$('.bottom-ui').append(dlg_wrapper);
}


function _ui_make_player_pick(s, label, type, on_cancel, modify_button) {
	var kill_dialog = function() {
		ui_esc_stack_pop();
		dlg_wrapper.remove();
	};
	var cancel = function() {
		kill_dialog();
		on_cancel();
	}

	ui_esc_stack_push(cancel);
	var dlg_wrapper = $('<div class="modal-wrapper">');
	dlg_wrapper.on('click', function(e) {
		if (e.target == dlg_wrapper[0]) {
			cancel();
		}
	});
	var dlg = $('<div class="pick_dialog">');
	dlg.appendTo(dlg_wrapper);

	var label_span = $('<span>');
	label_span.text(label);
	label_span.appendTo(dlg);

	var team_indices = [0, 1]
	team_indices.forEach(function(ti) {
		var btn = _ui_add_player_pick(s, dlg, type, ti, 0, kill_dialog);
		if (modify_button) {
			modify_button(btn, ti, 0);
		}
		if (s.setup.is_doubles) {
			btn = _ui_add_player_pick(s, dlg, type, ti, 1, kill_dialog);
			if (modify_button) {
				modify_button(btn, ti, 1);
			}
		}
	});

	var cancel_btn = $('<button class="cancel-button">Abbrechen</button>');
	cancel_btn.on('click', cancel);
	cancel_btn.appendTo(dlg);

	$('.bottom-ui').append(dlg_wrapper);
}

function _ui_add_player_pick(s, container, type, team_id, player_id, on_click, namefunc) {
	if (! namefunc) {
		namefunc = function(player) {
			return player.name;
		};
	}

	var player = s.setup.teams[team_id].players[player_id];
	var btn = $('<button>');
	btn.text(namefunc(player));
	btn.on('click', function() {
		var press = {
			type: type,
			team_id: team_id,
		};
		if (player_id !== null) {
			press.player_id = player_id;
		}
		if (on_click) {
			on_click(press);
		}
		on_press(press);
	});
	container.append(btn);
	return btn;
}

function show_error(msg, e) {
	console.error(msg, e);
}

function _ui_fullscreen_supported() {
	return (
		document.fullscreenEnabled ||
		document.webkitFullscreenEnabled ||
		document.mozFullScreenEnabled ||
		document.msFullscreenEnabled
	);
}

function _ui_fullscreen_active() {
	return (
		document.fullscreenElement ||
		document.webkitFullscreenElement ||
		document.mozFullScreenElement ||
		document.msFullscreenElement
	);
}

function _ui_fullscreen_start() {
	var doc = document.documentElement;
	if (doc.requestFullscreen) {
		doc.requestFullscreen();
	} else if (doc.webkitRequestFullscreen) {
		doc.webkitRequestFullscreen(doc.ALLOW_KEYBOARD_INPUT);
	} else if (doc.mozRequestFullScreen) {
		doc.mozRequestFullScreen();
	} else if (doc.msRequestFullscreen) {
		doc.msRequestFullscreen();
	}
}

function _ui_fullscreen_stop() {
	if (document.exitFullscreen) {
		document.exitFullscreen();
	} else if (document.webkitExitFullscreen) {
		document.webkitExitFullscreen();
	} else if (document.mozCancelFullScreen) {
		document.mozCancelFullScreen();
	} else if (document.msExitFullscreen) {
		document.msExitFullscreen();
	}
}

function ui_fullscreen_toggle() {
	var supported = _ui_fullscreen_supported();
	if (! supported) {
		return;
	}
	if (_ui_fullscreen_active()) {
		_ui_fullscreen_stop();
	} else {
		_ui_fullscreen_start();
	}
}

function ui_fullscreen_init() {
	$(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function() {
		$('.fullscreen_button').text(
			_ui_fullscreen_active() ? 'Vollbildmodus verlassen' : 'Vollbildmodus'
		);
	});

	if (! _ui_fullscreen_supported()) {
		$('.fullscreen_button').attr({
			disabled: 'disabled',
			title: 'Vollbildmodus wird auf diesem Browser nicht unterstützt'
		});
	}
}

function ui_show_error(msg) {
	alert(msg);
}

function ui_waitprogress(msg) {
	$('#waitprogress_message').text(msg);
	$('#waitprogress_wrapper').show();
}

function ui_waitprogress_stop() {
	$('#waitprogress_wrapper').hide();
}

function ui_settings_load_list(s) {
	if (s === undefined) {
		s = state;
	}

	var matches = load_matches();
	matches = matches.filter(function(m) {
		return (!s.metadata || m.metadata.id != s.metadata.id);
	});
	$('.setup_loadmatch_none').toggle(matches.length == 0);
	var match_list = $('.setup_loadmatch_list');
	match_list.empty();
	match_list.toggle(matches.length > 0);
	matches.sort(function(m1, m2) {
		var time1 = m1.metadata.updated;
		var time2 = m2.metadata.updated;
		if (time1 > time2) {
			return -1;
		} else if (time1 < time2) {
			return 1;
		} else {
			return 0;
		}
	});
	matches.forEach(function(m) {
		var li = $('<li>');
		var a = $('<span class="load_match_link">');
		var match_name;
		if (m.setup.is_doubles) {
			match_name = m.setup.teams[0].players[0].name + '/' + m.setup.teams[0].players[1].name + ' vs ' + m.setup.teams[1].players[0].name + '/' + m.setup.teams[1].players[1].name;
		} else {
			match_name = m.setup.teams[0].players[0].name + ' vs ' + m.setup.teams[1].players[0].name;
		}
		var d = new Date(m.metadata.updated);
		a.text(match_name + ', ' + _get_datetime_str(d));
		a.on('click', function(e) {
			e.preventDefault();
			resume_match(m);
			hide_settings(true);
		});
		li.append(a);
		var del_btn = $('<button class="button_delete image-button textsize-button"><span></span></button>');
		del_btn.on('click', function() {
			delete_match(m.metadata.id);
			ui_settings_load_list();
		});
		li.append(del_btn);
		match_list.append(li);
	});
}

function ui_show_exception_dialog() {
	$('#exception_wrapper').show();
	ui_esc_stack_push(function() {
		ui_hide_exception_dialog();
	});
}

function ui_hide_exception_dialog() {
	ui_esc_stack_pop();
	$('#exception_wrapper').hide();
}

function demo_match_start() {
	var setup = {
		counting: '3x21',
		is_doubles: true,
		teams: [{
			name: '1.BC Beuel',
			players: [{
				name: 'Max Weißkirchen'
			}, {
				name: 'Birgit Michels'
			}]
		}, {
			name: '1.BC Sbr.-Bischmisheim',
			players: [{
				name: 'Michael Fuchs'
			}, {
				name: 'Samantha Barning'
			}]
		}],
		match_name: 'GD',
		event_name: 'BCB - BCB (Demo)',
		tournament_name: 'Demo',
		team_competition: true,
	};

	hide_settings(true);
	start_match(state, setup);
}

var _network_reload_interval = null;
function show_settings() {
	var wrapper = $('#settings_wrapper');
	if (wrapper.attr('data-settings-visible') == 'true') {
		return;
	}
	wrapper.attr('data-settings-visible', 'true');

	wrapper.show();
	if (state.courtspot) {
		$('.setup_network_container').show();
		$('.setup_show_manual').show();
		$('#setup_manual_form').hide();
		$('#setup_network_matches').attr('data-network-type', 'courtspot');
		network.ui_list_matches(state);
	} else if (networks.btde) {
		$('.setup_network_container').show();
		$('.setup_show_manual').show();
		$('#setup_manual_form').hide();
		$('#setup_network_matches').attr('data-network-type', 'btde');
		network.ui_list_matches(state);
		if (_network_reload_interval === null) {
			_network_reload_interval = window.setInterval(function() {
				network.ui_list_matches(state, 'btde', true);
			}, 10000);
		}
	} else {
		$('.setup_network_container').hide();
		$('#setup_manual_form').show();
	}
	ui_esc_stack_push(function() {
		hide_settings();
	});
	ui_settings_load_list();
	$('.extended_options').toggle(state.initialized);
}

function hide_settings(force) {
	if (!force && !state.initialized) {
		return;
	}
	if (_network_reload_interval) {
		window.clearInterval(_network_reload_interval);
		_network_reload_interval = null;
	}
	var wrapper = $('#settings_wrapper');
	if (wrapper.attr('data-settings-visible') == 'false') {
		return;
	}


	wrapper.hide();
	ui_esc_stack_pop();
	wrapper.attr('data-settings-visible', 'false');
}

function resume_match(s) {
	state = s;
	s.initialized = true;
	calc.state(s);
	render.ui_render(state);
}

function start_match(s, setup) {
	calc.init_state(s, setup);
	calc.state(s);
	render.ui_render(s);
	network.send_press(s, {
		type: '_start_match'
	});
}

function on_press(press, s) {
	if (s === undefined) {
		s = state;
	}

	press.timestamp = Date.now();
	s.presses.push(press);

	on_presses_change(s);
	network.send_press(s, press);
}

function on_presses_change(s) {
	calc.state(s);
	if (s.match.finish_confirmed) {
		if (! settings.save_finished_matches) {
			delete_match(s.metadata.id);
		}
		s.metadata = {};
		s.initialized = false;
		show_settings();
	} else {
		store_match(s);
		render.ui_render(s);
	}
}

// Team name as presented to the umpire
function calc_teamtext_internal(s, team_id) {
	var player_names;
	if (s.setup.is_doubles) {
		player_names = (
			s.setup.teams[team_id].players[0].name + ' / ' +
			s.setup.teams[team_id].players[1].name);
	} else {
		player_names = s.setup.teams[team_id].players[0].name;
	}

	if (s.setup.team_competition) {
		return s.setup.teams[team_id].name + ' (' + player_names + ')';
	} else {
		return player_names;
	}
}


function ui_show_picker(obj) {
	obj.show();
	var first_button = obj.find('button:first');
	first_button.addClass('auto-focused');
	first_button.focus();
	var kill_special_treatment = function() {
		first_button.removeClass('auto-focused');
		first_button.off('blur', kill_special_treatment);
	};
	first_button.on('blur', kill_special_treatment);
}

function store_match(s) {
	if (! window.localStorage) {
		show_error('localStorage unavailable');
		return;
	}

	var presses = s.presses;
	if (presses && presses[presses.length - 1].type == 'postmatch-confirm') {
		presses = presses.slice(0, presses.length - 1);
	}
	var cleaned_s = {
		metadata: s.metadata,
		setup: s.setup,
		presses: presses,
	};
	try {
		window.localStorage.setItem('bup_match_' + s.metadata.id, JSON.stringify(cleaned_s));
	} catch(e) {
		show_error('Failed to store match ' + s.metadata.id, e);
	}
}

function load_matches() {
	if (! window.localStorage) {
		show_error('localStorage unavailable');
		return;
	}

	var res = [];
	for (var i = 0;i < window.localStorage.length;i++) {
		var k = window.localStorage.key(i);
		if (! k.match(/^bup_match_/)) {
			continue;
		}

		var m = JSON.parse(window.localStorage.getItem(k));
		res.push(m);
	}
	return res;
}

function delete_match(match_id) {
	window.localStorage.removeItem('bup_match_' + match_id);
}

function settings_load() {
	if (! window.localStorage) {
		show_error('localStorage unavailable');
		return;
	}

	var s = window.localStorage.getItem('bup_settings');
	if (s) {
		var new_settings = JSON.parse(s);
		settings = $.extend(settings, new_settings);
	}
}

function settings_store() {
	if (! window.localStorage) {
		show_error('localStorage unavailable');
		return;
	}

	window.localStorage.setItem('bup_settings', JSON.stringify(settings));
}

function init() {
	settings_load();
}


var _settings_checkboxes = ['save_finished_matches', 'go_fullscreen', 'show_pronounciation'];
var _settings_textfields = ['umpire_name', 'court_id', 'court_description', 'network_timeout'];
function ui_settings_update() {
	_settings_checkboxes.forEach(function(name) {
		var box = $('.settings [name="' + name + '"]');
		box.prop('checked', settings[name]);
	});

	_settings_textfields.forEach(function(name) {
		var input = $('.settings [name="' + name + '"]');
		input.val(settings[name] ? settings[name] : '');
	});
	render.ui_court_str();
}

function ui_init_settings() {
	_settings_checkboxes.forEach(function(name) {
		var box = $('.settings [name="' + name + '"]');
		box.on('change', function() {
			settings[name] = box.prop('checked');
			if ((name === 'show_pronounciation') && (state.initialized)) {
				render.ui_render(state);
			}
			settings_store();
		});
	});

	_settings_textfields.forEach(function(name) {
		var input = $('.settings [name="' + name + '"]');
		input.on('change input', function() {
			settings[name] = input.val();
			if ((name === 'court_id') || (name === 'court_description')) {
				render.ui_court_str();
			}
			settings_store();
		});
	});

	$('.setup_show_manual').on('click', function(e) {
		e.preventDefault();
		$('.setup_show_manual').hide();
		$('#setup_manual_form').show(200);
		return false;
	});

	ui_fullscreen_init();
	$('.fullscreen_button').on('click', function() {
		ui_fullscreen_toggle();
	});

	ui_settings_update();
}

var _editmode_last_click = 0;
function editmode_enter() {
	$('.editmode_leave,.editmode_arrow,.editmode_change-ends,.editmode_switch_left,.editmode_switch_right').show();
	$('.editmode_ok').attr('disabled', 'disabled');
	$('.editmode_button').text('Manuelles Bearbeiten abbrechen');
	$('#score td.score input').show();
	$('#score td.score span').hide();
	$('#game').addClass('editmode');
}

function editmode_leave() {
	$('#game').removeClass('editmode');
	$('.editmode_leave,.editmode_arrow,.editmode_change-ends,.editmode_switch_left,.editmode_switch_right').hide();
	$('.editmode_button').text('Manuell bearbeiten');
	$('#score td.score input').hide();
	$('#score td.score span').show();
}

function editmode_init() {
	$('.editmode_button').on('click', function() {
		if ($('#game').hasClass('editmode')) {
			editmode_leave();
		} else {
			editmode_enter();
		}
		hide_settings();
	});
	$('#court').on('click', function(e) {
		if (e.target.tagName.toLowerCase() == 'button') {
			return;
		}

		var now = Date.now();
		if (now - _editmode_last_click < DOUBLE_CLICK_TIMEOUT) {
			_editmode_last_click = 0;
			editmode_enter();
		} else {
			_editmode_last_click = now;
		}
		return true;
	});

	$('.editmode_leave').on('click', function() {
		editmode_leave();
	});
	$('.editmode_change-ends').on('click', function() {
		on_press({
			type: 'editmode_change-ends'
		});
	});
	$('.editmode_switch_left').on('click', function() {
		on_press({
			type: 'editmode_switch-sides',
			side: 'left'
		});
	});
	$('.editmode_switch_right').on('click', function() {
		on_press({
			type: 'editmode_switch-sides',
			side: 'right'
		});
	});
	$('.editmode_arrow').on('click', function() {
		on_press({
			type: 'editmode_change-serve',
		});
	});
}

var ui_timer = null;
function ui_set_timer(timer) {
	if (ui_timer) {
		window.clearTimeout(ui_timer);
	}

	if (ui_update_timer()) {
		$('.timer_container').show();
	}
}

function ui_update_timer() {
	if (! state.timer) {
		ui_remove_timer();
		return;
	}

	var remaining = state.timer.start + state.timer.duration - Date.now();
	remaining = Math.max(0, remaining);
	var remaining_val = Math.round(remaining / 1000);
	if (remaining_val >= 60) {
		remaining_val = Math.floor(remaining_val / 60) + ':' + _add_zeroes(remaining_val % 60);
	}
	var timer_el = $('.timer');
	timer_el.text(remaining_val);
	if (state.timer.exigent && (remaining <= state.timer.exigent)) {
		timer_el.addClass('timer_exigent');
	} else {
		timer_el.removeClass('timer_exigent');
	}
	if (remaining <= 0) {
		ui_remove_timer();
		return;
	}

	var remaining_ms = Math.max(10, remaining % 1000);
	ui_timer = window.setTimeout(ui_update_timer, remaining_ms);
	return true;
}

function ui_remove_timer() {
	if (ui_timer) {
		window.clearTimeout(ui_timer);
		ui_timer = null;
		$('.timer_container').fadeOut(500);
	}
}

function ui_init() {
	$('#script_jspdf').on('load', scoresheet.jspdf_loaded);
	editmode_init();
	$('.backtogame_button').on('click', function() {
		hide_settings();
	});

	scoresheet.ui_init();

	$('#setup_manual_form [name="gametype"]').on('change', function() {
		var new_type = $('#setup_manual_form [name="gametype"]:checked').val();
		var is_doubles = new_type == 'doubles';
		$('#setup_manual_form .only-doubles').toggle(is_doubles);

		$('.setup_players_manual [data-doubles-rowspan]').each(function(_, cell) {
			var $cell = $(cell);
			$cell.attr('rowspan', $cell.attr(is_doubles ? 'data-doubles-rowspan' : 'data-singles-rowspan'));
		});
	});

	$('.settings_layout').on('click', function(e) {
		if (e.target != this) {
			return;
		}
		hide_settings();
	});
	$('#exception_wrapper').on('click', function(e) {
		if (e.target != this) {
			return;
		}
 		ui_hide_exception_dialog();
	});

	$('#setup_manual_form').on('submit', function(e) {
		e.preventDefault();

		function _player_formval(input_name, def) {
			return {
				name: _formval(input_name, def)
			};
		}

		function _formval(input_name, def) {
			var val = $('#setup_manual_form [name="' + input_name + '"]').val();
			if (! val) {
				val = def;
			}
			return val;
		}

		var team1, team2;
		var setup = {
			is_doubles: $('#setup_manual_form [name="gametype"]:checked').val() == 'doubles',
			counting: '3x21'
		};

		setup.team_competition = $('#setup_manual_form [name="team_competition"]').prop('checked');
		setup.match_name = _formval('match_name');
		setup.event_name = _formval('event_name');
		setup.tournament_name = _formval('tournament_name');

		if (setup.is_doubles &&
				!_formval('team1_player1') && !_formval('team1_player2') &&
				!_formval('team2_player1') && !_formval('team2_player2') &&
				!_formval('team1_name') && !_formval('team2_name') &&
				!setup.match_name &&
				!setup.event_name &&
				!setup.tournament_name) {
			// Demo mode
			return demo_match_start();
		}

		if (setup.is_doubles) {
			team1 = [_player_formval('team1_player1', 'Left A'), _player_formval('team1_player2', 'Left B')];
			team2 = [_player_formval('team2_player1', 'Right C'), _player_formval('team2_player2', 'Right D')];
		} else {
			team1 = [_player_formval('team1_player1', 'Left')];
			team2 = [_player_formval('team2_player1', 'Right')];
		}
		setup.teams = [{
			'players': team1,
			'name': _formval('team1_name', (setup.team_competition ? (setup.is_doubles ? 'AB team' : 'Left team') : null)),
		}, {
			'players': team2,
			'name': _formval('team2_name', (setup.team_competition ? (setup.is_doubles ? 'CD team' : 'Right team') : null)),
		}];

		hide_settings(true);
		start_match(state, setup);
	});
	$('#pick_side_team1').on('click', function() {
		on_press({
			type: 'pick_side',
			team1_left: true,
		});
	});
	$('#pick_side_team2').on('click', function() {
		on_press({
			type: 'pick_side',
			team1_left: false,
		});
	});
	$('#love-all').on('click', function() {
		on_press({
			type: 'love-all'
		});
	});
	$('#postgame-confirm').on('click', function() {
		on_press({
			type: 'postgame-confirm'
		});
	});
	$('#postmatch-confirm').on('click', function() {
		on_press({
			type: 'postmatch-confirm'
		});
	});
	$('#left_score').on('click', function() {
		on_press({
			type: 'score',
			side: 'left'
		});
	});
	$('#right_score').on('click', function() {
		on_press({
			type: 'score',
			side: 'right'
		});
	});
	$('#button_undo').on('click', function() {
		on_press({
			type: 'undo',
		});
	});
	$('#button_redo').on('click', function() {
		on_press({
			type: 'redo',
		});
	});

	$('#button_settings').on('click', function() {
		show_settings();
	});
	$('#button_exception').on('click', function() {
		ui_show_exception_dialog();
	});
	$('.exception_dialog>.cancel-button').on('click', function() {
		ui_hide_exception_dialog();
	});
	$('#exception_referee').on('click', function() {
		on_press({
			type: 'referee',
		});
		ui_hide_exception_dialog();
	});
	$('#exception_interruption').on('click', function() {
		on_press({
			type: 'interruption',
		});
		ui_hide_exception_dialog();
	});
	$('#exception_correction').on('click', function() {
		ui_hide_exception_dialog();
		_ui_make_team_pick(
			state, 'Vertauschung Aufschlagfeld', 'correction', ui_show_exception_dialog
		);
	});
	$('#exception_overrule').on('click', function() {
		on_press({
			'type': 'overrule',
		});
		ui_hide_exception_dialog();
	});
	$('#button_shuttle').on('click', function() {
		on_press({
			'type': 'shuttle',
		});
	});
	$('#exception_yellow').on('click', function() {
		ui_hide_exception_dialog();
		_ui_make_player_pick(
			state, 'Verwarnung (Gelbe Karte)', 'yellow-card', ui_show_exception_dialog,
			function(btn, team_id, player_id) {
				if (state.match.carded[team_id]) {
					btn.prepend('<span class="yellow-card-image"></span>');
					btn.attr('disabled', 'disabled');
				}
			}
		);
	});
	$('#exception_red').on('click', function() {
		ui_hide_exception_dialog();
		_ui_make_player_pick(state, 'Fehlerwarnung (rote Karte)', 'red-card', ui_show_exception_dialog);
	});
	$('#exception_injury').on('click', function() {
		ui_hide_exception_dialog();
		_ui_make_player_pick(state, 'Verletzung', 'injury', ui_show_exception_dialog);
	});
	$('#exception_retired').on('click', function() {
		ui_hide_exception_dialog();
		_ui_make_player_pick(state, 'Aufgegeben', 'retired', ui_show_exception_dialog);
	});
	$('#exception_black').on('click', function() {
		ui_hide_exception_dialog();
		_ui_make_player_pick(state, 'Disqualifiziert (schwarze Karte)', 'disqualified', ui_show_exception_dialog);
	});


	Mousetrap.bind('x', function() {
		if (state.initialized) {
			ui_show_exception_dialog();
		}
	});
	Mousetrap.bind('s', function() {
		if (state.initialized) {
			show_settings();
		}
	});
	Mousetrap.bind('e', function() {
		if (state.initialized) {
			editmode_enter();
		}
	});
	Mousetrap.bind('shift+s', function() {
		scoresheet.ui_show();
	});

	ui_init_settings();

	var hash_query = _parse_query_string(window.location.hash.substr(1));
	if (hash_query.liveaw_match_id) {
		liveaw_init(hash_query.liveaw_match_id);
	} else if (hash_query.courtspot_court) {
		courtspot.ui_init(state, hash_query.courtspot_court);
	} else if (hash_query.btde !== undefined) {
		networks.btde = btde();
		networks.btde.ui_init(state);
	} else if (hash_query.demo !== undefined) {
		demo_match_start();
	} else {
		show_settings();
	}

	if (settings.go_fullscreen && _ui_fullscreen_supported()) {
		var go_fullscreen_hide = function() {
			ui_esc_stack_pop();
			$('#go_fullscreen_wrapper').hide();
		}

		$('.go_fullscreen_normal').on('click', function(e) {
			e.preventDefault();
			go_fullscreen_hide();
			return false;
		});
		$('.go_fullscreen_go').on('click', function(e) {
			e.preventDefault();
			go_fullscreen_hide();
			_ui_fullscreen_start();
			return false;
		});
		ui_esc_stack_push(go_fullscreen_hide);
		$('#go_fullscreen_wrapper').on('click', go_fullscreen_hide);
		$('#go_fullscreen_wrapper').show();
	}
}

if (typeof $ !== 'undefined') {
	init();
	$(ui_init);
}

if ((typeof module !== 'undefined') && (typeof require !== 'undefined')) {
	var utils = require('./utils');
	var calc = require('./calc');
	var render = require('./render');
	var scoresheet = require('./scoresheet');
	var network = require('./network');
	var pronounciation = require('./pronounciation');

	module.exports = {
		utils: utils,
		calc: calc,
		pronounciation: pronounciation,
		network: network,
		scoresheet: scoresheet,
		_duration_str: _duration_str,
	};
}
