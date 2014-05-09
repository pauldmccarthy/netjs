/*
 * Display the dendrogram and connectivity of a 
 * of a nets_hierarchy call using D3.js.
 * 
 * This file will make more sense if read from bottom to top.
 *
 * Author: Paul McCarthy <pauldmccarthy@gmail.com>
 *
 * Citations: 
 *   - http://d3js.org/
 *   - http://bl.ocks.org/mbostock/7607999
 */
var netvis = (function() {

  /* 
   * Various constants for configuring how nodes,
   * labels, thumbnails, and edges are displayed
   * normally (DEF), when highlighted (HLT),
   * and when selected (SEL).
   */
  var DEF_LABEL_SIZE   = 10;
  var SEL_LABEL_SIZE   = 16;
  var DEF_LABEL_WEIGHT = "normal";
  var HLT_LABEL_WEIGHT = "bold";
  var SEL_LABEL_WEIGHT = "bold";
  var DEF_LABEL_FONT   = "sans";
  var HLT_LABEL_FONT   = "sans";
  var SEL_LABEL_FONT   = "sans";

  // thumbnails are hidden by default
  var HLT_THUMB_WIDTH  = 91 /2.0;
  var HLT_THUMB_HEIGHT = 109/2.0;
  var SEL_THUMB_WIDTH  = 91 /1.5;
  var SEL_THUMB_HEIGHT = 109/1.5;

  // edge width and colour are scaled 
  // according to edge weights. Also,
  // a default edge opacity of less 
  // than 1.0 will result in a huge 
  // performance hit for large networks.
  var DEF_EDGE_WIDTH   = 1;
  var DEF_EDGE_OPACITY = 1.0;
  var HLT_EDGE_OPACITY = 0.7;

  var DEF_NODE_SIZE    = 3;
  var HLT_NODE_SIZE    = 5;
  var SEL_NODE_SIZE    = 5;
  var DEF_NODE_OPACITY = 0.2;
  var HLT_NODE_OPACITY = 1.0;
  var SEL_NODE_OPACITY = 1.0;

  /*
   * Generates D3 colour (and edge width) scales for the given
   * network, and attaches them as attributes of the network.
   * It is assumed that the network object already has two 
   * properties:
   *   - edgeWidthWeightIdx:  Index of the edge weight to be used
   *                          for scaling edge widths.
   *
   *   - edgeColourWeightIdx: Index of the edge weight to be used
   *                          for scaling edge colours.
   *
   * The following attributes are added to the network object:
   *
   *   - nodeColourScale:     Colours nodes according to their cluster
   *
   *   - edgeWidthScale:      Scales edge widths according to the edge 
   *                          weight at index edgeWidthWeightIdx.
   *
   *   - defEdgeColourScale:  Colours edges, when not highlighted, 
   *                          according to the edge weight at index 
   *                          edgeColourWeightIdx.
   *
   *   - hltEdgeColourScale:  Colours edges, when highlighted, according 
   *                          to the edge weight at index 
   *                          edgeColourWeightIdx.
   */
  function genColourScales(network) {
    
    var ewwIdx = network.edgeWidthWeightIdx;
    var ecwIdx = network.edgeColourWeightIdx;

    // Nodes are coloured according to their cluster
    // TODO handle more than 10 clusters?
    var nodeColourScale = d3.scale.category10();

    var ecMin = network.weightAbsMins[ecwIdx];
    var ecMax = network.weightAbsMaxs[ecwIdx];
    var ewMin = network.weightAbsMins[ewwIdx];
    var ewMax = network.weightAbsMaxs[ewwIdx];

    // Edge width scale
    var edgeWidthScale = d3.scale.linear()
      .domain([-ewMax, -ewMin, 0, ewMin, ewMax])
      .range( [    15,      2, 0,     2,    15]);

    // Colour scale for highlighted edges
    var hltEdgeColourScale = d3.scale.linear()
      .domain([ -ecMax,    -ecMin,    0,          ecMin,     ecMax  ])
      .range( ["#0000dd", "#ccccdd", "#ffffff", "#ddaaaa", "#dd0000"]);

    // The colour scale for non-highlighted edges
    // is a washed out version of that used for 
    // highlighted edges. Could achieve the same
    // effect with opacity, but avoiding opacity
    // gives better performance.
    var edgeColourHltToDef = d3.scale.linear()
      .domain([0,   255])
      .range( [210, 240]);

    var defEdgeColourScale = function(val) {
      var c = d3.rgb(hltEdgeColourScale(val));
      
      var cols = [c.r,c.g,c.b];
      cols.sort(function(a,b) {return a-b;});

      var ri = cols.indexOf(c.r);
      var gi = cols.indexOf(c.g);
      var bi = cols.indexOf(c.b);

      c.r = Math.ceil(edgeColourHltToDef(cols[ri]));
      c.g = Math.ceil(edgeColourHltToDef(cols[gi]));
      c.b = Math.ceil(edgeColourHltToDef(cols[bi]));

      return c;
    }

    // attach all those scales as 
    // attributes of the network
    network.nodeColourScale    = nodeColourScale;
    network.edgeWidthScale     = edgeWidthScale;
    network.defEdgeColourScale = defEdgeColourScale;
    network.hltEdgeColourScale = hltEdgeColourScale;
  }

  /*
   * Draw the nodes of the network. It is assumed that the network
   * has the following D3 selections as attributes (which are 
   * created and attached to the network in the displayNetwork 
   * function):
   *
   *   - network.svgNodes:      Place to draw circles representing nodes
   *   - network.svgNodeLabels: Place to draw node labels
   *   - network.svgThumbnails: Place to draw node thumbnails
   *
   * And that the network also has a 'treeNodes' attribute, containing 
   * node in the dendrogram tree (see the makeNetworkDendrogramTree 
   * function).
   */
  function drawNodes(svg, network, radius) {

    // We use the D3 cluster layout to draw the nodes in a circle.
    // This also lays out the tree nodes (see the 
    // makeNetworkDendrogramTree function) which represent the 
    // network dendrogram. These nodes are not displayed, but their
    // locations are used to determine the path splines used to
    // display edges (see the drawEdges function).
    var clusterLayout  = d3.layout.cluster().size([360, radius-110]);
    var rootNode       = network.treeNodes[network.treeNodes.length - 1];
    var clusteredNodes = clusterLayout.nodes(rootNode);
    var leafNodes      = network.nodes;

    // Position nodes in a big circle.
    function positionNode(node) {
      return "rotate("    + (node.x - 90) + ")"   + 
             "translate(" + (node.y)      + ",0)" + 
             (node.x < 180 ? "" : "rotate(180)"); 
    }

    // Position labels in a slightly bigger circle.
    function positionLabel(node, off) {
      return "rotate("    + (node.x - 90)   + ")"  + 
             "translate(" + (node.y + 4)  + ",0)" + 
             (node.x < 180 ? "" : "rotate(180)"); 
    }

    // Position thumbnails in an even slightly bigger 
    // circle, ensuring that they are upright.
    function positionThumbnail(node) {
      return "rotate("    + ( node.x - 90) + ")"   + 
             "translate(" + ( node.y + 70) + ",0)" + 
             "rotate("    + (-node.x + 90) + ")"   +
             "translate(-23,-28)";
    }

    // Position node labels nicely.
    function anchorLabel(node) {
      return node.x < 180 ? "start" : "end"; 
    }

    // Colour nodes according to 
    // the cluster they belong to.
    function colourNode(node) {
      return network.nodeColourScale(node.cluster-1);
    }

    // The circle, label and thumbnail for a specific node 
    // are given css class 'node-X', where X is the node 
    // id. For every neighbour of a particular node, that 
    // node is also given the css class  'nodenbr-Y', where 
    // Y is the index of the neighbour.
    function nodeClasses(node) {

      var classes = ["node-" + node.index];

      node.neighbours.forEach(function(nbr) {
        classes.push("nodenbr-" + nbr.index);
      });

      return classes.join(" ");
    }

    // Draw the nodes
    network.svgNodes = network.svgNodes
      .data(network.nodes)
      .enter()
      .append("circle")
      .attr("class",     nodeClasses)
      .attr("transform", positionNode)
      .attr("opacity",   DEF_NODE_OPACITY)
      .attr("r",         DEF_NODE_SIZE)
      .attr("fill",      colourNode);
      
    // Draw the node labels
    network.svgNodeLabels = network.svgNodeLabels
      .data(network.nodes)
      .enter()
      .append("text")
      .attr("class",        nodeClasses)
      .attr("dy",          ".31em")
      .attr("opacity",      DEF_NODE_OPACITY)
      .attr("font-family",  DEF_LABEL_FONT)
      .attr("font-weight",  DEF_LABEL_WEIGHT)
      .attr("font-size",    DEF_LABEL_SIZE)
      .attr("fill",         colourNode)
      .attr("transform",    positionLabel)
      .style("text-anchor", anchorLabel)
      .text(function(node) {return node.name; });

    // Draw the node thumbnails 
    network.svgThumbnails = network.svgThumbnails
      .data(network.nodes)
      .enter()
      .append("image")
      .attr("class",       nodeClasses)
      .attr("transform",   positionThumbnail)
      .attr("visibility", "hidden")
      .attr("xlink:href",  function(node) {return node.thumbnail;})
      .attr("width",       0)
      .attr("height",      0);
  }

  /*
   * Draw the edges of the given network. An edge between two nodes
   * is drawn as a spline path which wiggles its way from the first 
   * node, through the dendrogram tree up to the first common 
   * ancester of the two nodes, and then back down to the second 
   * node. Most of the hard work is done by the d3.layout.bundle 
   * function.
   */
  function drawEdges(svg, network, radius) {

    // For drawing network edges as splines
    var bundle = d3.layout.bundle();
    var line   = d3.svg.line.radial()
      .interpolate("bundle")
      .tension(.85)
      .radius(function(node) { return node.y - 8; })
      .angle( function(node) { return node.x / 180 * Math.PI; });

     // Each svg path element is given two classes - 'edge-X' 
     // and 'edge-Y', where X and Y are the edge endpoints
    function edgeClasses(path) {
      end = path.length - 1;
      classes = ["edge-" + path[0].index, "edge-" + path[end].index];
      return classes.join(" ");
    }

    // Each edge is also given an id 'edge-X-Y', where 
    // X and Y are the edge endpoints (and X < Y).
    function edgeId(path) {
      end = path.length - 1;
      idxs = [path[0].index, path[end].index];
      idxs.sort(function(a, b){return a-b});
      return "edge-" + idxs[0] + "-" + idxs[1];
    }
    
    // Colour the edges according to the edge weight
    // specified by network.edgeColourWeightIdx.
    function edgeColour(path) {
      return network.defEdgeColourScale(
        path.edge.weights[network.edgeColourWeightIdx]);
    }

    // Generate the spline paths for each edge,
    // and attach each edge as an attribute of
    // its path, and vice versa, to make things
    // easier in the various callback functions
    // passed to D3 (see the configDynamics
    // function)
    var paths = bundle(network.edges);
    for (var i = 0; i < paths.length; i++) {
      paths[i].edge         = network.edges[i];
      network.edges[i].path = paths[i];
    }

    // And we'll also add the paths associated with
    // the edges of each node as an attribute of 
    // that node, again to make D3 callback functions
    // nicer.
    network.nodes.forEach(function(node) {
      node.paths = node.edges.map(function(edge) {return edge.path;});
    });

    // draw the edges
    network.svgEdges = network.svgEdges
      .data(paths)
      .enter()
      .append("path")
      .attr("id",              edgeId)
      .attr("class",           edgeClasses)
      .attr("stroke",          edgeColour)
      .attr("stroke-width",    DEF_EDGE_WIDTH)
      .attr("stroke-linecap", "round")
      .attr("opacity",         DEF_EDGE_OPACITY)
      .attr("fill",           "none")
      .attr("d",               line);
  }

  /*
   * Configures mouse-based interaction with the full 
   * connectivity network. When the mouse moves over a node 
   * or its label, it is highlighted and its thumbnail 
   * displayed. When a mouse click occurs on a node, its 
   * label or thumbnail, it is 'selected'.  The edges of
   * that node, and its neighbour nodes are then highlighted,
   * and remain so until the node is clicked again, or 
   * another node is clicked upon.
   */
  function configDynamics(svg, network, radius) {

    var svgNodes      = network.svgNodes;
    var svgNodeLabels = network.svgNodeLabels;
    var svgThumbnails = network.svgThumbnails;
    var svgEdges      = network.svgEdges;

    // This variable is used to keep track 
    // of the currently selected node. 
    var selectedNode  = null;

    // Here, we pre-emptively run CSS selector lookups 
    // so they don't have to be done on every mouse event.
    // Makes the interaction a bit more snappy.
    network.nodes.forEach(function(node) {

      node.pathElems     = d3.selectAll(".edge-"          + node.index);
      node.nodeElem      = d3.select(   "circle.node-"    + node.index);
      node.labelElem     = d3.select(   "text.node-"      + node.index);
      node.thumbElem     = d3.select(   "image.node-"     + node.index);
      node.nbrElems      = d3.selectAll("circle.nodenbr-" + node.index);
      node.nbrLabelElems = d3.selectAll("text.nodenbr-"   + node.index);
      node.nbrThumbElems = d3.selectAll("image.nodenbr-"  + node.index);
    });

    /*
     * Shows or hides the network for the given node.
     * This includes the edges on the node and the 
     * thumbnails of the node neighbours.
     */
    function showNodeNetwork(node, show) {

      var pathElems     = node.pathElems;
      var paths         = node.paths;
      var nbrElems      = node.nbrElems;
      var nbrLabelElems = node.nbrLabelElems;
      var nbrThumbElems = node.nbrThumbElems;

      var nodeOpacity = DEF_NODE_OPACITY;
      var font        = DEF_LABEL_FONT;
      var fontWeight  = DEF_LABEL_WEIGHT;
      var thumbVis    = "hidden";
      var thumbWidth  = HLT_THUMB_WIDTH;
      var thumbHeight = HLT_THUMB_HEIGHT;

      var edgeOpacity = DEF_EDGE_OPACITY;
      var edgeWidth   = DEF_EDGE_WIDTH;
      var edgeColour  = function(path) {
        return network.defEdgeColourScale(path.edge.weights[0]);};
      
      if (show) {

        nodeOpacity = HLT_NODE_OPACITY;
        font        = HLT_LABEL_FONT;
        fontWeight  = HLT_LABEL_WEIGHT;
        thumbVis    = "visible";
        
        edgeOpacity = HLT_EDGE_OPACITY;
        edgeWidth   = function(path) {
          return network.edgeWidthScale(path.edge.weights[0]);}
        edgeColour  = function(path) {
          return network.hltEdgeColourScale(path.edge.weights[0]);};
      }
     
      nbrElems
        .attr("opacity",     nodeOpacity);

      nbrLabelElems
        .attr("opacity",     nodeOpacity)
        .attr("font-family", font)
        .attr("font-weight", fontWeight);

      nbrThumbElems
        .attr("visibility", thumbVis)
        .attr("width",      thumbWidth)
        .attr("height",     thumbHeight);
      
      pathElems
        .data(paths)
        .attr("stroke-width", edgeWidth)
        .attr("stroke",       edgeColour)
        .attr("opacity",      edgeOpacity)
        .each(function() {this.parentNode.appendChild(this)});
    }
    

    /*
     * Show or hide the given node, label, and thumbnail. The 
     * 'show' parameter may be "highlight", in which case the 
     * node is highlighted, "select", in which case the node 
     * is highlighted in a slightly more emphatic manner, or 
     * any other value, in which case the node thumbnail is 
     * hidden, and circle/label set to a default style.
     */
    function showNode(node, show) {

      var opacity     = DEF_NODE_OPACITY;
      var font        = DEF_LABEL_FONT;
      var fontWeight  = DEF_LABEL_WEIGHT;
      var fontSize    = DEF_LABEL_SIZE;
      var nodeSize    = DEF_NODE_SIZE;
      var thumbVis    = "hidden";
      var thumbWidth  = 0;
      var thumbHeight = 0;

      if (show === "highlight") {
        opacity     = HLT_NODE_OPACITY;
        font        = DEF_LABEL_FONT;
        fontWeight  = HLT_LABEL_WEIGHT; 
        fontSize    = DEF_LABEL_SIZE;
        nodeSize    = DEF_NODE_SIZE;
        thumbVis    = "visible";
        thumbWidth  = HLT_THUMB_WIDTH;
        thumbHeight = HLT_THUMB_HEIGHT;
      }
      else if (show === "select") {
        opacity     = SEL_NODE_OPACITY;
        font        = SEL_LABEL_FONT;
        fontWeight  = SEL_LABEL_WEIGHT; 
        fontSize    = SEL_LABEL_SIZE;
        nodeSize    = SEL_NODE_SIZE;
        thumbVis    = "visible";
        thumbWidth  = SEL_THUMB_WIDTH;
        thumbHeight = SEL_THUMB_HEIGHT;
      }

      node.labelElem.attr("opacity",     opacity);
      node.labelElem.attr("font-family", font);
      node.labelElem.attr("font-weight", fontWeight);
      node.labelElem.attr("font-size",   fontSize);

      node.nodeElem .attr("r",           nodeSize);
      node.nodeElem .attr("opacity",     opacity);

      node.thumbElem.attr("visibility",  thumbVis);
      node.thumbElem.attr("width",       thumbWidth);
      node.thumbElem.attr("height",      thumbHeight);

      // move the highlighted node thumbnail element
      // to the end of its parents' list of children,
      // so it is displayed on top
      var thumbNode = node.thumbElem.node();
      thumbNode.parentNode.appendChild(thumbNode);
    }

    /*
     * Called when a node, its label or thumbnail is clicked.
     * Selects that node, which involves highlighting the node 
     * and its immediate network. Or if the node was already
     * selected, it is deselected.
     */
    function mouseClickNode(node) {

      var oldSelection = selectedNode;

      // Situation the first. No other node 
      // was selected. Select this node.
      if (oldSelection === null) {
        selectedNode = node;

        showNode(       node, "select");
        showNodeNetwork(node,  true);
      }
      
      // Situation the second. This node was
      // already selected. Deselect it.
      else if (oldSelection === node) {
        selectedNode = null;

        showNode(       node, false);
        showNodeNetwork(node, false); 
      }

      // Situation the third. Another node 
      // was selected. Deselect that node,
      // and select this one.
      else {
        selectedNode = node;

        showNode(       oldSelection, false);
        showNodeNetwork(oldSelection, false);
        showNode(       node,        "select");
        showNodeNetwork(node,         true);
      }
    }
    
    /*
     * Called when the mouse moves over a node. 
     * Highlights that node.
     */
    function mouseOverNode(node) {
      showNode(node, "select");
    }


    /*
     * Called when the mouse moves off a node.
     * Removes any highlighting that was applied
     * by the mouseOverNode function.
     */
    function mouseOutNode(node) {

      // Situation the first. The node 
      // is selected. Don't touch it.
      if (selectedNode === node) {
        return;
      }

      // Situation the second. The node is a 
      // neighbour of the selected node. Return 
      // it back to a 'highlight' state.
      if (selectedNode !== null && 
          (selectedNode.neighbours.indexOf(node) > -1)) {
        showNode(node, "highlight");
      }

      // Situation the third. The node 
      // is just a node. Hide it.
      else {
        showNode(node, false);
      }
    }


    function mouseClickPath(path) {
      var desc = "Edge " + path.edge.i + " -- " + path.edge.j + ": ";
      desc = desc + path.edge.weights.join(", ");
      console.log(desc);
    }
    svgEdges.on("click", mouseClickPath);

    
    // configure mouse event callbacks on 
    // node circles, labels, and thumbnails.
    svgNodes
      .on("mouseover", mouseOverNode)
      .on("mouseout",  mouseOutNode)
      .on("click",     mouseClickNode);
    svgNodeLabels
      .on("mouseover", mouseOverNode)
      .on("mouseout",  mouseOutNode)
      .on("click",     mouseClickNode);
    svgThumbnails
      .on("mouseover", mouseOverNode)
      .on("mouseout",  mouseOutNode)
      .on("click",     mouseClickNode);
  }

  /*
   * Takes a network created by the matricesToNetowrk 
   * function (see below), and displays it in the 
   * specified networkDiv element, with nodes arranged 
   * in a big circle.
   */
  function displayNetwork(network, networkDiv, width, height) {

    var diameter = Math.min(width, height);
    var radius   = diameter / 2;

    // put an svg element inside the networkDiv
    var svg = d3.select(networkDiv).append("svg")
      .attr("width",       width)
      .attr("height",      height)
      .style("background-color", "#fafaf0")
      .append("g")
      .attr("transform", "translate(" + radius + "," + radius + ")");

    // The order of these lines defines the order in which
    // the elements are displayed (last displayed on top)
    var svgEdges      = svg.append("g").selectAll("path");
    var svgThumbnails = svg.append("g").selectAll("image");
    var svgNodes      = svg.append("g").selectAll("circle");
    var svgNodeLabels = svg.append("g").selectAll("text");

    // Attach all of those selections to the network 
    // object, so the drawNodes and drawEdges functions 
    // (above) can access them to draw their things.
    network.svgNodes      = svgNodes;
    network.svgEdges      = svgEdges;
    network.svgNodeLabels = svgNodeLabels;
    network.svgThumbnails = svgThumbnails;
    
    // Draw all of the things!
    drawNodes(     svg, network, radius);
    drawEdges(     svg, network, radius);
    configDynamics(svg, network, radius);
  }

  /*
   * Recursively prints a descriptino of the dendrogram 
   * tree to the console, starting from the given root 
   * node. See the makeNetworkDendrogramTree function
   * (below) for details of the dendrogram tree. 
   * 
   * This function is here for debugging purposes.
   */
  function printTree(root, depth) {

    desc = "";
    for (var i = 0; i < depth; i++) desc = desc + " ";

    desc = desc + root.index + ": ";

    if (!root.children) return;

    childIdxs = root.children.map(function(child) {return child.index;});
    desc = desc + childIdxs.join(", ");

    console.log(desc);

    root.children.forEach(function(child) {
      printTree(child, depth + 1);
    });
  }

  /*
   * Flattens the dendrogram tree for the given network 
   * (see the makeNetworkDendrogramTree function below), 
   * such that it contains at most maxClusters clusters. 
   * This function basically performs the same job as 
   * the MATLAB cluster function, e.g.:
   *
   *   > cluster(linkages, 'maxclust', maxClusters)
   */
  function flattenDendrogramTree(network, maxClusters) {

    // Returns a list of tree nodes which contain leaf 
    // nodes - the current 'clusters' in the tree.
    function getClusters() {

      var allClusts  = network.nodes.map(function(node) {return node.parent;});
      var uniqClusts = [];

      for (var i = 0; i < allClusts.length; i++) {
        if (uniqClusts.indexOf(allClusts[i]) > -1) continue;
        uniqClusts.push(allClusts[i]);
      }

      //var clIdxs = uniqClusts.map(function(c) {return c.index;});
      //console.log("Clusters: " + clIdxs.join(", "));
      return uniqClusts;
    }

    // Iterate through the list of clusters, 
    // merging them  one by one, until we are 
    // left with (at most) maxClusters.
    var clusters = getClusters();

    while (clusters.length > maxClusters) {
      //console.log("Tree:");
      //printTree(network.treeNodes[network.treeNodes.length - 1], 0);

      // Identify the cluster with the minimum 
      // distance  between its children
      distances = clusters.map(function(clust) {return clust.distance;});
      minIdx    = distances.indexOf(d3.min(distances));

      clust         = clusters[minIdx];
      parent        = clust.parent;
      children      = clust.children;
      clustChildIdx = parent.children.indexOf(clust);
      clustTreeIdx  = network.treeNodes.indexOf(clust);
      
      // Squeeze that cluster node out of the 
      // tree, by attaching its children to its 
      // parent and vice versa.
      parent .children .splice(clustChildIdx, 1);
      network.treeNodes.splice(clustTreeIdx,  1);

      children.forEach(function(child) {
        child.parent = parent;
        parent.children.push(child);
      });

      // Update the cluster list
      clusters = getClusters();
    }
  }

  /*
   * Given a network (see the makeNetwork function), and the 
   * output of a call to the MATLAB linkage function which 
   * describes the dendrogram of clusters of the network 
   * nodes, this function creates a list of 'dummy' nodes 
   * which represent the dendrogram tree. This list is added 
   * as an attribute called 'treeNodes' of the provided 
   * network.
   */
  function makeNetworkDendrogramTree(network, linkages) {

    var numNodes  = network.nodes.length;
    var treeNodes = [];

    for (var i = 0; i < linkages.length; i++) {
      var treeNode = {};
      var left     = linkages[i][0];
      var right    = linkages[i][1];

      if (left  > numNodes) left  = treeNodes[    left  - 1 - numNodes];
      else                  left  = network.nodes[left  - 1];
      if (right > numNodes) right = treeNodes[    right - 1 - numNodes];
      else                  right = network.nodes[right - 1];

      left .parent = treeNode;
      right.parent = treeNode;

      treeNode.children = [left, right];
      treeNode.distance = linkages[i][2];
      treeNode.index = i + numNodes + 1;

      treeNodes.push(treeNode);
    }

    network.treeNodes = treeNodes;
  }

  /*
   * Creates a network from the given list of matrices, and 
   * cluster and hierarchy labels for each node. The network
   * edges are defined by the first matrix in the matrix list
   * - any entries in this matrix which are not NaN will be
   * added as an edge in the network. The values in all other
   * matrices are added as 'weight' attributes on the 
   * corresponding network edge.
   */
  function matricesToNetwork(matrices, clusters) {

    matrix = matrices[0];

    // A network is simply a list of nodes and edges
    var nodes    = [];
    var edges    = [];
    var numNodes = matrix.length;

    // Create a list of nodes
    for (var i = 0; i < numNodes; i++) {

      var node = {};

      // Node label is 1-indexed
      node.index      = i+1;
      node.name       = "" + (i+1);
      node.cluster    = clusters[i];
      node.neighbours = [];
      node.edges      = [];

      nodes.push(node);
    }

    // Create a list of edges. At the same time, we'll 
    // figure out the real and absolute max/min values 
    // for each weight matrix across all edges, so they 
    // can be used to scale edge colour/width/etc properly.
    var weightMins    = [];
    var weightMaxs    = [];
    var weightAbsMins = [];
    var weightAbsMaxs = [];
    
    // initialise min/max arrays
    for (var i = 0; i < matrices.length; i++) {
      weightMins   .push( Number.MAX_VALUE);
      weightMaxs   .push(-Number.MAX_VALUE);
      weightAbsMins.push( Number.MAX_VALUE);
      weightAbsMaxs.push(-Number.MAX_VALUE);
    }

    for (var i = 0; i < numNodes; i++) {
      for (var j = i+1; j < numNodes; j++) {

        // NaN values in the first matrix
        // are not added as edges
        if (isNaN(matrix[i][j])) continue;

        var edge     = {};
        edge.i       = nodes[i];
        edge.j       = nodes[j];

        // d3.layout.bundle (see the drawEdges function, 
        // above) requires two attributes, 'source' and 
        // 'target', so we add them here, purely for 
        // convenience.
        edge.source  = nodes[i];
        edge.target  = nodes[j];
        edge.weights = matrices.map(function(mat) {return mat[i][j]; });

        // update weight mins/maxs
        for (var k = 0; k < edge.weights.length; k++) {

          var w  =          edge.weights[k];
          var aw = Math.abs(edge.weights[k]);

          if (w  > weightMaxs[k])    weightMaxs[k]    = w;
          if (w  < weightMins[k])    weightMins[k]    = w;
          if (aw > weightAbsMaxs[k]) weightAbsMaxs[k] = aw;
          if (aw < weightAbsMins[k]) weightAbsMins[k] = aw;
        }

        edges              .push(edge);
        nodes[i].neighbours.push(nodes[j]);
        nodes[j].neighbours.push(nodes[i]);
        nodes[i].edges     .push(edge);
        nodes[j].edges     .push(edge);
      }
    }

    // put all the network information 
    // into a dictionary
    var network = {};
    network.nodes         = nodes;
    network.edges         = edges;
    network.weightMins    = weightMins;
    network.weightMaxs    = weightMaxs;
    network.weightAbsMins = weightAbsMins;
    network.weightAbsMaxs = weightAbsMaxs;

    return network;
  }

  /*
   * Converts all the given text data into numerical matrices,
   * thresholds znet2 matrix, and does some other minor tweaks,
   * then passes all the data to the makeNetwork function, and
   * passes the resulting network to the displayNetwork function.
   */
  function createNetwork(
    matrices,
    clusters,
    linkage,
    thumbUrl) {

    // threshold the first matrix
    for (var i = 0; i < matrices[0].length; i++) {

      // TODO We are assuming here that the matrix
      // is symmetric, and is fully populated.
      // This thresholding will break if either
      // of the above assumptions are not true.
      absVals   = matrices[0][i].map(function(val) {return Math.abs(val);});
      nodeThres = d3.max(absVals) * 0.75;

      for (var j = 0; j < matrices[0].length; j ++) {
        if (Math.abs(matrices[0][i][j]) < nodeThres) {
          matrices[0][i][j] = Number.NaN;
        }
      }
    }

    // turn the matrix data into a network
    var network = matricesToNetwork(matrices, clusters);

    // generate a tree of dummy nodes from 
    // the dendrogram in the linkages data
    makeNetworkDendrogramTree(network, linkage);

    // flatten that tree to 10 clusters
    flattenDendrogramTree(network, 1);

    // Attach a thumbnail URL to 
    // every node in the network
    var zerofmt = d3.format("04d");
    for (var i = 0; i < network.nodes.length; i++) {

      var imgUrl = thumbUrl + "/" + zerofmt(i) + ".png";
      network.nodes[i].thumbnail = imgUrl;
    }

    // generate colour scales for network display
    network.edgeWidthWeightIdx  = 0;
    network.edgeColourWeightIdx = 0;
    genColourScales(network);

    return network;
  }

  /*
   * Uses d3.dsv to turn a string containing 
   * numerical matrix data into a 2D array.
   */
  function parseTextMatrix(matrixText) { 

    // create a parser for space delimited text
    var parser = d3.dsv(" ", "text/plain");
      
    // parse the text data, converting each value to 
    // a float and ignoring any extraneous whitespace
    // around or between values.
    var matrix = parser.parseRows(matrixText, function(row) {
      row = row.filter(function(value) {return value != ""; } );
      row = row.map(   function(value) {return parseFloat(value);});
      return row;
    });

    return matrix;
  }

  function onDataLoad(error, args) {

    // TODO handle error

    var linkage   = args[args.length-1];
    var clusters  = args[args.length-2];
    var thumbUrl  = args[args.length-3];
    var cb        = args[args.length-4];

    args.splice(-4, 4);
    var matrices = args;

    linkage  = parseTextMatrix(linkage);
    clusters = parseTextMatrix(clusters);
    matrices = matrices.map(parseTextMatrix);

    cb(createNetwork(matrices, clusters, linkage, thumbUrl));
  }

  /*
   *
   */
  function loadNetwork(urls, cb) {

    var matrixUrls = urls.matrices;
    var clusterUrl = urls.clusters;
    var linkageUrl = urls.linkage;
    var thumbUrl   = urls.thumbnails;

    // The qId function is an identity function 
    // which may be used to pass standard 
    // arguments to the await function.
    function qId(arg, cb) {cb(null, arg);}

    // Load all of the network data, and 
    // pass it to the onDataLoad function. 
    var q = queue();
    
    matrixUrls.forEach(function(url) {
      q = q.defer(d3.text, url);
    });

    q .defer(qId,     cb)
      .defer(qId,     thumbUrl)
      .defer(d3.text, clusterUrl)
      .defer(d3.text, linkageUrl)
      .awaitAll(onDataLoad);
  }

  var nvPublic = {};
  nvPublic.loadNetwork    = loadNetwork;
  nvPublic.displayNetwork = displayNetwork;
  return nvPublic;

})();

var urls = {};
urls.matrices   = ["/data/dummy/corr1.txt"];
urls.clusters   =  "/data/dummy/clusters.txt";
urls.linkage    =  "/data/dummy/linkages.txt";
urls.thumbnails =  "/data/dummy/thumbnails";

netvis.loadNetwork(urls, function(net) {
  netvis.displayNetwork(net, "#fullNetwork",  800, 800);
});

