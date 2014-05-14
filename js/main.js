require(["netjs", "lib/d3"], function(netjs, d3) {

  function thresholdMatrix(matrix, args) {

    var thresPerc = args[0];

    var thresMatrix = [];

    for (var i = 0; i < matrix.length; i++) {

      // TODO We are assuming here that the matrix
      // is symmetric, and is fully populated.
      // This thresholding will break if either
      // of the above assumptions are not true.
      absVals   = matrix[i].map(function(val) {return Math.abs(val);});
      nodeThres = d3.max(absVals) * thresPerc;

      thresMatrix.push([]);

      for (var j = 0; j < matrix[i].length; j++) {
        if (Math.abs(matrix[i][j]) < nodeThres) 
          thresMatrix[i].push(Number.NaN);
        else 
          thresMatrix[i].push(matrix[i][j]);
      }
    }

    return thresMatrix;
  }

  var args          = {};
  args.matrices     = ["data/dataset2/Znet1.txt", "data/dataset2/Znet2.txt"];
  args.matrixLabels = ["Znet1", "Znet2"];
  args.nodeLabels   =  "data/dataset2/clusters.txt";
  args.linkage      =  "data/dataset2/linkages.txt";
  args.thumbnails   =  "data/dataset2/melodic_IC_sum.sum";
  args.thresFunc    = thresholdMatrix;
  args.thresArgs    = [["Threshold percentage", 0.75]];

  // args.matrices     = ["data/dummy/corr1.txt", "data/dummy/corr2.txt"];
  // args.matrixLabels = ["Corr1", "Corr2"];
  // args.nodeLabels   =  "data/dummy/clusters.txt";
  // args.linkage      =  "data/dummy/linkages.txt";
  // args.thumbnails   =  "data/dummy/thumbnails";
  // args.thresFunc    = thresholdMatrix;
  // args.thresArgs    = [["", 0.75]];

  netjs.loadNetwork(args, function(net) {

    var w = window.innerWidth - 40;
    var h = window.innerHeight;

    netjs.createNetworkControls(net, "#networkCtrl", "#subNetwork", w/2.0, h);
    netjs.displayNetwork(       net, "#fullNetwork",  w/2.0, h);
  });
});

