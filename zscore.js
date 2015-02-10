var width = document.body.clientWidth,
    height = 400; //d3.max([document.body.clientHeight-540, 240]);

var m = [60, 0, 10, 0],
    w = width - m[1] - m[3],
    h = height - m[0] - m[2],
    xscale = d3.scale.ordinal().rangePoints([0, w], 1),
    x = d3.scale.ordinal().range([0, w]),
    yscale = {},
    dragging = {},
    line = d3.svg.line(),
    formatPercent = d3.format(".0%"),
    axis = d3.svg.axis().orient("left").ticks(1+height/50),//.tickFormat(formatPercent),
    data,
    foreground,
    background,
    highlighted,
    dimensions,
    legend,
    subcategories,
    render_speed = 50,
    brush_count = 0,
    excluded_groups = [];

// Tooltip
var tooltip = d3.select("body").append("div")
  .classed("tooltip", true)
  .classed("hidden", true);

var colors = {
  //"Acid": [185,56,73],
  //"Beef": [37,50,75],
  //"Beef (preserved)": [325,50,39],
  "Dairy": [27,158,119],                     // macro
  //"Eggs": [271,39,57],
  //"Fish": [56,58,73],
  //"Fruit": [28,100,52],
  "Grain": [217,95,2],                  // macro
  //"Honey": [318,65,67],
  //"Lard": [274,30,76],
  "Meat": [117,112,179],                   // macro
  //"Nuts": [334,80,84],
  //"Olives": [10,30,42],
  //"Salt": [339,60,49],
  //"Seafood": [359,69,49],
  //"Seasoning": [204,70,41],
  //"Seeds": [1,100,79],
  //"Spice": [189,57,75],
  //"Sugar": [110,57,70],
  //"Vegetable": [214,55,79],
  "Flavoring/Other": [231,41,138],       // macro
  "Fruits and Vegetables": [102,166,30]  // macro
};

// Scale chart and canvas height
d3.select("#chart")
    .style("height", (h + m[0] + m[2]) + "px");

d3.selectAll("canvas")
    .attr("width", w)
    .attr("height", h)
    .style("padding", m.join("px ") + "px");

// Foreground canvas for primary view
foreground = document.getElementById('foreground').getContext('2d');
foreground.globalCompositeOperation = "destination-over";
foreground.strokeStyle = "rgba(0,100,160,0.5)";
foreground.lineWidth = 1.7;
foreground.fillText("Loading...",w/2,h/2);

// Highlight canvas for temporary interactions
highlighted = document.getElementById('highlight').getContext('2d');
highlighted.strokeStyle = "rgba(0,100,160,1)";
highlighted.lineWidth = 4;

// Background canvas
background = document.getElementById('background').getContext('2d');
background.strokeStyle = "rgba(0,100,160,0.1)";
background.lineWidth = 1.7;

// SVG for ticks, labels, and interactions
var svg = d3.select("svg")
    .attr("width", w + m[1] + m[3])
    .attr("height", h + m[0] + m[2])
  .append("g")
    .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

// Load the data and visualization
d3.csv("food.zscore.csv", function(raw_data) {
  // Convert quantitative scales to floats
  data = raw_data.map(function(d) {
    for (var k in d) {
      if (!_.isNaN(raw_data[0][k] - 0) && k != 'subcategory') {
        d[k] = parseFloat(d[k]) || 0;
      }
    };
    return d;
  });

  // Extract the list of numerical dimensions and create a scale for each.
  xscale.domain(dimensions = d3.keys(data[0]).filter(function(k) {
    // Filter out all but years (_.isNumber) and set the domain for y-axis
    return (_.isNumber(data[0][k])) && (yscale[k] = d3.scale.linear()
    .domain([-2,4])
    .range([h, 0]));
  }).sort());

  // Add a group element for each dimension.
  var g = svg.selectAll(".dimension")
      .data(dimensions)
    .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + xscale(d) + ")"; });

  // Add an axis and title.
  g.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0,0)")
      .each(function(d) { d3.select(this).call(axis.scale(yscale[d])); })
    .append("text")
      .attr("text-anchor", "middle")
      .attr("y", function(d,i) { return i%2 == 0 ? -14 : -30 } )
      .attr("x", 0)
      .attr("class", "label")
      .text(String)
      .append("title")
        .text("Click to invert. Drag to reorder");

  // Add and store a brush for each axis.
  g.append("g")
      .attr("class", "brush")
      .each(function(d) { d3.select(this).call(yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush)); })
    .selectAll("rect")
      .style("visibility", null)
      .attr("x", -23)
      .attr("width", 36)
      .append("title")
        .text("Drag up or down to brush along this axis");

  g.selectAll(".extent")
      .append("title")
        .text("Drag or resize this filter");


  legend = create_legend(colors,brush);
  subcategories = create_subcategories(colors, brush);

  // Render full foreground
  brush();

  var columns = d3.keys(raw_data[0]);
