function load_cloud_word(element){
    var district = $('#district_filter').text();
    console.log("Clicked on: " +district);
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
    console.log("Category:" + cat);
    $('.modal-title').text(district + " {{ period|cut:'/' }}'s Word Cloud filtered with "+ category);
    $('#cloud').html("<p>Word Cloud Loading Please Wait...</p>");
    $('#cloud_modal').modal();
    if(district){
	console.log('District: '+ district + " found");
	$('#cloud').load('/map-cloud/?district='+district + "&period={{ period|cut:'/'|default:'' }}&category="+cat);
    }else{
	console.log('District not found');
	$('#cloud').load('/map-cloud/?category='+cat + "&period={{ period|cut:'/'|default:'' }}");
    }
}

function max_of(obj){
    var n = 0;
    var x;
    var key;
    for (x in obj){
	if (obj[x] > n){
	    n = obj[x];
	    key = x;
	}
    }
    return key;
}


function ready(error, ug, category) {
    var loading = document.getElementById("loading");
    if (loading){
	loading.style.display = "none";
    }
    // TODO handle error!
    // TODO maybe rework so that fgmPoll.tsv is organized like this?
    // District Answer Number
    // District1 yes 22
    // District1 no 11
    // i *think* that this sort of structure
    // would make it simpler to group by answer, so you could
    // easily toggle between mapping percentYes to percentNo, etc
    //
    // add poll name to each result record
    // TODO toggle between results from more than one poll
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
    caseTypes = _.unique(_.pluck(categories.top(1000), 'category'));
    categoriesGroup = categories.group().reduceSum(function(d){return d.total});
    categoryColor = d3.scale.ordinal()
    .domain(caseTypes)
    .range(["#0000FF", "#000000", "#800080", "#FFA500", "#FF0000", "#808080", "#006400"]);

    pieColor = d3.scale.ordinal()
    .domain(caseTypes)
    .range(["#000000", "#006400", "#800080", "#0000FF", "#FFA500", "#FF0000", "#808080"]);

    var dominant_mapper = {"no messages":0, "water":1, "violence against children":2, "ovc":6, "health & nutrition":3, "emergency":5, "education":4, "social policy":7};
    function category_of(value){
	var n;
	var x;
	for (x in dominant_mapper){
	    if (value == dominant_mapper[x]){
		n = x;
	    }
	}
	return n;
    }

    // crossfilter dimension for districts


    // crossfilter group (map-reduce) for poll result counts and stats by district
    // see https://github.com/square/crossfilter/wiki/API-Reference#wiki-group_reduce
    var totalAnswersByDistrict = districts.group().reduce(
	function(p, v) {
	// add function
	// reduce by sum
	p.total += +v.total;
	p.totals[v.category] = v.total;
	if (v.total !== 0){
	    p.categories.push(v.category);
	}
	p.dominant_name = max_of(p.totals);
	p.dominant = dominant_mapper[p.dominant_name];
	p.countList = _.sortBy(_.pairs(p.totals), function(d){return d[1];});
	total = p;
	return p;
    },
    function(p, v) {
	// add function
	// reduce by sum
	p.total -= +v.total;
	p.totals[v.category] = v.total;
	if (v.total !== 0){
	    p.categories.push(v.category);
	}
	p.dominant_name = max_of(p.totals);
	p.dominant = dominant_mapper[p.dominant_name];
	p.countList = _.sortBy(_.pairs(p.totals), function(d){return d[1];});
	total = p;
	return p;
    },
    function() {
	return {total: 0, counts: {}, countList: [], categories: [], totals: {}, dominant_name:"", dominant:0};
    }
    );

    maxCategories = _.max(totalAnswersByDistrict.top(1000), function(p) {return p.value.total;}).value.total;

    function enumerateCountsForDatumTitle(d) {
	var countsText = _.map(d.value.countList, function(x) {return x[0] + ":\t " + x[1] + "\n";}).join('');
	return d.key + ":" + d.value.total
	+ "\nCategories"
	+ "\n"
	+ countsText;
    }

    ugChart.width(width)
    .height(height)
    .dimension(districts)
    .projection(projection)
    .group(totalAnswersByDistrict)
    .valueAccessor(function (p) {
	return p.value.dominant;
    })
    // TODO look into patching dc.js so we can
    // use topojson instead of geojson (topojson files are much smaller)
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
    // color across yellow-green-blue range
    // with a domain of 0% yes to 100% yes
    .colors(["#E8FAF9", "#0000FF", "#000000", "#800080", "#FFA500", "#FF0000", "#808080"])
    .colorAccessor(function(d, i){return d})
    .title(function (d) {
	return "District: " + d.key + "\n " + category_of((d.value ? d.value : 0));
    });



    totalsChart.width((width))
    .height(height/1.5)
    .margins({top: 10, right: 50, bottom: 30, left: 60})
    .dimension(districts)
    // FIXME colors shown on chart don't make sense. WTF
    .colors(colorbrewer.YlGnBu[9])
    .colorDomain([0, 100])
    .group(totalAnswersByDistrict)
    .keyAccessor(function (p) {
	return p.value.total;
    })
    .valueAccessor(function (p) {
	return _.unique(p.value.categories).length;
    })
    .radiusValueAccessor(function (p) {
	return p.value.total;
    })
    // TODO calculate these domains
    .x(d3.scale.linear().domain([0, (2 + maxCategories)]))
    .r(d3.scale.linear().domain([0, maxCategories]))
    .minRadiusWithLabel(11)
    .elasticY(true)
    .yAxisPadding(5)
    .elasticX(true)
    .xAxisPadding(200)
    .maxBubbleRelativeSize(0.07)
    .renderHorizontalGridLines(false)
    .renderVerticalGridLines(true)
    .renderLabel(true)
    .renderTitle(true)
    .title(function (p) {
	return enumerateCountsForDatumTitle(p);
    });
    totalsChart.yAxis().tickFormat(function (s) {
	return s ;
    });
    totalsChart.xAxis().tickFormat(function (s) {
	return s;
    });

    nationalPieChart
    .width(200)
    .height(200)
    .transitionDuration(1000)
    .colors(pieColor)
    .colorAccessor(function(d, i){return i;})
    .radius(100)
    .innerRadius(30)
    .dimension(categories)
    .group(categoriesGroup)
    .renderLabel(true)
    .renderTitle(true);

    dc.renderAll();

    mapLegendColors = d3.scale.linear()
    .domain(d3.range(0,8))
    .range(["#BEBEBE", "#0000FF", "#000000", "#800080", "#FFA500", "#FF0000", "#808080", "#006400"]);

    var legend = d3.select('.legend');

    var legendItems = legend.selectAll('.legend-item')
    .data(_.zip(mapLegendColors.domain(), mapLegendColors.range()));

    legendItems.enter().append('li')
       .attr("style", function (d) { return "border-left: 18px solid " + mapLegendColors(d[0]) + ";"; })
    .append('span')
       .attr("style", function (d) { return "background-color: #FFFFFF; width: 90px; color: " + mapLegendColors(d[0]) + ";"; })
    .html(function(d) {
	return " " + category_of(d[0]);
    });
}
