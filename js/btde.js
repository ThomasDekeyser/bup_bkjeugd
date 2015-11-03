var btde = (function(baseurl) {
'use strict';

var ALL_COURTS = [{
	label: '1 (links)',
	court_id: '1',
	court_description: 'links',
}, {
	label: '2 (rechts)',
	court_id: '2',
	court_description: 'rechts',
}];

function ui_render_login(container) {
	var login_form = $('<form class="settings_login">');
	login_form.append($('<h2>Login badmintonticker</h2>'));
	var login_error = $('<div class="network_error"></div>');
	login_form.append(login_error);
	login_form.append($('<input name="benutzer" type="text" placeholder="Benutzername">'));
	login_form.append($('<input name="passwort" type="password" placeholder="Passwort">'));
	var login_button = $('<button class="login_button"/>');
	login_form.append(login_button);
	var loading_icon = $('<div class="default-invisible loading-icon" />');
	login_button.append(loading_icon);
	login_button.append($('<span>Anmelden</span>'));
	container.append(login_form);
	login_form.on('submit', function(e) {
		e.preventDefault();
		loading_icon.show();
		login_button.attr('disabled', 'disabled');

		$.ajax({
			dataType: 'text',
			url: baseurl + 'login/',
			method: 'POST',
			data: login_form.serializeArray(),
			contentType: 'application/x-www-form-urlencoded',
			timeout: state.settings.network_timeout,
		}).done(function(res) {
			loading_icon.hide();
			login_button.removeAttr('disabled');

			var m = /<div class="login">\s*<p class="rot">([^<]*)</.exec(res);
			var msg = 'Login fehlgeschlagen';
			if (m) {
				msg = m[1];
			} else if (/<div class="logout">/.exec(res)) {
				// Successful
				network.errstate('all', null);
				return;
			}

			login_error.text(msg);
			network.errstate('btde.login', {
				msg: 'Login fehlgeschlagen',
			});
		}).fail(function(xhr) {
			var code = xhr.status;
			loading_icon.hide();
			login_button.removeAttr('disabled');
			login_error.text('Login fehlgeschlagen (Fehler ' + code + ')');
			network.errstate('btde.login', {
				msg: 'Login fehlgeschlagen (Fehler ' + code + ')',
			});
		});

		return false;
	});
}

function _request(s, options, cb) {
	options.dataType = 'text';
	options.timeout = s.settings.network_timeout;
	$.ajax(options).done(function(res) {
		if (/<div class="login">/.exec(res)) {
			return cb({
				type: 'login-required',
				msg: 'Login erforderlich',
			}, res);
		}
		return cb(null, res);
	}).fail(function(xhr) {
		var msg = ((xhr.status === 0) ?
			'badmintonticker nicht erreichbar' :
			('Netzwerk-Fehler (Code ' + xhr.status + ')')
		);
		return cb({
			type: 'network-error',
			status: xhr.status,
			msg: msg,
		});
	});
}

function send_score(s) {
	var netscore = network.calc_score(s);

	/* // badminticker requirements - show 0:0 before match start
	if (netscore.length === 0) {
		netscore = [[0, 0]];
	}
	*/

	var post_data = {
		id: s.setup.btde_match_id,
		feld: s.settings.court_id,
	};
	netscore.forEach(function(score, game_idx) {
		post_data['satz' + (game_idx + 1)] = '' + score[0];
		post_data['satz' + (3 + game_idx + 1)] = '' + score[1];
	});
	for (var i = 1;i <= 6;i++) {
		if (post_data['satz' + i] === undefined) {
			post_data['satz' + i] = '';
		}
	}

	_request(s, {
		method: 'POST',
		url: baseurl + 'login/write.php',
		data: JSON.stringify(post_data),
		contentType: 'application/json; charset=utf-8',
	}, function(err) {
		if (!err) {
			s.remote.btde_score = netscore;
			s.remote.btde_court = s.settings.court_id;
		}
		network.errstate('btde.score', err);
	});
}

function sync(s) {
	var netscore = network.calc_score(s);
	if ((s.settings.court_id != s.remote.btde_court) || !utils.deep_equal(netscore, s.remote.btde_score)) {
		send_score(s);
	}
}

/* s, press */
function send_press(s) {
	sync(s);
}

function _parse_match_list(html) {
	var m = /<table style="width:720px;">([\s\S]*?)<\/table>/.exec(html);
	if (! m) {
		return {};
	}

	var table_html = m[1];

	m = /<td colspan="3">([^<]+?)\s*[0-9]+\s*:\s*[0-9]+\s*([^<]+?)<\/td>/.exec(table_html);
	var home_team_name = null;
	var away_team_name = null;
	if (m) {
		home_team_name = m[1];
		away_team_name = m[2];
	}

	var matches = [];
	var game_re = utils.multiline_regexp([
		/<td rowspan="2">([^<]+)<\/td>\s*/,
		/<td>([^\/,<]+),\s*([^\/,<]+)(?:\/([^\/,<]+),\s*([^\/,<]+))?<\/td>\s*/,
		/<td><input type="number" name="Satz1([^"]+)" placeholder="([0-9]*)"><\/td>\s*/,
		/<td><input type="number" name="Satz2[^"]+" placeholder="([0-9]*)"><\/td>\s*/,
		/<td><input type="number" name="Satz3[^"]+" placeholder="([0-9]*)"><\/td>\s*/,
		/<\/tr>\s*<tr>\s*/,
		/<td>([^\/,<]+),\s*([^\/,<]+)(?:\/([^\/,<]+),\s*([^\/,<]+))?<\/td>\s*/,
		/<td><input type="number" name="Satz4[^"]+" placeholder="([0-9]*)"><\/td>\s*/,
		/<td><input type="number" name="Satz5[^"]+" placeholder="([0-9]*)"><\/td>\s*/,
		/<td><input type="number" name="Satz6[^"]+" placeholder="([0-9]*)"><\/td>\s*/,
	], 'g');
	while ((m = game_re.exec(table_html)) !== null) {
		var home_p1 = {
			firstname: m[3],
			lastname: m[2],
		};
		home_p1.name = home_p1.firstname + ' ' + home_p1.lastname;
		var home_team = {
			name: home_team_name,
			players: [home_p1],
		};
		if (m[4]) {
			var home_p2 = {
				firstname: m[5],
				lastname: m[4],
			};
			home_p2.name = home_p2.firstname + ' ' + home_p2.lastname;
			home_team.players.push(home_p2);
		}

		var away_p1 = {
			firstname: m[11],
			lastname: m[10],
		};
		away_p1.name = away_p1.firstname + ' ' + away_p1.lastname;
		var away_team = {
			name: away_team_name,
			players: [away_p1],
		};
		if (m[12]) {
			var away_p2 = {
				firstname: m[13],
				lastname: m[12],
			};
			away_p2.name = away_p2.firstname + ' ' + away_p2.lastname;
			away_team.players.push(away_p2);
		}

		var network_score = [];
		for (var game_idx = 0;game_idx < 3;game_idx++) {
			var home_score_str = m[7 + game_idx];
			var away_score_str = m[14 + game_idx];
			if (home_score_str !== '' && away_score_str !== '') {
				network_score.push([
					parseInt(home_score_str, 10),
					parseInt(away_score_str, 10),
				]);
			}
		}

		var match_id = 'btde_' + utils.iso8601(new Date()) + '_' + m[1] + '_' + home_team_name + '-' + away_team_name;

		matches.push({
			setup: {
				counting: '3x21',
				match_name: m[1],
				is_doubles: home_team.players.length == 2,
				teams: [home_team, away_team],
				btde_match_id: m[6],
				team_competition: true,
				match_id: match_id,
			},
			network_score: network_score,
		});
	}
	return {
		event_name: home_team_name + ' - ' + away_team_name,
		matches: matches,
	};
}

function list_matches(s, cb) {
	_request(s, {
		url: baseurl + 'login/punkte.php',
	}, function(err, html) {
		if (err) {
			return cb(err);
		}

		return cb(null, _parse_match_list(html));
	});
}

function ui_init() {
	if (!baseurl) {
		baseurl = '../';
	}
	var m = window.location.pathname.match(/^(.*\/)[^\/]+\/bup(?:\/(?:bup\.html)?)?$/);
	if (m) {
		baseurl = m[1];
	}

	$('.setup_network_container').show();
	show_settings();

	var configured = ALL_COURTS.some(function(c) {
		return state.settings.court_id == c.court_id && state.settings.court_description == c.court_description;
	});
	if (! configured) {
		_ui_make_pick('Feld auswählen', ALL_COURTS, function(c) {
			state.settings.court_id = c.court_id;
			state.settings.court_description = c.court_description;
			settings.store(state);
			ui_settings_update();
		}, false, $('body'));
	}
}


return {
	ui_init: ui_init,
	ui_render_login: ui_render_login,
	send_press: send_press,
	list_matches: list_matches,
	sync: sync,
};

});


if ((typeof module !== 'undefined') && (typeof require !== 'undefined')) {
	var utils = require('./utils');

	module.exports = btde;
}
