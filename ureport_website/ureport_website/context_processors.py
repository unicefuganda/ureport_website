import logging
import urllib

from django.conf import settings
from django.core.cache import cache

import simplejson

logger = logging.getLogger(__name__)


def get_contacts_metadata():
    cache_key = 'contact_meta_data'
    cache_timeout = 3600  # 1 hour
    data = cache.get(cache_key)
    if data:
        logger.debug("returning contact data from the cache")
        return data

    api_base = settings.UREPORT_API_BASE
    args = {
        'meta_only': 'true',
        'username': settings.UREPORT_API_USERNAME,
        'api_key': settings.UREPORT_API_KEY,
    }
    url = api_base + 'contacts/?' + urllib.urlencode(args)
    logger.debug("calling url: %s" % url)
    data = simplejson.load(urllib.urlopen(url))
    cache.set(cache_key, data, cache_timeout)
    return data


def ureporter_count(request):
    results = get_contacts_metadata()
    if 'Error' in results:
        total_count = 0
    else:
        total_count = results['meta']['total_count']

    return {'total_ureporters': total_count}
