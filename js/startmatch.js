var startmatch = (function() {
'use strict';

function ui_init() {	
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
		settings.hide();
	});
	$('#exception_wrapper').on('click', function(e) {
		if (e.target != this) {
			return;
		}
		control.hide_exception_dialog();
	});

	$('#setup_manual_form').on('submit', function(e) {
		e.preventDefault();

		function _player_formval(input_name, def) {
			return {
				name: _formval(input_name, def),
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
			counting: '3x21',
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
			return control.demo_match_start();
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

		settings.hide(true);
		control.start_match(state, setup);
	});
}

return {
	ui_init: ui_init,
};

})();

/*@DEV*/
if ((typeof module !== 'undefined') && (typeof require !== 'undefined')) {
	var control = require('./control');

	module.exports = startmatch;
}
/*/@DEV*/
