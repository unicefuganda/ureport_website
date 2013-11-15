import simplejson
import urllib
import re

from django.views.generic import TemplateView, DetailView, ListView
from django.conf import settings

from .models import Partners, Quotes, Read, Watch


def get_polls():
    api_base = settings.UREPORT_API_BASE
    args = {
        'limit': settings.UREPORT_API_LIMIT,
        'username': settings.UREPORT_API_USERNAME,
        'api_key': settings.UREPORT_API_KEY,
        'format': 'json',
    }
    url = api_base + '/polls/?' + urllib.urlencode(args)
    return simplejson.load(urllib.urlopen(url))


def get_read_list():
    return Read.objects.filter(published=True)


def get_quote_list():
    return Quotes.objects.filter(published=True)


class SiteIndexView(TemplateView):
    template_name = 'ureport_website/index.html'

    def get_context_data(self, **kwargs):
        try:
            watchLatest = Watch.objects.latest('id')
        except Watch.DoesNotExist:
            watchLatest = None

        params = {
            'readList': get_read_list(),
            'watchLatest': watchLatest
        }
        return params


class EngageView(TemplateView):
    template_name = 'ureport_website/engage.html'


class NationalPulseView(TemplateView):
    template_name = 'ureport_website/national_pulse.html'

    def get_context_data(self, **kwargs):
        context = super(NationalPulseView, self).get_context_data(**kwargs)
        context['pulse_json_url'] = settings.UREPORT_PULSE_WS
        context['pulse_districts_url'] = settings.UREPORT_PULSE_DISTRICT_WS
        context['map_args'] = settings.UREPORT_PULSE_MAP_ARGS
        return context


class AboutView(TemplateView):
    template_name = 'ureport_website/about.html'

    def get_context_data(self, **kwargs):
        context = {
            'quoteList': get_quote_list()
        }
        return context


class PollsListView(TemplateView):
    template_name = 'ureport_website/polls_list.html'

    def get_context_data(self, **kwargs):
        context = super(PollsListView, self).get_context_data(**kwargs)

        result = get_polls()

        if 'error_message' in result:
            print result['error_message']
        else:
            objects = result['objects']
            polls = sorted(objects, cmp=lambda x, y: cmp(x['start_date'], y['start_date']), key=None, reverse=True)
            context['polls'] = polls[:50]
            context['recent_polls'] = polls[:5]
        return context


class PollDetailView(TemplateView):
    template_name = 'ureport_website/polls_detail.html'


class PollSearchView(TemplateView):
    template_name = 'ureport_website/polls_search_results.html'

    def get_context_data(self, **kwargs):
        context = super(PollSearchView, self).get_context_data(**kwargs)
        try:
            search_term = self.request.GET.get('q')
        except:
            return context

        result = get_polls()

        if 'Error' in result:
            print result['Error']
        else:
            prog = re.compile(search_term)
            objects = result['objects']
            p = [poll for poll in objects if prog.search(poll['question'])]
            polls = sorted(p, cmp=lambda x, y: cmp(x['start_date'], y['start_date']), key=None, reverse=True)
            context['polls'] = p[:50]
            context['recent_polls'] = polls[:5]
        return context


class PartnersListView(ListView):
    model = Partners
    context_object_name = 'partnersList'

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super(PartnersListView, self).get_context_data(**kwargs)
        context['quoteList'] = get_quote_list()
        return context


class PartnersDetailView(DetailView):
    model = Partners
    context_object_name = 'partnerDetails'

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super(PartnersDetailView, self).get_context_data(**kwargs)
        context['quoteList'] = get_quote_list()
        context['partnersList'] = Partners.objects.filter(published=True)
        return context


class ReadListView(ListView):
    model = Read
    context_object_name = 'readList'
    queryset = Read.objects.filter(published=True)

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super(ReadListView, self).get_context_data(**kwargs)
        context['quoteList'] = get_quote_list()

        try:
            readLatest = Read.objects.latest('id')
        except Read.DoesNotExist:
            readLatest = None
        context['readLatest'] = readLatest
        return context


class ReadDetailView(DetailView):
    model = Read
    context_object_name = 'readDetails'
    queryset = Read.objects.filter(published=True)

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super(ReadDetailView, self).get_context_data(**kwargs)
        context['quoteList'] = get_quote_list()
        context['readList'] = Read.objects.filter(published=True)
        return context


class WatchListView(ListView):
    model = Watch
    context_object_name = 'watchList'
    queryset = Watch.objects.filter(published=True)

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super(WatchListView, self).get_context_data(**kwargs)
        context['quoteList'] = get_quote_list()

        try:
            watchLatest = Watch.objects.latest('id')
        except Watch.DoesNotExist:
            watchLatest = None
        context['watchLatest'] = watchLatest
        return context


class WatchDetailView(DetailView):
    model = Watch
    context_object_name = 'watchDetails'
    queryset = Watch.objects.filter(published=True)

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super(WatchDetailView, self).get_context_data(**kwargs)
        context['quoteList'] = get_quote_list()
        context['watchList'] = Watch.objects.filter(published=True)
        return context
