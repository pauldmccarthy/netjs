define(["netdata", "netvis", "lib/d3"], function(netdata, netvis, d3) {

  // Cite: http://marvl.infotech.monash.edu/webcola/examples/unix.html

  function drawNetwork(network) {
    var svg      = network.display.svg;
    var radius   = network.display.radius;
    var width    = network.display.width;
    var height   = network.display.height;
    var svgEdges = network.display.svgEdges;
    var svgNodes = network.display.svgNodes;

    var force = d3.layout.force();
    force
      .size([width, height])
      .charge(-250)
      .linkDistance(125)
      .nodes(network.nodes)
      .links(network.edges);

    var nodeGroups = svgNodes
      .selectAll("g")
      .data(network.nodes)
      .enter()
      .append("g")
      .call(force.drag);

    nodeGroups
      .append("text")
      .attr("text-anchor", "middle" )
      .style("pointer-events", "none")
      .attr("fill", function(node) {return network.scaleInfo.nodeColourScale(node.label);})
      .attr("transform", "translate(" + netvis.HLT_THUMB_WIDTH/2.0 + ",-5)")
      .text(function(node) {return node.name;});

    nodeGroups
      .append("image")
      .attr("xlink:href", function(node) {return node.thumbnail;})
      .attr("width",      netvis.HLT_THUMB_WIDTH)
      .attr("height",     netvis.HLT_THUMB_HEIGHT);

    nodeGroups
      .append("rect")
      .attr("fill", "none")
      .attr("stroke", function(node) {
        return network.scaleInfo.nodeColourScale(node.label);})
      .attr("stroke-width", "2")
      .attr("x", "0")
      .attr("y", "0")
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("width",  netvis.HLT_THUMB_WIDTH)
      .attr("height", netvis.HLT_THUMB_HEIGHT);

    var edges = svgEdges 
      .selectAll("line")
      .data(network.edges)
      .enter()
      .append("line")
      .attr("fill",   "none")
      .attr("stroke",       function(edge) {
          return network.scaleInfo.hltEdgeColourScale(
            edge.weights[
              network.scaleInfo.edgeColourWeightIdx]);})
      .attr("stroke-width", function(edge) {
          return network.scaleInfo.edgeWidthScale(
            edge.weights[network.scaleInfo.edgeWidthWeightIdx]);});
      
    force.on("tick", function() {

      nodeGroups
        .attr("transform", function(node) {
          return "translate(" + node.x + "," + node.y + ")";});

      edges
        .attr("x1", function(edge) {return edge.source.x + netvis.HLT_THUMB_WIDTH  / 2.0;})
        .attr("y1", function(edge) {return edge.source.y + netvis.HLT_THUMB_HEIGHT / 2.0;})
        .attr("x2", function(edge) {return edge.target.x + netvis.HLT_THUMB_WIDTH  / 2.0;})
        .attr("y2", function(edge) {return edge.target.y + netvis.HLT_THUMB_HEIGHT / 2.0;})
    });

    force.start();
    
  }

  function displaySubNetwork(network, div, width, height) {

    var visProps = {};
    var diameter = Math.min(width, height);
    var radius   = diameter / 2;

    var svg = null;

    if (!network.display) {

      svg = d3.select(div).append("svg")
        .attr("width",       width)
        .attr("height",      height)
        .style("background-color", "#fafaf0")
    }
    else {
      svg = network.display.svg;
    }

    var parentGroup = svg
      .append("g")
      .attr("id", "networkParentGroup"); 

    var display = {};

    display.svg      = svg;
    display.radius   = radius;
    display.width    = width;
    display.height   = height;
    display.svgEdges = parentGroup.append("g");
    display.svgNodes = parentGroup.append("g");

    network.display = display;

    drawNetwork(network);
  }

  function redrawSubNetwork(network) {

    network.display.svg.select("#networkParentGroup").remove();

    displaySubNetwork(
      network, null, network.display.width, network.display.height);    
  }

  function clearSubNetwork(network) {
    if (!network.display) return;
    network.display.svg.remove();
    delete network.display;
  }


  var netvis_subnet = {};
  netvis_subnet.displaySubNetwork = displaySubNetwork;
  netvis_subnet.redrawSubNetwork  = redrawSubNetwork;
  netvis_subnet.clearSubNetwork   = clearSubNetwork;

  return netvis_subnet;
});
