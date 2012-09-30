
$(document).ready(function(){
    var PROMPT = "# ";
    var active_session = null;

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
                active_session = Session(data.session_id);
                echo(PROMPT);
                get_output(active_session);
            }
        });
    });

    function cursorhide() {
        $('#cursor').hide();
    }

    function cursorshow() {
        $('#cursor').show();
    }

    function cursorblink() {
        if (active_session == null) {
            cursorhide();
        }

        if ($('#cursor').is(':visible')){
            cursorhide();
        } else {
            cursorshow();
        }
    }

    setInterval(cursorblink, 500);

    function echo(line) {
        var content = $('#echo');
        var cleaned = line.replace("\n", "<br>");
        cleaned = cleaned.replace(" ", "&nbsp;");
        content.append(cleaned);
        cursorhide();

        var scroller = $('#scroller');
        scroller.scrollTop(content.height() + scroller.height());
    }

    function flash_error(text) {
        var el = $('#errorflash');
        el.text(text);
        el.show();
    }

    function backspace() {
        var content = $('#echo');
        var text = content.text();
        var new_text = text.substr(0, text.length - 1);
        content.text(new_text);
    }


    $(document).keypress(function(e) {
        /* Keypress handles letter keypresses */
        if (active_session == null) {
            return;
        }
        var letter =  String.fromCharCode(e.keyCode);
        if (e.keyCode != 13 && e.keyCode != 8) {
            active_session.cmd_buffer = active_session.cmd_buffer +letter;
            echo(letter);
        }
    });

    $(document).keyup(function(e) {
        /* keyup handles non-letter keypresses */
        if (active_session == null) {
            return;
        }
        if (e.keyCode == 13) {
           if (active_session.cmd_buffer.length == 0) {
               echo("<br>" + PROMPT)
           } else {
               active_session.cmd_stack.push(active_session.cmd_buffer);
               run(active_session.cmd_buffer);
               echo("<br>");
           }
           active_session.cmd_buffer = "";
       } else if (e.keyCode == 8) {
           if (active_session.cmd_buffer.length > 0) {
               active_session.cmd_buffer = active_session.cmd_buffer.substr(0, active_session.cmd_buffer.length - 1);
               backspace();
           }
        } else if (e.keyCode == 38) {
            if (active_session.cmd_stack.length > 0) {
                active_session.cmd_buffer = active_session.cmd_stack[active_session.cmd_stack.length - 1];
                echo(active_session.cmd_stack[active_session.cmd_stack.length - 1]);
            }
        }
    });

    function run(cmd) {
        $.ajax("/input/" + active_session.id + "/", {
            type: 'POST',
            data: {command: cmd},
            success: function(data) {
            },
            error: function(jqxhr) {
                flash_error("Error " + jqxhr.status + " getting output");
            }
        });
    }

    function get_output(session) {
        $.ajax("/output/" + session.id + "/" + session.lines.length + "/", {
           type: 'GET',
           success: function(data) {
               if (data.lines) {
                   $.each(data.lines, function(i, line) {
                       session.lines.push(line);
                       if (line[1] == null) {
                           echo(PROMPT);
                       } else {
                           echo(line[0] + ": " + line[1] + "<br>");
                       }
                   });
               }
               get_output(session);
           },
           error: function(jqxhr, error) {
               flash_error("Error " + jqxhr.status + " getting output");
           }
        });
    }
});