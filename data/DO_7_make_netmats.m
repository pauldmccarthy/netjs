
% Znet1 is square matrix of full correlations (units = z-statistics)
% Znet2 is partial correlations   (below for an example of a second matrix to show simultaneously, you could just use Znet1 as the second)
% ts.DD is here just 1:200 (more generally it's the list of "good" nodes)
% SUMPICS is folder sith thumbnail PNGs in

%%% view hierarchical clustering of nodes
[hier,linkages]=nets_hierarchy(Znet1,Znet2,ts.DD,SUMPICS);   % hier is the vector of reordered nodes

%%% netpics
NP=sprintf('%s/netmats/%s/netpics',SCRATCH,G); mkdir(NP);   % output directory
meanCORR=Znet2;  meanPCORR=Znet2;  hier_order=hier;   % use partial for both

netmax=max(abs(meanCORR(:))); netthresh=10;
fidi=fopen(sprintf('%s/index.html',NP),'w');
fprintf(fidi,'<p><p><a href="../index.html">... back to main index</a>\n');

fprintf(fidi,'<p>Clusters:<br>\n');
clusters=cluster(linkages,'maxclust',10)';
for CC=1:max(clusters)
  origclus=find(clusters==CC);  allclus=origclus;                                                    % find core members of cluster
  allclus=unique(allclus);                                                                           % remove duplicate entries
  fid=fopen(sprintf('%s/netpic%.3d.dot',NP,CC),'w');  fprintf(fid,'graph G {\n');
  for I=allclus, fprintf(fid,'%d [shapefile="%s.sum/%.4d.png", fontcolor="#008000", fontsize="18"];\n',I,SUMPICS,ts.DD(I)-1); end;
  for I=allclus,  for J=allclus,  if (J<I) && (abs(meanCORR(I,J))>netthresh)
    strength=max(0.01,min(.99, ((abs(meanPCORR(I,J))-netthresh)/(netmax-netthresh)) ));
    if meanPCORR(I,J)>0, linecol='ff0000'; else, linecol='0000ff'; end;
    fprintf(fid,'%d -- %d [color="#%s", weight=%f, style="setlinewidth(%d)"];\n',I,J,linecol,strength^2,ceil(strength*4));
  end; end; end;
  fprintf(fid,'}\n');  fclose(fid);
  system(sprintf('dot -v -Tpng %s/netpic%.3d.dot -o%s/netpic%.3d.png',NP,CC,NP,CC));
  fprintf(fidi,'<a href="netpic%.3d.png">%d  </a>\n',CC,CC);
end

fprintf(fidi,'<p>Node-centred graphs (nodes are clickable):<br>\n');
system(sprintf('cp %s.sum/*png %s',SUMPICS,NP));
for II=1:length(ts.DD)
  allclus=II
  netthresh=max(abs(meanCORR(II,:))) * 0.75;  % netthresh=8;
  for J=1:ts.Nnodes
    if abs(meanCORR(II,J))>netthresh, allclus=[allclus J]; 
  end; 
end;  % find related nodes from other clusters

allclus=unique(allclus);                                                             % remove duplicate entries
fid=fopen(sprintf('%s/netpic_node%.3d.dot',NP,II),'w');  fprintf(fid,'graph %d {\n',II);

for I=allclus, fprintf(fid,'%d [shapefile="%s.sum/%.4d.png", URL="netpic_node%.3d.html", fontcolor="#008000", fontsize="18"];\n',I,SUMPICS,ts.DD(I)-1,I); end;

for I=allclus,  
  for J=allclus,
    if (J<I) && (abs(meanCORR(I,J))>netthresh)
      strength=max(0.01,min(.99, ((abs(meanPCORR(I,J))-netthresh)/(netmax-netthresh)) ));
      if meanPCORR(I,J)>0, linecol='ff0000'; else, linecol='0000ff'; end;
      fprintf(fid,'%d -- %d [color="#%s", weight=%f, style="setlinewidth(%d)"];\n',I,J,linecol,strength^2,ceil(strength*4));
    end; 
  end; 
end;

fprintf(fid,'}\n');  fclose(fid);
system(sprintf('dot -v -Tcmapx -otmp.map -Tpng -o%s/netpic_node%.3d.png %s/netpic_node%.3d.dot',NP,II,NP,II));
fid=fopen(sprintf('tmp.html'),'w');fprintf(fid,'<a href="index.html">back to index</a><br><br><IMG SRC="netpic_node%.3d.png" USEMAP="#%d""/>\n',II,II);fclose(fid);
system(sprintf('cat tmp.html tmp.map > %s/netpic_node%.3d.html',NP,II));
fprintf(fidi,'<a href="netpic_node%.3d.html"><img src="%.4d.png" />  </a>\n',II,II-1);
end

fclose(fidi);

