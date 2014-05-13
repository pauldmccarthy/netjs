define(["netdata", "lib/d3"], function(netdata, d3) {


  function drawNodes (network) {
    var svg           = network.localVisProps.svg;
    var radius        = network.localVisProps.radius;
    var width         = network.localVisProps.width;
    var height        = network.localVisProps.height;
    var svgNodeLabels = network.localVisProps.svgNodeLabels;
    var svgThumbnails = network.localVisProps.svgThumbnails;

    var force = d3.layout.force()
      .size([width, height])
      .nodes(network.nodes)
      .links(network.edges)
      .start();


    function positionLabel(node) {
      return "translate(" + node.x + "," + node.y + ")";
    }

    function positionThumbnail(node) {
      return "translate(" + node.x + "," + node.y + ")";
    }
    
    svgNodeLabels
      .selectAll("text")
      .data(network.nodes)
      .enter()
      .append("text")
      .attr("transform", positionLabel)
      .text(function(node) {return node.name;});

    svgThumbnails
      .selectAll("image")
      .data(network.nodes)
      .enter()
      .append("image")
      .attr("transform",  positionThumbnail)
      .attr("xlink:href", function(node) {return node.thumbnail;})
      .attr("width",      91/1.5)
      .attr("height",     109/1.5);
  }

  function displayLocalNetwork(network, div, width, height) {

    var visProps = {};
    var diameter = Math.min(width, height);
    var radius   = diameter / 2;
    
    var svg = d3.select(div).append("svg")
      .attr("width",       width)
      .attr("height",      height)
      .style("background-color", "#fafaf0")

    var parentGroup = svg
      .append("g")
      .attr("id", "networkParentGroup")
      .attr("transform", "translate(" + radius + "," + radius + ")"); 

    visProps.svg           = svg;
    visProps.radius        = radius;
    visProps.width         = width;
    visProps.height        = height;
    visProps.svgNodeLabels = parentGroup.append("g");
    visProps.svgThumbnails = parentGroup.append("g");
    visProps.svgEdges      = parentGroup.append("g");

    network.localVisProps = visProps;

    drawNodes(network);
  }

  

  var netvis_local = {};
  netvis_local.displayLocalNetwork = displayLocalNetwork;

  return netvis_local;
});
