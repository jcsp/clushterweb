


function flash_error(text) {
    var el = $('#errorflash');
    el.text(text);
    el.show();
}

function cursorhide() {
    $('.cursor').hide();
}

function cursorshow() {
    $('.cursor').show();
}

function cursorblink() {
    if ($('.cursor').is(':visible')){
        cursorhide();
    } else {
        cursorshow();
    }
}

setInterval(cursorblink, 500);

var ShellSessionView = Backbone.View.extend({
    initialize: function(options) {
        this.session = options.session;
    },
    tagName: "div",
    className: "shell_session",
    events: {
        "click .close": 'close',
        "keyup": 'keyup',
        "keypress": 'keypress'
    },
    keypress: function(e) {
        /* Keypress handles letter keypresses */
        var letter =  String.fromCharCode(e.keyCode);
        if (e.keyCode != 13 && e.keyCode != 8) {
            this.session.cmd_buffer = this.session.cmd_buffer +letter;
            this.echo(letter);
        }
    },
    keyup: function(e) {
        /* keyup handles non-letter keypresses */
        if (e.keyCode == 13) {
            if (this.session.cmd_buffer.length == 0) {
                this.echo_raw("<br>" + this.PROMPT)
            } else {
                this.session.cmd_stack.push(this.session.cmd_buffer);
                this.run(this.session.cmd_buffer);
                this.echo_raw("<br>");
            }
            this.session.cmd_buffer = "";
        } else if (e.keyCode == 8) {
            if (this.session.cmd_buffer.length > 0) {
                this.session.cmd_buffer = this.session.cmd_buffer.substr(0, this.session.cmd_buffer.length - 1);
                this.backspace();
            }
        } else if (e.keyCode == 38) {
            if (this.session.cmd_stack.length > 0) {
                this.session.cmd_buffer = this.session.cmd_stack[this.session.cmd_stack.length - 1];
                this.echo(this.session.cmd_stack[this.session.cmd_stack.length - 1]);
            }
        }
    },
    echo_template: _.template("<span class='hostname_prefix'><%= hostname %></span>: <%= content %><br>"),
    PROMPT: "> ",
    template: _.template($('#shell_session_template').html()),
    render: function() {
        $(this.el).html(this.template({}));
        this.echo(this.PROMPT);
        return this;
    },
    close: function() {
        this.el.destroy();
    },
    backspace: function() {
        // broken
        return;
        var content = $(this.el).find('.echo');
        var html = content.html();
        var new_text = html.substr(0, html.length - 1);
        console.log(html);
        console.log(new_text);
        content.html(new_text);
    },
    echo_host: function(host, line) {
        this.echo_raw(this.echo_template({
            hostname: host,
            content: _.escape(line)
        }));
    },
    echo: function(text) {
        this.echo_raw(_.escape(text));
    },
    echo_raw: function(text) {
        var content = $(this.el).find('.echo');
        content.append(text);
        cursorhide();

        var scroller = $(this.el).find('.scroller');
        scroller.scrollTop(content.height() + scroller.height());
    },
    run: function(cmd) {
        $.ajax("/input/" + this.session.id + "/", {
            type: 'POST',
            data: {command: cmd},
            success: function() {
            },
            error: function(jqxhr) {
                flash_error("Error " + jqxhr.status + " getting output");
            }
        });
    },
    get_output: function() {
        var view = this;
        var session = view.session;

        $.ajax("/output/" + session.id + "/" + session.lines.length + "/", {
            type: 'GET',
            success: function(data) {
                if (data.lines) {
                    $.each(data.lines, function(i, line) {
                        session.lines.push(line);
                        if (line[1] == null) {
                            view.echo(view.PROMPT);
                        } else {
                            view.echo_host(line[0], line[1]);
                        }
                    });
                }
                view.get_output();
            },
            error: function(jqxhr) {
                flash_error("Error " + jqxhr.status + " getting output");
            }
        });
    }
});

$(document).ready(function(){
    function Session(id) {
        return {
            id: id,
            lines: [],
            cmd_stack: [],
            cmd_buffer: ""
        }
    }

    $('#start_session').click(function() {
        $.ajax("/session/", {
            type: 'POST',
            data: {'nodes': $("#nodes").val()},
            success: function(data) {
                var header_markup = _.template("<li class='active'><a href='#<%=id%>' data-toggle='tab'><%=title%></a></li>")({
                    'id': data.session_id,
                    'title': $('#nodes').val()});

                var headers_container = $('#session_tab_headers');
                headers_container.find('li').removeClass('active');
                headers_container.append(header_markup);

                var bodies_container = $('#session_tab_bodies');
                bodies_container.find('.tab-pane').removeClass('active');

                var body_markup = _.template("<div class='tab-pane active' id='<%=id%>'></div>")({id: data.session_id});
                bodies_container.append(body_markup);

                var session = Session(data.session_id);
                var view = new ShellSessionView({session: session});
                view.render();
                $('#' + data.session_id).append(view.el);

                $(view.el).attr('tabindex', 1);
                $(view.el).focus();

                view.get_output();
            }
        });
    });
});