//  console.log(columns);

  var table = d3.select("#foods_table").append("table"),
      thead = table.append("thead");
      tbody = table.append("tbody");

      thead.append("tr")
        .selectAll("th")
        .data(columns)
      .enter().append("th")
      .text(function(column) { return column; });

      rows = tbody.selectAll("tr")
        .data(raw_data)
      .enter().append("tr")
        .style("display", null);

//creates a cell for each column in each row
      cells = rows.selectAll("td")
        .data(function(row) {
		        return columns.map(function(column) {
		          return {column: column, value: row[column], maxValue: row["max"]};
		        });
		      })
		    .enter().append("td")
	      .html(function(d,i) { return d.value; });

});
/*
// copy one canvas to another, grayscale
function gray_copy(source, target) {
  var pixels = source.getImageData(0,0,w,h);
  target.putImageData(grayscale(pixels),0,0);
}
*/

/*
// http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
function grayscale(pixels, args) {
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    // CIE luminance for the RGB
    // The human eye is bad at seeing red and blue, so we de-emphasize them.
    var v = 0.2126*r + 0.7152*g + 0.0722*b;
    d[i] = d[i+1] = d[i+2] = v
  }
  return pixels;
};
*/

function create_legend(colors,brush) {
  // create legend
  var legend_data = d3.select("#legend")
    .html("")
    .selectAll(".row")
    .data( _.keys(colors).sort() )

  // filter by group
  var legend = legend_data
    .enter().append("div")
      .attr("title", "Hide group")
      .on("click", function(d) {
        // toggle food group
        if (_.contains(excluded_groups, d)) {
          d3.select(this).attr("title", "Hide group")
          excluded_groups = _.difference(excluded_groups,[d]);
          brush();
        } else {
          d3.select(this).attr("title", "Show group")
          excluded_groups.push(d);
          brush();
        }
      });

  legend
    .append("span")
    .style("background", function(d,i) { return color(d,0.85)})
    .attr("class", "color-bar");

  legend
    .append("span")
    .attr("class", "tally")
    .text(function(d,i) { return 0});

  legend
    .append("span")
    .text(function(d,i) { return " " + d});

  return legend;
}

function create_subcategories(colors,brush) {
  // create legend
  var categories_data = d3.select("#subcategories")
  .html("")
  .selectAll(".row")
  .data( _.keys(colors).sort() )

  // filter by group
  var subcategorylegend = categories_data
  .enter().append("div")
  .attr("title", "Hide group")
  .on("click", function(d) {
    // toggle food group
    if (_.contains(excluded_groups, d)) {
      d3.select(this).attr("title", "Hide group")
      excluded_groups = _.difference(excluded_groups,[d]);
      brush();
    } else {
      d3.select(this).attr("title", "Show group")
      excluded_groups.push(d);
      brush();
    }
  });

  subcategorylegend
  .append("span")
  .style("background", function(d,i) { return color(d,0.85)})
  .attr("class", "color-bar");

  subcategorylegend
  .append("span")
  .attr("class", "tally")
  .text(function(d,i) { return 0});

  subcategorylegend
  .append("span")
  .text(function(d,i) { return " " + d});

  return subcategorylegend;
}

// render polylines i to i+render_speed
function render_range(selection, i, max, opacity) {
  selection.slice(i,max).forEach(function(d) {
    path(d, foreground, color(d.macrocategory,opacity));
  });
};

