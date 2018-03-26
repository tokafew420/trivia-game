(function (window) {
    var opts = {
        timer: {
            autostart: true,
            seconds: 30
        },
        category: {
            maxQuestions: 10
        },
        sound: true
    };

    var $options = $('#options-modal');
    var $categoriesContainer = $('.categories-container');
    var $cateogries = $('.categories', $categoriesContainer);
    var $questionsContainer = $('.questions-container');
    var $questions = $('.questions', $questionsContainer);
    var $questionModal = $('#question-modal');
    var $loader = $('.loader-container');
    var $loaderMsg = $('.msg', $loader);
    var sounds = (function () {
        var playInterval;

        return {
            $tick: $('#audio-tick'),
            $click: $('#audio-open'),
            $blop: $('#audio-blop'),
            $buzzer: $('#audio-buzzer'),
            play: function ($sound) {
                if (opts.sound) {
                    //$sound.load();
                    $sound[0].play();
                }
            },
            startLoop: function ($sound, ms) {
                if (playInterval) return;
                if (opts.sound) {
                    playInterval = setInterval(function () {
                        $sound[0].play();
                    }, ms);
                }
            },
            stopLoop: function () {
                clearInterval(playInterval);
                playInterval = null;
            }
        }
    }());

    var timer = (function () {
        var timerInterval;
        var started = false;
        var countDown = opts.timer.seconds * 10;

        function startTimer() {
            if (countDown === 0) return;
            if (timerInterval) return;
            var totaltime = opts.timer.seconds * 10;

            if (!started) countDown = opts.timer.seconds * 10;
            started = true;

            sounds.startLoop(sounds.$tick, 1000);
            var dangerZone = function () {
                sounds.stopLoop();
                sounds.startLoop(sounds.$tick, 500);
                $('.timer .block').addClass('danger');
            };

            function update(remaining) {
                var deg;
                var half = (totaltime / 2);
                if (remaining < half) {
                    // 90 -> 270
                    // 90 + (180 + (-360 * remaining / totaltime))
                    deg = 270 - (360 * remaining / totaltime);
                    $('.timer').css('background-image',
                        'linear-gradient(' + deg + 'deg, transparent 50%, #ffffff 50%),linear-gradient(90deg, transparent 50%, #ffffff 50%)'
                    );
                } else {
                    // 90 -> 270
                    // 90 + (360 + (-360 * remaining / totaltime))
                    deg = 450 - (360 * (remaining / totaltime));
                    $('.timer').css('background-image',
                        'linear-gradient(90deg, #1fbba6 50%, transparent 50%),linear-gradient(' + deg + 'deg, white 50%, transparent 50%)'
                    );
                }
            }

            timerInterval = setInterval(function () {
                countDown -= 1;
                $('#time').html((countDown / 10).toFixed(1));
                update(countDown);

                if (countDown < 100) {
                    dangerZone();
                    dangerZone = function () {}
                }
                if (countDown === 0) {
                    stopTimer();
                    sounds.play(sounds.$buzzer);
                }
            }, 100);
        }

        function stopTimer() {
            clearInterval(timerInterval);
            sounds.stopLoop();
            timerInterval = null;
            $('.timer .block').removeClass('danger');
        }

        function resetTimer() {
            stopTimer();
            started = false;
            countDown = opts.timer.seconds * 10;
            $('#time').html(opts.timer.seconds);
            $('.timer').css('background-image', 'none');
        }

        $('#start-timer-btn').click(startTimer);
        $('#stop-timer-btn').click(stopTimer);
        $('#reset-timer-btn').click(resetTimer);

        return {
            start: startTimer,
            stop: stopTimer,
            reset: resetTimer
        };
    }());

    $('input', $options).change(function () {
        var $timerSeconds = $('#timer-seconds-input', $options);
        var secs = +($timerSeconds.val());

        if (!isNaN(secs) && secs > 0) {
            opts.timer.seconds = secs;
        } else {
            $timerSeconds.val(opts.timer.seconds);
        }
        opts.timer.autostart = !!$('#timer-autostart-chk', $options).prop('checked');

        var $maxQuestions = $('#category-max-questions-input', $options);
        var max = +($maxQuestions.val());

        if (!isNaN(max) && max > 0) {
            opts.category.maxQuestions = max;
        } else {
            $maxQuestions.val(opts.category.maxQuestions);
        }

        opts.sound = !!$('#sound-chk', $options).prop('checked');
        console.log(opts);
        saveGame();
    });

    var gameData = {
        categories: [],
        data: [{
                "category": "Category 1",
                "difficulty": "Easy",
                "question": "What color is the sky?",
                "answer": "Blue",
                "notes": ""
            },
            {
                "category": "Category 1",
                "difficulty": "Normal",
                "question": "1 + 1 = ?",
                "answer": "2",
                "notes": ""
            },
            {
                "category": "Category 2",
                "difficulty": "Easy",
                "question": "A square has how many sides?",
                "answer": "4",
                "notes": ""
            },
            {
                "category": "Category 2",
                "difficulty": "Normal",
                "question": "How much wood can a woodchuck chuck if a woodchuck could chuck wood?\nA) 100\nB) 300\nC) 400\nD) None",
                "answer": "D) None",
                "notes": "huh?"
            },
            {
                "category": "Category 2",
                "difficulty": "Hard",
                "question": "Who shot Alexander Hamilton?",
                "answer": "Aaron Burr",
                "notes": ""
            }
        ]
    };

    function saveGame() {
        window.localStorage.setItem('trivia-game', JSON.stringify({
            opts: opts,
            gameData: gameData
        }));
    }

    function renderCategories() {
        $cateogries.empty();
        gameData.categories.forEach(function (category) {
            var $card = $('<div class="col-lg-3 col-md-4 col-xs-6 category-container">' +
                '<a href="#"><div class="card category-card">' +
                '<div class="card-body">' +
                '    <div class="category-title align-middle">' + category.name + '</div>' +
                '    <span class="category-badge"></span>' +
                '</div></div></a></div>');

            if (category.remaining) {
                $card.mouseenter(function () {
                    sounds.play(sounds.$blop);
                });

                $('.category-badge', $card).text(category.remaining);

                $('a', $card).click(function () {
                    sounds.play(sounds.$click);
                    $categoriesContainer.fadeOut('fast', function () {
                        renderQuestions($card, category);
                        $questionsContainer.fadeIn('fast');
                    });
                });
            } else {
                $card.addClass('answered');
                $card.off('mouseenter');
                $('.category-badge', $card).hide();
            }

            $card.appendTo($cateogries);
        });
    }

    function renderQuestions($categoryCard, category) {
        $questions.empty();

        category.questions.forEach(function (q) {
            var $card = $('<div class="col-lg-3 col-md-4 col-xs-6 question-container">' +
                '<a href="#"><div class="card question-card">' +
                '<div class="card-body">' +
                '    <div class="question-title">' + q.order + '</div>' +
                '    <div class="question-difficulty">' + q.difficulty + '</div>' +
                '</div></div></a></div>');

            if (q.answered) {
                $card.addClass('answered');
            } else {
                $card.mouseenter(function () {
                    sounds.play(sounds.$blop);
                });

                $('a', $card).click(function () {
                    sounds.play(sounds.$click);
                    q.answered = true;
                    category.remaining--;

                    if (category.remaining) {
                        $('.category-badge', $categoryCard).text(category.remaining);
                    } else {
                        $categoryCard.addClass('answered')
                            .off('mouseenter');
                        $('.category-badge', $categoryCard).hide();
                        $('a', $categoryCard).off('click');
                    }

                    $('#question-modal-title', $questionModal).text(category.name + ' : ' + q.order);
                    $('.question-text', $questionModal).text(q.question);
                    $('.answer-text', $questionModal).text('Answer: ' + q.answer);

                    $('#show-answer', $questionModal).show();
                    $('#done', $questionModal).hide();
                    $questionModal.modal('show');
                });
            }
            $card.appendTo($questions);
        });
    }

    $('.navbar-collapse a').click(function (e) {
        $('.navbar-collapse').collapse('toggle');
    });

    function loadData(data) {
        $loaderMsg.text('Loading data...');

        try {
            gameData.data = data;
            gameData.categories = data.map(function (d) {
                return d.category;
            }).reduce(function (accumulator, c) {
                if (accumulator.indexOf(c) === -1) {
                    accumulator.push(c);
                }

                return accumulator;
            }, []).sort().map(function (c) {
                return {
                    name: c
                };
            });

            gameData.categories.forEach(function (cat) {
                var order = 1;
                cat.questions = data.filter(function (d) {
                    return d.category === cat.name;
                }).map(function (d) {
                    return {
                        question: d.question,
                        answer: d.answer,
                        difficulty: d.difficulty,
                        notes: d.notes,
                        order: 100 * order++
                    };
                });

                cat.remaining = Math.min(opts.category.maxQuestions, cat.questions.length);
            });

            console.log(gameData);

            renderCategories();

            $loaderMsg.text('Done!!');
        } catch (err) {
            console.error(err);
        }

        $loaderMsg.text('');
        $loader.hide();
    }

    $('#load-game-data-btn').click(function (e) {
        var $file = $('#load-game-data-file');
        var file = $file[0].files[0];

        if (!file) {
            return;
        }
        $('#load-game-data-modal').modal('hide');
        $loader.show();
        var $title = $('#load-game-data-modal-title');
        var $msg = $('#load-game-data-msg');
        var reader = new FileReader();

        $loaderMsg.text('Reading file...');
        reader.onload = function (e) {
            var contents = e.target.result;
            $loaderMsg.text('Parsing contents...');
            try {
                var data = JSON.parse(contents) || {};

                loadData(data);
                saveGame();
            } catch (err) {
                console.error(err);
            }
            $loaderMsg.text('');
            $loader.hide();
        };
        reader.readAsText(file);
    });

    $questionModal.modal({
        backdrop: 'static',
        keyboard: false,
        focus: true,
        show: false
    }).on('hidden.bs.modal', function (e) {
        $questionsContainer.fadeOut('fast', function () {
            $categoriesContainer.fadeIn('fast');
        });
    }).on('shown.bs.modal', function (e) {
        $('.timer-card').fadeIn('fast', function () {
            if (opts.timer.autostart) timer.start();
        });
    });

    $('#show-answer', $questionModal).click(function () {
        var $this = $(this);
        $this.hide();
        $('#answer', $questionModal).collapse('show');
        $('#done', $questionModal).show();
        timer.stop();
    });

    $('#done', $questionModal).click(function () {
        var $this = $(this);

        $this.hide();
        $('#answer', $questionModal).collapse('hide');
        $('#show-answer', $questionModal).show();
        $('.timer-card').fadeOut('fast', function () {
            timer.reset()
        });
        saveGame();
        $questionModal.modal('hide');
    });

    $('.reset-link').click(function (e) {
        loadData(gameData.data);
        saveGame();
    });

    var savedData = window.localStorage.getItem('trivia-game');
    if (savedData) {
        try {
            savedData = JSON.parse(savedData);
        } catch (err) {
            savedData = '';
        }

        if (savedData) {
            if (savedData.opts) {
                opts = savedData.opts;
                $('#timer-seconds-input', $options).val(opts.timer.seconds);
                $('#timer-autostart-chk', $options).prop('checked', !!opts.timer.autostart);
                $('#category-max-questions-input', $options).val(opts.category.maxQuestions);
                $('#sound-chk', $options).prop('checked', !!opts.sound);
            }
            if (savedData.gameData) {
                gameData = savedData.gameData;
                renderCategories();
            }
        }
    } else {
        loadData(gameData.data);
    }
    timer.reset();
})(window);
