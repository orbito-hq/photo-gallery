self.onmessage = (e) => {
  const { files, cameraPosition, viewDistance } = e.data;
  
  const visibleFiles = files.filter((file: any) => {
    if (!file.position) return false;
    const [x, y, z] = file.position;
    const dx = x - cameraPosition.x;
    const dy = y - cameraPosition.y;
    const dz = z - cameraPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance <= viewDistance;
  });

  visibleFiles.sort((a: any, b: any) => {
    if (!a.position || !b.position) return 0;
    const [ax, ay, az] = a.position;
    const [bx, by, bz] = b.position;
    const distA = Math.sqrt(
      Math.pow(ax - cameraPosition.x, 2) +
      Math.pow(ay - cameraPosition.y, 2) +
      Math.pow(az - cameraPosition.z, 2)
    );
    const distB = Math.sqrt(
      Math.pow(bx - cameraPosition.x, 2) +
      Math.pow(by - cameraPosition.y, 2) +
      Math.pow(bz - cameraPosition.z, 2)
    );
    return distA - distB;
  });

  self.postMessage({ visibleFiles });
};
