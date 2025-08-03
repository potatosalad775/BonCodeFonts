import { readFont, getAdvanceWidth } from '../build/font-io.mjs';
import fs from 'fs-extra';

async function analyzeFontMetrics() {
  console.log('=== Font Metrics Analysis ===\n');
  
  const fonts = [
    { name: 'Google Sans Code Regular', path: 'sources/GoogleSansCode/GoogleSansCode-Regular.ttf' },
    { name: 'JetBrains Mono Regular', path: 'sources/JetBrainsMono/JetBrainsMonoNL-Regular.ttf' },
    { name: 'Geist Mono Variable', path: 'sources/GeistMonoVariable/GeistMono[wght].ttf' },
    { name: 'Sarasa Fixed K Regular', path: 'sources/SarasaFixedK/SarasaFixedK-Regular.ttf' },
  ];
  
  for (const fontInfo of fonts) {
    if (!await fs.pathExists(fontInfo.path)) {
      console.log(`❌ ${fontInfo.name}: File not found at ${fontInfo.path}\n`);
      continue;
    }
    
    try {
      console.log(`📊 ${fontInfo.name}:`);
      console.log(`   Path: ${fontInfo.path}`);
      
      const font = await readFont(fontInfo.path);
      
      // Basic font metrics
      console.log(`   Units per Em: ${font.head?.unitsPerEm || 'not found'}`);
      console.log(`   Ascender: ${font.hhea?.ascender || font.os2?.typoAscender || 'not found'}`);
      console.log(`   Descender: ${font.hhea?.descender || font.os2?.typoDescender || 'not found'}`);
      console.log(`   Line Gap: ${font.hhea?.lineGap || font.os2?.typoLineGap || 'not found'}`);
      
      // Analyze some key characters
      if (font.cmap?.unicode) {
        const testChars = [
          { char: 'A', code: 0x41 },
          { char: 'a', code: 0x61 },
          { char: '가', code: 0xAC00 },
          { char: '한', code: 0xD55C },
          { char: '글', code: 0xAE00 }
        ];
        
        console.log(`   Character widths:`);
        for (const { char, code } of testChars) {
          const glyph = font.cmap.unicode.get(code);
          if (glyph) {
            const width = getAdvanceWidth(glyph);
            console.log(`     ${char} (U+${code.toString(16).toUpperCase().padStart(4, '0')}): ${width} units`);
          } else {
            console.log(`     ${char} (U+${code.toString(16).toUpperCase().padStart(4, '0')}): not found`);
          }
        }
      }
      
      // Font tables present
      const tables = Object.keys(font).filter(key => typeof font[key] === 'object' && font[key] !== null);
      console.log(`   Tables present: ${tables.join(', ')}`);
      
      // Glyph count
      if (font.glyf) {
        console.log(`   Glyph count (glyf): ${font.glyf.size || Object.keys(font.glyf).length}`);
      }
      if (font.cmap?.unicode) {
        console.log(`   Unicode mappings: ${font.cmap.unicode.size}`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ Error analyzing ${fontInfo.name}: ${error.message}\n`);
    }
  }
}

// Run the analysis
analyzeFontMetrics().catch(console.error);
