define(["netdata", "lib/d3"], function(netdata, d3) {



  var THUMBNAIL_HEIGHT = 109/1.5;
  var THUMBNAIL_WIDTH  = 91/1.5;


  // Cite: http://marvl.infotech.monash.edu/webcola/examples/unix.html

  function drawNetwork(network) {
    var svg      = network.localVisProps.svg;
    var radius   = network.localVisProps.radius;
    var width    = network.localVisProps.width;
    var height   = network.localVisProps.height;
    var svgEdges = network.localVisProps.svgEdges;
    var svgNodes = network.localVisProps.svgNodes;

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
      .attr("fill", function(node) {return network.nodeColourScale(node.label);})
      .attr("transform", "translate(" + THUMBNAIL_WIDTH/2.0 + ",-5)")
      .text(function(node) {return node.name;});

    nodeGroups
      .append("image")
      .attr("xlink:href", function(node) {return node.thumbnail;})
      .attr("width",      THUMBNAIL_WIDTH)
      .attr("height",     THUMBNAIL_HEIGHT);

    nodeGroups
      .append("rect")
      .attr("fill", "none")
      .attr("stroke", function(node) {return network.nodeColourScale(node.label);})
      .attr("stroke-width", "2")
      .attr("x", "0")
      .attr("y", "0")
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("width",  THUMBNAIL_WIDTH)
      .attr("height", THUMBNAIL_HEIGHT);

    var edges = svgEdges 
      .selectAll("line")
      .data(network.edges)
      .enter()
      .append("line")
      .attr("fill",   "none")
      .attr("stroke",       function(edge) {
          return network.hltEdgeColourScale(edge.weights[network.edgeColourWeightIdx]);})
      .attr("stroke-width", function(edge) {
          return network.edgeWidthScale(edge.weights[network.edgeWidthWeightIdx]);});
      
    force.on("tick", function() {

      nodeGroups
        .attr("transform", function(node) {
          return "translate(" + node.x + "," + node.y + ")";});

      edges
        .attr("x1", function(edge) {return edge.source.x + THUMBNAIL_WIDTH  / 2.0;})
        .attr("y1", function(edge) {return edge.source.y + THUMBNAIL_HEIGHT / 2.0;})
        .attr("x2", function(edge) {return edge.target.x + THUMBNAIL_WIDTH  / 2.0;})
        .attr("y2", function(edge) {return edge.target.y + THUMBNAIL_HEIGHT / 2.0;})
    });

    force.start();
    
  }

  function displaySubNetwork(network, div, width, height) {

    var visProps = {};
    var diameter = Math.min(width, height);
    var radius   = diameter / 2;

    if (!network.localVisProps) {
      var svg = d3.select(div).append("svg")
        .attr("width",       width)
        .attr("height",      height)
        .style("background-color", "#fafaf0")
    }
    else {
      var svg = network.localVisProps.svg;
    }

    var parentGroup = svg
      .append("g")
      .attr("id", "networkParentGroup"); 

    visProps.svg      = svg;
    visProps.radius   = radius;
    visProps.width    = width;
    visProps.height   = height;
    visProps.svgEdges = parentGroup.append("g");
    visProps.svgNodes = parentGroup.append("g");


    network.localVisProps = visProps;

    console.log("subnet: ");
    console.log(network);

    drawNetwork(network);
  }

  var netvis_subnet = {};
  netvis_subnet.displaySubNetwork = displaySubNetwork;

  return netvis_subnet;
});
