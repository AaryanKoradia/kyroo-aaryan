from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared instance — main.py registers it on the app, individual route
# files import it to decorate specific endpoints with @limiter.limit(...).
# Living in its own module avoids a circular import between main.py and
# the route files.
limiter = Limiter(key_func=get_remote_address)
