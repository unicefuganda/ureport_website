function load_cloud_word(element){
  var district = $('#district_filter').text();
  if (debug) {
    console.log("Clicked on: " + district);
  }
  $('.modal-title').text(district + " {{ period|cut:'/' }}'s Word Cloud");
  $('#cloud').html("<p>Word Cloud Loading Please Wait...</p>");
  $('#cloud_modal').modal();
  $('#cloud').load('/map-cloud/?district='+district + "&period={{ period|cut:'/'|default:'' }}");
}

function load_cloud_with_category(){
  var district = $('#district_filter').text();
  var category = $('#category_filter').text();
  var cat = category.replace(" ", "_");
  cat = cat.replace(" ", "_");
  if (debug) {
    console.log("Category:" + cat);
  }
  $('.modal-title').text(district + " {{ period|cut:'/' }}'s Word Cloud filtered with "+ category);
  $('#cloud').html("<p>Word Cloud Loading Please Wait...</p>");
  $('#cloud_modal').modal();
  if(district){
    if (debug) {
      console.log('District: '+ district + " found");
    }
    $('#cloud').load('/map-cloud/?district='+district + "&period={{ period|cut:'/'|default:'' }}&category="+cat);
  } else {
    if (debug) {
      console.log('District not found');
    }
    $('#cloud').load('/map-cloud/?category='+cat + "&period={{ period|cut:'/'|default:'' }}");
  }
}

// use this to format decimals to two places
var numberFormat = d3.format(".2f");

// declare some vars here so they are available
// in the browser console for debugging
var records;
var recordsByDistrict;
var shapes;
var recordsByCategory;
var debug = false;
var categories;
var totalsByCategory;


function ready(error, district_shapes, district_records) {
    var loading = document.getElementById("loading");
    if (error !== null) {
      // replace loading notice with error message
      // if assets do not load properly
      loading = false;
      d3.select('#loading')
        .attr('style', "position: absolute; top: 0; left: 42%; z-index: 56; background: #ff0000; color: #ffffff;")
        .html('Oops. An error has occured. Please try again later.');
    }

    // hide loading notice
    if (loading){
	    loading.style.display = "none";
    }

    shapes = district_shapes;
    records = crossfilter(_.map(district_records, function(p){return _.defaults(p, {'category': 'irrelevant'})}))

    recordsByCategory = records.dimension(function(d){
	    return d['category']
    });
    recordsByDistrict = records.dimension(function (d) {
	    return d["district"];
    });
    districtNamesFromData = _.unique(_.pluck(recordsByDistrict, 'district'));
    totalsByCategory = recordsByCategory.group().reduceSum(function(d){return d.total});

    // find all categories
    categories = _.unique(_.pluck(recordsByCategory.top(1000), 'category'));
    // prepend a category for 'no data'
    categories.unshift('no data');

    categoryColorScale = d3.scale.ordinal()
      .domain(_.keys(categories))
      .range(colorbrewer.Set1[categories.length]);

    // d3.map converts an object into something more like a python dict
    // that can be accessed by my_map.get('key') - its faster and more reliable
    // in most browsers
    // this is taking the categories and making a map of {name: index}
    // (d3.map ['create a mapping'] is very different from _.map ['map a function over an array'])
    category_map = d3.map(_.object(_.map(categories, function(d, i){ return [d, i]})));
    // instead of a function, using a d3.map will be faster for lookups
    // _.invert returns a copy of the object with keys and values swapped,
    // so instead of {name: index} like in category_map, this will have
    // a map of {index: name}
    category_of = d3.map(_.invert(category_map));


    // crossfilter group (map-reduce) for poll result counts and stats by district
    // see https://github.com/square/crossfilter/wiki/API-Reference#wiki-group_reduce
    totalsByDistrict = recordsByDistrict.group().reduce(
      function(p, v) {
        // add function
        // reduce by sum
        p.total += +v.total;
        p.totals[v.category] = v.total;
        // for speed, its better to do this type of calculation within the closure
        // rather than by calling a function in another scope.
        // _.pairs returns a list of lists of the object's key value pairs
        // (e.g., [[k,v],[k2,v2],...]
        // then call _.max with an accessor function that finds the largest list based
        // on the value. and then get the key
        //p.dominant_name = _.max(_.pairs(p.totals), function(d) {return Math.max(d[1])})[0]
        //p.dominant = category_map.get(p.dominant_name);
        // ...
        // but! we dont need these. the categoryList is sorted, so
        // _.last(p.categoryList) will be the dominant category
        p.categoryList = _.sortBy(_.pairs(p.totals), function(d){return d[1];});
        return p;
      },
      function(p, v) {
        // add function
        // reduce by sum
        p.total = p.total;
        p.totals[v.category] -= v.total;

        p.categoryList = _.sortBy(_.pairs(p.totals), function(d){return d[1];});
        return p;
      },
      function() {
        return {total: 0, categoryList: [], totals: {}};
      }
    );
    //maxCategories = _.max(totalsByDistrict.top(1000), function(p) {return p.value.total;}).value.total;


    map.width(width)
      .height(height)
      .dimension(recordsByDistrict)
      .projection(projection)
      .group(totalsByDistrict)
      .valueAccessor(function (p) {
        // prepare values (two item array)
        // used by charts: [category_number, count]
        var topcat = _.last(p.value.categoryList);
        return [category_map.get(topcat[0]), topcat[1]];
      })
      .overlayGeoJson(shapes.features, "district", function (d) {
	      if (_.find(districtNamesFromData, function(x){ return x == d.properties.name; })){
          // if district name from map is the same
          // as district name in records, use it
          return d.properties.name;
	      }
        // print debug info if district cannont be reconciled with map
        if (debug) {
            console.log('no district named ', d.properties.name);
        }
	      return d.properties.name;
      })
      .colorAccessor(function(d, i){
        if (d) {
          if (categoryChart.hasFilter()) {
            // if a category is selected in the pie chart,
            // color districts based on number of records
            // for the category
            // TODO would be nice to use shades of the
            // category color instead of Reds
            map.colors(colorbrewer.Reds[9]);
            // TODO calculate upper bound!
            map.colorDomain([0, 1000])
            return d[1];
          } else {
            // if no category is selected,
            // color districts based on the
            // district's dominant category
            map.colors(categoryColorScale)
            return d[0];
          }
        } else {
          return 0;
        }
      })
      .title(function (d) {
        var title_text = "District: " + d.key + "\n ";
        if (d.value && d.value[0]){
          title_text = title_text + category_of.get((d.value[0] ? d.value[0] : 0)) + ": " + d.value[1];
        }
        return title_text;
      });


    categoryChart
      .width(200)
      .height(200)
      .transitionDuration(1000)
      .colors(categoryColorScale)
      .colorAccessor(function(d, i){return _.indexOf(categories, d.data.key); })
      .radius(100)
      .innerRadius(30)
      .dimension(recordsByCategory)
      .group(totalsByCategory)
      .renderLabel(false)
      .renderTitle(true);

    dc.renderAll();

    // create legend
    var legend = d3.select('.legend');
    var legendItems = legend.selectAll('.legend-item')
      .data(_.zip(categoryColorScale.domain(), categoryColorScale.range()));

    // append legend list items
    legendItems.enter().append('li')
       .attr("style", function (d) { return "border-left: 18px solid " + categoryColorScale(d[0]) + ";"; })
    .append('span')
       .attr("style", function (d) { return "background-color: #FFFFFF; width: 90px; color: " + categoryColorScale(d[0]) + ";"; })
    .html(function(d) {
	    return " " + category_of.get(d[0]);
    });
}