// simple data table
function data_table(sample) {
  // sort by first column
  var sample = sample.sort(function(a,b) {
    var col = d3.keys(a)[0];
    return a[col] < b[col] ? -1 : 1;
  });

  // var foodList = sample.sort(function(a,b) {
  //   var col = d3.keys(a)[0];
  //   return a[col] < b[col] ? -1 : 1;
  // });

  var table = d3.select("#food-list")
    .html("")
    .selectAll(".row")
      .data(sample)
    .enter().append("div")
      .on("mouseover", highlight)
      .on("mouseout", unhighlight);

  table
    .append("span")
      .attr("class", "color-block")
      .style("background", function(d) { return color(d.macrocategory,0.85) })

  table
    .append("span")
      .text(function(d) { return d.translation; })
}

// Adjusts rendering speed
function optimize(timer) {
  var delta = (new Date()).getTime() - timer;
  render_speed = Math.max(Math.ceil(render_speed * 30 / delta), 8);
  render_speed = Math.min(render_speed, 300);
  return (new Date()).getTime();
}

// Feedback on rendering progress
function render_stats(i,n,render_speed) {
  d3.select("#rendered-count").text(i);
  d3.select("#rendered-bar")
    .style("width", (100*i/n) + "%");
  d3.select("#render-speed").text(render_speed);
}

// Feedback on selection
function selection_stats(opacity, n, total) {
  d3.select("#data-count").text(total);
  d3.select("#selected-count").text(n);
  d3.select("#selected-bar").style("width", (100*n/total) + "%");
  d3.select("#opacity").text((""+(opacity*100)).slice(0,4) + "%");
}

// Highlight single polyline
function highlight(d) {
  d3.select("#foreground").style("opacity", "0.25");
  d3.selectAll(".row").style("opacity", function(p) { return (d.macrocategory == p) ? null : "0.3" });
  path(d, highlighted, color(d.macrocategory,1));
  d3.selectAll(".row").style("opacity", function(p) { return (d.subcategory == p) ? null : "0.3" });
  path(d, highlighted, color(d.subcategory,1));
}

// Remove highlight
function unhighlight() {
  d3.select("#foreground").style("opacity", null);
  d3.selectAll(".row").style("opacity", null);
  highlighted.clearRect(0,0,w,h);
}
/*
function invert_axis(d) {
  // save extent before inverting
  if (!yscale[d].brush.empty()) {
    var extent = yscale[d].brush.extent();
  }
  if (yscale[d].inverted == true) {
    yscale[d].range([h, 0]);
    d3.selectAll('.label')
      .filter(function(p) { return p == d; })
      .style("text-decoration", null);
    yscale[d].inverted = false;
  } else {
    yscale[d].range([0, h]);
    d3.selectAll('.label')
      .filter(function(p) { return p == d; })
      .style("text-decoration", "underline");
    yscale[d].inverted = true;
  }
  return extent;
}
*/

// Draw a single polyline
/*
function path(d, ctx, color) {
  if (color) ctx.strokeStyle = color;
  var x = xscale(0)-15;
      y = yscale[dimensions[0]](d[dimensions[0]]);   // left edge
  ctx.beginPath();
  ctx.moveTo(x,y);
  dimensions.map(function(p,i) {
    x = xscale(p),
    y = yscale[p](d[p]);
    ctx.lineTo(x, y);
  });
  ctx.lineTo(x+15, y);                               // right edge
  ctx.stroke();
}
*/

function path(d, ctx, color) {
  if (color) ctx.strokeStyle = color;
  ctx.beginPath();
  var x0 = xscale(0)-15,
      y0 = yscale[dimensions[0]](d[dimensions[0]]);   // left edge
  ctx.moveTo(x0,y0);
  dimensions.map(function(p,i) {
    var x = xscale(p),
        y = yscale[p](d[p]);
    var cp1x = x - 0.88*(x-x0);
    var cp1y = y0;
    var cp2x = x - 0.12*(x-x0);
    var cp2y = y;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    x0 = x;
    y0 = y;
  });
  ctx.lineTo(x0+15, y0);                               // right edge
  ctx.stroke();
}

function color(d,a) {
  var c = colors[d];
  //console.log("hsla("+c[0]+","+c[1]+"%,"+c[2]+"%,"+a+")");
  //console.log(["hsla(",c[0],",",c[1],"%,",c[2],"%,",a,")"].join(""));
  //return ["hsla(",c[0],",",c[1],"%,",c[2],"%,",a,")"].join("");
  return ["rgba(",c[0],",",c[1],",",c[2],",",a,")"].join("");
}

