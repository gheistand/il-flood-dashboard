#!/usr/bin/env node
/**
 * Fetches the US county GeoJSON and filters to Illinois (FIPS 17xxx).
 * Output: public/il-counties.geojson
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

const URL = 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json';
const OUTPUT = path.resolve(process.cwd(), 'public/il-counties.geojson');

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching US counties GeoJSON...');
  const geojson = await fetchJson(URL);
  const ilFeatures = geojson.features.filter((f: any) => String(f.id).startsWith('17'));
  const output = { type: 'FeatureCollection', features: ilFeatures };
  fs.writeFileSync(OUTPUT, JSON.stringify(output));
  console.log(`Saved ${ilFeatures.length} Illinois counties to ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
