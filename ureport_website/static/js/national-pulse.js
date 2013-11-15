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


function ready(error, ug, category) {
    var loading = document.getElementById("loading");
    if (loading){
	    loading.style.display = "none";
    }
    // TODO handle error!
    //data = crossfilter(_.map(poll, function(p) {return _.defaults(p, {'poll': 'fgm'});}));
    shapes = ug;

    data = crossfilter(_.map(category, function(p){return _.defaults(p, {'category': 'irrelevant'})}))
    categories = data.dimension(function(d){
	    return d['category']
    });
    districts = data.dimension(function (d) {
	    return d["district"];
    });
    caseDistricts = _.unique(_.pluck(districts, 'district'));
    categoriesGroup = categories.group().reduceSum(function(d){return d.total});

    // find all categories
    caseTypes = _.unique(_.pluck(categories.top(1000), 'category'));
    // prepend a category for 'no data'
    caseTypes.unshift('no data');

    categoryColor = d3.scale.ordinal()
      .domain(_.keys(caseTypes))
      .range(colorbrewer.Set1[caseTypes.length]);

    // d3.map converts an object into something more like a python dict
    // that can be accessed by my_map.get('key') - its faster and more reliable
    // in most browsers
    // this is taking the caseTypes and making a map of {name: index}
    // (d3.map ['create a mapping'] is very different from _.map ['map a function over an array'])
    dominant_mapper = d3.map(_.object(_.map(caseTypes, function(d, i){ return [d, i]})));
    // instead of a function, using a d3.map will be faster for lookups
    // _.invert returns a copy of the object with keys and values swapped,
    // so instead of {name: index} like in dominant_mapper, this will have
    // a map of {index: name}
    category_of = d3.map(_.invert(dominant_mapper));


    // crossfilter group (map-reduce) for poll result counts and stats by district
    // see https://github.com/square/crossfilter/wiki/API-Reference#wiki-group_reduce
    totalAnswersByDistrict = districts.group().reduce(
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
        //p.dominant = dominant_mapper.get(p.dominant_name);
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
    //maxCategories = _.max(totalAnswersByDistrict.top(1000), function(p) {return p.value.total;}).value.total;


    ugChart.width(width)
      .height(height)
      .dimension(districts)
      .projection(projection)
      .group(totalAnswersByDistrict)
      .valueAccessor(function (p) {
        // prepare values (two item array)
        // used by charts: [category_number, count]
        var dom = _.last(p.value.categoryList);
        return [dominant_mapper.get(dom[0]), dom[1]];
      })
      .overlayGeoJson(ug.features, "district", function (d) {
	      if (_.find(caseDistricts, function(x){ return x == d.properties.name; })){
          // if district name from map is the same
          // as district name in cases, use it
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
          if (nationalPieChart.hasFilter()) {
            // if a category is selected in the pie chart,
            // color districts based on number of cases
            // for the category
            // TODO would be nice to use shades of the
            // category color instead of Reds
            ugChart.colors(colorbrewer.Reds[9]);
            // TODO calculate upper bound!
            ugChart.colorDomain([0, 1000])
            return d[1];
          } else {
            // if no category is selected,
            // color districts based on the dominant category
            ugChart.colors(categoryColor)
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


    nationalPieChart
      .width(200)
      .height(200)
      .transitionDuration(1000)
      .colors(categoryColor)
      .colorAccessor(function(d, i){return _.indexOf(caseTypes, d.data.key); })
      .radius(100)
      .innerRadius(30)
      .dimension(categories)
      .group(categoriesGroup)
      .renderLabel(true)
      .renderTitle(true);

    dc.renderAll();


    var legend = d3.select('.legend');

    var legendItems = legend.selectAll('.legend-item')
      .data(_.zip(categoryColor.domain(), categoryColor.range()));

    legendItems.enter().append('li')
       .attr("style", function (d) { return "border-left: 18px solid " + categoryColor(d[0]) + ";"; })
    .append('span')
       .attr("style", function (d) { return "background-color: #FFFFFF; width: 90px; color: " + categoryColor(d[0]) + ";"; })
    .html(function(d) {
	    return " " + category_of.get(d[0]);
    });
}
