
var urls = {};
// urls.matrices     = ["/data/dummy/corr1.txt", "/data/dummy/corr2.txt", "/data/dummy/corr1.txt"];
// urls.matrixLabels = ["Full correlation", "Partial correlation", "Garbage"];
// urls.nodeLabels   =  "/data/dummy/clusters.txt";
// urls.linkage      =  "/data/dummy/linkages.txt";
// urls.thumbnails   =  "/data/dummy/thumbnails";

urls.matrices     = ["/data/dataset2/Znet1.txt", "/data/dataset2/Znet2.txt"];
urls.matrixLabels = ["Znet1", "Znet2"];
urls.nodeLabels   =  "/data/dataset2/clusters.txt";
urls.linkage      =  "/data/dataset2/linkages.txt";
urls.thumbnails   =  "/data/dataset2/melodic_IC_sum.sum";

netvis.loadNetwork(urls, function(net) {

  netctrl.createNetworkControls(net, "networkCtrl");

  netvis.displayNetwork(net, "#fullNetwork",  800, 800);
  
});

