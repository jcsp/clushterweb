
Clushterweb - web frontend to clustershell
==========================================

This is a minimal prototype/example of using gevent+long polling
to drive a backend library running operations in parallel across
a number of hosts.

Server: python (clustershell+flask+gevent) server with a Javascript frontend.

No official relationship to clustershell, just a demo which uses
it as a dependency.


::

    python server.py
    open http://localhost:5000/static/ui.html

