const USDM_HEADERS = {
  'User-Agent': 'il-flood-dashboard/1.0 (gheistand@gmail.com)',
  Accept: 'application/json',
};

export interface DroughtSummary {
  mapDate: string;          // "2026-05-06"
  none: number;             // % with no drought
  d0: number;               // % Abnormally Dry
  d1: number;               // % Moderate Drought
  d2: number;               // % Severe Drought
  d3: number;               // % Extreme Drought
  d4: number;               // % Exceptional Drought
  inDrought: number;        // d1+d2+d3+d4 (D1 or worse)
  worstCategory: string;    // 'None' | 'D0' | 'D1' | 'D2' | 'D3' | 'D4'
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function determineWorstCategory(record: any): string {
  const d4 = parseFloat(record.D4 ?? '0');
  const d3 = parseFloat(record.D3 ?? '0');
  const d2 = parseFloat(record.D2 ?? '0');
  const d1 = parseFloat(record.D1 ?? '0');
  const d0 = parseFloat(record.D0 ?? '0');
  
  if (d4 > 0) return 'D4';
  if (d3 > 0) return 'D3';
  if (d2 > 0) return 'D2';
  if (d1 > 0) return 'D1';
  if (d0 > 0) return 'D0';
  return 'None';
}

export async function fetchILDroughtSummary(): Promise<DroughtSummary | null> {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const startDate = formatDate(thirtyDaysAgo);
    const endDate = formatDate(today);
    
    const url = `https://usdmdataservices.unl.edu/api/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent?aoi=17&startdate=${startDate}&enddate=${endDate}&statisticsType=1`;
    const res = await fetch(url, { headers: USDM_HEADERS });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    
    // Most recent record = last item
    const latest = data[data.length - 1];
    
    const none = parseFloat(latest.None ?? '0');
    const d0 = parseFloat(latest.D0 ?? '0');
    const d1 = parseFloat(latest.D1 ?? '0');
    const d2 = parseFloat(latest.D2 ?? '0');
    const d3 = parseFloat(latest.D3 ?? '0');
    const d4 = parseFloat(latest.D4 ?? '0');
    
    return {
      mapDate: latest.MapDate ?? latest.ValidStart ?? endDate,
      none,
      d0,
      d1,
      d2,
      d3,
      d4,
      inDrought: d1 + d2 + d3 + d4,
      worstCategory: determineWorstCategory(latest),
    };
  } catch {
    return null;
  }
}
