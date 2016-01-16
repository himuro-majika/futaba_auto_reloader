// ==UserScript==
// @name           futaba auto reloader
// @namespace      https://github.com/himuro-majika
// @description    赤福Firefox版で自動更新しちゃう(実況モードもあるよ！)
// @author         himuro_majika
// @include        http://*.2chan.net/*/res/*
// @include        http://board.futakuro.com/*/res/*
// @require        http://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min.js
// @version        1.6.1
// @grant          GM_addStyle
// @license        MIT
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
	var LIVE_TOGGLE_KEY = "76";				//実況モードON・OFF切り替えキーコード(With Alt)
	var SHOW_NORMAL_BUTTON = true;			//通常モードボタンを表示する

	var res = 0;	//新着レス数
	var timerNormal, timerLiveReload, timerLiveScroll;
	var url = location.href;
	var script_name = "futaba_auto_reloader";
	var isWindowActive = true;	// タブのアクティブ状態

	if(!isFileNotFound()){
		setNormalReload();
	}
	soudane();
	makeFormClearButton();
	reset_title();
	make_live_button();
	addCss();
	setWindowFocusEvent();

	//通常リロード開始
	function setNormalReload() {
		timerNormal = setInterval(rel, RELOAD_INTERVAL_NORMAL);
		console.log(script_name + ": Start auto reloading @" + url);
	}
	//通常リロード停止
	function clearNormalReload() {
		clearInterval(timerNormal);
		console.log(script_name + ": Stop auto reloading @" + url);
	}
	/*
	 * 404チェック
	 */
	function isFileNotFound() {
		if(document.title == "404 File Not Found") {
			return true;
		}
		else {
			return false;
		}
	}

	/*
	 * ボタン作成
	 */
	function make_live_button() {
		var normal_flag = true;	//通常モード有効フラグ
		//通常モードボタン
		var $normalButton = $("<a>", {
			id: "GM_FAR_relButton_normal",
			class: "GM_FAR_relButton",
			text: "[通常]",
			css: {
				cursor: "pointer",
				"background-color": "#ea8",
			},
			click: function() {
				normalMode();
			}
		});

		var live_flag = false;	//実況モード有効フラグ
		//実況モードボタン
		var $liveButton = $("<a>", {
			id: "GM_FAR_relButton_live",
			class: "GM_FAR_relButton",
			text: "[実況モード(Alt+" + String.fromCharCode(LIVE_TOGGLE_KEY) + ")]",
			css: {
				cursor: "pointer",
			},
			click: function() {
				liveMode();
			}
		});

		var $input = $("input[value$='信する']");
		$input.after($liveButton);
		if(SHOW_NORMAL_BUTTON){
			$input.after($normalButton);
		}

		//実況モードトグルショートカットキー
		window.addEventListener("keydown",function(e) {
			if ( e.altKey && e.keyCode == LIVE_TOGGLE_KEY ) {
				liveMode();
			}
		}, false);

		/*
		 * 通常モード切り替え
		 */
		function normalMode() {
			if(normal_flag) {
				clearNormalReload();
				$normalButton.css("background" , "none");
				normal_flag = false;
			} else {
				setNormalReload();
				$normalButton.css("background-color" , "#ea8");
				normal_flag = true;
			}

		 }

		/*
		 * 実況モード
		 * 呼出ごとにON/OFFトグル
		 */
		function liveMode() {
			if (!live_flag) {
				//実況モード時リロード
				timerLiveReload = setInterval(rel_scroll, RELOAD_INTERVAL_LIVE);
				//自動スクロール
				timerLiveScroll = setInterval(live_scroll, LIVE_SCROLL_INTERVAL);
				$liveButton.css("backgroundColor", "#ffa5f0");
				startspin();
				console.log(script_name + ": Start live mode @" + url);
				live_flag = true;
			} else {
				clearInterval(timerLiveReload);
				clearInterval(timerLiveScroll);
				$liveButton.css("background", "none");
				stopspin();
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
					clickrelbutton();
				}
			}

			function live_scroll() {
				window.scrollBy( 0, LIVE_SCROLL_SPEED );
			}
			function startspin() {
				$("#akahuku_throp_menu_opener").css(
					"animation", "spin 2s infinite steps(8)"
				);
			}
			function stopspin() {
				$("#akahuku_throp_menu_opener").css(
					"animation", "none"
				);
			}
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
			clearNormalReload();
			console.log(script_name + ": Page not found, Stop auto reloading @" + url);
		}
		else {
			clickrelbutton();
		}
	}
	
	/**
	 * 赤福の続きを読むボタンをクリック
	 */
	function clickrelbutton() {
		var relbutton = document.getElementById("akahuku_reload_button");
		if(relbutton){
			var e = document.createEvent("MouseEvents");
			e.initEvent("click", false, true);
			relbutton.dispatchEvent(e);
		}
		setTimeout(function(){
			if (!isWindowActive) {
				getNewResContent();
			}
		}, 1000);
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
	// 新着レスの内容を取得
	function getNewResContent() {
		var $newrestable = $("#akahuku_new_reply_header ~ table[border]");
		if ($newrestable.length) {
			var restexts = [];
			$newrestable.each(function() {
				var texts = [];
				$(this).find("blockquote").contents().each(function() {
					if ($(this).text() !== "") {
						texts.push($(this).text());
					}
				});
				restexts.push(texts.join("\r\n"));
			});
			var popupText = restexts.join("\r\n===============\r\n");
			showNotification(popupText);
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
	function addCss() {
		GM_addStyle(
			"@keyframes spin {" +
			"  0% { transform: rotate(0deg); }" +
			"  100% { transform: rotate(359deg); }" +
			"}"
		);
	}
	// タブのアクティブ状態を取得
	function setWindowFocusEvent() {
		$(window).focus();
		$(window).bind("focus", function() {
			// タブアクティブ時
			isWindowActive = true;
		}).bind("blur", function() {
			// タブ非アクティブ時
			isWindowActive = false;
		});
	}
	// 新着レスをポップアップでデスクトップ通知する
	function showNotification(body) {
		Notification.requestPermission(function(permission) {
			// console.log(permission);
		});
		var icon = $("#akahuku_thumbnail").attr("src");
		var instance = new Notification(
			document.title, {
				body: body,
				icon: icon,
			}
		);
	}
	
})(jQuery);
