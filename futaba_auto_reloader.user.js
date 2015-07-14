// ==UserScript==
// @name           futaba auto reloader
// @namespace   https://github.com/himuro-majika
// @description    赤福Firefox版の"リロードの代わりに続きを読む"を有効にして自動更新しちゃう(実況モードもあるよ！)
// @include     http://*.2chan.net/*/res/*
// @include     http://board.futakuro.com/*/res/*
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min.js
// @version     1.3
// @grant       none
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAAPUExURYv4i2PQYy2aLUe0R////zorx9oAAAAFdFJOU/////8A+7YOUwAAAElJREFUeNqUj1EOwDAIQoHn/c88bX+2fq0kRsAoUXVAfwzCttWsDWzw0kNVWd2tZ5K9gqmMZB8libt4pSg6YlO3RnTzyxePAAMAzqMDgTX8hYYAAAAASUVORK5CYII=
// ==/UserScript==
this.$ = this.jQuery = jQuery.noConflict(true);

(function ($) {
	/*
	 *	設定
	 */
	var USE_SOUDANE = true;					//そうだねをハイライト表示する
	var USE_CLEAR_BUTTON = true;			//フォームにクリアボタンを表示する
	var USE_TITLE_NAME = true;				//新着レス数・スレ消滅状態をタブに表示する
	var RELOAD_INTERVAL_NORMAL = 60000;		//リロード間隔[ミリ秒](通常時)
	var RELOAD_INTERVAL_LIVE = 5000;		//リロード間隔[ミリ秒](実況モード時)
	var LIVE_SCROLL_INTERVAL = 12;			//実況モードスクロール間隔[ミリ秒]
	var LIVE_SCROLL_SPEED = 2;				//実況モードスクロール幅[px]
	var LIVE_TOGGLE_KEY = "76";				//実況モードON・OFF切り替えキーコード(With Ctrl)

	var live_flag = false;	//実況モード有効フラグ
	var res = 0;	//新着レス数
	var timerNormal, timerLiveReload, timerLiveScroll;
	var liveButton;
	var url = location.href;
	var script_name = "futaba_auto_reloader";

	//通常時60秒おきにリロード
	if(!isFileNotFound()){
		timerNormal = setInterval(rel, RELOAD_INTERVAL_NORMAL);
	}

	soudane();
	makeFormClearButton();
	reset_title();
	make_live_button();

	function isFileNotFound() {
		if(document.title == "404 File Not Found") {
			return true;
		}
		else {
			console.log(script_name + ": Start auto reloading @" + url);
			return false;
		}
	}

	function make_live_button() {
		liveButton = document.createElement("a");
		liveButton.id = "relButton";
		liveButton.style.cursor = 'pointer';
		liveButton.innerHTML = "[実況モード(Alt+" + String.fromCharCode(LIVE_TOGGLE_KEY) + ")]";

		var input = document.evaluate(
			"//input[@value='返信する' or @value='送信する']",
			document,
			null,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null);

		for (var i = 0; i < input.snapshotLength; i++) {
			var submit = input.snapshotItem(i);
			var tr = submit.parentNode;
			tr.appendChild(liveButton);
			liveButton.addEventListener("click", liveMode, true);
		}

		//実況モードトグルショートカットキー
		window.addEventListener("keydown",function(e) {
			if ( e.altKey && e.keyCode == LIVE_TOGGLE_KEY ) {
				liveMode();
			}
		}, false);
	}

	/*
	 * 実況モード
	 * メソッド呼出ごとにON/OFFトグル
	 */
	function liveMode() {
		if (!live_flag) {
			//実況モード時リロード
			timerLiveReload = setInterval(rel_scroll, RELOAD_INTERVAL_LIVE);
			//自動スクロール
			timerLiveScroll = setInterval(live_scroll, LIVE_SCROLL_INTERVAL);
			liveButton.style.backgroundColor = '#ffa5f0';
			console.log(script_name + ": Start live mode @" + url);
			live_flag = true;
		} else {
			clearInterval(timerLiveReload);
			clearInterval(timerLiveScroll);
			liveButton.style.background = 'none';
			console.log(script_name + ": Stop live mode @" + url);
			live_flag = false;
		}

		//新着スクロール
		function rel_scroll() {
			$('html, body').animate(
				{scrollTop:window.scrollMaxY},"fast"
			);
			if(isAkahukuNotFound()){
				//404時
				liveMode();
			}
			else {
				location.reload();
			}
		}

		function live_scroll() {
			window.scrollBy( 0, LIVE_SCROLL_SPEED );
		}
	}

	/*
	 * 新着レスをリセット
	 */
	function reset_title() {
		//ページ末尾でホイールダウンした時
		window.addEventListener("DOMMouseScroll",function scroll(event) {
			var window_y = window.scrollY;
			var window_ymax = window.scrollMaxY;
			if (event.detail > 0 && window_y >= window_ymax) {
				reset_titlename();
			}
			return;
		} ,false);
		//F5キー押された時
		window.addEventListener("keydown",function(e) {
			if ( e.keyCode == "116" ) {
				reset_titlename();
			}
		}, false);

		function reset_titlename() {
			res = 0;
			var title_char = title_name();
			document.title = title_char;
		}
	}

	function rel() {
		soudane();
		setTimeout(changetitle, 1000);
		if(isAkahukuNotFound()){
			//404時
			clearInterval(timerNormal);
			console.log(script_name + ": Page not found, Stop auto reloading @" + url);
		}
		else {
			location.reload();
		}
	}

	/*
	 * そうだねの数に応じてレスを着色
	 */
	function soudane() {
		if ( USE_SOUDANE ) {
			$("td > .sod").each(function(){
				var sodnum = $(this).text().match(/\d+/);
				if (sodnum){
					var col = "rgb(180, 240," + (Math.round(10 * sodnum + 180)) + ")";
					$(this).parent().css("background-color", col);
				}
			});
		}
	}

	/*
	 * タブタイトルに新着レス数・スレ消滅状態を表示
	 */
	function changetitle() {
		if ( USE_TITLE_NAME ) {
			var title_char = title_name();
			var newres = $("#akahuku_new_reply_header_number").text();
			if (isAkahukuNotFound()) {
				document.title = "#" + title_char;
			} else {
				if(newres) {
					res += parseInt(newres);
				}
				if ( res !== 0) {
					document.title = "(" + res + ")" + title_char;
				}
			}
		}
	}

	/*
	 * 赤福のステータスからスレ消滅状態をチェック
	 */
	function isAkahukuNotFound() {
		var statustext = $("#akahuku_reload_status").text();
		if (statustext.match(/(No Future)|((M|N)ot Found)/)) {
			return true;
		}
		else {
			return false;
		}
	}

	function title_name() {
		var title = document.title;
		var title_num = title.match(/^(#|\(\d+\))/);
		var title_num_length;
		if(!title_num){
			title_num_length = 0;
		}
		else {
			title_num_length = title_num[0].length;
		}
		var act_title_name = title.substr(title_num_length);
		return act_title_name;
	}

	function makeFormClearButton() {
		if ( USE_CLEAR_BUTTON ) {
			var $formClearButton = $("<div>", {
				id: "formClearButton",
				text: "[クリア]",
				css: {
					cursor: "pointer",
					margin: "0 5px"
				},
				click: function() {
					clearForm();
				}
			});
			var $comeTd = $(".ftdc b:contains('コメント')");
			$comeTd.after($formClearButton);
		}

		function clearForm() {
			$("#ftxa").val("");
		}
	}

})(jQuery);
