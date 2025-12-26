// Quick deployment: copies all files at once
const fs = require('fs');
const path = require('path');

const sourceFiles = [
  '/mnt/user-data/outputs/jit-command-center/lib/policy.ts',
  '/mnt/user-data/outputs/jit-command-center/lib/gate.ts',
  '/mnt/user-data/outputs/jit-command-center/app/api/status/route.ts',
  '/mnt/user-data/outputs/jit-command-center/app/api/control/route.ts',
  '/mnt/user-data/outputs/jit-command-center/components/InfrastructureHUD.tsx',
  '/mnt/user-data/outputs/jit-command-center/app/page.tsx'
];

console.log('This won\'t work - files are in Linux container, not Windows');
console.log('Ivan: You need to manually copy the generated files from the download links');
console.log('Or Claude needs to write each file individually');