function position(d) {
  var v = dragging[d];
  return v == null ? xscale(d) : v;
}

// Handles a brush event, toggling the display of foreground lines.
// TODO refactor
function brush() {
  brush_count++;
  var actives = dimensions.filter(function(p) { return !yscale[p].brush.empty(); }),
      extents = actives.map(function(p) { return yscale[p].brush.extent(); });

  // hack to hide ticks beyond extent
  // var b = d3.selectAll('.dimension')[0]
  //   .forEach(function(element, i) {
  //     var dimension = d3.select(element).data()[0];
  //     if (_.include(actives, dimension)) {
  //       var extent = extents[actives.indexOf(dimension)];
  //       d3.select(element)
  //         .selectAll('text')
  //         .style('font-weight', 'bold')
  //         .style('font-size', '13px')
  //         .style('display', function() {
  //           var value = d3.select(this).data();
  //           return extent[0] <= value && value <= extent[1] ? null : "none"
  //         });
  //     } else {
  //       d3.select(element)
  //         .selectAll('text')
  //         .style('font-size', null)
  //         .style('font-weight', null)
  //         .style('display', null);
  //     }
  //     d3.select(element)
  //       .selectAll('.label')
  //       .style('display', null);
  //   });
  //   ;

  // bold dimensions with label
  d3.selectAll('.label')
    .style("font-weight", function(dimension) {
      if (_.include(actives, dimension)) return "bold";
      return null;
    });

  // Get lines within extents
  var selected = [];
  data
    .filter(function(d) {
      return !_.contains(excluded_groups, d.macrocategory);
    })
    .map(function(d) {
      return actives.every(function(p, dimension) {
        return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
      }) ? selected.push(d) : null;
    });

  // free text search
  var query = d3.select("#search")[0][0].value;
  if (query.length > 0) {
    selected = search(selected, query);
  }

  if (selected.length < data.length && selected.length > 0) {
    d3.select("#keep-data").attr("disabled", null);
    d3.select("#exclude-data").attr("disabled", null);
  } else {
    d3.select("#keep-data").attr("disabled", "disabled");
    d3.select("#exclude-data").attr("disabled", "disabled");
  };

  // total by food group
  var tallies = _(selected)
    .groupBy(function(d) { return d.macrocategory; })

  var subcategoryTallies = _(selected)
    .groupBy(function(d) { return d.subcategory; })

  //console.log(subcategoryTallies);

  // include empty groups
  _(colors).each(function(v,k) { tallies[k] = tallies[k] || []; });
  _(colors).each(function(v,k) { subcategoryTallies[k] = subcategoryTallies[k] || []; });

  legend
    .style("text-decoration", function(d) { return _.contains(excluded_groups,d) ? "line-through" : null; })
    .attr("class", function(d) {
      return (tallies[d].length > 0)
           ? "row"
           : "row off";
    });

  legend.selectAll(".color-bar")
    .style("width", function(d) {
      return Math.ceil(600*tallies[d].length/data.length) + "px"
    });

  legend.selectAll(".tally")
    .text(function(d,i) { return tallies[d].length });

  subcategories
    .style("text-decoration", function(d) { return _.contains(excluded_groups,d) ? "line-through" : null; })
    .attr("class", function(d) {
      return (subcategoryTallies[d].length > 0)
      ? "row"
      : "row off";
    });

  subcategories.selectAll(".color-bar")
    .style("width", function(d) {
      return Math.ceil(600*subcategoryTallies[d].length/data.length) + "px"
    });

  subcategories.selectAll(".tally")
    .text(function(d,i) { return subcategoryTallies[d].length });

  // Render selected lines
  paths(selected, foreground, brush_count, true);
}

// render a set of polylines on a canvas
function paths(selected, ctx, count) {
  var n = selected.length,
      i = 0,
      opacity = d3.min([2/Math.pow(n,0.3),1]),
      timer = (new Date()).getTime();

  selection_stats(opacity, n, data.length)

  shuffled_data = _.shuffle(selected);

  data_table(shuffled_data.slice(0,25));

  ctx.clearRect(0,0,w+1,h+1);

  // render all lines until finished or a new brush event
  function animloop(){
    if (i >= n || count < brush_count) return true;
    var max = d3.min([i+render_speed, n]);
    render_range(shuffled_data, i, max, opacity);
    render_stats(max,n,render_speed);
    i = max;
    timer = optimize(timer);  // adjusts render_speed
  };

  d3.timer(animloop);
}

