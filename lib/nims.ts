const USGS_HEADERS = {
  'User-Agent': 'il-flood-dashboard/1.0 (gheistand@gmail.com)',
  Accept: 'application/json',
};

export interface NIMSCamera {
  camId: string;
  camName: string;
  smallDir: string;
  thumbDir: string;
  newestImageDT: string | null;
}

export interface NIMSImage {
  camId: string;
  camName: string;
  imageUrl: string;
  thumbUrl: string;
  capturedAt: string | null;
}

// Returns [] if no cameras at this site
export async function fetchSiteCameras(siteNo: string): Promise<NIMSImage[]> {
  try {
    // 1. Fetch cameras for this site
    const camerasUrl = `https://api.waterdata.usgs.gov/nims/v0/cameras?siteId=${siteNo}`;
    const camerasRes = await fetch(camerasUrl, { headers: USGS_HEADERS });
    if (!camerasRes.ok) return [];
    
    const cameras: NIMSCamera[] = await camerasRes.json();
    if (!Array.isArray(cameras) || cameras.length === 0) return [];

    // 2. For each camera, fetch latest image filename
    const imagePromises = cameras.map(async (camera): Promise<NIMSImage | null> => {
      try {
        const filesUrl = `https://api.waterdata.usgs.gov/nims/v0/listFiles?camId=${camera.camId}&limit=1&recent=true`;
        const filesRes = await fetch(filesUrl, { headers: USGS_HEADERS });
        if (!filesRes.ok) return null;
        
        const filenames: string[] = await filesRes.json();
        if (!Array.isArray(filenames) || filenames.length === 0) return null;

        // 3. Construct URLs
        const filename = filenames[0];
        return {
          camId: camera.camId,
          camName: camera.camName,
          imageUrl: camera.smallDir + filename,
          thumbUrl: camera.thumbDir + filename,
          capturedAt: camera.newestImageDT,
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(imagePromises);
    return results.filter((img): img is NIMSImage => img !== null);
  } catch {
    return [];
  }
}
