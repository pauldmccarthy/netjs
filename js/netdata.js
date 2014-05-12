/**
 * 
 */
define(["lib/d3", "lib/queue"], function(d3, queue) {

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
   *   - nodeColourScale:     Colours nodes according to their label
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

    // Nodes are coloured according to their label
    // TODO handle more than 10 labels?
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
   * Recursively prints a description of the dendrogram 
   * tree to the console, starting from the given root 
   * node. See the makeNetworkDendrogramTree function
   * (below) for details of the dendrogram tree. 
   * 
   * This function is here for debugging purposes.
   */
  function printTree(root, depth) {

    desc = "";
    for (var i = 0; i < depth; i++) desc = desc + " ";

    desc = desc + (root.index+1) + ": ";

    if (!root.children) return;

    childIdxs = root.children.map(function(child) {return child.index+1;});
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
      treeNode.index = i + numNodes;

      treeNodes.push(treeNode);
    }

    network.treeNodes = treeNodes;
  }


  // function extractSubNetwork(network, rootIdx) {

  //   subnet       = {}
  //   subnet.nodes = [];
  //   subnet.edges = [];

  //   var nodeIdxs = [rootIdx];

  //   // A 0-indexed mapping of node indices from the 
  //   // new subnetwork to the old parent network
  //   var indexMap = [];
  //   indexMap[0] = rootIdx-1;

  //   for (var i = 0; i < network.nodes[rootIdx-1].neighbours.length; i++) {

  //     var nbrIdx = network.nodes[rootIdx-1].neighbours[i];

  //     nodeIdxs.push(nbrIdx);
  //     indexMap[i+1] = nbrIdx-1;
  //   }

  //   for (var i = 0; i < nodeIdxs.length; i++) {

  //     oldNode        = network.nodes[indexMap[i]];
  //     node           = {};
  //     node.index     = idx;
  //     node.label     = oldNode.label;
  //     node.depth     = oldNode.depth;
  //     node.thumbnail = oldNode.thumbnail;
  //   });


    
  // }

  /*
   * Creates a network from the given list of matrices. The 
   * network edges are defined by the first matrix in the 
   * matrix list - any entries in this matrix which are not 
   * NaN will be added as an edge in the network. The values 
   * in all other matrices are added as 'weight' attributes 
   * on the corresponding network edge.
   */
  function matricesToNetwork(matrices) {

    matrix = matrices[0];

    // A network is simply a list of nodes and edges
    var nodes    = [];
    var edges    = [];
    var numNodes = matrix.length;

    // Create a list of nodes
    for (var i = 0; i < numNodes; i++) {

      var node = {};

      // Node name is 1-indexed
      node.index      = i;
      node.name       = "" + (i+1);
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
    matrixLabels,
    nodeLabels,
    linkage,
    thumbUrl) {

    // turn the matrix data into a network
    var network = matricesToNetwork(matrices);
    network.linkage = linkage;

    // label the nodes
    for (var i = 0; i < network.nodes.length; i++) {
      network.nodes[i].label = nodeLabels[i];
    }

    // flatten the tree to one cluster
    setNumClusters(network, 1);

    // Attach a thumbnail URL to 
    // every node in the network
    var zerofmt = d3.format("04d");
    for (var i = 0; i < network.nodes.length; i++) {

      var imgUrl = thumbUrl + "/" + zerofmt(i) + ".png";
      network.nodes[i].thumbnail = imgUrl;
    }

    // generate colour scales for network display
    network.weightLabels        = matrixLabels;
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


  /*
   *
   */
  function onDataLoad(error, args) {

    // TODO handle error

    var linkage      = args[args.length-1];
    var nodeLabels   = args[args.length-2];
    var matrixLabels = args[args.length-3];
    var thumbUrl     = args[args.length-4];
    var cbFunc       = args[args.length-5];
    var thresFunc    = args[args.length-6];

    args.splice(-6, 6);
    var matrices = args;

    linkage    = parseTextMatrix(linkage);
    nodeLabels = parseTextMatrix(nodeLabels)[0];
    matrices   = matrices.map(parseTextMatrix);
    
    if (thresFunc !== null) {
      matrices[0] = thresFunc(matrices[0]);
    }

    cbFunc(createNetwork(matrices, matrixLabels, nodeLabels, linkage, thumbUrl));
  }

  /*
   *
   */
  function loadNetwork(urls, thresFunc, cbFunc) {

    var matrixUrls    = urls.matrices;
    var matrixLabels  = urls.matrixLabels;
    var nodeLabelsUrl = urls.nodeLabels;
    var linkageUrl    = urls.linkage;
    var thumbUrl      = urls.thumbnails;

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

    q .defer(qId,     thresFunc)
      .defer(qId,     cbFunc)
      .defer(qId,     thumbUrl)
      .defer(qId,     matrixLabels)
      .defer(d3.text, nodeLabelsUrl)
      .defer(d3.text, linkageUrl)
      .awaitAll(onDataLoad);
  }


  /*
   *
   */
  function setNumClusters(network, numClusts) {

    // generate a tree of dummy nodes from 
    // the dendrogram in the linkages data
    makeNetworkDendrogramTree(network, network.linkage);

    // flatten the tree to the specified number of clusters
    flattenDendrogramTree(network, numClusts);
  }

  function setEdgeWidthWeightIdx(network, idx) {
    network.edgeWidthWeightIdx = idx;
    genColourScales(network);
  }


  function setEdgeColourWeightIdx(network, idx) {
    network.edgeWidthColourIdx = idx;
    genColourScales(network);
  }

  var netdata                    = {};
  netdata.loadNetwork            = loadNetwork;
  netdata.setNumClusters         = setNumClusters;
  netdata.setEdgeWidthWeightIdx  = setEdgeWidthWeightIdx;
  netdata.setEdgeColourWeightIdx = setEdgeColourWeightIdx;

  return netdata;
});
