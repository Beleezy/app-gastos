const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.nuxt') && !file.includes('.output')) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.vue')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk(path.join(process.cwd(), 'components'));
const pages = walk(path.join(process.cwd(), 'pages'));
const layouts = walk(path.join(process.cwd(), 'layouts'));
const allFiles = [...files, ...pages, ...layouts];

allFiles.forEach(f => {
  let text = fs.readFileSync(f, 'utf8');
  let original = text;
  
  // Replacements to map hardcoded dark primary classes to semantic classes
  text = text.replace(/bg-primary-950/g, 'bg-theme-bg');
  text = text.replace(/bg-primary-900\/\d+/g, 'bg-theme-input'); 
  text = text.replace(/bg-primary-900/g, 'bg-theme-input');
  text = text.replace(/bg-primary-800\/\d+/g, 'bg-theme-card');
  text = text.replace(/bg-primary-800/g, 'bg-theme-card');
  text = text.replace(/bg-primary-700\/\d+/g, 'bg-theme-border-md');
  text = text.replace(/bg-primary-700/g, 'bg-theme-border-md');
  
  text = text.replace(/border-primary-700\/\d+/g, 'border-theme-border');
  text = text.replace(/border-primary-700/g, 'border-theme-border');
  text = text.replace(/border-primary-800/g, 'border-theme-border');
  
  text = text.replace(/from-primary-900/g, 'from-theme-bg');
  text = text.replace(/to-primary-900/g, 'to-theme-bg');
  text = text.replace(/from-primary-800/g, 'from-theme-card');
  text = text.replace(/to-primary-800/g, 'to-theme-card');
  text = text.replace(/via-primary-800/g, 'via-theme-card');
  
  text = text.replace(/to-primary-800\/\d+/g, 'to-theme-bg');
  
  // also fix black/white hardcoded backgrounds
  text = text.replace(/bg-black\/\d+/g, 'bg-theme-bg/80'); // Modals overlay
  text = text.replace(/bg-white/g, 'bg-theme-card'); // Ensure no forced white hardcodes unadapted
  text = text.replace(/text-gray-400/g, 'text-theme-text-muted');
  text = text.replace(/text-gray-500/g, 'text-theme-text-sec');
  
  if (text !== original) {
    fs.writeFileSync(f, text, 'utf8');
    console.log('Updated', f);
  }
});
