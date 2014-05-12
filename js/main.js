require(["netjs", "lib/d3"], function(netjs, d3) {

  function thresholdMatrix(matrix) {

    for (var i = 0; i < matrix.length; i++) {

      // TODO We are assuming here that the matrix
      // is symmetric, and is fully populated.
      // This thresholding will break if either
      // of the above assumptions are not true.
      absVals   = matrix[i].map(function(val) {return Math.abs(val);});
      nodeThres = d3.max(absVals) * 0.75;

      for (var j = 0; j < matrix.length; j ++) {
        if (Math.abs(matrix[i][j]) < nodeThres) {
          matrix[i][j] = Number.NaN;
        }
      }
    }

    return matrix;
  }


  var urls = {};

  urls.matrices     = ["/data/dataset2/Znet1.txt", "/data/dataset2/Znet2.txt"];
  urls.matrixLabels = ["Znet1", "Znet2"];
  urls.nodeLabels   =  "/data/dataset2/clusters.txt";
  urls.linkage      =  "/data/dataset2/linkages.txt";
  urls.thumbnails   =  "/data/dataset2/melodic_IC_sum.sum";

  netjs.loadNetwork(urls, thresholdMatrix, function(net) {

    netjs.createNetworkControls(net, "#networkCtrl");
    netjs.displayNetwork(       net, "#fullNetwork",  800, 800);
  });
});

