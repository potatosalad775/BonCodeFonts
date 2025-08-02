import { readFont } from "../build/font-io.mjs";
import fs from "fs-extra";

/**
 * Test font functionality
 */
export default async function testFonts() {
	console.log("🧪 Testing font functionality...\n");
	
	try {
		// Test 1: Check if output directory exists
		const outDir = "out";
		if (await fs.pathExists(outDir)) {
			console.log("✅ Output directory exists");
			
      const files = await fs.readdir(outDir, { recursive: true });
      const fontFiles = files.filter(f => f.endsWith('.ttf'));
			
			if (fontFiles.length > 0) {
				console.log(`✅ Found ${fontFiles.length} font files:`);
				fontFiles.forEach(f => console.log(`   - ${f}`));
				
				// Test 2: Try to read a font file
				const testFontPath = `${outDir}/${fontFiles[0]}`;
				try {
					const font = await readFont(testFontPath);
					console.log(`✅ Successfully read font: ${fontFiles[0]}`);
					
					// Test 3: Check for Korean characters
					let koreanCount = 0;
					let latinCount = 0;
					
					if (font.cmap?.unicode) {
						for (const [codePoint] of font.cmap.unicode.entries()) {
							if (codePoint >= 0xAC00 && codePoint <= 0xD7AF) {
								koreanCount++;
							} else if (codePoint >= 0x0020 && codePoint <= 0x007E) {
								latinCount++;
							}
						}
						
						console.log(`✅ Character analysis:`);
						console.log(`   - Korean syllables: ${koreanCount}`);
						console.log(`   - Basic Latin: ${latinCount}`);
						
						if (koreanCount > 1000 && latinCount > 50) {
							console.log("✅ Font appears to be a successful hybrid!");
						} else {
							console.log("⚠️  Font may not have complete character sets");
						}
					} else {
						console.log("❌ Font missing Unicode cmap table");
					}
					
				} catch (error) {
					console.log(`❌ Failed to read font: ${error.message}`);
				}
				
			} else {
				console.log("❌ No font files found in output directory");
			}
			
		} else {
			console.log("❌ Output directory doesn't exist - run build first");
		}
		
	} catch (error) {
		console.log(`❌ Test failed: ${error.message}`);
		process.exit(1);
	}
	
	console.log("\n🎉 Font testing completed!");
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	testFonts().catch(console.error);
}
