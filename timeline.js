/* *********************************************************************
 * Time chart
 */
var width = document.body.clientWidth,
    margin = {top: 60, right: 0, bottom: 10, left: 0},
    height = 150 - margin.top - margin.bottom;

 var time_scale_x = d3.scale.ordinal()
     .rangeRoundBands([0, width], .1);

 var time_scale_y = d3.scale.linear()
     .range([height, 0]);

 var time_x_axis = d3.svg.axis()
     .scale(time_scale_x)
     .orient("bottom");

 var time_y_axis = d3.svg.axis()
     .scale(time_scale_y)
     .orient("left")
     .ticks(10, "%");

 var chart_svg = d3.select("#timechart").append("svg")
     .attr("width", width + margin.left + margin.right)
     .attr("height", height + margin.top + margin.bottom)
   .append("g")
     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.csv("visit_percentage.csv", type, function(error, timechart) {
  time_scale_x.domain(timechart.map(function(d) { return d.year; }));
  time_scale_y.domain([0, d3.max(timechart, function(d) { return d.perc_year; })]);

  chart_svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(time_x_axis)
    .selectAll("text")
      .attr("y", 0)
      .attr("x", 9)
      .attr("dy", ".35em")
      .attr("transform", "rotate(90)")
      .style("text-anchor", "start");

  chart_svg.append("g")
    .attr("class", "y axis")
  .call(time_y_axis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("% of time at court");

  chart_svg.selectAll(".bar")
    .data(timechart)
  .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return time_scale_x(d.year); })
    .attr("width", time_scale_x.rangeBand())
    .attr("y", function(d) { return time_scale_y(d.perc_year); })
    .attr("height", function(d) { return height - time_scale_y(d.perc_year); })
    .style("fill", "steelblue");
});

function type(d) {
  d.perc_year = +d.perc_year;
  return d;
}
