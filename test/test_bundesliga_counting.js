var assert = require('assert');

var tutils = require('./tutils');
var _describe = tutils._describe;
var _it = tutils._it;

var press_score = tutils.press_score;
var state_after = tutils.state_after;
var bup = tutils.bup;

(function() {
'use strict';


var DOUBLES_SETUP = bup.utils.deep_copy(tutils.DOUBLES_SETUP);
DOUBLES_SETUP.counting = '2x21+11';
var SINGLES_SETUP = bup.utils.deep_copy(tutils.SINGLES_SETUP);
SINGLES_SETUP.counting = '2x21+11';


_describe('Bundesliga 2016 counting', function() {
	_it('go through a whole match', function() {
		var presses = [{
			type: 'pick_side',
			team1_left: true,
		}, {
			type: 'pick_server',
			team_id: 0,
			player_id: 0,
		}];
		press_score(presses, 21, 19);
		presses.push({
			type: 'postgame-confirm',
		});
		presses.push({
			type: 'love-all',
		});
		press_score(presses, 10, 7);
		presses.push({
			type: 'score',
			side: 'left',
			timestamp: 1000,
		});
		
		var s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [7, 11]);
		assert.strictEqual(s.game.interval, true);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, {
			duration: 60 * 1000,
			exigent: 20499,
			start: 1000,
		});

		press_score(presses, 10, 10);
		presses.push({
			type: 'postgame-confirm',
		});
		presses.push({
			type: 'love-all',
		});
		press_score(presses, 5, 4);
		
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [5, 4]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		presses.push({
			type: 'score',
			side: 'left',
			timestamp: 2000,
		});
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [6, 4]);
		assert.strictEqual(s.game.interval, true);
		assert.strictEqual(s.game.change_sides, true);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, {
			duration: 60 * 1000,
			exigent: 20499,
			start: 2000,
		});

		presses.push({
			type: 'score',
			side: 'left',
		});
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [6, 5]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		presses.push({
			type: 'score',
			side: 'left',
		});
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [6, 6]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		press_score(presses, 3, 3);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [9, 9]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);
		var base_presses = presses.slice();

		press_score(presses, 1, 0);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [9, 10]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, true);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		presses = base_presses.slice();
		press_score(presses, 0, 1);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [10, 9]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, true);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);
		base_presses = presses.slice();

		press_score(presses, 0, 1);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [11, 9]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, true);
		assert.strictEqual(s.game.team1_won, true);
		assert.strictEqual(s.match.team1_won, true);
		assert.deepStrictEqual(s.timer, false);

		presses = base_presses.slice();
		press_score(presses, 1, 0);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [10, 10]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		press_score(presses, 1, 0);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [10, 11]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		base_presses = presses.slice();
		press_score(presses, 1, 0);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [10, 12]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, true);
		assert.strictEqual(s.game.finished, true);
		assert.strictEqual(s.match.finished, true);
		assert.strictEqual(s.game.team1_won, false);
		assert.strictEqual(s.match.team1_won, false);
		assert.deepStrictEqual(s.timer, false);

		presses = base_presses.slice();
		press_score(presses, 0, 1);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [11, 11]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		press_score(presses, 0, 1);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [12, 11]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		press_score(presses, 1, 0);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [12, 12]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		press_score(presses, 0, 1);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [13, 12]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		base_presses = presses.slice();
		press_score(presses, 0, 1);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [14, 12]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, true);
		assert.strictEqual(s.match.finished, true);
		assert.strictEqual(s.game.finished, true);
		assert.strictEqual(s.match.finished, true);
		assert.strictEqual(s.game.team1_won, true);
		assert.strictEqual(s.match.team1_won, true);
		assert.deepStrictEqual(s.timer, false);

		presses = base_presses.slice();
		press_score(presses, 1, 0);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [13, 13]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		press_score(presses, 1, 0);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [13, 14]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, true);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		base_presses = presses.slice();
		press_score(presses, 1, 0);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [13, 15]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, true);
		assert.strictEqual(s.game.finished, true);
		assert.strictEqual(s.match.finished, true);
		assert.strictEqual(s.game.team1_won, false);
		assert.strictEqual(s.match.team1_won, false);
		assert.deepStrictEqual(s.timer, false);

		presses = base_presses.slice();
		press_score(presses, 0, 1);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [14, 14]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, true);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, false);
		assert.strictEqual(s.game.finished, false);
		assert.strictEqual(s.match.finished, false);
		assert.strictEqual(s.game.team1_won, null);
		assert.strictEqual(s.match.team1_won, null);
		assert.deepStrictEqual(s.timer, false);

		base_presses = presses.slice();
		press_score(presses, 0, 1);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [15, 14]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, true);
		assert.strictEqual(s.game.finished, true);
		assert.strictEqual(s.match.finished, true);
		assert.strictEqual(s.game.team1_won, true);
		assert.strictEqual(s.match.team1_won, true);
		assert.deepStrictEqual(s.timer, false);

		presses = base_presses.slice();
		press_score(presses, 1, 0);
		s = state_after(presses, SINGLES_SETUP);
		assert.deepStrictEqual(s.game.score, [14, 15]);
		assert.strictEqual(s.game.interval, false);
		assert.strictEqual(s.game.change_sides, false);
		assert.strictEqual(s.game.matchpoint, false);
		assert.strictEqual(s.game.gamepoint, false);
		assert.strictEqual(s.game.game, true);
		assert.strictEqual(s.game.finished, true);
		assert.strictEqual(s.match.finished, true);
		assert.strictEqual(s.game.team1_won, false);
		assert.strictEqual(s.match.team1_won, false);
		assert.deepStrictEqual(s.timer, false);
	});

	_it('game_winner helper function', function() {
		assert.equal(bup.calc.game_winner('2x21+11', 0, 21, 19), 'left');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 19, 21), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 22, 20), 'left');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 25, 27), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 29, 30), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 28, 30), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 0, 0), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 20, 19), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 25, 26), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 29, 29), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 22, 19), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 32, 30), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 30, 31), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 30, 30), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 0, 28, 25), 'invalid');

		assert.equal(bup.calc.game_winner('2x21+11', 1, 21, 19), 'left');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 19, 21), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 22, 20), 'left');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 25, 27), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 29, 30), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 28, 30), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 0, 0), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 20, 19), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 25, 26), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 29, 29), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 22, 19), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 32, 30), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 30, 31), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 30, 30), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 1, 28, 25), 'invalid');

		assert.equal(bup.calc.game_winner('2x21+11', 2, 11, 9), 'left');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 9, 11), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 12, 10), 'left');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 13, 11), 'left');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 12, 14), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 14, 15), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 13, 15), 'right');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 0, 0), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 10, 9), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 11, 12), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 14, 14), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 12, 12), 'inprogress');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 22, 19), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 21, 19), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 17, 15), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 15, 16), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 14, 11), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 15, 15), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 15, 11), 'invalid');
		assert.equal(bup.calc.game_winner('2x21+11', 2, 20, 20), 'invalid');

	});
});

})();