GITCE.console = function (parameters) {
    var options = $.extend({
        refreshTime:2000
    }, parameters);

    var params = GITCE.getQueryParams();

    // extend with get-parameters default-parameters
    params = $.extend({
        server:'/',
        config:'test',
        branch:'master',
        build:'0'
    }, params);

    var logKeys = {
        'error':[
            new RegExp('err', 'i'),
            new RegExp('fail', 'i')
        ],
        'warning':[
            new RegExp('warn', 'i')
        ],
        'info':[
            new RegExp('^Build .*-\\d+$'),
            new RegExp('^Running build script .*...$'),
            new RegExp('^Return code: \\d+$')
        ],
        'success':[
            new RegExp('success', 'i')
        ]
    };

    var tplSpinner = $('<img src="/images/spinner.gif"/>');
    var tplBuild = $('<li><a href="#"><h3/><span class="date"/></a></li>');

    var that = {
        autoscroll: false,

        highlightText:function (text) {
            var lines = text.split("\n");
            for (var index in lines) {
                lines[index] = that.highlightLine(lines[index]);
            }
            return lines.join("\n");
        },

        highlightLine:function (line) {
            for (var state in logKeys) {
                for (var keyIndex in logKeys[state]) {
                    var key = logKeys[state][keyIndex];
                    if (line.search(key) >= 0) {
                        line = '<span class="' + state + '">' + line + '</span>';
                        return line;
                    }
                }
            }
            return line;
        },

        updateConsole:function (consoleLog) {
            $.ajax({
                url:params.server + 'cgi-bin/log.cgi?' + params.config + '/' + params.branch + '/' + params.build,
                success:function (response) {
                    consoleLog.html(that.highlightText(response));
                    if (that.autoscroll) {
                        consoleLog.append(tplSpinner.clone()).scrollTop(100 * 1000000);
                    }
                }
            });
        },

        updateHistory:function (historyList) {
            var nowDay = new Date();

            $.ajax({
                url:params.server + 'cgi-bin/builds.cgi?' + params.config,
                success:function (history) {

                    if (typeof(history[params.branch]) != "undefined") {
                        historyList.empty();

                        for (var buildNumber in history[params.branch]) {
                            var isCurrent = false,
                                build = history[params.branch][buildNumber],
                                buildContainer = tplBuild.clone();

                            // title + link
                            if (build.hasOwnProperty('exec')) {
                                buildContainer.find('h3').html('Build #' + buildNumber + '*');
                            } else {
                                buildContainer.find('h3').html('Build #' + buildNumber);
                            }

                            buildContainer.find('a').attr('href', '/log.html?server=' + params.server + '&config='
                                + params.config + '&branch=' + params.branch + '&build=' + buildNumber);

                            if (buildNumber == params.build) {
                                buildContainer.addClass('current');
                                isCurrent = true;
                            }

                            // status
                            if (build.result == '0') {
                                buildContainer.addClass('status-ok');
                            } else if (build.result != '') {
                                buildContainer.addClass('status-broken');
                            } else {
                                buildContainer.addClass('status-pending');

                                if (isCurrent) {
                                    that.autoscroll = true;
                                }
                            }

                            // date
                            var date = build['time'];
                            if (date != '') {
                                var calcDate = new Date();
                                calcDate.setTime(date * 1000);

                                if (calcDate.toDateString() == nowDay.toDateString()) {
                                    buildContainer.find('span').html('today, ' + calcDate.getHours() + ':' + calcDate.getMinutes());
                                } else {
                                    buildContainer.find('span').html(calcDate.toDateString());
                                }

                                buildContainer.find('a').attr('title', calcDate.toGMTString());
                            }

                            historyList.prepend(buildContainer);
                        }
                    }

                }
            })
        },

        init:function () {
            // initalize console-log
            var consoleLog = $('#console');

            var historyContainer = $('#history');
            $('h2').text(params.config + ' / ' + params.branch + ' / #' + params.build);
            $('.head a').attr('href', '/detail.html?server=' + params.server + '&config=' + params.config);
            var historyList = historyContainer.find('ul');

            that.updateConsole(consoleLog);
            that.updateHistory(historyList);
            window.setInterval(function () {
                that.updateConsole.call(that, consoleLog);
                that.updateHistory.call(that, historyList);
            }, options.refreshTime);
        }
    };

    return that;
};