// transition ticks for reordering, rescaling and inverting
function update_ticks(d, extent) {
  // update brushes
  if (d) {
    var brush_el = d3.selectAll(".brush")
        .filter(function(key) { return key == d; });
    // single tick
    if (extent) {
      // restore previous extent
      brush_el.call(yscale[d].brush = d3.svg.brush().y(yscale[d]).extent(extent).on("brush", brush));
    } else {
      brush_el.call(yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush));
    }
  } else {
    // all ticks
    d3.selectAll(".brush")
      .each(function(d) { d3.select(this).call(yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush)); })
  }

  brush_count++;

  show_ticks();

  // update axes
  d3.selectAll(".axis")
    .each(function(d,i) {
      // hide lines for better performance
      d3.select(this).selectAll('line').style("display", "none");

      // transition axis numbers
      d3.select(this)
        .transition()
        .duration(720)
        .call(axis.scale(yscale[d]));

      // bring lines back
      d3.select(this).selectAll('line').transition().delay(800).style("display", null);

      d3.select(this)
        .selectAll('text')
        .style('font-weight', null)
        .style('font-size', null)
        .style('display', null);
    });
}

// Rescale to new dataset domain
function rescale() {
  // reset yscales, preserving inverted state
  dimensions.forEach(function(d,i) {
    if (yscale[d].inverted) {
      yscale[d] = d3.scale.linear()
          .domain(d3.extent(data, function(p) { return +p[d]; }))
          .range([0, h]);
      yscale[d].inverted = true;
    } else {
      yscale[d] = d3.scale.linear()
          .domain(d3.extent(data, function(p) { return +p[d]; }))
          .range([h, 0]);
    }
  });

  update_ticks();

  // Render selected data
  paths(data, foreground, brush_count);
}

