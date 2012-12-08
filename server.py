import logging
import threading
import uuid
from ClusterShell.Event import EventHandler
import ansi2html
from flask import Flask, request, make_response, jsonify

app = Flask(__name__)

app.logger.setLevel(logging.DEBUG)
app.logger.addHandler(logging.StreamHandler())



from ClusterShell.Task import Task, task_self

class WebEventHandler(EventHandler):
    def __init__(self, read_callback, complete_callback):
        self._read_callback = read_callback
        self._complete_callback = complete_callback

    def ev_read(self, worker):
        self._read_callback(worker.current_node, worker.current_msg)

    def ev_close(self, worker):
        self._complete_callback(worker.current_node)


class ShellSession(object):
    def __init__(self, nodes):
        self.nodes = nodes
        self.handler = WebEventHandler(self.on_message, self.on_complete)

        self.messages_lock = threading.Lock()
        self.messages = []
        self.watcher_events = []

    def on_complete(self, node):
        self.on_message(node, None)

    def on_message(self, node, message):
        with self.messages_lock:
            if message:
                message = ansi2html.Ansi2HTMLConverter(inline = True).convert(message, full = False)

            self.messages.append([node, message])
            for ev in self.watcher_events:
                ev.set()

    def blocking_get(self, start_index, timeout):
        wait_event = None
        with self.messages_lock:
            # eg starting from 1, if len
            if len(self.messages) <= start_index:
                wait_event = threading.Event()
                self.watcher_events.append(wait_event)

        if wait_event:
            got_data = wait_event.wait(timeout = timeout)
            with self.messages_lock:
                self.watcher_events.remove(wait_event)

            if got_data:
                return self.messages[start_index:]
            else:
                return None
        else:
            return self.messages[start_index:]

    def call(self, cmdline):
        task = Task()
        task.shell(cmdline, nodes = self.nodes, handler = self.handler )
        task.run()

_sessions = {}

@app.route("/session/", methods = ['POST'])
def start_session():
    id = uuid.uuid4().__str__()
    # flask gives me unicode, clustershell wants str
    nodes = str(request.form['nodes']).strip()
    app.logger.info("Creating session %s for nodes %s" % (id, nodes))
    _sessions[id] = ShellSession(nodes)

    return jsonify({'session_id': id})


@app.route('/output/<session_id>/<int:from_offset>/', methods = ['GET'])
def output(session_id, from_offset):
    session = _sessions[session_id]
    lines = session.blocking_get(from_offset, 10)
    return jsonify({'lines': lines})


@app.route('/input/<session_id>/', methods = ['POST'])
def input(session_id):
    session = _sessions[session_id]
    session.call(request.form['command'])
    return jsonify({})

if __name__ == '__main__':
    import gevent.monkey
    gevent.monkey.patch_all()
    from gevent.wsgi import WSGIServer

    http_server = WSGIServer(('', 5000), app)
    http_server.serve_forever()
