/**
 * Created with PyCharm.
 * User: john
 * Date: 9/28/12
 * Time: 5:05 PM
 * To change this template use File | Settings | File Templates.
 */

$(document).ready(function(){
    function echo(line) {
        var content = $('#echo');
        //content.text(content.text() + line);
        content.append(line);

        var scroller = $('#scroller');
        scroller.scrollTop(content.height() + scroller.height());
    }

    function backspace() {
        var content = $('#echo');
        var text = content.text();
        var new_text = text.substr(0, text.length - 1);
        content.text(new_text);
    }

    var cmd_stack = [];
    var cmd_buffer = "";
    var PROMPT = "# ";
    $(document).keypress(function(e) {
        var letter =  String.fromCharCode(e.keyCode);
        if (e.keyCode != 13 && e.keyCode != 8) {
            cmd_buffer = cmd_buffer +letter;
            echo(letter);
        }
    });

    $(document).keyup(function(e) {
        if (e.keyCode == 13) {
           if (cmd_buffer.length == 0) {
               echo("<br>" + PROMPT)
           } else {
               cmd_stack.push(cmd_buffer);
               run(cmd_buffer);
               echo("<br>");
           }
           cmd_buffer = "";
       } else if (e.keyCode == 8) {
           if (cmd_buffer.length > 0) {
               cmd_buffer = cmd_buffer.substr(0, cmd_buffer.length - 1);
               backspace();
           }
        } else if (e.keyCode == 38) {
            if (cmd_stack.length > 0) {
                cmd_buffer = cmd_stack[cmd_stack.length - 1];
                echo(cmd_stack[cmd_stack.length - 1]);
            }
        }
    });


    function run(cmd) {
        $.ajax("/input/", {
            type: 'POST',
            data: {command: cmd},
            success: function(data) {

            }
        });
    }

    var lines = [];
    function get_output() {
        $.ajax("/output/" + lines.length + "/", {
           type: 'GET',
           success: function(data) {
               if (data.lines) {
                   $.each(data.lines, function(i, line) {
                       lines.push(line);
                       if (line[1] == null) {
                           echo(PROMPT);
                       } else {
                           echo(line[0] + ": " + line[1] + "<br>");
                       }
                   });
               }
               get_output();
           }
        });
    }
    get_output();



});