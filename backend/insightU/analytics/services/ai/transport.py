"""HTTP transport that never follows provider redirects."""
import urllib.error
import urllib.request


class NoProviderRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.URLError("Provider redirects are disabled.")


_OPENER = urllib.request.build_opener(NoProviderRedirect())


def open_no_redirect(request, *, timeout):
    return _OPENER.open(request, timeout=timeout)
