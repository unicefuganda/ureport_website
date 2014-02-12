# ureport_website/urls.py

from __future__ import unicode_literals

from django.conf import settings
from django.conf.urls import include, patterns, url
from django.conf.urls.i18n import i18n_patterns
from django.conf.urls.static import static
from django.contrib import admin

from .views import (AboutView, EngageView, NationalPulsePeriodView,
                    NationalPulseView, PartnersDetailView, PartnersListView,
                    PollDetailView, PollSearchView, PollsListView,
                    ReadDetailView, ReadListView, SiteIndexView,
                    WatchDetailView, WatchListView)

admin.autodiscover()

urlpatterns = i18n_patterns(
    "",
    # Change the admin prefix here to use an alternate URL for the
    # admin interface, which would be marginally more secure.
    ("^admin/", include(admin.site.urls)),
)

urlpatterns += patterns(
    '',
    url(
        r'^$',
        SiteIndexView.as_view(),
        name="home"
    ),
    url(
        '^about-ureport$',
        AboutView.as_view(),
        name="website-about-ureport"
    ),
    url(
        r'^engage$',
        EngageView.as_view(),
        name='website-engage'
    ),
    url(
        r'^national-pulse/$',
        NationalPulseView.as_view(),
        name='website-national-pulse'
    ),
    url(
        r'^national-pulse/(?P<period>\w+)/$',
        NationalPulsePeriodView.as_view(),
        name='website-national-pulse-detail'
    ),

    # Polls
    url(
        r'^polls/$',
        PollsListView.as_view(),
        name='website-polls'
    ),
    url(
        r'^polls/(?P<object_id>\d+)/$',
        PollDetailView.as_view(),
        name='website-polls-detail'
    ),
    url(
        r'^polls/search/$',
        PollSearchView.as_view(),
        name='website-polls-search'
    ),

    # Partners
    url(
        r'^partners$',
        PartnersListView.as_view(),
        name='website-partners'
    ),
    url(
        r'^partners/(?P<slug>[\w\-]+)/$',
        PartnersDetailView.as_view(),
        name='website-partners-detail'
    ),

    # Read
    url(
        r'^read$',
        ReadListView.as_view(),
        name='website-read'
    ),
    url(
        r'^read/(?P<slug>[\w\-]+)/$',
        ReadDetailView.as_view(),
        name='website-read-detail'
    ),

    # Watch
    url(
        r'^watch$',
        WatchListView.as_view(),
        name='website-watch'
    ),
    url(
        r'^watch/(?P<slug>[\w\-]+)/$',
        WatchDetailView.as_view(),
        name='website-watch-detail'
    ),

    ("^", include("mezzanine.urls")),
) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


# Adds ``STATIC_URL`` to the context of error pages, so that error
# pages can use JS, CSS and images.
handler404 = "mezzanine.core.views.page_not_found"
handler500 = "mezzanine.core.views.server_error"