// Get polylines within extents
function actives() {
  var actives = dimensions.filter(function(p) { return !yscale[p].brush.empty(); }),
      extents = actives.map(function(p) { return yscale[p].brush.extent(); });

  // filter extents and excluded groups
  var selected = [];
  data
    .filter(function(d) {
      return !_.contains(excluded_groups, d.macrocategory);
    })
    .filter(function(d) {
      return !_.contains(excluded_groups, d.subcategory);
    })
    .map(function(d) {
    return actives.every(function(p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? selected.push(d) : null;
  });

  // free text search
  var query = d3.select("#search")[0][0].value;
  if (query > 0) {
    selected = search(selected, query);
  }

  return selected;
}

// scale to window size
// window.onresize = function() {
//   width = document.body.clientWidth,
//   height = d3.max([document.body.clientHeight-500, 220]);
//
//   w = width - m[1] - m[3],
//   h = height - m[0] - m[2];
//
//   d3.select("#chart")
//       .style("height", (h + m[0] + m[2]) + "px")
//
//   d3.selectAll("canvas")
//       .attr("width", w)
//       .attr("height", h)
//       .style("padding", m.join("px ") + "px");
//
//   d3.select("svg")
//       .attr("width", w + m[1] + m[3])
//       .attr("height", h + m[0] + m[2])
//     .select("g")
//       .attr("transform", "translate(" + m[3] + "," + m[0] + ")");
//
//   xscale = d3.scale.ordinal().rangePoints([0, w], 1).domain(dimensions);
//   dimensions.forEach(function(d) {
//     yscale[d].range([h, 0]);
//   });
//
//   d3.selectAll(".dimension")
//     .attr("transform", function(d) { return "translate(" + xscale(d) + ")"; })
//   // update brush placement
//   d3.selectAll(".brush")
//     .each(function(d) { d3.select(this).call(yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush)); })
//   brush_count++;
//
//   // update axis placement
//   axis = axis.ticks(1+height/50),
//   d3.selectAll(".axis")
//     .each(function(d) { d3.select(this).call(axis.scale(yscale[d])); });
//
//   // render data
//   brush();
// };

// Remove all but selected from the dataset
// function keep_data() {
//   new_data = actives();
//   if (new_data.length == 0) {
//     alert("I don't mean to be rude, but I can't let you remove all the data.\n\nTry removing some brushes to get your data back. Then click 'Keep' when you've selected data you want to look closer at.");
//     return false;
//   }
//   data = new_data;
//   rescale();
// }

// Exclude selected from the dataset
// function exclude_data() {
//   new_data = _.difference(data, actives());
//   if (new_data.length == 0) {
//     alert("I don't mean to be rude, but I can't let you remove all the data.\n\nTry selecting just a few data points then clicking 'Exclude'.");
//     return false;
//   }
//   data = new_data;
//   rescale();
// }
//
// function remove_axis(d,g) {
//   dimensions = _.difference(dimensions, [d]);
//   xscale.domain(dimensions);
//   g.attr("transform", function(p) { return "translate(" + position(p) + ")"; });
//   g.filter(function(p) { return p == d; }).remove();
//   update_ticks();
// }

// d3.select("#keep-data").on("click", keep_data);
// d3.select("#exclude-data").on("click", exclude_data);
// d3.select("#export-data").on("click", export_csv);
d3.select("#search").on("keyup", brush);

/*
// Appearance toggles
d3.select("#hide-ticks").on("click", hide_ticks);
d3.select("#show-ticks").on("click", show_ticks);

function hide_ticks() {
  d3.selectAll(".axis g").style("display", "none");
  //d3.selectAll(".axis path").style("display", "none");
  d3.selectAll(".background").style("visibility", "hidden");
  d3.selectAll("#hide-ticks").attr("disabled", "disabled");
  d3.selectAll("#show-ticks").attr("disabled", null);
};

function show_ticks() {
  d3.selectAll(".axis g").style("display", null);
  //d3.selectAll(".axis path").style("display", null);
  d3.selectAll(".background").style("visibility", null);
  d3.selectAll("#show-ticks").attr("disabled", "disabled");
  d3.selectAll("#hide-ticks").attr("disabled", null);
};
*/

function search(selection,str) {
  pattern = new RegExp(str,"i")
  return _(selection).filter(function(d) { return pattern.exec(d.translation); });
}

function tooltipText(d) {

  var val;
  var sPop   = "n/a",
  fbPop  = "n/a",
  ftPop  = "n/a",
  sPerc  = "n/a",
  fbPerc = "n/a",
  ftPerc = "n/a",
  tPop   = "n/a",
  sDen   = "n/a",
  fbDen  = "n/a",
  ftDen  = "n/a",
  tDen   = "n/a";

  if (data.raw_data.has(d.id) && data.raw_data.get(d.id).has(current.year.toString())) {

    val = data.raw_data.get(d.id).get(current.year.toString())[0];

    foodName      = val.translation;
    pctChange     = val.pctChange;
    zScore        = val.zscore;
    foodValue     = val.value;
    category      = val.category;
    subcategory   = val.subcategory;
    macrocategory = val.macrocategory;
  }

  return "<h5>" + d.properties.c + ", " + d.properties.s + "</h5>" +
  "<table>" +
  "<tr>" +
  "<td class='field'>Slaves: </td>" +
  "<td>" + sPop.toLocaleString() + "</td>" +
  "<td style='width:65px;'>" + sPerc + "</td>" +
  "</tr><tr>"+
  "<td class='field'>Free African Americans: </td>" +
  "<td>" + fbPop.toLocaleString() + "</td>" +
  "<td style='width:65px;'>" + fbPerc + "</td>" +
  "</tr><tr>"+
  "<td class='field'>Total free population: </td>" +
  "<td>" + ftPop.toLocaleString() + "</td>" +
  "<td style='width:65px;'>" + ftPerc + "</td>" +
  "</tr><tr>"+
  "<td class='field'>Total population: </td>" +
  "<td>" + tPop.toLocaleString() + "</td>" +
  "<td></td>" +
  "</tr><tr>"+
  "<td class='field table-break'>Slaves/mileÂ²: </td>" +
  "<td class='table-break'>" + sDen + "</td>" +
  "</tr><tr>"+
  "<td class='field'>Free African Americans/mileÂ²: </td>" +
  "<td>" + fbDen + "</td>" +
  "</tr><tr>"+
  "<td class='field'>Total free persons/mileÂ²: </td>" +
  "<td>" + ftDen + "</td>" +
  "</tr><tr>"+
  "<td class='field'>All persons/mileÂ²: </td>" +
  "<td>" + tDen + "</td>" +
  "</tr></table>";
}
