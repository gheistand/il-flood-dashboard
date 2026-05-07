import type { SparklinePoint } from './types';

const USGS_HEADERS = {
  'User-Agent': 'il-flood-dashboard/1.0 (gheistand@gmail.com)',
  Accept: 'application/json',
};

export interface USGSSiteValue {
  siteNo: string;
  siteName: string;
  latitude: number;
  longitude: number;
  gageHeight: number | null;
  streamflow: number | null;
  lastUpdated: string | null;
}

export async function fetchILGages(): Promise<USGSSiteValue[]> {
  const url =
    'https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=IL&parameterCd=00060,00065&siteStatus=active&period=PT3H';
  const res = await fetch(url, { headers: USGS_HEADERS });
  if (!res.ok) throw new Error(`USGS IV fetch failed: ${res.status}`);
  const data = await res.json() as any;

  const siteMap = new Map<
    string,
    { siteNo: string; siteName: string; lat: number; lng: number; gh: number | null; sf: number | null; ts: string | null }
  >();

  const tsArray = data?.value?.timeSeries ?? [];
  for (const ts of tsArray) {
    const siteNo: string = ts.sourceInfo?.siteCode?.[0]?.value ?? '';
    if (!siteNo) continue;
    const siteName: string = ts.sourceInfo?.siteName ?? '';
    const lat = parseFloat(ts.sourceInfo?.geoLocation?.geogLocation?.latitude ?? 'NaN');
    const lng = parseFloat(ts.sourceInfo?.geoLocation?.geogLocation?.longitude ?? 'NaN');
    const paramCode: string = ts.variable?.variableCode?.[0]?.value ?? '';
    const values = ts.values?.[0]?.value ?? [];
    const latest = values[values.length - 1];
    const latestValue = latest ? parseFloat(latest.value) : null;
    const latestTime: string | null = latest?.dateTime ?? null;
    const validValue = latestValue !== null && !isNaN(latestValue) ? latestValue : null;

    if (!siteMap.has(siteNo)) {
      siteMap.set(siteNo, { siteNo, siteName, lat, lng, gh: null, sf: null, ts: null });
    }
    const entry = siteMap.get(siteNo)!;
    if (paramCode === '00065') {
      entry.gh = validValue;
      entry.ts = latestTime;
    } else if (paramCode === '00060') {
      entry.sf = validValue;
    }
  }

  return Array.from(siteMap.values()).map((e) => ({
    siteNo: e.siteNo,
    siteName: e.siteName,
    latitude: e.lat,
    longitude: e.lng,
    gageHeight: e.gh,
    streamflow: e.sf,
    lastUpdated: e.ts,
  }));
}

export async function fetchSparkline(siteNo: string): Promise<SparklinePoint[]> {
  const url = `https://waterservices.usgs.gov/nwis/dv/?format=json&sites=${siteNo}&parameterCd=00065&period=P7D`;
  const res = await fetch(url, { headers: USGS_HEADERS });
  if (!res.ok) return [];
  const data = await res.json() as any;
  const ts = data?.value?.timeSeries?.[0];
  if (!ts) return [];
  const values = ts.values?.[0]?.value ?? [];
  return values
    .map((v: any) => ({ dateTime: v.dateTime, value: parseFloat(v.value) }))
    .filter((p: SparklinePoint) => !isNaN(p.value));
}

export async function fetchPercentile(siteNo: string): Promise<Record<string, number>> {
  const url = `https://waterservices.usgs.gov/nwis/stat/?format=json&sites=${siteNo}&parameterCd=00065&statReportType=daily&statYearType=water`;
  const res = await fetch(url, { headers: USGS_HEADERS });
  if (!res.ok) return {};
  const data = await res.json() as any;
  const ts = data?.value?.timeSeries?.[0];
  if (!ts) return {};
  const values = ts.values?.[0]?.value ?? [];
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayKey = `${mm}-${dd}`;
  const row = values.find((v: any) => {
    const dt = v.dateTime?.substring(5, 10);
    return dt === todayKey;
  });
  if (!row) return {};
  return {
    p10: parseFloat(row.p10_va),
    p25: parseFloat(row.p25_va),
    p50: parseFloat(row.p50_va),
    p75: parseFloat(row.p75_va),
    p90: parseFloat(row.p90_va),
  };
}

export async function fetchILSiteMetadata(): Promise<
  Array<{ siteNo: string; siteName: string; lat: number; lng: number; county: string; huc8: string }>
> {
  const url =
    'https://waterservices.usgs.gov/nwis/site/?format=rdb&stateCd=IL&siteType=ST&siteStatus=active&hasDataTypeCd=iv&outputDataTypeCd=iv';
  const res = await fetch(url, { headers: { 'User-Agent': USGS_HEADERS['User-Agent'] } });
  if (!res.ok) throw new Error(`Site metadata fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n');
  // Skip comment lines (#), find header, skip type row, parse data
  const nonComment = lines.filter((l) => !l.startsWith('#') && l.trim() !== '');
  if (nonComment.length < 3) return [];
  const header = nonComment[0].split('\t');
  // nonComment[1] is the type row — skip it
  const dataLines = nonComment.slice(2);
  const idx = (name: string) => header.indexOf(name);
  return dataLines.map((line) => {
    const cols = line.split('\t');
    return {
      siteNo: cols[idx('site_no')] ?? '',
      siteName: cols[idx('station_nm')] ?? '',
      lat: parseFloat(cols[idx('dec_lat_va')] ?? 'NaN'),
      lng: parseFloat(cols[idx('dec_long_va')] ?? 'NaN'),
      county: cols[idx('county_nm')] ?? '',
      huc8: cols[idx('huc_cd')] ?? '',
    };
  }).filter((s) => s.siteNo && !isNaN(s.lat));
}
