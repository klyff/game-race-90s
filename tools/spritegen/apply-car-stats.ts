import { writeMatrixManifest } from './write-matrix-manifest.ts';

const result = writeMatrixManifest();
console.log(
  `cars.json ← MatrixCarIndex + CarStatMatrix from ${result.folders.length} matrix folder(s)`,
);
