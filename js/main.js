require(["netjs"], function(netjs) {

  var urls = {};

  urls.matrices     = ["/data/dataset2/Znet1.txt", "/data/dataset2/Znet2.txt"];
  urls.matrixLabels = ["Znet1", "Znet2"];
  urls.nodeLabels   =  "/data/dataset2/clusters.txt";
  urls.linkage      =  "/data/dataset2/linkages.txt";
  urls.thumbnails   =  "/data/dataset2/melodic_IC_sum.sum";

  netjs.loadNetwork(urls, function(net) {

    netjs.createNetworkControls(net, "#networkCtrl");
    netjs.displayNetwork(net, "#fullNetwork",  800, 800);
    
  });
});
